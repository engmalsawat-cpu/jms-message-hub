-- Allow reviewers to view papers they have review requests for
CREATE POLICY "Reviewers can view assigned papers"
ON public.papers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.review_requests
    WHERE review_requests.paper_id = papers.id
    AND review_requests.reviewer_id = auth.uid()
    AND review_requests.status IN ('pending', 'accepted', 'completed')
  )
);