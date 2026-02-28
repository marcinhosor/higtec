
-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  street TEXT DEFAULT '',
  number TEXT DEFAULT '',
  complement TEXT DEFAULT '',
  neighborhood TEXT DEFAULT '',
  city TEXT DEFAULT '',
  state TEXT DEFAULT '',
  property_type TEXT DEFAULT '',
  observations TEXT DEFAULT '',
  service_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create manufacturers table
CREATE TABLE public.manufacturers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  manufacturer TEXT DEFAULT '',
  type TEXT DEFAULT '',
  ph REAL,
  dilution TEXT DEFAULT '',
  cost_per_liter REAL DEFAULT 0,
  current_stock_ml REAL DEFAULT 0,
  min_stock_ml REAL DEFAULT 0,
  stock_status TEXT DEFAULT 'ok',
  last_restock_date TEXT DEFAULT '',
  consumption_history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create service_types table
CREATE TABLE public.service_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  default_price REAL DEFAULT 0,
  estimated_minutes INT DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create collaborators table
CREATE TABLE public.collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  status TEXT DEFAULT 'ativo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create appointments table
CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  service TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  collaborator_id TEXT DEFAULT '',
  collaborator_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  quote_number INT NOT NULL DEFAULT 1,
  client_id TEXT NOT NULL,
  client_name TEXT NOT NULL,
  services JSONB DEFAULT '[]'::jsonb,
  discount REAL DEFAULT 0,
  discount_type TEXT DEFAULT 'percent',
  payment_method TEXT DEFAULT '',
  validity_days INT DEFAULT 15,
  status TEXT DEFAULT 'pending',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create equipment table
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model TEXT DEFAULT '',
  serial_number TEXT DEFAULT '',
  purchase_date TEXT DEFAULT '',
  purchase_cost REAL DEFAULT 0,
  status TEXT DEFAULT 'ativo',
  next_maintenance_date TEXT DEFAULT '',
  maintenance_cost REAL DEFAULT 0,
  observations TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create service_executions table
CREATE TABLE public.service_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  appointment_id TEXT NOT NULL,
  photos_before JSONB DEFAULT '[]'::jsonb,
  photos_after JSONB DEFAULT '[]'::jsonb,
  soiling_level TEXT DEFAULT '',
  soiling_types JSONB DEFAULT '[]'::jsonb,
  fiber_type TEXT DEFAULT '',
  non_conformities JSONB DEFAULT '[]'::jsonb,
  products_used JSONB DEFAULT '[]'::jsonb,
  observations TEXT DEFAULT '',
  process_description TEXT DEFAULT '',
  started_at TEXT DEFAULT '',
  finished_at TEXT DEFAULT '',
  elapsed_seconds INT DEFAULT 0,
  status TEXT DEFAULT 'in_progress',
  collaborator_id TEXT DEFAULT '',
  collaborator_name TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_executions ENABLE ROW LEVEL SECURITY;

-- RLS policies for all tables (company member CRUD)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY['clients','manufacturers','products','service_types','collaborators','appointments','quotes','equipment','service_executions'])
  LOOP
    EXECUTE format('CREATE POLICY "Members can select %1$s" ON public.%1$s FOR SELECT USING (is_company_member(auth.uid(), company_id))', tbl);
    EXECUTE format('CREATE POLICY "Members can insert %1$s" ON public.%1$s FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id))', tbl);
    EXECUTE format('CREATE POLICY "Members can update %1$s" ON public.%1$s FOR UPDATE USING (is_company_member(auth.uid(), company_id))', tbl);
    EXECUTE format('CREATE POLICY "Members can delete %1$s" ON public.%1$s FOR DELETE USING (is_company_member(auth.uid(), company_id))', tbl);
  END LOOP;
END;
$$;

-- Indexes on company_id
CREATE INDEX idx_clients_company ON public.clients(company_id);
CREATE INDEX idx_manufacturers_company ON public.manufacturers(company_id);
CREATE INDEX idx_products_company ON public.products(company_id);
CREATE INDEX idx_service_types_company ON public.service_types(company_id);
CREATE INDEX idx_collaborators_company ON public.collaborators(company_id);
CREATE INDEX idx_appointments_company ON public.appointments(company_id);
CREATE INDEX idx_quotes_company ON public.quotes(company_id);
CREATE INDEX idx_equipment_company ON public.equipment(company_id);
CREATE INDEX idx_service_executions_company ON public.service_executions(company_id);

-- Updated_at triggers
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_types_updated_at BEFORE UPDATE ON public.service_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collaborators_updated_at BEFORE UPDATE ON public.collaborators FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_executions_updated_at BEFORE UPDATE ON public.service_executions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
