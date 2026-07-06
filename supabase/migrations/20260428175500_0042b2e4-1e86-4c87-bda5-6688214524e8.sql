-- Lock down has_role: revoke from public roles, only used internally by policies (SECURITY DEFINER bypasses)
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;

-- Fix search_path on timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Replace permissive orders insert policy with validated one
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

CREATE POLICY "Anyone can create valid orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    length(trim(customer_name)) BETWEEN 1 AND 120
    AND length(trim(customer_phone)) BETWEEN 5 AND 30
    AND length(trim(customer_address)) BETWEEN 1 AND 300
    AND payment_method IN ('Efectivo','Nequi','Daviplata')
    AND total >= 0
    AND total <= 100000000
    AND jsonb_typeof(items) = 'array'
    AND source = 'web'
  );
