
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_cost numeric NOT NULL DEFAULT 0;

-- Restrict public column-level access so cost_price is NEVER exposed via the anon/authenticated roles.
REVOKE SELECT ON public.products FROM anon, authenticated;
GRANT SELECT (id, name, description, price, category, image_url, available, sort_order, created_at, updated_at)
  ON public.products TO anon, authenticated;
