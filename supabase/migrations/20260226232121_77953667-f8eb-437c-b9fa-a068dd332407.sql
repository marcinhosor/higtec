
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'technician', 'viewer');
CREATE TYPE public.plan_tier AS ENUM ('free', 'pro', 'premium');

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cnpj TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  signature_url TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  neighborhood TEXT,
  plan_tier public.plan_tier NOT NULL DEFAULT 'free',
  trial_ends_at TIMESTAMPTZ,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'admin',
  UNIQUE (user_id, role)
);

-- Company memberships
CREATE TABLE public.company_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL DEFAULT 'technician',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

-- Enable RLS
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_memberships ENABLE ROW LEVEL SECURITY;

-- Helper: check role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- Helper: check company membership
CREATE OR REPLACE FUNCTION public.is_company_member(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_memberships
    WHERE user_id = _user_id AND company_id = _company_id
  )
$$;

-- RLS: profiles
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS: companies
CREATE POLICY "Members can view their company"
  ON public.companies FOR SELECT
  TO authenticated
  USING (public.is_company_member(auth.uid(), id));

CREATE POLICY "Admins can update their company"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (public.is_company_member(auth.uid(), id) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create companies"
  ON public.companies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS: user_roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS: company_memberships
CREATE POLICY "Members can view company memberships"
  ON public.company_memberships FOR SELECT
  TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Admins can manage memberships"
  ON public.company_memberships FOR INSERT
  TO authenticated
  WITH CHECK (public.is_company_member(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete memberships"
  ON public.company_memberships FOR DELETE
  TO authenticated
  USING (public.is_company_member(auth.uid(), company_id) AND public.has_role(auth.uid(), 'admin'));

-- Trigger: auto-create profile + company on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create a company for the new user
  INSERT INTO public.companies (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'company_name', 'Minha Empresa'))
  RETURNING id INTO new_company_id;

  -- Create profile
  INSERT INTO public.profiles (user_id, company_id, full_name)
  VALUES (NEW.id, new_company_id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Assign admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'admin');

  -- Create membership
  INSERT INTO public.company_memberships (user_id, company_id, role)
  VALUES (NEW.id, new_company_id, 'admin');

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
