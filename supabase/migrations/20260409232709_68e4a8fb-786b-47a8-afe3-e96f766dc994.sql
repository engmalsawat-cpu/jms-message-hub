
-- Review request statuses
CREATE TYPE public.review_request_status AS ENUM ('pending', 'accepted', 'declined', 'completed', 'cancelled', 'expired');

-- Review recommendations
CREATE TYPE public.review_recommendation AS ENUM ('accept', 'minor_revision', 'major_revision', 'reject');

-- Review requests table
CREATE TABLE public.review_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  requested_by UUID NOT NULL,
  status review_request_status NOT NULL DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  response_notes TEXT,
  responded_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.review_requests ENABLE ROW LEVEL SECURITY;

-- Editors can manage review requests
CREATE POLICY "Editors manage review requests" ON public.review_requests
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor_in_chief'::app_role, 'managing_editor'::app_role]));

-- Reviewers can view their own requests
CREATE POLICY "Reviewers view own requests" ON public.review_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = reviewer_id);

-- Reviewers can update their own pending requests (accept/decline)
CREATE POLICY "Reviewers update own requests" ON public.review_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = reviewer_id);

-- Evaluation criteria per journal
CREATE TABLE public.evaluation_criteria (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  weight NUMERIC NOT NULL DEFAULT 1,
  max_score INTEGER NOT NULL DEFAULT 10,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.evaluation_criteria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Criteria viewable by authenticated" ON public.evaluation_criteria
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/editors manage criteria" ON public.evaluation_criteria
  FOR ALL TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor_in_chief'::app_role]));

-- Review reports
CREATE TABLE public.review_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_request_id UUID NOT NULL REFERENCES public.review_requests(id) ON DELETE CASCADE,
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  recommendation review_recommendation,
  general_comments TEXT,
  confidential_comments TEXT,
  is_submitted BOOLEAN NOT NULL DEFAULT false,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

-- Reviewers manage their own reports
CREATE POLICY "Reviewers manage own reports" ON public.review_reports
  FOR ALL TO authenticated
  USING (auth.uid() = reviewer_id)
  WITH CHECK (auth.uid() = reviewer_id);

-- Editors can view all reports
CREATE POLICY "Editors view all reports" ON public.review_reports
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor_in_chief'::app_role, 'managing_editor'::app_role]));

-- Authors can view submitted reports for their papers (without confidential comments - handled in app)
CREATE POLICY "Authors view reports for own papers" ON public.review_reports
  FOR SELECT TO authenticated
  USING (
    is_submitted = true
    AND EXISTS (
      SELECT 1 FROM papers WHERE papers.id = review_reports.paper_id AND papers.submitted_by = auth.uid()
    )
  );

-- Criteria scores per report
CREATE TABLE public.criteria_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  review_report_id UUID NOT NULL REFERENCES public.review_reports(id) ON DELETE CASCADE,
  criteria_id UUID NOT NULL REFERENCES public.evaluation_criteria(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.criteria_scores ENABLE ROW LEVEL SECURITY;

-- Reviewers manage their own scores
CREATE POLICY "Reviewers manage own scores" ON public.criteria_scores
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM review_reports WHERE review_reports.id = criteria_scores.review_report_id AND review_reports.reviewer_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM review_reports WHERE review_reports.id = criteria_scores.review_report_id AND review_reports.reviewer_id = auth.uid())
  );

-- Editors can view all scores
CREATE POLICY "Editors view all scores" ON public.criteria_scores
  FOR SELECT TO authenticated
  USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor_in_chief'::app_role, 'managing_editor'::app_role]));

-- Authors can view scores for submitted reports on their papers
CREATE POLICY "Authors view scores for own papers" ON public.criteria_scores
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM review_reports rr
      JOIN papers p ON p.id = rr.paper_id
      WHERE rr.id = criteria_scores.review_report_id
        AND rr.is_submitted = true
        AND p.submitted_by = auth.uid()
    )
  );

-- Triggers
CREATE TRIGGER update_review_requests_updated_at BEFORE UPDATE ON public.review_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_evaluation_criteria_updated_at BEFORE UPDATE ON public.evaluation_criteria FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_review_reports_updated_at BEFORE UPDATE ON public.review_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
