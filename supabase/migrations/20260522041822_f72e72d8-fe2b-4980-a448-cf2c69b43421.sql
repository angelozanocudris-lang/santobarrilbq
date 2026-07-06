
CREATE INDEX IF NOT EXISTS idx_products_available_sort ON public.products (available, sort_order) WHERE available = true;
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_ip_time ON public.admin_login_attempts (ip, attempted_at DESC);
