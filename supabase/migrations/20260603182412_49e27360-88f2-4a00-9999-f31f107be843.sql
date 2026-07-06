-- 1. Restrict anonymous access to the cost_price column on products
REVOKE SELECT ON public.products FROM anon;
GRANT SELECT (id, name, description, price, category, image_url, available, sort_order, promo_price, promo_active, created_at, updated_at) ON public.products TO anon;

-- 2. Relocate pg_net out of the public schema (drop + recreate in extensions schema)
CREATE SCHEMA IF NOT EXISTS extensions;
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;
