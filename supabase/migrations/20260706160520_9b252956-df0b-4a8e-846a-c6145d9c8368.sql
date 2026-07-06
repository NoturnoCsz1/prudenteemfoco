-- Peek helper: resolve event_id from a plain access token without consuming it.
-- Used by the scanner to refuse "QR de outro evento" without side-effects.
CREATE OR REPLACE FUNCTION public.peek_access_token_event(_token_plain text)
RETURNS TABLE(event_id uuid, organization_id uuid, status public.access_token_status)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $function$
DECLARE
  _hash text;
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;
  IF _token_plain IS NULL OR char_length(_token_plain) < 8 THEN
    RETURN;
  END IF;
  _hash := encode(extensions.digest(_token_plain, 'sha256'), 'hex');

  RETURN QUERY
    SELECT t.event_id, t.organization_id, t.status
    FROM public.access_tokens t
    WHERE t.token_hash = _hash
      AND public.is_active_org_member(_uid, t.organization_id)
    LIMIT 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.peek_access_token_event(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.peek_access_token_event(text) TO authenticated;