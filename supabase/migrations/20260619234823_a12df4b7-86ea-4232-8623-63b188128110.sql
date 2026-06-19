ALTER TABLE public.review_requests
  ADD CONSTRAINT review_requests_reviewer_id_profiles_fkey
  FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.review_requests
  ADD CONSTRAINT review_requests_requested_by_profiles_fkey
  FOREIGN KEY (requested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;