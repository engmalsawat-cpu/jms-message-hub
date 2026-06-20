
DROP POLICY IF EXISTS "Review reports viewable by reviewer, editors, or paper author" ON public.review_reports;
CREATE POLICY "Review reports viewable by reviewer, editors, or paper author"
ON public.review_reports
FOR SELECT
USING (
  (auth.uid() = reviewer_id)
  OR (EXISTS (
    SELECT 1 FROM public.papers p
    WHERE p.id = review_reports.paper_id
      AND is_member_of_journal(auth.uid(), p.journal_id)
      AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor_in_chief'::app_role, 'managing_editor'::app_role, 'hq_admin'::app_role])
  ))
  OR (is_submitted = true AND EXISTS (
    SELECT 1 FROM public.papers p
    WHERE p.id = review_reports.paper_id AND p.submitted_by = auth.uid()
  ))
  OR (is_submitted = true AND public.is_committee_member_for_paper(auth.uid(), paper_id))
);

DROP POLICY IF EXISTS "Criteria scores viewable by reviewer, editors, or paper author" ON public.criteria_scores;
CREATE POLICY "Criteria scores viewable by reviewer, editors, or paper author"
ON public.criteria_scores
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.review_reports rr
    WHERE rr.id = criteria_scores.review_report_id AND rr.reviewer_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.review_reports rr
    JOIN public.papers p ON p.id = rr.paper_id
    WHERE rr.id = criteria_scores.review_report_id
      AND is_member_of_journal(auth.uid(), p.journal_id)
      AND has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor_in_chief'::app_role, 'managing_editor'::app_role, 'hq_admin'::app_role])
  )
  OR EXISTS (
    SELECT 1 FROM public.review_reports rr
    JOIN public.papers p ON p.id = rr.paper_id
    WHERE rr.id = criteria_scores.review_report_id
      AND rr.is_submitted = true
      AND p.submitted_by = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.review_reports rr
    WHERE rr.id = criteria_scores.review_report_id
      AND rr.is_submitted = true
      AND public.is_committee_member_for_paper(auth.uid(), rr.paper_id)
  )
);
