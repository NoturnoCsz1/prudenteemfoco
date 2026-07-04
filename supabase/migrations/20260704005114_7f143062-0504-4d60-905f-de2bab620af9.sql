
-- Policies on storage.objects for the event-covers bucket
-- Path convention: {organization_id}/{event_id}/{filename}

DROP POLICY IF EXISTS "event_covers_select_auth" ON storage.objects;
CREATE POLICY "event_covers_select_auth"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'event-covers'
    AND public.can_manage_event_cover(name)
  );

DROP POLICY IF EXISTS "event_covers_insert_manager" ON storage.objects;
CREATE POLICY "event_covers_insert_manager"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'event-covers'
    AND owner = auth.uid()
    AND public.can_manage_event_cover(name)
  );

DROP POLICY IF EXISTS "event_covers_update_manager" ON storage.objects;
CREATE POLICY "event_covers_update_manager"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'event-covers'
    AND public.can_manage_event_cover(name)
  )
  WITH CHECK (
    bucket_id = 'event-covers'
    AND public.can_manage_event_cover(name)
  );

DROP POLICY IF EXISTS "event_covers_delete_manager" ON storage.objects;
CREATE POLICY "event_covers_delete_manager"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'event-covers'
    AND public.can_manage_event_cover(name)
  );
