CREATE TABLE public.store_settings (
  id INT PRIMARY KEY DEFAULT 1,
  status_override TEXT NOT NULL DEFAULT 'auto' CHECK (status_override IN ('auto','open','closed')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT singleton CHECK (id = 1)
);

GRANT SELECT ON public.store_settings TO anon, authenticated;
GRANT ALL ON public.store_settings TO service_role;

ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read store_settings" ON public.store_settings FOR SELECT USING (true);

INSERT INTO public.store_settings (id, status_override) VALUES (1, 'auto') ON CONFLICT (id) DO NOTHING;