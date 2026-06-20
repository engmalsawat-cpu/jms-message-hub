CREATE OR REPLACE FUNCTION public.is_committee_member(_user_id uuid, _committee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.committee_members cm
    WHERE cm.user_id = _user_id
      AND cm.committee_id = _committee_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_vote_on_committee_paper(_user_id uuid, _committee_paper_id uuid)
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
    WHERE cp.id = _committee_paper_id
      AND cm.user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_committee_members(_user_id uuid, _committee_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_committee_member(_user_id, _committee_id)
    OR EXISTS (
      SELECT 1
      FROM public.committees c
      WHERE c.id = _committee_id
        AND public.is_member_of_journal(_user_id, c.journal_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.can_view_committee_paper(_user_id uuid, _committee_paper_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.can_vote_on_committee_paper(_user_id, _committee_paper_id)
    OR EXISTS (
      SELECT 1
      FROM public.committee_papers cp
      JOIN public.committees c ON c.id = cp.committee_id
      WHERE cp.id = _committee_paper_id
        AND public.is_member_of_journal(_user_id, c.journal_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.get_committee_paper_tally(_committee_paper_id uuid)
RETURNS TABLE(
  approve_count integer,
  approve_revisions_count integer,
  reject_count integer,
  abstain_count integer,
  cast_count integer,
  member_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COUNT(*) FILTER (WHERE v.vote = 'approve')::int                AS approve_count,
    COUNT(*) FILTER (WHERE v.vote = 'approve_with_revisions')::int AS approve_revisions_count,
    COUNT(*) FILTER (WHERE v.vote = 'reject')::int                 AS reject_count,
    COUNT(*) FILTER (WHERE v.vote = 'abstain')::int                AS abstain_count,
    COUNT(v.*)::int                                                AS cast_count,
    (
      SELECT COUNT(*)::int
      FROM public.committee_members cm
      JOIN public.committee_papers cp2 ON cp2.committee_id = cm.committee_id
      WHERE cp2.id = _committee_paper_id
    ) AS member_count
  FROM public.committee_votes v
  WHERE v.committee_paper_id = _committee_paper_id
    AND public.can_view_committee_paper(auth.uid(), _committee_paper_id);
$$;

DROP POLICY IF EXISTS "Committees viewable by members" ON public.committees;
CREATE POLICY "Committees viewable by members"
ON public.committees
FOR SELECT
TO authenticated
USING (
  public.is_member_of_journal(auth.uid(), journal_id)
  OR public.is_committee_member(auth.uid(), id)
);

DROP POLICY IF EXISTS "Committee members viewable by journal members" ON public.committee_members;
CREATE POLICY "Committee members viewable by journal or committee members"
ON public.committee_members
FOR SELECT
TO authenticated
USING (public.can_view_committee_members(auth.uid(), committee_id));

DROP POLICY IF EXISTS "Committee papers viewable by committee or journal members" ON public.committee_papers;
CREATE POLICY "Committee papers viewable by committee or journal members"
ON public.committee_papers
FOR SELECT
TO authenticated
USING (public.can_view_committee_paper(auth.uid(), id));

DROP POLICY IF EXISTS "Committee members vote in own journals" ON public.committee_votes;
CREATE POLICY "Committee members can vote on assigned papers"
ON public.committee_votes
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.can_vote_on_committee_paper(auth.uid(), committee_paper_id)
);

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