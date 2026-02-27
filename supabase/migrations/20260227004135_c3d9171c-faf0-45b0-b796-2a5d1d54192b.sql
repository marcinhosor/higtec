
-- Allow admins to view all companies
CREATE POLICY "Admins can view all companies"
ON public.companies
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to view all memberships
CREATE POLICY "Admins can view all memberships"
ON public.company_memberships
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
