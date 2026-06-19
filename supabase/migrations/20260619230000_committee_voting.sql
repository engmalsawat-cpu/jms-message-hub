-- =============================================================================
-- Migration: committee_voting
-- Milestone: 3 — Feature 1: Committee voting
--
-- PURPOSE
--   1. Add a SECURITY DEFINER helper (can_vote_on_committee_paper) to resolve
--      committee membership through committee_papers → committees, avoiding the
--      RLS recursion pattern fixed in 20260619222300.
--   2. Add an UPDATE policy so a committee member can change their own vote
--      (the UNIQUE constraint on committee_votes means re-voting requires UPDATE
--      or an upsert; previously only SELECT + INSERT existed).
--   3. Add a DELETE policy so a member can withdraw their own vote.
--
-- PREREQUISITE
--   20260619222300_c522ced1-af9e-43f4-8fc4-b098401cc4bd.sql MUST be applied
--   first (it introduces can_view_paper_as_reviewer and restates the papers
--   SELECT policy).
--   20260409234700_center_walls.sql must also be applied (defines
--   is_member_of_journal and the existing committee_votes policies).
--
-- APPLYING THIS MIGRATION
--   Apply via the Supabase Dashboard → SQL Editor, or via the Supabase CLI:
--     supabase db push
--   It is idempotent with respect to the helper (CREATE OR REPLACE).
--   Policy DROPs use DROP POLICY IF EXISTS for safety.
--
-- ROLLBACK NOTE
--   To roll back manually:
--     DROP POLICY IF EXISTS "Committee members update own vote" ON public.committee_votes;
--     DROP POLICY IF EXISTS "Committee members delete own vote" ON public.committee_votes;
--     DROP FUNCTION IF EXISTS public.can_vote_on_committee_paper(uuid, uuid);
--     DROP FUNCTION IF EXISTS public.get_committee_paper_tally(uuid);
--   The INSERT and SELECT policies added by center_walls.sql remain intact.
-- =============================================================================


-- ===========================================================================
-- SECTION 0: AGGREGATE TALLY RPC (privacy-safe, no individual votes exposed)
-- ===========================================================================
-- get_committee_paper_tally(_committee_paper_id)
--   Returns aggregate vote counts for a committee paper so that regular
--   committee members (who cannot see other members' individual rows under
--   the SELECT RLS policy) can still get an accurate tally.
--
--   SECURITY DEFINER bypasses committee_votes RLS — the guard
--   is_member_of_journal() ensures only members of the owning journal receive
--   real counts; anyone else gets an empty result set.
--
--   Returned columns:
--     approve_count         — votes with value 'approve'
--     approve_revisions_count — votes with value 'approve_with_revisions'
--     reject_count          — votes with value 'reject'
--     abstain_count         — votes with value 'abstain'
--     cast_count            — total vote rows (all four values combined)
--     member_count          — total committee members for this paper
--
--   This function MUST be applied to the live Supabase project (SQL Editor or
--   `supabase db push`) — it will not take effect until deployed.
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


-- ===========================================================================
-- SECTION 1: SECURITY-DEFINER HELPER FUNCTION
-- ===========================================================================

-- can_vote_on_committee_paper(_user_id, _committee_paper_id)
--   Returns true when ALL of the following hold:
--     a) The user is a member of the committee that owns this committee_paper.
--     b) The user is a member of the journal that owns that committee
--        (enforces the cross-center wall via is_member_of_journal).
--
--   Using SECURITY DEFINER avoids the RLS recursion that would occur if the
--   UPDATE/DELETE policies performed inline EXISTS joins across tables that
--   themselves have RLS enabled (the same pattern as can_view_paper_as_reviewer
--   in migration 20260619222300).
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


-- ===========================================================================
-- SECTION 2: committee_votes UPDATE POLICY
-- ===========================================================================

-- Committee members can UPDATE their own vote row.
-- Without this policy the upsert (ON CONFLICT DO UPDATE) would fail because
-- Postgres evaluates the UPDATE branch under RLS after the INSERT conflicts.
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


-- ===========================================================================
-- SECTION 3: committee_votes DELETE POLICY (optional, for completeness)
-- ===========================================================================

DROP POLICY IF EXISTS "Committee members delete own vote" ON public.committee_votes;

CREATE POLICY "Committee members delete own vote"
  ON public.committee_votes
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND public.can_vote_on_committee_paper(auth.uid(), committee_paper_id)
  );
