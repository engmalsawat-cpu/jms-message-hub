
DROP POLICY IF EXISTS "Committees viewable by members" ON public.committees;
CREATE POLICY "Committees viewable by members"
ON public.committees
FOR SELECT
USING (
  is_member_of_journal(auth.uid(), journal_id)
  OR EXISTS (
    SELECT 1 FROM public.committee_members cm
    WHERE cm.committee_id = committees.id AND cm.user_id = auth.uid()
  )
);
