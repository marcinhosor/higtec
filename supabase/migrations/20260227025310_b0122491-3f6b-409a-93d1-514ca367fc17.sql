
-- Fix set_admin_password to use extensions.crypt/gen_salt
CREATE OR REPLACE FUNCTION public.set_admin_password(_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN false;
  END IF;

  INSERT INTO public.admin_settings (setting_key, setting_value, updated_at)
  VALUES ('admin_password', extensions.crypt(_password, extensions.gen_salt('bf')), now())
  ON CONFLICT (setting_key)
  DO UPDATE SET setting_value = extensions.crypt(_password, extensions.gen_salt('bf')), updated_at = now();

  RETURN true;
END;
$$;

-- Fix verify_admin_password to use extensions.crypt
CREATE OR REPLACE FUNCTION public.verify_admin_password(_password text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
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

  RETURN stored_hash = extensions.crypt(_password, stored_hash);
END;
$$;
