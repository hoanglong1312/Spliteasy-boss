alter table public.settlement_checkpoints
  add column if not exists covered_items jsonb not null default '[]'::jsonb;

drop function if exists public.request_settlement_checkpoint(uuid, uuid, numeric);

create or replace function public.request_settlement_checkpoint(
  p_group_id uuid,
  p_member_id uuid,
  p_amount numeric,
  p_covered_items jsonb default '[]'::jsonb
) returns public.settlement_checkpoints
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_end timestamptz;
  v_row public.settlement_checkpoints;
begin
  if not exists (
    select 1 from public.members where id = p_member_id and group_id = p_group_id
  ) then
    raise exception 'Unauthorized: member not in this group';
  end if;

  if exists (
    select 1 from public.settlement_checkpoints
    where group_id = p_group_id and member_id = p_member_id and status = 'pending'
  ) then
    raise exception 'Already has a pending settlement checkpoint';
  end if;

  select max(period_end) into v_last_end
  from public.settlement_checkpoints
  where group_id = p_group_id and member_id = p_member_id and status = 'confirmed';

  insert into public.settlement_checkpoints (
    group_id, member_id, period_start, period_end, amount, covered_items, status, created_by_member_id
  ) values (
    p_group_id,
    p_member_id,
    coalesce(v_last_end, '1970-01-01'::timestamptz),
    now(),
    p_amount,
    coalesce(p_covered_items, '[]'::jsonb),
    'pending',
    p_member_id
  ) returning * into v_row;

  return v_row;
end;
$$;
