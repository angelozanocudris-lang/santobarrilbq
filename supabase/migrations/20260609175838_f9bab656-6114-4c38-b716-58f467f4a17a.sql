REVOKE SELECT (cost_price) ON public.products FROM anon;
REVOKE SELECT (cost_price) ON public.products FROM authenticated;
GRANT SELECT (id, name, description, price, category, image_url, available, sort_order, promo_price, promo_active, created_at, updated_at) ON public.products TO anon;
GRANT SELECT (id, name, description, price, category, image_url, available, sort_order, promo_price, promo_active, created_at, updated_at) ON public.products TO authenticated;