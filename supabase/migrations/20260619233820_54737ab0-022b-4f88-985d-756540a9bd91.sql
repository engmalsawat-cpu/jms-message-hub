ALTER TABLE public.papers
DROP CONSTRAINT IF EXISTS papers_submitted_by_fkey;

ALTER TABLE public.papers
ADD CONSTRAINT papers_submitted_by_fkey
FOREIGN KEY (submitted_by) REFERENCES public.profiles(id);