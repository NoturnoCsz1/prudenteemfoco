
CREATE OR REPLACE FUNCTION public.resolve_and_track_short_link(
  _slug text,
  _referrer text DEFAULT NULL,
  _user_agent text DEFAULT NULL,
  _device text DEFAULT NULL,
  _browser text DEFAULT NULL,
  _utm_source text DEFAULT NULL,
  _utm_medium text DEFAULT NULL,
  _utm_campaign text DEFAULT NULL,
  _utm_content text DEFAULT NULL,
  _utm_term text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _link_id uuid;
  _dest text;
BEGIN
  IF _slug IS NULL OR _slug !~ '^[a-z0-9][a-z0-9_-]{0,63}$' THEN
    RETURN NULL;
  END IF;

  SELECT id, destination_url
    INTO _link_id, _dest
    FROM public.short_links
    WHERE slug = lower(_slug) AND active = true
    LIMIT 1;

  IF _link_id IS NULL OR _dest IS NULL OR _dest !~* '^https?://' THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.short_link_clicks (
    short_link_id, referrer, user_agent, device, browser,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term
  ) VALUES (
    _link_id,
    NULLIF(left(_referrer, 512), ''),
    NULLIF(left(_user_agent, 512), ''),
    NULLIF(_device, ''),
    NULLIF(_browser, ''),
    NULLIF(_utm_source, ''),
    NULLIF(_utm_medium, ''),
    NULLIF(_utm_campaign, ''),
    NULLIF(_utm_content, ''),
    NULLIF(_utm_term, '')
  );

  RETURN _dest;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_and_track_short_link(text, text, text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_and_track_short_link(text, text, text, text, text, text, text, text, text, text) TO anon, authenticated;
