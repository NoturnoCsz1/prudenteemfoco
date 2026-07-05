
CREATE OR REPLACE FUNCTION public.admin_site_analytics(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _totals jsonb;
  _top jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  WITH scoped AS (
    SELECT h.*
    FROM public.hotsite_click_events h
    WHERE h.created_at >= _from
      AND h.created_at < _to
      AND public.is_active_org_member(_uid, h.organization_id)
  )
  SELECT jsonb_build_object(
    'home_views', COALESCE(SUM(CASE WHEN kind = 'home_hero_view' THEN 1 ELSE 0 END), 0),
    'home_cta_clicks', COALESCE(SUM(CASE WHEN kind IN ('home_hero_click','home_event_card_click','home_agenda_click') THEN 1 ELSE 0 END), 0),
    'news_clicks', COALESCE(SUM(CASE WHEN kind = 'home_news_click' THEN 1 ELSE 0 END), 0),
    'experience_clicks', COALESCE(SUM(CASE WHEN kind = 'home_experience_click' THEN 1 ELSE 0 END), 0),
    'ticket_clicks', COALESCE(SUM(CASE WHEN kind IN ('home_ticket_click','commercial_link') THEN 1 ELSE 0 END), 0),
    'event_page_views', COALESCE(SUM(CASE WHEN kind = 'page_view' THEN 1 ELSE 0 END), 0),
    'total_events_tracked', COUNT(*)
  )
  INTO _totals FROM scoped;

  WITH scoped AS (
    SELECT h.event_id, h.kind
    FROM public.hotsite_click_events h
    WHERE h.created_at >= _from
      AND h.created_at < _to
      AND public.is_active_org_member(_uid, h.organization_id)
  ),
  agg AS (
    SELECT
      s.event_id,
      SUM(CASE WHEN kind = 'page_view' THEN 1 ELSE 0 END) AS views,
      SUM(CASE WHEN kind IN ('home_hero_click','home_event_card_click','home_agenda_click') THEN 1 ELSE 0 END) AS cta_clicks,
      SUM(CASE WHEN kind IN ('home_ticket_click','commercial_link') THEN 1 ELSE 0 END) AS ticket_clicks,
      COUNT(*) AS total
    FROM scoped s
    GROUP BY s.event_id
  )
  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'total')::int DESC), '[]'::jsonb)
  INTO _top
  FROM (
    SELECT jsonb_build_object(
      'event_id', a.event_id,
      'title', e.title,
      'slug', e.slug,
      'views', a.views,
      'cta_clicks', a.cta_clicks,
      'ticket_clicks', a.ticket_clicks,
      'total', a.total
    ) AS row
    FROM agg a
    JOIN public.events e ON e.id = a.event_id
    ORDER BY a.total DESC
    LIMIT 20
  ) t;

  RETURN jsonb_build_object('totals', _totals, 'top_events', _top);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_site_analytics(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_site_analytics(timestamptz, timestamptz) TO authenticated;
