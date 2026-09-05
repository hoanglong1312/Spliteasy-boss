-- Restore profile-based treasurer auth for cross-group (expense ↔ pickleball) settlements.
-- 20260817000001 added groupId preference for refunds but regressed treasurer checks
-- back to exact member-id match, breaking confirm when actor is treasurer of the linked
-- expense group while coveredSources use pickleball sourceId.
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
    -- Prefer explicit groupId (refunds); fall back to sourceId for normal sources.
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

    -- Remap member id into the settlement group when payload carries a sibling-group membership.
    if v_member_id is not null and not exists (
      select 1 from public.members where id = v_member_id and group_id = v_group_id
    ) then
      if v_profile_id is null then
        select profile_id into v_profile_id from public.members where id = v_member_id;
      end if;
      v_member_id := null;
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

    -- Linked expense-group treasurer may settle pickleball months for the same profile.
    if v_settled_by_member_id is null and v_treasurer_profile_id is not null then
      if exists (
        select 1
        from public.members actor
        join public.groups expense_group on expense_group.id = actor.group_id
        where actor.id = p_treasurer_member_id
          and actor.role in ('treasurer', 'admin', 'owner')
          and expense_group.linked_pickleball_group_id = v_group_id
      ) then
        select id into v_settled_by_member_id
        from public.members
        where group_id = v_group_id
          and profile_id = v_treasurer_profile_id
        order by (case when role in ('treasurer', 'admin', 'owner') then 0 else 1 end),
                 (case when is_active is false then 1 else 0 end),
                 created_at desc
        limit 1;
        if v_settled_by_member_id is null then
          v_settled_by_member_id := p_treasurer_member_id;
        end if;
      end if;
    end if;

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
