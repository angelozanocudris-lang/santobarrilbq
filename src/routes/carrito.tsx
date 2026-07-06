import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

import { useCart } from "@/lib/cart";
import { formatCOP } from "@/lib/format";

export const Route = createFileRoute("/carrito")({
  head: () => ({
    meta: [
      { title: "Carrito — SANTO BARRIL" },
      { name: "description", content: "Revisa tu pedido y finalízalo." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const total = useCart((s) => s.total());
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">
          Tu <span className="text-gradient-fire">carrito</span>
        </h1>

        {items.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-10 text-center">
            <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-3 text-muted-foreground">Tu carrito está vacío.</p>
            <Link
              to="/menu"
              className="mt-5 inline-block rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Ir al menú
            </Link>
          </div>
        ) : (
          <>
            <ul className="mt-6 divide-y divide-border rounded-2xl border border-border bg-card">
              {items.map((it) => (
                <li key={it.id} className="flex items-center gap-3 p-4 sm:gap-4">
                  {it.image_url && (
                    <img
                      src={it.image_url}
                      alt=""
                      width={64}
                      height={64}
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-lg text-foreground">{it.name}</div>
                    <div className="text-sm text-muted-foreground">{formatCOP(it.price)} c/u</div>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-border">
                    <button
                      onClick={() => setQty(it.id, it.quantity - 1)}
                      aria-label="Disminuir"
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center font-semibold">{it.quantity}</span>
                    <button
                      onClick={() => setQty(it.id, it.quantity + 1)}
                      aria-label="Aumentar"
                      className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(it.id)}
                    aria-label="Quitar"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>{formatCOP(total)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
                <span className="font-display text-xl">Total</span>
                <span className="font-display text-2xl text-accent">{formatCOP(total)}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">No incluye costo de domicilio.</p>
              <button
                onClick={() => navigate({ to: "/checkout" })}
                className="mt-5 w-full rounded-full bg-gradient-fire py-3 font-bold uppercase tracking-wider text-primary-foreground shadow-ember transition hover:opacity-95 active:scale-[0.98]"
              >
                Finalizar pedido
              </button>
            </div>
          </>
        )}
      </section>
      <SiteFooter />
    </div>
  );
}
