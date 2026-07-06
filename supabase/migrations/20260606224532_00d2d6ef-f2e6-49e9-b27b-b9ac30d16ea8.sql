
-- Renumber existing orders sequentially by created_at
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM public.orders
)
UPDATE public.orders o
SET order_number = ordered.rn::text
FROM ordered
WHERE o.id = ordered.id;

-- Reset sequence to continue after the last assigned number
SELECT setval('public.orders_number_seq', COALESCE((SELECT MAX(order_number::int) FROM public.orders), 0), true);

-- Update trigger function to use plain numbers
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.order_number IS NULL THEN
    NEW.order_number := nextval('public.orders_number_seq')::text;
  END IF;
  RETURN NEW;
END;
$function$;
