
-- Remove broad SELECT policy. The bucket is marked public, so file URLs
-- remain accessible via the public CDN endpoint without an RLS SELECT policy.
-- This prevents anonymous clients from listing the bucket contents.
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
