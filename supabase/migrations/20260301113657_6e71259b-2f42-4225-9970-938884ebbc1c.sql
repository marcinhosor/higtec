-- Allow master admin to see all device sessions
CREATE POLICY "Master admin can view all device_sessions"
ON public.device_sessions
FOR SELECT
USING (is_master_admin(auth.uid()));

-- Allow master admin to update all device sessions (revoke/reactivate)
CREATE POLICY "Master admin can update all device_sessions"
ON public.device_sessions
FOR UPDATE
USING (is_master_admin(auth.uid()));