import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useCart } from "@/lib/cart";
import { formatCOP } from "@/lib/format";
import { buildOrderMessage, openWhatsApp } from "@/lib/whatsapp";


export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [{ title: "Finalizar pedido — SANTO BARRIL" }],
  }),
  component: CheckoutPage,
});

const schema = z.object({
  name: z.string().trim().min(1, "Nombre requerido").max(120),
  phone: z.string().trim().min(5, "Celular requerido").max(30),
  address: z.string().trim().min(1, "Dirección requerida").max(300),
  paymentMethod: z.enum(["Efectivo", "Transferencia"]),
  notes: z.string().max(500).optional(),
});

function CheckoutPage() {
  const items = useCart((s) => s.items);
  const total = useCart((s) => s.total());
  const clear = useCart((s) => s.clear);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    paymentMethod: "Efectivo" as "Efectivo" | "Transferencia",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <p className="text-muted-foreground">Tu carrito está vacío.</p>
          <button
            onClick={() => navigate({ to: "/menu" })}
            className="mt-4 rounded-full bg-primary px-6 py-2 text-primary-foreground"
          >
            Ir al menú
          </button>
        </div>
        <SiteFooter />
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    try {
      const msg = buildOrderMessage(items, parsed.data);
      clear();
      openWhatsApp(msg);
    } finally {
      setSubmitting(false);
    }
  }


  const inputClass =
    "w-full rounded-lg border border-border bg-input px-4 py-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="font-display text-4xl text-foreground sm:text-5xl">
          Finalizar <span className="text-gradient-fire">pedido</span>
        </h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nombre *</label>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Tu nombre completo"
              required
              maxLength={120}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Celular *</label>
            <input
              className={inputClass}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="3001234567"
              type="tel"
              required
              maxLength={30}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Dirección *</label>
            <input
              className={inputClass}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Calle, número, barrio, ciudad"
              required
              maxLength={300}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Método de pago *</label>
            <div className="grid grid-cols-3 gap-2">
              {(["Efectivo", "Transferencia"] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setForm({ ...form, paymentMethod: m })}
                  className={`rounded-lg border px-3 py-3 text-sm font-semibold transition ${
                    form.paymentMethod === m
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-primary/50"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Notas especiales</label>
            <textarea
              className={inputClass}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Ej: sin cebolla, tocar el timbre dos veces..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Total (NO incluye domicilio)</span>
              <span className="font-display text-xl text-accent">{formatCOP(total)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-fire py-4 font-bold uppercase tracking-wider text-primary-foreground shadow-ember transition hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-5 w-5 animate-spin" />}
            Enviar pedido por WhatsApp
          </button>
        </form>
      </section>
      <SiteFooter />
    </div>
  );
}
