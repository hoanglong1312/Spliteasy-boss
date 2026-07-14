create or replace function public.undo_settlement_checkpoint(
  p_checkpoint_id uuid,
  p_treasurer_member_id uuid
) returns public.settlement_checkpoints
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.settlement_checkpoints;
begin
  select *
  into v_row
  from public.settlement_checkpoints
  where id = p_checkpoint_id
  for update;

  if v_row.id is null then
    raise exception 'Checkpoint not found';
  end if;

  if not exists (
    select 1
    from public.members
    where id = p_treasurer_member_id
      and group_id = v_row.group_id
      and role = 'treasurer'
  ) then
    raise exception 'Unauthorized: not treasurer of this group';
  end if;

  if v_row.status <> 'confirmed' then
    raise exception 'Checkpoint not found or not confirmed';
  end if;

  if exists (
    select 1
    from public.settlement_checkpoints
    where group_id = v_row.group_id
      and member_id = v_row.member_id
      and status = 'pending'
  ) then
    raise exception 'Already has a pending settlement checkpoint';
  end if;

  if exists (
    select 1
    from public.settlement_checkpoints
    where group_id = v_row.group_id
      and member_id = v_row.member_id
      and status = 'confirmed'
      and (
        period_end > v_row.period_end
        or (period_end = v_row.period_end and created_at > v_row.created_at)
      )
  ) then
    raise exception 'A newer confirmed settlement checkpoint exists';
  end if;

  update public.settlement_checkpoints
  set status = 'pending',
      confirmed_by_member_id = null,
      confirmed_at = null
  where id = p_checkpoint_id
    and status = 'confirmed'
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function public.undo_settlement_checkpoint(uuid, uuid) to anon, authenticated;
