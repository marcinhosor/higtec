
-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
  model TEXT NOT NULL DEFAULT '',
  plate TEXT NOT NULL DEFAULT '',
  fuel_type TEXT NOT NULL DEFAULT 'gasolina',
  avg_consumption_km_l REAL NOT NULL DEFAULT 10,
  fuel_price_per_liter REAL NOT NULL DEFAULT 6.0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can select vehicles" ON public.vehicles FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can update vehicles" ON public.vehicles FOR UPDATE USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can delete vehicles" ON public.vehicles FOR DELETE USING (is_company_member(auth.uid(), company_id));

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Vehicle trips table
CREATE TABLE public.vehicle_trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE SET NULL,
  appointment_id UUID NULL,
  origin_address TEXT DEFAULT '',
  origin_lat DOUBLE PRECISION NULL,
  origin_lng DOUBLE PRECISION NULL,
  destination_address TEXT DEFAULT '',
  destination_lat DOUBLE PRECISION NULL,
  destination_lng DOUBLE PRECISION NULL,
  estimated_distance_km REAL DEFAULT 0,
  actual_distance_km REAL DEFAULT 0,
  estimated_cost REAL DEFAULT 0,
  actual_cost REAL DEFAULT 0,
  checkin_at TIMESTAMPTZ NULL,
  checkout_at TIMESTAMPTZ NULL,
  checkin_lat DOUBLE PRECISION NULL,
  checkin_lng DOUBLE PRECISION NULL,
  checkout_lat DOUBLE PRECISION NULL,
  checkout_lng DOUBLE PRECISION NULL,
  route_deviation BOOLEAN DEFAULT false,
  deviation_details TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can select vehicle_trips" ON public.vehicle_trips FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can insert vehicle_trips" ON public.vehicle_trips FOR INSERT WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can update vehicle_trips" ON public.vehicle_trips FOR UPDATE USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can delete vehicle_trips" ON public.vehicle_trips FOR DELETE USING (is_company_member(auth.uid(), company_id));

CREATE TRIGGER update_vehicle_trips_updated_at BEFORE UPDATE ON public.vehicle_trips FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
