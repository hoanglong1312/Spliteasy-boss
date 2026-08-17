-- Fix record_member_month_payment_settlements to prefer explicit groupId field
-- over sourceId. Refund coveredSources use sourceId = profileId (not groupId),
-- so the RPC was silently skipping them. Now checks groupId first.
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
  v_month text;
  v_inserted integer := 0;
begin
  if p_treasurer_member_id is null then
    raise exception 'Missing treasurer member id';
  end if;

  for v_source in select * from jsonb_array_elements(coalesce(p_covered_sources, '[]'::jsonb))
  loop
    -- Prefer explicit groupId field; fall back to sourceId for normal sources
    v_group_id_text := nullif(coalesce(
      v_source->>'groupId',
      v_source->>'group_id',
      v_source->>'sourceId',
      v_source->>'source_id'
    ), '');
    v_member_id_text := nullif(coalesce(v_source->>'memberId', v_source->>'member_id'), '');
    v_profile_id_text := nullif(coalesce(v_source->>'profileId', v_source->>'profile_id'), '');
    v_group_id := case when v_group_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_group_id_text::uuid else null end;
    v_member_id := case when v_member_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_member_id_text::uuid else null end;
    v_profile_id := case when v_profile_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then v_profile_id_text::uuid else null end;
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

    if not exists (
      select 1 from public.members
      where id = p_treasurer_member_id
        and group_id = v_group_id
        and role in ('treasurer', 'admin', 'owner')
    ) then
      raise exception 'Unauthorized: not treasurer of this group';
    end if;

    insert into public.member_month_settlements (
      member_id, group_id, month, expense_id, settled_by_member_id
    ) values (
      v_member_id, v_group_id, v_month, null, p_treasurer_member_id
    )
    on conflict (member_id, month, group_id) do nothing;

    if found then
      v_inserted := v_inserted + 1;
    end if;
  end loop;

  return v_inserted;
end;
$$;
