
DROP POLICY IF EXISTS "Users can view own papers" ON storage.objects;

CREATE POLICY "Users can view paper files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'papers'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor_in_chief'::app_role, 'managing_editor'::app_role])
    OR EXISTS (
      SELECT 1 FROM public.papers p
      WHERE p.file_url = storage.objects.name
        AND (
          p.submitted_by = auth.uid()
          OR EXISTS (SELECT 1 FROM public.review_requests rr WHERE rr.paper_id = p.id AND rr.reviewer_id = auth.uid())
          OR EXISTS (SELECT 1 FROM public.journal_members jm WHERE jm.journal_id = p.journal_id AND jm.user_id = auth.uid())
        )
    )
  )
);
