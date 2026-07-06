import { Link, useLocation } from "@tanstack/react-router";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/lib/cart";

export function CartFab() {
  const count = useCart((s) => s.count());
  const location = useLocation();

  // Hide on cart/checkout pages and when empty
  if (count === 0) return null;
  if (location.pathname.startsWith("/carrito") || location.pathname.startsWith("/checkout")) {
    return null;
  }

  return (
    <Link
      to="/carrito"
      aria-label={`Ver carrito (${count})`}
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-fire text-primary-foreground shadow-ember transition-transform hover:scale-110 active:scale-95"
    >
      <ShoppingBag className="h-6 w-6" strokeWidth={2.25} />
      <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-primary text-[11px] font-bold text-primary-foreground">
        {count}
      </span>
    </Link>
  );
}
