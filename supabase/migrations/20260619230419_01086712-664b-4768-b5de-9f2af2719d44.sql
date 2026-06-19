CREATE OR REPLACE FUNCTION public.get_committee_paper_tally(_committee_paper_id uuid)
RETURNS TABLE (
  approve_count           int,
  approve_revisions_count int,
  reject_count            int,
  abstain_count           int,
  cast_count              int,
  member_count            int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE v.vote = 'approve')::int                   AS approve_count,
    COUNT(*) FILTER (WHERE v.vote = 'approve_with_revisions')::int    AS approve_revisions_count,
    COUNT(*) FILTER (WHERE v.vote = 'reject')::int                    AS reject_count,
    COUNT(*) FILTER (WHERE v.vote = 'abstain')::int                   AS abstain_count,
    COUNT(v.*)::int                                                   AS cast_count,
    (
      SELECT COUNT(*)::int
      FROM   public.committee_members cm
      JOIN   public.committee_papers  cp2 ON cp2.committee_id = cm.committee_id
      WHERE  cp2.id = _committee_paper_id
    )                                                                 AS member_count
  FROM public.committee_votes v
  WHERE v.committee_paper_id = _committee_paper_id
    AND public.is_member_of_journal(
          auth.uid(),
          (
            SELECT c.journal_id
            FROM   public.committee_papers cp
            JOIN   public.committees       c ON c.id = cp.committee_id
            WHERE  cp.id = _committee_paper_id
          )
        )
$$;

CREATE OR REPLACE FUNCTION public.can_vote_on_committee_paper(
  _user_id           uuid,
  _committee_paper_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.committee_papers cp
    JOIN public.committees         c  ON c.id  = cp.committee_id
    JOIN public.committee_members  cm ON cm.committee_id = cp.committee_id
    WHERE cp.id        = _committee_paper_id
      AND cm.user_id   = _user_id
      AND public.is_member_of_journal(_user_id, c.journal_id)
  )
$$;

DROP POLICY IF EXISTS "Committee members update own vote" ON public.committee_votes;
CREATE POLICY "Committee members update own vote"
  ON public.committee_votes
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.can_vote_on_committee_paper(auth.uid(), committee_paper_id)
  )
  WITH CHECK (
    auth.uid() = user_id
    AND public.can_vote_on_committee_paper(auth.uid(), committee_paper_id)
  );

DROP POLICY IF EXISTS "Committee members delete own vote" ON public.committee_votes;
CREATE POLICY "Committee members delete own vote"
  ON public.committee_votes
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.can_vote_on_committee_paper(auth.uid(), committee_paper_id)
  );