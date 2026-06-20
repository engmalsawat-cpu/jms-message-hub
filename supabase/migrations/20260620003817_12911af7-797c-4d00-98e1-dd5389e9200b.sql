
DO $$ BEGIN
  CREATE TYPE public.author_decision_type AS ENUM ('accept','minor_revision','major_revision','reject');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.author_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id uuid NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  prepared_by uuid NOT NULL,
  decision public.author_decision_type NOT NULL,
  unified_message text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.author_decisions TO authenticated;
GRANT ALL ON public.author_decisions TO service_role;

ALTER TABLE public.author_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read author_decisions: journal members or author"
  ON public.author_decisions FOR SELECT TO authenticated
  USING (
    public.is_member_of_journal(
      auth.uid(),
      (SELECT p.journal_id FROM public.papers p WHERE p.id = paper_id)
    )
    OR EXISTS (SELECT 1 FROM public.papers p WHERE p.id = paper_id AND p.submitted_by = auth.uid())
  );

CREATE POLICY "Insert author_decisions: journal members only"
  ON public.author_decisions FOR INSERT TO authenticated
  WITH CHECK (
    prepared_by = auth.uid()
    AND public.is_member_of_journal(
      auth.uid(),
      (SELECT p.journal_id FROM public.papers p WHERE p.id = paper_id)
    )
  );

CREATE INDEX IF NOT EXISTS author_decisions_paper_id_idx ON public.author_decisions(paper_id);
