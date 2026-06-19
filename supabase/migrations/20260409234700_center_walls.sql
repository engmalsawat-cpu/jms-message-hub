-- =============================================================================
-- Migration: center_walls
-- Milestone: 2 — Center walls
--
-- PURPOSE
--   Restrict every center-tagged table so that authenticated users can only
--   read and write rows that belong to a journal (center) they are a member
--   of.  A user with the 'hq_admin' role bypasses all center walls and can
--   read/write across every center.
--
-- PREREQUISITE
--   Migration 20260409234600_add_hq_admin_role.sql MUST be applied first.
--   (It adds 'hq_admin' to the app_role enum in its own transaction.)
--
-- HOW TO GRANT hq_admin TO A USER
--   Run this in the Supabase SQL editor (replace <uuid> with the user's UUID):
--
--     INSERT INTO public.user_roles (user_id, role)
--     VALUES ('<uuid>', 'hq_admin')
--     ON CONFLICT DO NOTHING;
--
--   To find a user's UUID:
--     SELECT id, email FROM auth.users WHERE email = 'someone@example.com';
--
-- APPLYING THIS MIGRATION
--   Apply via the Supabase Dashboard → SQL Editor, or via the Supabase CLI:
--     supabase db push
--   It is idempotent with respect to the helper functions (CREATE OR REPLACE).
--   Policy DROPs use DROP POLICY IF EXISTS for safety.
--
-- ROLLBACK NOTE
--   To roll back manually, DROP the functions is_hq_admin and
--   is_member_of_journal, then re-create the original broad "viewable by
--   authenticated" / "viewable by members" policies from migration
--   20260409220300_*.sql and 20260409232709_*.sql.  The enum value
--   'hq_admin' cannot be removed from a Postgres enum once committed.
-- =============================================================================


-- ===========================================================================
-- SECTION 1: SECURITY-DEFINER HELPER FUNCTIONS
-- ===========================================================================

-- is_hq_admin(_user_id)
--   Returns true when the user holds the 'hq_admin' role.
--   Used as a fast bypass check inside is_member_of_journal.
CREATE OR REPLACE FUNCTION public.is_hq_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'hq_admin'
  )
$$;

-- is_member_of_journal(_user_id, _journal_id)
--   Returns true when the user is an hq_admin (bypasses all center walls) OR
--   has at least one entry in journal_members for the given journal.
--   All center-wall RLS policies call this single function, which keeps
--   policy text short and the bypass logic in one place.
CREATE OR REPLACE FUNCTION public.is_member_of_journal(_user_id uuid, _journal_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_hq_admin(_user_id)
      OR EXISTS (
           SELECT 1
           FROM public.journal_members jm
           WHERE jm.user_id   = _user_id
             AND jm.journal_id = _journal_id
         )
$$;


-- ===========================================================================
-- SECTION 2: BACKFILL journal_members (idempotent)
-- ===========================================================================
-- Ensures no authenticated user who already has data in the system is locked
-- out after the center walls go up.  All inserts use ON CONFLICT DO NOTHING
-- against the UNIQUE(journal_id, user_id, role) constraint.
--
-- Default role used for backfill sources that carry no explicit role: 'researcher'.
-- This is the least-privileged non-management role and is a valid app_role value.

-- 2a. Authors who submitted papers → researcher in that journal
INSERT INTO public.journal_members (journal_id, user_id, role)
SELECT DISTINCT p.journal_id, p.submitted_by, 'researcher'::public.app_role
FROM public.papers p
WHERE p.submitted_by IS NOT NULL
ON CONFLICT (journal_id, user_id, role) DO NOTHING;

-- 2b. Users who appear in paper_roles → researcher in the paper's journal
INSERT INTO public.journal_members (journal_id, user_id, role)
SELECT DISTINCT p.journal_id, pr.user_id, 'researcher'::public.app_role
FROM public.paper_roles pr
JOIN public.papers p ON p.id = pr.paper_id
WHERE pr.user_id IS NOT NULL
ON CONFLICT (journal_id, user_id, role) DO NOTHING;

-- 2c. Committee members → committee_member role in the committee's journal
INSERT INTO public.journal_members (journal_id, user_id, role)
SELECT DISTINCT c.journal_id, cm.user_id, 'committee_member'::public.app_role
FROM public.committee_members cm
JOIN public.committees c ON c.id = cm.committee_id
WHERE cm.user_id IS NOT NULL
ON CONFLICT (journal_id, user_id, role) DO NOTHING;

-- 2d. Reviewers from review_requests → reviewer role in the paper's journal
INSERT INTO public.journal_members (journal_id, user_id, role)
SELECT DISTINCT p.journal_id, rr.reviewer_id, 'reviewer'::public.app_role
FROM public.review_requests rr
JOIN public.papers p ON p.id = rr.paper_id
WHERE rr.reviewer_id IS NOT NULL
ON CONFLICT (journal_id, user_id, role) DO NOTHING;

-- 2e. Users who requested reviews (editors) → managing_editor in the paper's journal
INSERT INTO public.journal_members (journal_id, user_id, role)
SELECT DISTINCT p.journal_id, rr.requested_by, 'managing_editor'::public.app_role
FROM public.review_requests rr
JOIN public.papers p ON p.id = rr.paper_id
WHERE rr.requested_by IS NOT NULL
ON CONFLICT (journal_id, user_id, role) DO NOTHING;


-- ===========================================================================
-- SECTION 3: DIRECTLY CENTER-TAGGED TABLES
--            (tables that have their own journal_id column)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 3.1  journals
-- ---------------------------------------------------------------------------
-- OLD: "Journals viewable by authenticated"  → any authenticated user sees all
-- NEW: only members of that journal (or hq_admin) can SELECT it

DROP POLICY IF EXISTS "Journals viewable by authenticated" ON public.journals;
-- Keep management policy; rewrite to include hq_admin bypass
DROP POLICY IF EXISTS "Admins can manage journals"         ON public.journals;

-- SELECT: membership or hq_admin
CREATE POLICY "Journals viewable by members"
  ON public.journals
  FOR SELECT
  TO authenticated
  USING (public.is_member_of_journal(auth.uid(), id));

-- ALL (INSERT/UPDATE/DELETE): must be admin or editor_in_chief AND a member
-- hq_admin is folded in via is_member_of_journal; the existing role check
-- keeps write access restricted to management roles even for hq_admin.
CREATE POLICY "Admins/hq can manage journals"
  ON public.journals
  FOR ALL
  TO authenticated
  USING (
    public.is_member_of_journal(auth.uid(), id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  )
  WITH CHECK (
    public.is_member_of_journal(auth.uid(), id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  );


-- ---------------------------------------------------------------------------
-- 3.2  journal_members
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view journal members"  ON public.journal_members;
DROP POLICY IF EXISTS "Admins/editors manage members"     ON public.journal_members;

CREATE POLICY "Journal members viewable by members"
  ON public.journal_members
  FOR SELECT
  TO authenticated
  USING (public.is_member_of_journal(auth.uid(), journal_id));

CREATE POLICY "Admins/hq manage journal members"
  ON public.journal_members
  FOR ALL
  TO authenticated
  USING (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  )
  WITH CHECK (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  );


-- ---------------------------------------------------------------------------
-- 3.3  workflow_stages
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Stages viewable by authenticated"  ON public.workflow_stages;
DROP POLICY IF EXISTS "Admins/editors manage stages"      ON public.workflow_stages;

CREATE POLICY "Stages viewable by members"
  ON public.workflow_stages
  FOR SELECT
  TO authenticated
  USING (public.is_member_of_journal(auth.uid(), journal_id));

CREATE POLICY "Admins/hq manage stages"
  ON public.workflow_stages
  FOR ALL
  TO authenticated
  USING (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  )
  WITH CHECK (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  );


-- ---------------------------------------------------------------------------
-- 3.4  papers
-- ---------------------------------------------------------------------------
-- Existing policies to remove (all SELECT/INSERT/UPDATE policies):
DROP POLICY IF EXISTS "Authors can view own papers"            ON public.papers;
DROP POLICY IF EXISTS "Editors can view all papers"           ON public.papers;
DROP POLICY IF EXISTS "Authors can create papers"              ON public.papers;
DROP POLICY IF EXISTS "Authors can update own draft papers"    ON public.papers;
DROP POLICY IF EXISTS "Editors can update papers"              ON public.papers;
DROP POLICY IF EXISTS "Reviewers can view assigned papers"     ON public.papers;

-- SELECT: member of journal OR author of paper OR assigned reviewer
--   (preserves Milestone-1 author access and reviewer-sees-assigned)
CREATE POLICY "Papers viewable by journal members"
  ON public.papers
  FOR SELECT
  TO authenticated
  USING (
    public.is_member_of_journal(auth.uid(), journal_id)
    OR auth.uid() = submitted_by
    OR EXISTS (
         SELECT 1 FROM public.review_requests rr
         WHERE rr.paper_id    = papers.id
           AND rr.reviewer_id = auth.uid()
           AND rr.status IN ('pending', 'accepted', 'completed')
       )
  );

-- INSERT: author submits their own paper to a journal they belong to
CREATE POLICY "Authors create papers in own journals"
  ON public.papers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = submitted_by
    AND public.is_member_of_journal(auth.uid(), journal_id)
  );

-- UPDATE by author (own draft only) — must belong to same journal
CREATE POLICY "Authors update own draft papers"
  ON public.papers
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = submitted_by
    AND status = 'draft'
    AND public.is_member_of_journal(auth.uid(), journal_id)
  )
  WITH CHECK (
    auth.uid() = submitted_by
    AND public.is_member_of_journal(auth.uid(), journal_id)
  );

-- UPDATE by editors — must be member of same journal
CREATE POLICY "Editors update papers in own journals"
  ON public.papers
  FOR UPDATE
  TO authenticated
  USING (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor', 'hq_admin']::public.app_role[])
  )
  WITH CHECK (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor', 'hq_admin']::public.app_role[])
  );


-- ---------------------------------------------------------------------------
-- 3.5  committees
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Committees viewable by authenticated" ON public.committees;
DROP POLICY IF EXISTS "Admins/editors manage committees"     ON public.committees;

CREATE POLICY "Committees viewable by members"
  ON public.committees
  FOR SELECT
  TO authenticated
  USING (public.is_member_of_journal(auth.uid(), journal_id));

CREATE POLICY "Admins/hq manage committees"
  ON public.committees
  FOR ALL
  TO authenticated
  USING (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  )
  WITH CHECK (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  );


-- ---------------------------------------------------------------------------
-- 3.6  financial_records
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins/editors can view financials" ON public.financial_records;
DROP POLICY IF EXISTS "Admins can manage financials"       ON public.financial_records;

CREATE POLICY "Financials viewable by journal admins"
  ON public.financial_records
  FOR SELECT
  TO authenticated
  USING (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  );

CREATE POLICY "Admins/hq manage financials"
  ON public.financial_records
  FOR ALL
  TO authenticated
  USING (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'hq_admin']::public.app_role[])
  )
  WITH CHECK (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'hq_admin']::public.app_role[])
  );


-- ---------------------------------------------------------------------------
-- 3.7  submission_windows
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Submission windows viewable by all"  ON public.submission_windows;
DROP POLICY IF EXISTS "Admins/editors manage windows"       ON public.submission_windows;

CREATE POLICY "Submission windows viewable by members"
  ON public.submission_windows
  FOR SELECT
  TO authenticated
  USING (public.is_member_of_journal(auth.uid(), journal_id));

CREATE POLICY "Admins/hq manage submission windows"
  ON public.submission_windows
  FOR ALL
  TO authenticated
  USING (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  )
  WITH CHECK (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  );


-- ---------------------------------------------------------------------------
-- 3.8  blacklist
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins/editors can view blacklist"   ON public.blacklist;
DROP POLICY IF EXISTS "Admins/editors can manage blacklist" ON public.blacklist;

CREATE POLICY "Blacklist viewable by journal admins"
  ON public.blacklist
  FOR SELECT
  TO authenticated
  USING (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  );

CREATE POLICY "Admins/hq manage blacklist"
  ON public.blacklist
  FOR ALL
  TO authenticated
  USING (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  )
  WITH CHECK (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  );


-- ---------------------------------------------------------------------------
-- 3.9  evaluation_criteria
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Criteria viewable by authenticated"  ON public.evaluation_criteria;
DROP POLICY IF EXISTS "Admins/editors manage criteria"      ON public.evaluation_criteria;

CREATE POLICY "Criteria viewable by members"
  ON public.evaluation_criteria
  FOR SELECT
  TO authenticated
  USING (public.is_member_of_journal(auth.uid(), journal_id));

CREATE POLICY "Admins/hq manage criteria"
  ON public.evaluation_criteria
  FOR ALL
  TO authenticated
  USING (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  )
  WITH CHECK (
    public.is_member_of_journal(auth.uid(), journal_id)
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  );


-- ===========================================================================
-- SECTION 4: CHILD TABLES (scoped via parent's journal_id)
-- ===========================================================================
-- Strategy: each child table gets a new membership SELECT policy that joins
-- through the parent chain to papers.journal_id (or committees.journal_id).
-- Existing narrower per-user policies (author, reviewer, voter) are PRESERVED
-- by OR-ing them into the new SELECT policy.
-- Write policies (INSERT/UPDATE/DELETE) that were role-only are updated to
-- also require membership in the target journal.

-- ---------------------------------------------------------------------------
-- 4.1  paper_roles
--        paper_roles → papers.journal_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Paper roles viewable by participants" ON public.paper_roles;
DROP POLICY IF EXISTS "Editors manage paper roles"           ON public.paper_roles;

-- SELECT: own role row OR member of that paper's journal
CREATE POLICY "Paper roles viewable by participants or members"
  ON public.paper_roles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
         SELECT 1 FROM public.papers p
         WHERE p.id = paper_roles.paper_id
           AND public.is_member_of_journal(auth.uid(), p.journal_id)
       )
  );

-- ALL write: must be editor-class AND member of the paper's journal
CREATE POLICY "Editors manage paper roles in own journals"
  ON public.paper_roles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.papers p
      WHERE p.id = paper_roles.paper_id
        AND public.is_member_of_journal(auth.uid(), p.journal_id)
    )
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor', 'hq_admin']::public.app_role[])
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.papers p
      WHERE p.id = paper_roles.paper_id
        AND public.is_member_of_journal(auth.uid(), p.journal_id)
    )
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor', 'hq_admin']::public.app_role[])
  );


-- ---------------------------------------------------------------------------
-- 4.2  paper_stage_history
--        paper_stage_history → papers.journal_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "History viewable by paper author" ON public.paper_stage_history;
DROP POLICY IF EXISTS "Editors can insert history"       ON public.paper_stage_history;

-- SELECT: own paper's history OR editor/member of journal
CREATE POLICY "History viewable by author or journal members"
  ON public.paper_stage_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.papers p
      WHERE p.id = paper_stage_history.paper_id
        AND (
          p.submitted_by = auth.uid()
          OR public.is_member_of_journal(auth.uid(), p.journal_id)
        )
    )
  );

-- INSERT: editor-class AND member of paper's journal
CREATE POLICY "Editors insert history in own journals"
  ON public.paper_stage_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.papers p
      WHERE p.id = paper_stage_history.paper_id
        AND public.is_member_of_journal(auth.uid(), p.journal_id)
    )
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor', 'hq_admin']::public.app_role[])
  );


-- ---------------------------------------------------------------------------
-- 4.3  committee_members
--        committee_members → committees.journal_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Committee members viewable"                    ON public.committee_members;
DROP POLICY IF EXISTS "Admins/editors manage committee members"       ON public.committee_members;

-- SELECT: member of committee's journal OR the user themselves
CREATE POLICY "Committee members viewable by journal members"
  ON public.committee_members
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
         SELECT 1 FROM public.committees c
         WHERE c.id = committee_members.committee_id
           AND public.is_member_of_journal(auth.uid(), c.journal_id)
       )
  );

-- ALL write: admin/editor AND member of that journal
CREATE POLICY "Admins/hq manage committee members in own journals"
  ON public.committee_members
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.committees c
      WHERE c.id = committee_members.committee_id
        AND public.is_member_of_journal(auth.uid(), c.journal_id)
    )
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.committees c
      WHERE c.id = committee_members.committee_id
        AND public.is_member_of_journal(auth.uid(), c.journal_id)
    )
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
  );


-- ---------------------------------------------------------------------------
-- 4.4  committee_papers
--        committee_papers → committees.journal_id  (via committee_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Committee papers viewable by members" ON public.committee_papers;
DROP POLICY IF EXISTS "Editors manage committee papers"      ON public.committee_papers;

-- SELECT: committee member of that committee OR member of journal
CREATE POLICY "Committee papers viewable by committee or journal members"
  ON public.committee_papers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.committee_members cm
      WHERE cm.committee_id = committee_papers.committee_id
        AND cm.user_id = auth.uid()
    )
    OR EXISTS (
         SELECT 1 FROM public.committees c
         WHERE c.id = committee_papers.committee_id
           AND public.is_member_of_journal(auth.uid(), c.journal_id)
       )
  );

-- ALL write: editor-class AND member of that committee's journal
CREATE POLICY "Editors manage committee papers in own journals"
  ON public.committee_papers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.committees c
      WHERE c.id = committee_papers.committee_id
        AND public.is_member_of_journal(auth.uid(), c.journal_id)
    )
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor', 'hq_admin']::public.app_role[])
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.committees c
      WHERE c.id = committee_papers.committee_id
        AND public.is_member_of_journal(auth.uid(), c.journal_id)
    )
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor', 'hq_admin']::public.app_role[])
  );


-- ---------------------------------------------------------------------------
-- 4.5  committee_votes
--        committee_votes → committee_papers → committees.journal_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Voters can view own votes"    ON public.committee_votes;
DROP POLICY IF EXISTS "Committee members can vote"   ON public.committee_votes;

-- SELECT: own vote OR admin/editor in same journal
--   Chain: committee_votes → committee_papers → committees → journal_id
CREATE POLICY "Voters view own votes or journal admins view all"
  ON public.committee_votes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
         SELECT 1
         FROM public.committee_papers cp
         JOIN public.committees c ON c.id = cp.committee_id
         WHERE cp.id = committee_votes.committee_paper_id
           AND public.is_member_of_journal(auth.uid(), c.journal_id)
           AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'hq_admin']::public.app_role[])
       )
  );

-- INSERT: committee member casting their own vote for a paper in their journal
CREATE POLICY "Committee members vote in own journals"
  ON public.committee_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
          SELECT 1
          FROM public.committee_papers cp
          JOIN public.committee_members cm ON cm.committee_id = cp.committee_id
          JOIN public.committees c ON c.id = cp.committee_id
          WHERE cp.id = committee_votes.committee_paper_id
            AND cm.user_id = auth.uid()
            AND public.is_member_of_journal(auth.uid(), c.journal_id)
        )
  );


-- ---------------------------------------------------------------------------
-- 4.6  threads
--        threads → papers.journal_id  (via paper_id; paper_id may be NULL)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Participants can view threads"    ON public.threads;
DROP POLICY IF EXISTS "Authenticated can create threads" ON public.threads;

-- SELECT: participant OR (paper exists AND member of that journal)
--   For threads with no paper (paper_id IS NULL), participants array is the gate.
CREATE POLICY "Thread participants or journal members can view"
  ON public.threads
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = ANY(participants)
    OR (
      paper_id IS NOT NULL
      AND EXISTS (
            SELECT 1 FROM public.papers p
            WHERE p.id = threads.paper_id
              AND public.is_member_of_journal(auth.uid(), p.journal_id)
          )
    )
  );

-- INSERT: must be listed as participant; if paper-attached, must be member of that journal
CREATE POLICY "Members create threads in own journals"
  ON public.threads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = ANY(participants)
    AND (
      paper_id IS NULL
      OR EXISTS (
           SELECT 1 FROM public.papers p
           WHERE p.id = threads.paper_id
             AND public.is_member_of_journal(auth.uid(), p.journal_id)
         )
    )
  );


-- ---------------------------------------------------------------------------
-- 4.7  messages
--        messages → threads → papers.journal_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Thread participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Thread participants can send messages" ON public.messages;

-- SELECT: participant in thread OR journal member (via thread → paper → journal)
CREATE POLICY "Thread participants or journal members view messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.threads t
      WHERE t.id = messages.thread_id
        AND (
          auth.uid() = ANY(t.participants)
          OR (
            t.paper_id IS NOT NULL
            AND EXISTS (
                  SELECT 1 FROM public.papers p
                  WHERE p.id = t.paper_id
                    AND public.is_member_of_journal(auth.uid(), p.journal_id)
                )
          )
        )
    )
  );

-- INSERT: sender must be thread participant AND (thread unlinked OR member of journal)
CREATE POLICY "Thread participants send messages in own journals"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
          SELECT 1 FROM public.threads t
          WHERE t.id = messages.thread_id
            AND auth.uid() = ANY(t.participants)
            AND (
              t.paper_id IS NULL
              OR EXISTS (
                   SELECT 1 FROM public.papers p
                   WHERE p.id = t.paper_id
                     AND public.is_member_of_journal(auth.uid(), p.journal_id)
                 )
            )
        )
  );


-- ---------------------------------------------------------------------------
-- 4.8  review_requests
--        review_requests → papers.journal_id  (via paper_id)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Editors manage review requests" ON public.review_requests;
DROP POLICY IF EXISTS "Reviewers view own requests"    ON public.review_requests;
DROP POLICY IF EXISTS "Reviewers update own requests"  ON public.review_requests;

-- SELECT: own reviewer row OR editor-class member of paper's journal
CREATE POLICY "Reviewers or journal editors view review requests"
  ON public.review_requests
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = reviewer_id
    OR EXISTS (
         SELECT 1 FROM public.papers p
         WHERE p.id = review_requests.paper_id
           AND public.is_member_of_journal(auth.uid(), p.journal_id)
           AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor', 'hq_admin']::public.app_role[])
       )
  );

-- UPDATE: reviewer updates own row OR editor-class member of journal
CREATE POLICY "Reviewers update own or editors update in journal"
  ON public.review_requests
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = reviewer_id
    OR (
      EXISTS (
        SELECT 1 FROM public.papers p
        WHERE p.id = review_requests.paper_id
          AND public.is_member_of_journal(auth.uid(), p.journal_id)
      )
      AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor', 'hq_admin']::public.app_role[])
    )
  )
  WITH CHECK (
    auth.uid() = reviewer_id
    OR (
      EXISTS (
        SELECT 1 FROM public.papers p
        WHERE p.id = review_requests.paper_id
          AND public.is_member_of_journal(auth.uid(), p.journal_id)
      )
      AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor', 'hq_admin']::public.app_role[])
    )
  );

-- INSERT/DELETE: editor-class AND member of paper's journal
CREATE POLICY "Editors manage review requests in own journals"
  ON public.review_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.papers p
      WHERE p.id = review_requests.paper_id
        AND public.is_member_of_journal(auth.uid(), p.journal_id)
    )
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor', 'hq_admin']::public.app_role[])
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.papers p
      WHERE p.id = review_requests.paper_id
        AND public.is_member_of_journal(auth.uid(), p.journal_id)
    )
    AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor', 'hq_admin']::public.app_role[])
  );


-- ---------------------------------------------------------------------------
-- 4.9  review_reports
--        review_reports → papers.journal_id  (via paper_id directly on the table)
--        Also links via review_request_id → review_requests → papers
--        We use the direct paper_id column for efficiency.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Reviewers manage own reports"        ON public.review_reports;
DROP POLICY IF EXISTS "Editors view all reports"            ON public.review_reports;
DROP POLICY IF EXISTS "Authors view reports for own papers" ON public.review_reports;

-- SELECT: own reviewer row OR editor-class member OR author of submitted report
CREATE POLICY "Review reports viewable by reviewer, editors, or paper author"
  ON public.review_reports
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = reviewer_id
    OR EXISTS (
         SELECT 1 FROM public.papers p
         WHERE p.id = review_reports.paper_id
           AND public.is_member_of_journal(auth.uid(), p.journal_id)
           AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor', 'hq_admin']::public.app_role[])
       )
    OR (
      is_submitted = true
      AND EXISTS (
            SELECT 1 FROM public.papers p
            WHERE p.id = review_reports.paper_id
              AND p.submitted_by = auth.uid()
          )
    )
  );

-- ALL write (INSERT/UPDATE/DELETE): reviewer owns their own report, within their journal
CREATE POLICY "Reviewers manage own reports in assigned journals"
  ON public.review_reports
  FOR ALL
  TO authenticated
  USING (
    auth.uid() = reviewer_id
    AND EXISTS (
          SELECT 1 FROM public.papers p
          WHERE p.id = review_reports.paper_id
            AND public.is_member_of_journal(auth.uid(), p.journal_id)
        )
  )
  WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
          SELECT 1 FROM public.papers p
          WHERE p.id = review_reports.paper_id
            AND public.is_member_of_journal(auth.uid(), p.journal_id)
        )
  );


-- ---------------------------------------------------------------------------
-- 4.10  criteria_scores
--         criteria_scores → review_reports → papers.journal_id
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Reviewers manage own scores"         ON public.criteria_scores;
DROP POLICY IF EXISTS "Editors view all scores"             ON public.criteria_scores;
DROP POLICY IF EXISTS "Authors view scores for own papers"  ON public.criteria_scores;

-- SELECT: own score (via own review_report) OR editor-class member OR author of paper
CREATE POLICY "Criteria scores viewable by reviewer, editors, or paper author"
  ON public.criteria_scores
  FOR SELECT
  TO authenticated
  USING (
    -- Reviewer sees their own scores
    EXISTS (
      SELECT 1 FROM public.review_reports rr
      WHERE rr.id = criteria_scores.review_report_id
        AND rr.reviewer_id = auth.uid()
    )
    -- Editor-class sees all scores within their journal
    OR EXISTS (
         SELECT 1
         FROM public.review_reports rr
         JOIN public.papers p ON p.id = rr.paper_id
         WHERE rr.id = criteria_scores.review_report_id
           AND public.is_member_of_journal(auth.uid(), p.journal_id)
           AND public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor', 'hq_admin']::public.app_role[])
       )
    -- Author sees scores for their submitted papers
    OR EXISTS (
         SELECT 1
         FROM public.review_reports rr
         JOIN public.papers p ON p.id = rr.paper_id
         WHERE rr.id = criteria_scores.review_report_id
           AND rr.is_submitted = true
           AND p.submitted_by = auth.uid()
       )
  );

-- ALL write: reviewer owns their scores AND must be member of the paper's journal
CREATE POLICY "Reviewers manage own scores in assigned journals"
  ON public.criteria_scores
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.review_reports rr
      JOIN public.papers p ON p.id = rr.paper_id
      WHERE rr.id = criteria_scores.review_report_id
        AND rr.reviewer_id = auth.uid()
        AND public.is_member_of_journal(auth.uid(), p.journal_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.review_reports rr
      JOIN public.papers p ON p.id = rr.paper_id
      WHERE rr.id = criteria_scores.review_report_id
        AND rr.reviewer_id = auth.uid()
        AND public.is_member_of_journal(auth.uid(), p.journal_id)
    )
  );


-- ===========================================================================
-- SECTION 5: NOTIFICATIONS — NO CHANGE
-- ===========================================================================
-- notifications is per-user only (user_id = auth.uid()) and is NOT
-- center-tagged.  The existing policies "Users can view own notifications"
-- and "Users can update own notifications" remain untouched.


-- ===========================================================================
-- SECTION 6: user_roles — extend SELECT to hq_admin users
-- ===========================================================================
-- hq_admin users need to read user_roles to function correctly (the
-- is_hq_admin function is SECURITY DEFINER so it bypasses RLS internally,
-- but UI queries from the hq_admin session still need SELECT access).
-- The existing "Admins can view all roles" policy covers 'admin'.
-- We add a parallel policy for hq_admin without removing the existing ones.

CREATE POLICY "HQ admins can view all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.is_hq_admin(auth.uid()));

CREATE POLICY "HQ admins can manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.is_hq_admin(auth.uid()))
  WITH CHECK (public.is_hq_admin(auth.uid()));
