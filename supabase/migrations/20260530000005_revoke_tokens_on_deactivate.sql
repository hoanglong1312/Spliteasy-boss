-- Revoke member tokens when member is deactivated (is_active = false)
-- Prevents kicked members from continuing to access the app with existing tokens

CREATE OR REPLACE FUNCTION public.revoke_tokens_on_deactivate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active IS FALSE AND (OLD.is_active IS TRUE OR OLD.is_active IS NULL) THEN
    UPDATE public.member_tokens
    SET revoked_at = now()
    WHERE member_id = NEW.id
      AND revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revoke_tokens_on_deactivate ON public.members;

CREATE TRIGGER trg_revoke_tokens_on_deactivate
  AFTER UPDATE OF is_active ON public.members
  FOR EACH ROW
  EXECUTE FUNCTION public.revoke_tokens_on_deactivate();
