
-- Create enum for app roles
CREATE TYPE public.app_role AS ENUM (
  'admin',
  'editor_in_chief',
  'managing_editor',
  'reviewer',
  'researcher',
  'committee_member'
);

-- Create enum for paper status
CREATE TYPE public.paper_status AS ENUM (
  'draft',
  'submitted',
  'under_review',
  'revision_required',
  'revised',
  'accepted',
  'rejected',
  'published',
  'withdrawn'
);

-- Create enum for journal status
CREATE TYPE public.journal_status AS ENUM (
  'active',
  'inactive',
  'archived'
);

-- Timestamp update function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ===== PROFILES =====
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  preferred_language TEXT NOT NULL DEFAULT 'ar',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== USER ROLES =====
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ===== JOURNALS =====
CREATE TABLE public.journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  issn TEXT,
  status journal_status NOT NULL DEFAULT 'active',
  settings JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Journals viewable by authenticated" ON public.journals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage journals" ON public.journals FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief']::app_role[]));

CREATE TRIGGER update_journals_updated_at BEFORE UPDATE ON public.journals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== JOURNAL MEMBERS =====
CREATE TABLE public.journal_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(journal_id, user_id, role)
);

ALTER TABLE public.journal_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view journal members" ON public.journal_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/editors manage members" ON public.journal_members FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief']::app_role[]));

-- ===== WORKFLOW STAGES =====
CREATE TABLE public.workflow_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  stage_order INT NOT NULL DEFAULT 0,
  stage_type TEXT NOT NULL DEFAULT 'review',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workflow_stages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stages viewable by authenticated" ON public.workflow_stages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/editors manage stages" ON public.workflow_stages FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief']::app_role[]));

CREATE TRIGGER update_workflow_stages_updated_at BEFORE UPDATE ON public.workflow_stages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== PAPERS =====
CREATE TABLE public.papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES auth.users(id),
  title_ar TEXT,
  title_en TEXT,
  abstract_ar TEXT,
  abstract_en TEXT,
  keywords TEXT[],
  current_stage_id UUID REFERENCES public.workflow_stages(id),
  status paper_status NOT NULL DEFAULT 'draft',
  file_url TEXT,
  metadata JSONB DEFAULT '{}',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can view own papers" ON public.papers FOR SELECT TO authenticated
  USING (auth.uid() = submitted_by);
CREATE POLICY "Editors can view all papers" ON public.papers FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor']::app_role[]));
CREATE POLICY "Authors can create papers" ON public.papers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = submitted_by);
CREATE POLICY "Authors can update own draft papers" ON public.papers FOR UPDATE TO authenticated
  USING (auth.uid() = submitted_by AND status = 'draft');
CREATE POLICY "Editors can update papers" ON public.papers FOR UPDATE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor']::app_role[]));

CREATE TRIGGER update_papers_updated_at BEFORE UPDATE ON public.papers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== PAPER ROLES =====
CREATE TABLE public.paper_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(paper_id, user_id, role)
);

ALTER TABLE public.paper_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Paper roles viewable by participants" ON public.paper_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor']::app_role[]));
CREATE POLICY "Editors manage paper roles" ON public.paper_roles FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor']::app_role[]));

-- ===== PAPER STAGE HISTORY =====
CREATE TABLE public.paper_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  stage_id UUID REFERENCES public.workflow_stages(id),
  action TEXT NOT NULL,
  performed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.paper_stage_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "History viewable by paper author" ON public.paper_stage_history FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.papers WHERE papers.id = paper_id AND papers.submitted_by = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor']::app_role[])
  );
CREATE POLICY "Editors can insert history" ON public.paper_stage_history FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor']::app_role[]));

-- ===== COMMITTEES =====
CREATE TABLE public.committees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  committee_type TEXT NOT NULL DEFAULT 'review',
  voting_mechanism TEXT NOT NULL DEFAULT 'majority',
  min_votes INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Committees viewable by authenticated" ON public.committees FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/editors manage committees" ON public.committees FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief']::app_role[]));

CREATE TRIGGER update_committees_updated_at BEFORE UPDATE ON public.committees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== COMMITTEE MEMBERS =====
CREATE TABLE public.committee_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_head BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(committee_id, user_id)
);

ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Committee members viewable" ON public.committee_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/editors manage committee members" ON public.committee_members FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief']::app_role[]));

-- ===== COMMITTEE PAPERS =====
CREATE TABLE public.committee_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id UUID NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  paper_id UUID NOT NULL REFERENCES public.papers(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  decision TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(committee_id, paper_id)
);

ALTER TABLE public.committee_papers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Committee papers viewable by members" ON public.committee_papers FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.committee_members WHERE committee_members.committee_id = committee_papers.committee_id AND committee_members.user_id = auth.uid())
    OR public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor']::app_role[])
  );
CREATE POLICY "Editors manage committee papers" ON public.committee_papers FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor']::app_role[]));

CREATE TRIGGER update_committee_papers_updated_at BEFORE UPDATE ON public.committee_papers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== COMMITTEE VOTES =====
CREATE TABLE public.committee_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_paper_id UUID NOT NULL REFERENCES public.committee_papers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vote TEXT NOT NULL,
  justification TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(committee_paper_id, user_id)
);

ALTER TABLE public.committee_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Voters can view own votes" ON public.committee_votes FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief']::app_role[]));
CREATE POLICY "Committee members can vote" ON public.committee_votes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.committee_papers cp
      JOIN public.committee_members cm ON cm.committee_id = cp.committee_id
      WHERE cp.id = committee_paper_id AND cm.user_id = auth.uid()
    )
  );

-- ===== THREADS =====
CREATE TABLE public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paper_id UUID REFERENCES public.papers(id) ON DELETE CASCADE,
  thread_type TEXT NOT NULL DEFAULT 'general',
  subject TEXT,
  participants UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view threads" ON public.threads FOR SELECT TO authenticated
  USING (auth.uid() = ANY(participants) OR public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief']::app_role[]));
CREATE POLICY "Authenticated can create threads" ON public.threads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = ANY(participants));

CREATE TRIGGER update_threads_updated_at BEFORE UPDATE ON public.threads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== MESSAGES =====
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id),
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Thread participants can view messages" ON public.messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.threads WHERE threads.id = thread_id AND auth.uid() = ANY(threads.participants))
    OR public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief']::app_role[])
  );
CREATE POLICY "Thread participants can send messages" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (SELECT 1 FROM public.threads WHERE threads.id = thread_id AND auth.uid() = ANY(threads.participants))
  );

-- ===== NOTIFICATIONS =====
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title_ar TEXT,
  title_en TEXT,
  body_ar TEXT,
  body_en TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- ===== FINANCIAL RECORDS =====
CREATE TABLE public.financial_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  paper_id UUID REFERENCES public.papers(id),
  record_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/editors can view financials" ON public.financial_records FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief']::app_role[]));
CREATE POLICY "Admins can manage financials" ON public.financial_records FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_financial_records_updated_at BEFORE UPDATE ON public.financial_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== SUBMISSION WINDOWS =====
CREATE TABLE public.submission_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  opens_at TIMESTAMPTZ NOT NULL,
  closes_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.submission_windows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Submission windows viewable by all" ON public.submission_windows FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/editors manage windows" ON public.submission_windows FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief']::app_role[]));

-- ===== BLACKLIST =====
CREATE TABLE public.blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES public.journals(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blacklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/editors can view blacklist" ON public.blacklist FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief']::app_role[]));
CREATE POLICY "Admins/editors can manage blacklist" ON public.blacklist FOR ALL TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief']::app_role[]));

-- ===== STORAGE BUCKET FOR PAPERS =====
INSERT INTO storage.buckets (id, name, public) VALUES ('papers', 'papers', false);

CREATE POLICY "Authors can upload papers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'papers' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own papers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'papers' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_any_role(auth.uid(), ARRAY['admin', 'editor_in_chief', 'managing_editor']::app_role[])
  ));
