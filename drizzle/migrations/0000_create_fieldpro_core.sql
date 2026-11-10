CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  customer_since date NOT NULL DEFAULT CURRENT_DATE,
  equipment jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their customers" ON public.customers FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX customers_user_idx ON public.customers(user_id);

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  title text NOT NULL,
  service_type text NOT NULL DEFAULT 'General service',
  address text NOT NULL DEFAULT '',
  scheduled_date date,
  start_hour numeric NOT NULL DEFAULT 9,
  duration_hrs numeric NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'scheduled',
  priority text NOT NULL DEFAULT 'normal',
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NOT NULL DEFAULT '',
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  signature text,
  activity jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'app',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT jobs_status_check CHECK (status IN ('pending','scheduled','en_route','in_progress','completed')),
  CONSTRAINT jobs_priority_check CHECK (priority IN ('normal','urgent'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their jobs" ON public.jobs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX jobs_user_date_idx ON public.jobs(user_id, scheduled_date);

CREATE TABLE public.mileage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  purpose text NOT NULL DEFAULT '',
  address_from text NOT NULL DEFAULT '',
  address_to text NOT NULL DEFAULT '',
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  start_odometer numeric NOT NULL,
  end_odometer numeric,
  elapsed_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mileage_logs TO authenticated;
GRANT ALL ON public.mileage_logs TO service_role;
ALTER TABLE public.mileage_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their mileage" ON public.mileage_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX mileage_user_idx ON public.mileage_logs(user_id, start_at);

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  number text NOT NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  job_id uuid REFERENCES public.jobs(id) ON DELETE SET NULL,
  estimate_id text,
  title text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  tax_rate numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'unpaid',
  due_date date NOT NULL DEFAULT (CURRENT_DATE + 30),
  paid_at timestamptz,
  paid_method text,
  stripe_session_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_status_check CHECK (status IN ('unpaid','paid'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage their invoices" ON public.invoices FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX invoices_user_idx ON public.invoices(user_id, created_at);

-- Per-user secret token that identifies the owner of incoming SMS/email job requests.
CREATE TABLE public.intake_tokens (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(),
  token text NOT NULL UNIQUE DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.intake_tokens TO authenticated;
GRANT ALL ON public.intake_tokens TO service_role;
ALTER TABLE public.intake_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read their intake token" ON public.intake_tokens FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owners create their intake token" ON public.intake_tokens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owners delete their intake token" ON public.intake_tokens FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER customers_touch BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER jobs_touch BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();