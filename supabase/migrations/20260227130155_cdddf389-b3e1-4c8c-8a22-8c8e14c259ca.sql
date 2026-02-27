-- Store master account ID in admin_settings
INSERT INTO public.admin_settings (setting_key, setting_value)
VALUES ('master_user_id', 'bc4d5ad1-a39a-400f-8f96-40f063ab2415')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = 'bc4d5ad1-a39a-400f-8f96-40f063ab2415', updated_at = now();

-- Create a security definer function to check if user is master
CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_settings
    WHERE setting_key = 'master_user_id'
      AND setting_value = _user_id::text
  )
$$;