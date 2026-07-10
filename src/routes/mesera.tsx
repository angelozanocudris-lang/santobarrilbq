import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2, Lock, Minus, Plus, Trash2, X } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { formatCOP } from "@/lib/format";
import {
  checkWaiterSession,
  loginWaiter,
  logoutWaiter,
} from "@/lib/waiter-auth.functions";
import {
  waiterListProducts,
  waiterCreateOrder,
  waiterListOrders,
  waiterAddItemsToOrder,
  waiterUpdatePaymentMethod,
  waiterUpdateOrderDeliveryFee,
  waiterUpdatePaymentStatus,
  waiterUpdatePaymentNotes,
} from "@/lib/waiter-data.functions";

const PAYMENT_METHODS = ["Efectivo", "Nequi", "Datafono", "Mixto"];

export const Route = createFileRoute("/mesera")({
  component: MeseraPage,
  head: () => ({
    meta: [
      { title: "Pedido Mesa | Santo Barril" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type Product = {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string | null;
};
type CartItem = { id: string; name: string; price: number; quantity: number };
type RecentOrder = {
  id: string;
  order_number: string | null;
  daily_number: number | null;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  payment_method: string;
  notes: string | null;
  items: { name: string; price: number; quantity: number }[];
  total: number;
  delivery_fee?: number;
  status: string;
  payment_status?: string;
  payment_notes?: string | null;
};

function MeseraPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    checkWaiterSession()
      .then((r) => setIsAuth(!!r?.authenticated))
      .finally(() => setAuthLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {authLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : !isAuth ? (
          <PinGate onSuccess={() => setIsAuth(true)} />
        ) : (
          <WaiterOrder onLogout={() => setIsAuth(false)} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function PinGate({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length < 4) return toast.error("Clave muy corta");
    setBusy(true);
    try {
      await loginWaiter({ data: { pin } });
      onSuccess();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-sm rounded-2xl border border-border bg-card p-6 shadow-lg">
      <div className="mb-4 flex flex-col items-center text-center">
        <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-accent">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl">Pedido Mesa</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ingresa la clave de mesera para registrar un pedido.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <input
          type="password"
          autoFocus
          placeholder="Clave"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="w-full rounded-lg border border-border bg-input px-3 py-2.5 text-center text-lg tracking-widest focus:border-primary focus:outline-none"
          maxLength={32}
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {busy ? "Verificando..." : "Entrar"}
        </button>
        <Link to="/" className="block text-center text-xs text-muted-foreground hover:text-foreground">
          ← Volver al inicio
        </Link>
      </form>
    </div>
  );
}

function WaiterOrder({ onLogout }: { onLogout: () => void }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("");
  const [search, setSearch] = useState("");
  const [mesa, setMesa] = useState("");
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [recent, setRecent] = useState<RecentOrder[]>([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingOrder, setEditingOrder] = useState<RecentOrder | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [sideModal, setSideModal] = useState<Product | null>(null);
  const [sideStep, setSideStep] = useState<1 | 2>(1);
  const [chosenSide, setChosenSide] = useState<"Bollo" | "Yuca" | null>(null);
  const [mode, setMode] = useState<"mesa" | "whatsapp">("mesa");
  const [waClient, setWaClient] = useState("");
  const [waPhone, setWaPhone] = useState("");
  const [waAddress, setWaAddress] = useState("");
  const [waRef, setWaRef] = useState("");
  const [waPayment, setWaPayment] = useState("Efectivo");
  const [waDelivery, setWaDelivery] = useState("");

  const REQUIRES_SIDE = new Set([
    "chicharron",
    "chicharrón",
    "bondiola",
    "duo 1",
    "duo 2",
    "dúo 1",
    "dúo 2",
    "chorizo artesanal",
    "morcilla",
  ]);
  const normalize = (s: string) => s.trim().toLowerCase();
  const needsSide = (p: Product) => {
    if (p.category === "Adicionales") return false;
    return REQUIRES_SIDE.has(normalize(p.name));
  };
  const isDuo = (p: Product) => {
    const n = normalize(p.name);
    return n === "duo 1" || n === "duo 2" || n === "dúo 1" || n === "dúo 2";
  };
  const closeSideModal = () => {
    setSideModal(null);
    setSideStep(1);
    setChosenSide(null);
  };
  const handleProductClick = (p: Product) => {
    if (needsSide(p)) {
      setSideModal(p);
      setSideStep(1);
      setChosenSide(null);
      return;
    }
    addToCart(p);
  };
  const addVariantToCart = (id: string, name: string, price: number) => {
    setCart((prev) => {
      const i = prev.findIndex((x) => x.id === id);
      if (i >= 0) {
        const n = [...prev];
        n[i] = { ...n[i], quantity: n[i].quantity + 1 };
        return n;
      }
      return [...prev, { id, name, price: Number(price), quantity: 1 }];
    });
  };
  const addWithSide = (p: Product, side: "Bollo" | "Yuca") => {
    if (isDuo(p)) {
      setChosenSide(side);
      setSideStep(2);
      return;
    }
    const suffix = side === "Bollo" ? "bollo" : "yuca";
    addVariantToCart(`${p.id}__${suffix}`, `${p.name} (con ${side.toLowerCase()})`, Number(p.price));
    toast.success(`${p.name} con ${side.toLowerCase()} agregado`);
    closeSideModal();
  };
  const addDuoWithProtein = (p: Product, protein: "Chorizo" | "Morcilla") => {
    if (!chosenSide) return;
    const sideSuffix = chosenSide === "Bollo" ? "bollo" : "yuca";
    const protSuffix = protein.toLowerCase();
    addVariantToCart(
      `${p.id}__${sideSuffix}__${protSuffix}`,
      `${p.name} (con ${chosenSide.toLowerCase()} y ${protein.toLowerCase()})`,
      Number(p.price),
    );
    toast.success(`${p.name} con ${chosenSide.toLowerCase()} y ${protein.toLowerCase()} agregado`);
    closeSideModal();
  };

  function refreshRecent() {
    setRecentLoading(true);
    waiterListOrders()
      .then((data) => setRecent((data as unknown as RecentOrder[]) || []))
      .catch(() => {})
      .finally(() => setRecentLoading(false));
  }

  useEffect(() => {
    waiterListProducts()
      .then((data) => setProducts((data as unknown as Product[]) || []))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refreshRecent();
    const t = setInterval(refreshRecent, 30000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [products]);

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(category)) {
      setCategory(categories[0]);
    }
  }, [categories, category]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(
      (p) =>
        (!category || p.category === category) &&
        (!q || p.name.toLowerCase().includes(q)),
    );
  }, [products, category, search]);

  const total = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  function addToCart(p: Product) {
    setCart((prev) => {
      const i = prev.findIndex((x) => x.id === p.id);
      if (i >= 0) {
        const n = [...prev];
        n[i] = { ...n[i], quantity: n[i].quantity + 1 };
        return n;
      }
      return [...prev, { id: p.id, name: p.name, price: Number(p.price), quantity: 1 }];
    });
  }

  function setQty(id: string, q: number) {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, q) } : i))
        .filter((i) => i.quantity > 0),
    );
  }

  const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
  async function submit() {
    if (cart.length === 0) return toast.error("Agrega productos");
    setBusy(true);
    try {
      if (editingOrder) {
        await waiterAddItemsToOrder({
          data: {
            id: editingOrder.id,
            items: cart.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
            notes: notes.trim() || null,
          },
        });
        toast.success("Productos agregados al pedido");
      } else if (mode === "whatsapp") {
        if (!waClient.trim()) { setBusy(false); return toast.error("Nombre del cliente"); }
        if (!waPhone.trim()) { setBusy(false); return toast.error("Teléfono del cliente"); }
        if (!waAddress.trim()) { setBusy(false); return toast.error("Dirección"); }
        const fullAddress = waRef.trim() ? `${waAddress.trim()} — ${waRef.trim()}` : waAddress.trim();
        const deliveryFee = Number(waDelivery) || 0;
        await waiterCreateOrder({
          data: {
            customer_name: waClient.trim(),
            customer_phone: waPhone.trim(),
            customer_address: fullAddress,
            payment_method: waPayment,
            delivery_fee: deliveryFee,
            notes: notes.trim() || null,
            items: cart.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
          },
        });
        toast.success("Pedido de WhatsApp registrado");
        setWaClient(""); setWaPhone(""); setWaAddress(""); setWaRef(""); setWaDelivery(""); setWaPayment("Efectivo");
      } else {
        if (!mesa.trim()) { setBusy(false); return toast.error("Indica la mesa"); }
        const mesaLabel = mesa.trim().toLowerCase().startsWith("mesa")
          ? mesa.trim()
          : `Mesa ${mesa.trim()}`;
        await waiterCreateOrder({
          data: {
            customer_name: mesaLabel,
            customer_phone: "En sitio",
            payment_method: "Efectivo",
            notes: notes.trim() || null,
            items: cart.map((i) => ({ id: i.id, name: i.name, price: i.price, quantity: i.quantity })),
          },
        });
        toast.success("Pedido enviado a cocina");
      }
      refreshRecent();
      setCart([]);
      setMesa("");
      setNotes("");
      setEditingOrder(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(o: RecentOrder) {
    setEditingOrder(o);
    setCart([]);
    setNotes("");
    setExpandedId(null);
    toast.info(`Agregando productos a: ${o.customer_name}`);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditingOrder(null);
    setCart([]);
    setNotes("");
  }

  async function logout() {
    await logoutWaiter();
    onLogout();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl">Pedido Mesa</h1>
            <p className="text-sm text-muted-foreground">Selecciona productos para la mesa.</p>
          </div>
          <button
            onClick={logout}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Cerrar sesión
          </button>
        </div>

        <input
          placeholder="Buscar producto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mb-3 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3 py-1 text-xs capitalize transition ${
                category === c
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {filtered.map((p) => {
              const inCart = cart.find((c) => c.id === p.id);
              return (
                <li key={p.id}>
                  <button
                    onClick={() => handleProductClick(p)}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-secondary"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.category}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold">{formatCOP(p.price)}</span>
                    {inCart && (
                      <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                        {inCart.quantity}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="py-10 text-center text-sm text-muted-foreground">Sin productos.</li>
            )}
          </ul>
        )}
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="mb-1 font-display text-xl">
            {editingOrder ? "Agregar productos" : "Resumen"}
          </h2>
          <p className="mb-3 text-[11px] uppercase tracking-wide text-muted-foreground">
            {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            {" · "}
            {new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
          </p>
          {editingOrder && (
            <div className="mb-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs">
              <p className="font-semibold">Editando: {editingOrder.customer_name}</p>
              <p className="text-muted-foreground">
                Total actual: {formatCOP(editingOrder.total)}
              </p>
              <button
                onClick={cancelEdit}
                className="mt-1 text-[11px] underline hover:text-foreground"
              >
                Cancelar edición
              </button>
            </div>
          )}
          {!editingOrder && (
            <>
              <div className="mb-3 grid grid-cols-2 gap-1 rounded-full border border-border bg-background/50 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("mesa")}
                  className={`rounded-full py-1.5 font-semibold transition ${mode === "mesa" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                   Mesa
                </button>
                <button
                  type="button"
                  onClick={() => setMode("whatsapp")}
                  className={`rounded-full py-1.5 font-semibold transition ${mode === "whatsapp" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                   WhatsApp
                </button>
              </div>
              {mode === "mesa" ? (
                <input
                  placeholder="Mesa (ej: 5)"
                  value={mesa}
                  onChange={(e) => setMesa(e.target.value)}
                  className="mb-2 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              ) : (
                <div className="mb-2 space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Pedido por WhatsApp</p>
                  <input
                    placeholder="Nombre del cliente *"
                    value={waClient}
                    onChange={(e) => setWaClient(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono *"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <input
                    placeholder="Dirección *"
                    value={waAddress}
                    onChange={(e) => setWaAddress(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <input
                    placeholder="Barrio / referencia (opcional)"
                    value={waRef}
                    onChange={(e) => setWaRef(e.target.value)}
                    className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={waPayment}
                      onChange={(e) => setWaPayment(e.target.value)}
                      className="rounded-lg border border-border bg-input px-2 py-2 text-sm focus:border-primary focus:outline-none"
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      placeholder="Domicilio $"
                      value={waDelivery}
                      onChange={(e) => setWaDelivery(e.target.value)}
                      className="rounded-lg border border-border bg-input px-2 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
              )}
            </>
          )}
          <input
            placeholder={editingOrder ? "Nota adicional (opcional)" : "Notas (opcional)"}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mb-3 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />


          {cart.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Toca productos para agregar.
            </p>
          ) : (
            <ul className="mb-3 max-h-64 space-y-2 overflow-y-auto">
              {cart.map((i) => (
                <li key={i.id} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 truncate">{i.name}</span>
                  <button
                    onClick={() => setQty(i.id, i.quantity - 1)}
                    className="rounded-full border border-border p-1 hover:border-primary"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="w-5 text-center font-semibold">{i.quantity}</span>
                  <button
                    onClick={() => setQty(i.id, i.quantity + 1)}
                    className="rounded-full border border-border p-1 hover:border-primary"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setQty(i.id, 0)}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!editingOrder && mode === "whatsapp" && (Number(waDelivery) || 0) > 0 && (
            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatCOP(total)}</span>
            </div>
          )}
          {!editingOrder && mode === "whatsapp" && (Number(waDelivery) || 0) > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Domicilio</span>
              <span>{formatCOP(Number(waDelivery) || 0)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-display text-xl">
              {formatCOP(total + (!editingOrder && mode === "whatsapp" ? Number(waDelivery) || 0 : 0))}
            </span>
          </div>
          <button
            onClick={submit}
            disabled={busy || cart.length === 0}
            className="mt-3 w-full rounded-full bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-50"
          >
            {busy ? "Enviando..." : editingOrder ? "Agregar al pedido" : mode === "whatsapp" ? "Registrar pedido WhatsApp" : "Guardar pedido"}
          </button>
          <Link
            to="/"
            className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Volver al inicio
          </Link>
        </div>

        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl">Pedidos recientes</h2>
            <button
              onClick={refreshRecent}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {recentLoading ? "..." : "Actualizar"}
            </button>
          </div>
          {recent.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {recentLoading ? "Cargando..." : "Sin pedidos aún."}
            </p>
          ) : (
            <ul className="max-h-[420px] space-y-2 overflow-y-auto">
              {recent.map((o, idx) => {
                const open = expandedId === o.id;
                const label = o.daily_number != null ? `#${o.daily_number}` : (o.order_number ? `#${o.order_number}` : `#${recent.length - idx}`);
                const time = new Date(o.created_at).toLocaleTimeString("es-CO", {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const date = new Date(o.created_at).toLocaleDateString("es-CO", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                });
                return (
                  <li key={o.id} className="rounded-lg border border-border bg-background/40">
                    <button
                      onClick={() => setExpandedId(open ? null : o.id)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                    >
                      <span className="shrink-0 rounded-full bg-primary px-2 py-1 text-[10px] font-bold text-primary-foreground">
                        {label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{o.customer_name}</p>
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {date} · {time} · {o.status} · {o.payment_method}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className="text-sm font-semibold">{formatCOP(Number(o.total) + (Number(o.delivery_fee) || 0))}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${o.payment_status === "pagado" ? "bg-green-600/20 text-green-500" : "bg-yellow-600/20 text-yellow-500"}`}>
                          {o.payment_status === "pagado" ? "Pagado" : "Pendiente"}
                        </span>
                      </div>
                    </button>
                    {open && (
                      <div className="border-t border-border px-3 py-2 text-xs">
                        {o.customer_phone && o.customer_phone !== "En sitio" && (
                          <p className="mb-1 text-muted-foreground">Tel: {o.customer_phone}</p>
                        )}
                        <ul className="space-y-1">
                          {(o.items || []).map((it, idx) => (
                            <li key={idx} className="flex justify-between gap-2">
                              <span className="truncate">
                                {it.quantity}× {it.name}
                              </span>
                              <span className="shrink-0 font-medium">
                                {formatCOP(Number(it.price) * Number(it.quantity))}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <DeliveryFeeEditor
                          orderId={o.id}
                          initial={Number(o.delivery_fee) || 0}
                          onSaved={(fee) =>
                            setRecent((prev) => prev.map((x) => (x.id === o.id ? { ...x, delivery_fee: fee } : x)))
                          }
                        />
                        {o.notes && (
                          <p className="mt-2 text-muted-foreground">
                            <span className="font-semibold">Notas:</span> {o.notes}
                          </p>
                        )}
                        <div className="mt-3">
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Método de pago
                          </label>
                          <select
                            value={o.payment_method}
                            disabled={payingId === o.id}
                            onChange={async (e) => {
                              const newMethod = e.target.value;
                              if (newMethod === o.payment_method) return;
                              setPayingId(o.id);
                              try {
                                await waiterUpdatePaymentMethod({
                                  data: { id: o.id, payment_method: newMethod },
                                });
                                setRecent((prev) =>
                                  prev.map((x) =>
                                    x.id === o.id ? { ...x, payment_method: newMethod } : x,
                                  ),
                                );
                                toast.success("Método de pago actualizado");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Error");
                              } finally {
                                setPayingId(null);
                              }
                            }}
                            className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-xs focus:border-primary focus:outline-none disabled:opacity-50"
                          >
                            {PAYMENT_METHODS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                            {!PAYMENT_METHODS.includes(o.payment_method) && (
                              <option value={o.payment_method}>{o.payment_method}</option>
                            )}
                          </select>
                        </div>
                        <div className="mt-3">
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Detalle de pago (opcional)
                          </label>
                          <input
                            type="text"
                            defaultValue={o.payment_notes ?? ""}
                            placeholder="Ej: 40k efectivo + 30k Nequi"
                            onBlur={async (e) => {
                              const val = e.target.value.trim();
                              if ((o.payment_notes ?? "") === val) return;
                              try {
                                await waiterUpdatePaymentNotes({
                                  data: { id: o.id, payment_notes: val || null },
                                });
                                setRecent((prev) =>
                                  prev.map((x) =>
                                    x.id === o.id ? { ...x, payment_notes: val || null } : x,
                                  ),
                                );
                                toast.success("Detalle de pago guardado");
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Error");
                              }
                            }}
                            className="w-full rounded-lg border border-border bg-input px-2 py-1.5 text-xs focus:border-primary focus:outline-none"
                          />
                        </div>
                        <div className="mt-3">
                          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Estado de pago
                          </label>
                          <div className="flex gap-2">
                            {(["pendiente", "pagado"] as const).map((s) => {
                              const active = (o.payment_status || "pendiente") === s;
                              return (
                                <button
                                  key={s}
                                  onClick={async () => {
                                    if (active) return;
                                    try {
                                      await waiterUpdatePaymentStatus({ data: { id: o.id, payment_status: s } });
                                      setRecent((prev) => prev.map((x) => (x.id === o.id ? { ...x, payment_status: s } : x)));
                                      toast.success(s === "pagado" ? "Marcado como pagado" : "Marcado como pendiente");
                                    } catch (err) {
                                      toast.error(err instanceof Error ? err.message : "Error");
                                    }
                                  }}
                                  className={`flex-1 rounded-full py-1.5 text-xs font-semibold capitalize ${active ? (s === "pagado" ? "bg-green-600 text-white" : "bg-yellow-600 text-white") : "border border-border bg-background text-muted-foreground hover:text-foreground"}`}
                                >
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <button
                          onClick={() => startEdit(o)}
                          className="mt-3 w-full rounded-full bg-accent py-2 text-xs font-semibold text-accent-foreground hover:opacity-90"
                        >
                          + Agregar productos a este pedido
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
      {sideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={closeSideModal}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-display text-2xl text-foreground">{sideModal.name}</h3>
              <button
                type="button"
                onClick={closeSideModal}
                className="rounded-full p-1 text-muted-foreground hover:bg-white/5 hover:text-foreground"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {sideStep === 1 ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Elige el acompañamiento (obligatorio)
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => addWithSide(sideModal, "Bollo")}
                    className="rounded-xl border border-border bg-background py-4 font-semibold text-foreground transition hover:border-primary hover:bg-primary/10"
                  >
                    Con bollo
                  </button>
                  <button
                    type="button"
                    onClick={() => addWithSide(sideModal, "Yuca")}
                    className="rounded-xl border border-border bg-background py-4 font-semibold text-foreground transition hover:border-primary hover:bg-primary/10"
                  >
                    Con yuca
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted-foreground">
                  Elegiste <span className="text-foreground font-semibold">{chosenSide?.toLowerCase()}</span>. Ahora elige la proteína (obligatorio)
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => addDuoWithProtein(sideModal, "Chorizo")}
                    className="rounded-xl border border-border bg-background py-4 font-semibold text-foreground transition hover:border-primary hover:bg-primary/10"
                  >
                    Con chorizo
                  </button>
                  <button
                    type="button"
                    onClick={() => addDuoWithProtein(sideModal, "Morcilla")}
                    className="rounded-xl border border-border bg-background py-4 font-semibold text-foreground transition hover:border-primary hover:bg-primary/10"
                  >
                    Con morcilla
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => { setSideStep(1); setChosenSide(null); }}
                  className="mt-4 w-full text-center text-xs text-muted-foreground underline-offset-2 hover:underline"
                >
                  ← Volver a elegir acompañamiento
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DeliveryFeeEditor({
  orderId,
  initial,
  onSaved,
}: {
  orderId: string;
  initial: number;
  onSaved: (fee: number) => void;
}) {
  const [value, setValue] = useState<string>(String(initial || 0));
  const [saving, setSaving] = useState(false);
  const current = Number(value) || 0;
  const dirty = current !== (Number(initial) || 0);

  async function save() {
    setSaving(true);
    try {
      await waiterUpdateOrderDeliveryFee({
        data: { id: orderId, delivery_fee: Math.max(0, current) },
      });
      toast.success("Domicilio actualizado");
      onSaved(Math.max(0, current));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-background/40 p-2">
      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Domicilio
      </label>
      <div className="flex gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 rounded-md border border-border bg-input px-2 py-1 text-xs focus:border-primary focus:outline-none"
          placeholder="0"
        />
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "..." : "Guardar"}
        </button>
      </div>
    </div>
  );
}
