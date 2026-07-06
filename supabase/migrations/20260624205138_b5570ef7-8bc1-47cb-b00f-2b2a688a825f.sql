
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS daily_number integer;

CREATE INDEX IF NOT EXISTS idx_orders_created_date_bogota
  ON public.orders ((((created_at AT TIME ZONE 'America/Bogota')::date)));

-- Backfill existing rows by date (Bogota)
WITH ranked AS (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY ((created_at AT TIME ZONE 'America/Bogota')::date)
      ORDER BY created_at, id
    ) AS rn
  FROM public.orders
)
UPDATE public.orders o
SET daily_number = ranked.rn
FROM ranked
WHERE o.id = ranked.id AND o.daily_number IS NULL;

-- Trigger to set daily_number on insert
CREATE OR REPLACE FUNCTION public.set_daily_order_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  d date;
  next_n int;
BEGIN
  IF NEW.daily_number IS NOT NULL THEN
    RETURN NEW;
  END IF;
  d := ((COALESCE(NEW.created_at, now())) AT TIME ZONE 'America/Bogota')::date;
  SELECT COALESCE(MAX(daily_number), 0) + 1
    INTO next_n
  FROM public.orders
  WHERE ((created_at AT TIME ZONE 'America/Bogota')::date) = d;
  NEW.daily_number := next_n;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_daily_order_number_trg ON public.orders;
CREATE TRIGGER set_daily_order_number_trg
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_daily_order_number();
