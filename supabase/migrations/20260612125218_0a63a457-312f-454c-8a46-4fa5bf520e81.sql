
CREATE TABLE public.purchase_catalog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  unit TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX purchase_catalog_name_unique ON public.purchase_catalog (lower(name));

GRANT ALL ON public.purchase_catalog TO service_role;

ALTER TABLE public.purchase_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages purchase catalog"
ON public.purchase_catalog FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE TRIGGER update_purchase_catalog_updated_at
BEFORE UPDATE ON public.purchase_catalog
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.expenses
ADD COLUMN catalog_item_id UUID REFERENCES public.purchase_catalog(id) ON DELETE SET NULL;

CREATE INDEX expenses_catalog_item_id_idx ON public.expenses (catalog_item_id);
