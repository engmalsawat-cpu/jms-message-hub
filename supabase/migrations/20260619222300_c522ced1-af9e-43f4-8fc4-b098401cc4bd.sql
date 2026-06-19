CREATE OR REPLACE FUNCTION public.can_view_paper_as_reviewer(_user_id uuid, _paper_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.review_requests rr
    WHERE rr.paper_id = _paper_id
      AND rr.reviewer_id = _user_id
      AND rr.status IN ('pending', 'accepted', 'completed')
  )
$$;

DROP POLICY IF EXISTS "Papers viewable by journal members" ON public.papers;

CREATE POLICY "Papers viewable by journal members" ON public.papers
FOR SELECT TO authenticated
USING (
  public.is_member_of_journal(auth.uid(), journal_id)
  OR auth.uid() = submitted_by
  OR public.can_view_paper_as_reviewer(auth.uid(), id)
);