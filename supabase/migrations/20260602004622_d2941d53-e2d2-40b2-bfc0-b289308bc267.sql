-- Sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS public.orders_number_seq START WITH 1 INCREMENT BY 1;

-- Column for the human-readable order number
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_number text UNIQUE;

-- Function to generate next MSB-xxxx
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := 'MSB-' || lpad(nextval('public.orders_number_seq')::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger on insert
DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE TRIGGER set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.generate_order_number();

-- Backfill existing orders in created_at order
DO $$
DECLARE
  r record;
  n int := 0;
BEGIN
  FOR r IN SELECT id FROM public.orders WHERE order_number IS NULL ORDER BY created_at ASC LOOP
    n := nextval('public.orders_number_seq');
    UPDATE public.orders SET order_number = 'MSB-' || lpad(n::text, 4, '0') WHERE id = r.id;
  END LOOP;
END $$;

-- Make column NOT NULL after backfill
ALTER TABLE public.orders ALTER COLUMN order_number SET NOT NULL;