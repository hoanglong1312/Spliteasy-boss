-- Point-in-time settlement checkpoints: replace calendar-month settle with
-- a running period from the last confirmed checkpoint to "now".
create table if not exists public.settlement_checkpoints (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  amount numeric not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_by_member_id uuid references public.members(id),
  confirmed_by_member_id uuid references public.members(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

-- Only one open (pending) checkpoint per member per group at a time —
-- new expenses while a checkpoint is pending roll into the NEXT request.
create unique index if not exists settlement_checkpoints_one_pending_per_member
  on public.settlement_checkpoints (group_id, member_id)
  where status = 'pending';

alter table public.settlement_checkpoints enable row level security;

-- role thực tế client dùng là "anon" (custom x-member-token header, không phải
-- Supabase Auth JWT), khớp policy public đã dùng cho member_month_settlements.
create policy "settlement_checkpoints_select" on public.settlement_checkpoints
  for select using (true);

-- period_start = period_end of the member's last CONFIRMED checkpoint,
-- or their earliest activity in the group if they've never settled.
create or replace function public.request_settlement_checkpoint(
  p_group_id uuid,
  p_member_id uuid,
  p_amount numeric
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
    group_id, member_id, period_start, period_end, amount, status, created_by_member_id
  ) values (
    p_group_id, p_member_id, coalesce(v_last_end, '1970-01-01'::timestamptz), now(), p_amount, 'pending', p_member_id
  ) returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.confirm_settlement_checkpoint(
  p_checkpoint_id uuid,
  p_treasurer_member_id uuid
) returns public.settlement_checkpoints
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_row public.settlement_checkpoints;
begin
  select group_id into v_group_id from public.settlement_checkpoints where id = p_checkpoint_id;
  if v_group_id is null then
    raise exception 'Checkpoint not found';
  end if;
  if not exists (
    select 1 from public.members
    where id = p_treasurer_member_id and group_id = v_group_id and role = 'treasurer'
  ) then
    raise exception 'Unauthorized: not treasurer of this group';
  end if;

  update public.settlement_checkpoints
  set status = 'confirmed', confirmed_by_member_id = p_treasurer_member_id, confirmed_at = now()
  where id = p_checkpoint_id and status = 'pending'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Checkpoint not found or not pending';
  end if;

  return v_row;
end;
$$;

create or replace function public.reject_settlement_checkpoint(
  p_checkpoint_id uuid,
  p_treasurer_member_id uuid
) returns public.settlement_checkpoints
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_row public.settlement_checkpoints;
begin
  select group_id into v_group_id from public.settlement_checkpoints where id = p_checkpoint_id;
  if v_group_id is null then
    raise exception 'Checkpoint not found';
  end if;
  if not exists (
    select 1 from public.members
    where id = p_treasurer_member_id and group_id = v_group_id and role = 'treasurer'
  ) then
    raise exception 'Unauthorized: not treasurer of this group';
  end if;

  update public.settlement_checkpoints
  set status = 'rejected', confirmed_by_member_id = p_treasurer_member_id, confirmed_at = now()
  where id = p_checkpoint_id and status = 'pending'
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Checkpoint not found or not pending';
  end if;

  return v_row;
end;
$$;
