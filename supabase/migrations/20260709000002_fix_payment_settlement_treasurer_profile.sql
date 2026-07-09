-- Allow treasurer confirmations to settle source months across groups for the same profile.
create or replace function public.record_member_month_payment_settlements(
  p_treasurer_member_id uuid,
  p_covered_sources jsonb
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source jsonb;
  v_group_id_text text;
  v_member_id_text text;
  v_profile_id_text text;
  v_group_id uuid;
  v_member_id uuid;
  v_profile_id uuid;
  v_treasurer_profile_id uuid;
  v_settled_by_member_id uuid;
  v_month text;
  v_inserted integer := 0;
begin
  if p_treasurer_member_id is null then
    raise exception 'Missing treasurer member id';
  end if;

  select profile_id into v_treasurer_profile_id
  from public.members
  where id = p_treasurer_member_id;

  for v_source in select * from jsonb_array_elements(coalesce(p_covered_sources, '[]'::jsonb))
  loop
    v_group_id_text := nullif(coalesce(v_source->>'sourceId', v_source->>'source_id'), '');
    v_member_id_text := nullif(coalesce(v_source->>'memberId', v_source->>'member_id'), '');
    v_profile_id_text := nullif(coalesce(v_source->>'profileId', v_source->>'profile_id'), '');
    v_group_id := case when v_group_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_group_id_text::uuid else null end;
    v_member_id := case when v_member_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_member_id_text::uuid else null end;
    v_profile_id := case when v_profile_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_profile_id_text::uuid else null end;
    v_month := nullif(coalesce(v_source->>'month', v_source->>'yearMonth', v_source->>'year_month'), '');

    if v_group_id is null or v_month is null then
      continue;
    end if;

    if v_member_id is null and v_profile_id is not null then
      select id into v_member_id
      from public.members
      where group_id = v_group_id and profile_id = v_profile_id
      order by (case when is_active is false then 1 else 0 end), created_at desc
      limit 1;
    end if;

    if v_member_id is null then
      continue;
    end if;

    v_settled_by_member_id := null;
    select id into v_settled_by_member_id
    from public.members
    where group_id = v_group_id
      and role in ('treasurer', 'admin', 'owner')
      and (
        id = p_treasurer_member_id
        or (v_treasurer_profile_id is not null and profile_id = v_treasurer_profile_id)
      )
    order by (case when id = p_treasurer_member_id then 0 else 1 end), created_at desc
    limit 1;

    if v_settled_by_member_id is null then
      raise exception 'Unauthorized: not treasurer of this group';
    end if;

    insert into public.member_month_settlements (
      member_id, group_id, month, expense_id, settled_by_member_id
    ) values (
      v_member_id, v_group_id, v_month, null, v_settled_by_member_id
    )
    on conflict (member_id, month, group_id) do nothing;

    if found then
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  return v_inserted;
end;
$$;

grant execute on function public.record_member_month_payment_settlements(uuid, jsonb) to anon, authenticated;

insert into public.member_month_settlements (
  member_id, group_id, month, expense_id, settled_by_member_id
)
with payment_sources as (
  select
    n.actor_member_id,
    actor_member.profile_id as treasurer_profile_id,
    nullif(source->>'sourceId', '') as group_id_text,
    nullif(coalesce(source->>'memberId', source->>'member_id'), '') as member_id_text,
    nullif(coalesce(source->>'profileId', source->>'profile_id'), '') as profile_id_text,
    nullif(coalesce(source->>'month', source->>'yearMonth', source->>'year_month'), '') as month
  from public.notifications n
  left join public.members actor_member on actor_member.id = n.actor_member_id
  cross join lateral jsonb_array_elements(coalesce(n.metadata->'coveredSources', '[]'::jsonb)) source
  where lower(n.type) like '%payment%'
    and lower(coalesce(n.metadata->>'status', '')) = 'confirmed'
),
valid_sources as (
  select
    actor_member_id,
    treasurer_profile_id,
    group_id_text::uuid as group_id,
    case when member_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then member_id_text::uuid
      else null
    end as member_id,
    case when profile_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then profile_id_text::uuid
      else null
    end as profile_id,
    month
  from payment_sources
  where group_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and month ~ '^[0-9]{4}-[0-9]{2}$'
),
resolved_sources as (
  select
    coalesce(valid_sources.member_id, member_by_profile.id) as member_id,
    valid_sources.group_id,
    valid_sources.month,
    treasurer_by_profile.id as settled_by_member_id
  from valid_sources
  left join lateral (
    select id
    from public.members
    where group_id = valid_sources.group_id
      and profile_id = valid_sources.profile_id
    order by (case when is_active is false then 1 else 0 end), created_at desc
    limit 1
  ) member_by_profile on valid_sources.member_id is null and valid_sources.profile_id is not null
  left join lateral (
    select id
    from public.members
    where group_id = valid_sources.group_id
      and role in ('treasurer', 'admin', 'owner')
      and (
        id = valid_sources.actor_member_id
        or (valid_sources.treasurer_profile_id is not null and profile_id = valid_sources.treasurer_profile_id)
      )
    order by (case when id = valid_sources.actor_member_id then 0 else 1 end), created_at desc
    limit 1
  ) treasurer_by_profile on true
)
select member_id, group_id, month, null, settled_by_member_id
from resolved_sources
where member_id is not null and settled_by_member_id is not null
on conflict (member_id, month, group_id) do nothing;
