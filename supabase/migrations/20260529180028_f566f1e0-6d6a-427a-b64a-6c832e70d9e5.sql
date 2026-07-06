ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS promo_price numeric,
  ADD COLUMN IF NOT EXISTS promo_active boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_promo_active ON public.products (promo_active) WHERE promo_active = true;