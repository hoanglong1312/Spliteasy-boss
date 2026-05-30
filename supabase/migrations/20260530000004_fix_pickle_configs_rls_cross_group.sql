-- Fix pickle_configs_update policy for cross-group auth

DROP POLICY IF EXISTS "pickle_configs_update" ON public.pickle_configs;

CREATE POLICY "pickle_configs_update" ON public.pickle_configs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.members m
      WHERE m.id IN (SELECT public.get_my_member_ids())
        AND m.group_id = pickle_configs.group_id
        AND m.role = 'treasurer'
    )
  );
