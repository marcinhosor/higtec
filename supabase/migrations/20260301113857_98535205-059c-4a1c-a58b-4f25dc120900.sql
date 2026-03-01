-- Allow master admin to view all collaborators
CREATE POLICY "Master admin can view all collaborators"
ON public.collaborators
FOR SELECT
USING (is_master_admin(auth.uid()));

-- Allow master admin to view all service_executions
CREATE POLICY "Master admin can view all service_executions"
ON public.service_executions
FOR SELECT
USING (is_master_admin(auth.uid()));