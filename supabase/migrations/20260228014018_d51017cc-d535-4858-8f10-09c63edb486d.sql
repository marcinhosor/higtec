
-- Create notifications table for persistent history
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'appointment', 'maintenance_client', 'maintenance_equipment', 'low_stock'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'urgent'
  entity_id TEXT, -- reference to related entity
  entity_type TEXT, -- 'client', 'appointment', 'equipment'
  read BOOLEAN NOT NULL DEFAULT false,
  dismissed BOOLEAN NOT NULL DEFAULT false,
  whatsapp_sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Members can select notifications"
  ON public.notifications FOR SELECT
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can update notifications"
  ON public.notifications FOR UPDATE
  USING (is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can delete notifications"
  ON public.notifications FOR DELETE
  USING (is_company_member(auth.uid(), company_id));

-- Trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX idx_notifications_company_read ON public.notifications(company_id, read, dismissed);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
