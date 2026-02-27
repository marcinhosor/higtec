
-- Table to store admin panel password (hashed)
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write
CREATE POLICY "Admins can view admin_settings"
ON public.admin_settings FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert admin_settings"
ON public.admin_settings FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update admin_settings"
ON public.admin_settings FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to verify admin password
CREATE OR REPLACE FUNCTION public.verify_admin_password(_password text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  stored_hash text;
BEGIN
  SELECT setting_value INTO stored_hash
  FROM public.admin_settings
  WHERE setting_key = 'admin_password';

  IF stored_hash IS NULL THEN
    RETURN false;
  END IF;

  RETURN stored_hash = crypt(_password, stored_hash);
END;
$$;

-- Function to set admin password
CREATE OR REPLACE FUNCTION public.set_admin_password(_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN false;
  END IF;

  INSERT INTO public.admin_settings (setting_key, setting_value, updated_at)
  VALUES ('admin_password', crypt(_password, gen_salt('bf')), now())
  ON CONFLICT (setting_key)
  DO UPDATE SET setting_value = crypt(_password, gen_salt('bf')), updated_at = now();

  RETURN true;
END;
$$;

-- Function to check if admin password exists
CREATE OR REPLACE FUNCTION public.has_admin_password()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_settings WHERE setting_key = 'admin_password'
  );
$$;

-- Trigger for updated_at
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
