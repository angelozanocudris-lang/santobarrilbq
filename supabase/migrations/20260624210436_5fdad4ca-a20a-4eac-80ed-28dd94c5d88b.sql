
-- Explicit bucket-scoped deny policies for product-images writes.
-- Service role bypasses RLS, so server-side admin uploads keep working.

DROP POLICY IF EXISTS "Deny client insert product-images" ON storage.objects;
CREATE POLICY "Deny client insert product-images"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id <> 'product-images');

DROP POLICY IF EXISTS "Deny client update product-images" ON storage.objects;
CREATE POLICY "Deny client update product-images"
  ON storage.objects FOR UPDATE
  TO anon, authenticated
  USING (bucket_id <> 'product-images')
  WITH CHECK (bucket_id <> 'product-images');

DROP POLICY IF EXISTS "Deny client delete product-images" ON storage.objects;
CREATE POLICY "Deny client delete product-images"
  ON storage.objects FOR DELETE
  TO anon, authenticated
  USING (bucket_id <> 'product-images');
