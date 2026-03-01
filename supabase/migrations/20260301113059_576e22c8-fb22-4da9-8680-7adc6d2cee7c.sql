
-- Device sessions table for plan-based device limits
CREATE TABLE public.device_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  device_id TEXT NOT NULL,
  device_type TEXT NOT NULL DEFAULT 'mobile', -- 'desktop' or 'mobile'
  device_name TEXT DEFAULT '',
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(company_id, device_id)
);

ALTER TABLE public.device_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view device sessions" ON public.device_sessions FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can insert device sessions" ON public.device_sessions FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can update device sessions" ON public.device_sessions FOR UPDATE USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admins can delete device sessions" ON public.device_sessions FOR DELETE USING (is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'admin'::app_role));

-- Add device limit overrides to companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS max_desktop_devices INTEGER DEFAULT NULL;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS max_mobile_devices INTEGER DEFAULT NULL;
