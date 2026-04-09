
-- Specializations lookup table
CREATE TABLE public.specializations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  parent_id UUID REFERENCES public.specializations(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.specializations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Specializations viewable by authenticated" ON public.specializations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage specializations" ON public.specializations FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- User specializations
CREATE TABLE public.user_specializations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  specialization_id UUID NOT NULL REFERENCES public.specializations(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, specialization_id)
);
ALTER TABLE public.user_specializations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own specializations" ON public.user_specializations FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins/editors view all specializations" ON public.user_specializations FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor_in_chief'::app_role]));

-- Academic qualifications
CREATE TABLE public.academic_qualifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  degree TEXT NOT NULL, -- e.g. بكالوريوس، ماجستير، دكتوراه
  field_of_study TEXT NOT NULL,
  institution TEXT NOT NULL,
  graduation_year INTEGER,
  country TEXT,
  certificate_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.academic_qualifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own qualifications" ON public.academic_qualifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins/editors view all qualifications" ON public.academic_qualifications FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor_in_chief'::app_role]));

-- Scientific productions
CREATE TABLE public.scientific_productions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  production_type TEXT NOT NULL DEFAULT 'paper', -- paper, book, article, patent
  title TEXT NOT NULL,
  description TEXT,
  publication_date DATE,
  publisher TEXT,
  url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.scientific_productions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own productions" ON public.scientific_productions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins/editors view all productions" ON public.scientific_productions FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor_in_chief'::app_role]));

-- Work experiences
CREATE TABLE public.work_experiences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  job_title TEXT NOT NULL,
  organization TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.work_experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own experiences" ON public.work_experiences FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins/editors view all experiences" ON public.work_experiences FOR SELECT TO authenticated USING (has_any_role(auth.uid(), ARRAY['admin'::app_role, 'editor_in_chief'::app_role]));

-- Add extended fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS academic_rank TEXT,
  ADD COLUMN IF NOT EXISTS institution TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS orcid TEXT,
  ADD COLUMN IF NOT EXISTS google_scholar_url TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

-- Triggers for updated_at
CREATE TRIGGER update_academic_qualifications_updated_at BEFORE UPDATE ON public.academic_qualifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_scientific_productions_updated_at BEFORE UPDATE ON public.scientific_productions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_work_experiences_updated_at BEFORE UPDATE ON public.work_experiences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
