
-- Add settings columns to companies for multi-device sync
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS instagram text DEFAULT '',
  ADD COLUMN IF NOT EXISTS facebook text DEFAULT '',
  ADD COLUMN IF NOT EXISTS website text DEFAULT '',
  ADD COLUMN IF NOT EXISTS company_description text DEFAULT '',
  ADD COLUMN IF NOT EXISTS differentials text DEFAULT '',
  ADD COLUMN IF NOT EXISTS service_guarantee text DEFAULT '',
  ADD COLUMN IF NOT EXISTS execution_method text DEFAULT '',
  ADD COLUMN IF NOT EXISTS technical_recommendation text DEFAULT '',
  ADD COLUMN IF NOT EXISTS proposal_text text DEFAULT '',
  ADD COLUMN IF NOT EXISTS selected_theme_id text DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS custom_theme jsonb DEFAULT null,
  ADD COLUMN IF NOT EXISTS bank_data jsonb DEFAULT null,
  ADD COLUMN IF NOT EXISTS pix_keys jsonb DEFAULT '[]'::jsonb;
