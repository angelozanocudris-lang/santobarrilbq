
-- 1) Orders: remove public INSERT policy. Inserts will only happen via server (service role).
DROP POLICY IF EXISTS "Anyone can create valid orders" ON public.orders;

-- 2) Products: only show available products to the public
DROP POLICY IF EXISTS "Anyone can view available products" ON public.products;
CREATE POLICY "Public can view available products"
  ON public.products FOR SELECT
  TO public
  USING (available = true);

-- 3) Rate limit table for admin PIN attempts
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_time
  ON public.admin_login_attempts (ip, attempted_at DESC);
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
-- No policies: only service role (server) can access.

-- 4) Storage policies for product-images bucket
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

-- Deny writes from anon/authenticated clients. Service role bypasses RLS,
-- so server-side admin uploads still work.
DROP POLICY IF EXISTS "No client writes to product images" ON storage.objects;
CREATE POLICY "No client writes to product images"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (false);

DROP POLICY IF EXISTS "No client updates to product images" ON storage.objects;
CREATE POLICY "No client updates to product images"
  ON storage.objects FOR UPDATE
  TO public
  USING (false);

DROP POLICY IF EXISTS "No client deletes to product images" ON storage.objects;
CREATE POLICY "No client deletes to product images"
  ON storage.objects FOR DELETE
  TO public
  USING (false);
