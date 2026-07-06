
WITH recomputed AS (
  SELECT
    o.id,
    COALESCE(SUM(
      COALESCE(p.cost_price, 0) * (item->>'quantity')::numeric
    ), 0) AS new_cost,
    jsonb_agg(
      CASE
        WHEN p.id IS NOT NULL THEN jsonb_set(item, '{cost}', to_jsonb(p.cost_price))
        ELSE item
      END
      ORDER BY ord
    ) AS new_items
  FROM public.orders o
  CROSS JOIN LATERAL jsonb_array_elements(o.items) WITH ORDINALITY AS t(item, ord)
  LEFT JOIN public.products p
    ON p.id::text = split_part(item->>'id', '__', 1)
   AND (item->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}'
  WHERE o.source = 'manual'
  GROUP BY o.id
)
UPDATE public.orders o
SET total_cost = r.new_cost,
    items = r.new_items
FROM recomputed r
WHERE o.id = r.id
  AND o.total_cost IS DISTINCT FROM r.new_cost;
