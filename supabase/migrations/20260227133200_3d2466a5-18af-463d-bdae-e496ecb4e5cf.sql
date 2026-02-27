
-- Add access_code to companies for technician login
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS access_code text UNIQUE;

-- Generate a random 6-char access code for existing companies
CREATE OR REPLACE FUNCTION public.generate_access_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  code text;
  exists_already boolean;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.companies WHERE access_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- Set access_code for existing companies that don't have one
UPDATE public.companies SET access_code = public.generate_access_code() WHERE access_code IS NULL;

-- Make access_code NOT NULL after populating
ALTER TABLE public.companies ALTER COLUMN access_code SET NOT NULL;
ALTER TABLE public.companies ALTER COLUMN access_code SET DEFAULT public.generate_access_code();

-- Create technicians table
CREATE TABLE public.technicians (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  pin text NOT NULL, -- 4-digit PIN
  email text,
  phone text,
  status text NOT NULL DEFAULT 'active', -- active, inactive
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;

-- Company admins can manage their technicians
CREATE POLICY "Admins can manage own technicians" ON public.technicians
  FOR ALL USING (
    is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'admin'::app_role)
  ) WITH CHECK (
    is_company_member(auth.uid(), company_id) AND has_role(auth.uid(), 'admin'::app_role)
  );

-- Master admin can see all
CREATE POLICY "Master admin can view all technicians" ON public.technicians
  FOR SELECT USING (is_master_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_technicians_updated_at
  BEFORE UPDATE ON public.technicians
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add tech_limit settings to admin_settings
INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES 
  ('tech_limit_free', '0'),
  ('tech_limit_pro', '3'),
  ('tech_limit_premium', '10')
ON CONFLICT (setting_key) DO NOTHING;

-- RPC: get technicians by company access code (public, for login screen)
CREATE OR REPLACE FUNCTION public.get_technicians_by_code(_code text)
RETURNS TABLE(id uuid, name text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name
  FROM public.technicians t
  JOIN public.companies c ON c.id = t.company_id
  WHERE c.access_code = upper(_code) AND t.status = 'active';
$$;

-- RPC: technician login (verify PIN)
CREATE OR REPLACE FUNCTION public.technician_login(_code text, _technician_id uuid, _pin text)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tech record;
  comp record;
BEGIN
  SELECT t.*, c.name as company_name, c.id as comp_id, c.access_code
  INTO tech
  FROM public.technicians t
  JOIN public.companies c ON c.id = t.company_id
  WHERE c.access_code = upper(_code) AND t.id = _technician_id AND t.status = 'active';

  IF tech IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Técnico não encontrado');
  END IF;

  IF tech.pin != _pin THEN
    RETURN json_build_object('success', false, 'error', 'PIN incorreto');
  END IF;

  RETURN json_build_object(
    'success', true,
    'technician_id', tech.id,
    'technician_name', tech.name,
    'company_id', tech.comp_id,
    'company_name', tech.company_name
  );
END;
$$;
