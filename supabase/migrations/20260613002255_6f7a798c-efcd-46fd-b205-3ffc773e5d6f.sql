-- Add section column to expenses (compras | gastos)
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS section text NOT NULL DEFAULT 'compras';

-- Backfill section for existing rows based on legacy category mapping
UPDATE public.expenses
   SET section = CASE
     WHEN category IN ('Nómina','Servicios','Transporte','Publicidad','Otros') THEN 'gastos'
     ELSE 'compras'
   END;

-- Editable categories per section
CREATE TABLE IF NOT EXISTS public.expense_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL CHECK (section IN ('compras','gastos')),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (section, name)
);

GRANT ALL ON public.expense_categories TO service_role;

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages expense categories"
  ON public.expense_categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed defaults (won't duplicate)
INSERT INTO public.expense_categories (section, name) VALUES
  ('compras','Insumos'),
  ('gastos','Nómina'),
  ('gastos','Servicios'),
  ('gastos','Transporte'),
  ('gastos','Publicidad'),
  ('gastos','Otros')
ON CONFLICT (section, name) DO NOTHING;
