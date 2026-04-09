-- Temporary policy to allow users to insert their own role (for seeding)
CREATE POLICY "Users can insert own role (temp)"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
