
CREATE OR REPLACE FUNCTION public.is_committee_member_for_paper(_user_id uuid, _paper_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.committee_papers cp
    JOIN public.committee_members cm ON cm.committee_id = cp.committee_id
    WHERE cp.paper_id = _paper_id
      AND cm.user_id = _user_id
  );
$$;

DROP POLICY IF EXISTS "Papers viewable by journal members" ON public.papers;
CREATE POLICY "Papers viewable by journal members"
ON public.papers
FOR SELECT
USING (
  is_member_of_journal(auth.uid(), journal_id)
  OR auth.uid() = submitted_by
  OR can_view_paper_as_reviewer(auth.uid(), id)
  OR public.is_committee_member_for_paper(auth.uid(), id)
);
