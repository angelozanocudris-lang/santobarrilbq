import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Loader2, Download, X, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import {
  adminListOrders,
  adminCreateManualOrder,
  adminUpdateManualOrder,
  adminDeleteOrder,
  adminUpdateOrderStatus,
  adminUpdateOrderPayment,
  adminUpdateOrderDeliveryFee,
  adminListProducts,
  adminListExpenses,
} from "@/lib/admin-data.functions";
import { formatCOP } from "@/lib/format";

const STATUSES = ["nuevo", "preparando", "entregado", "cancelado"] as const;
const STATUS_STYLE: Record<string, string> = {
  nuevo: "bg-primary/15 text-accent",
  preparando: "bg-yellow-500/20 text-yellow-600",
  entregado: "bg-[var(--whatsapp)]/20 text-[var(--whatsapp)]",
  cancelado: "bg-destructive/20 text-destructive",
};

export const Route = createFileRoute("/admin/pedidos")({
  component: () => (
    <AdminLayout>
      <OrdersAdmin />
    </AdminLayout>
  ),
});

type OrderItem = { id?: string; name: string; price: number; cost?: number; quantity: number };
type Order = {
  id: string;
  order_number?: string | null;
  daily_number?: number | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  payment_method: string;
  notes: string | null;
  items: OrderItem[];
  total: number;
  total_cost: number;
  delivery_fee?: number;
  source: string;
  status: string;
  payment_status?: string;
  created_at: string;
};

function computeCost(o: Order): number {
  if (typeof o.total_cost === "number" && o.total_cost > 0) return Number(o.total_cost);
  return (o.items || []).reduce((s, i) => s + (Number(i.cost) || 0) * (Number(i.quantity) || 0), 0);
}

function OrdersAdmin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManual, setShowManual] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [viewing, setViewing] = useState<Order | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("todas");
  const [productCategoryMap, setProductCategoryMap] = useState<Record<string, string>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expensesTotal, setExpensesTotal] = useState(0);
  const [purchasesTotal, setPurchasesTotal] = useState(0);
  const [gastosTotal, setGastosTotal] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const data = await adminListOrders();
      setOrders((data as unknown as Order[]) || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    adminListProducts()
      .then((data) => {
        const list = (data as { name: string; category: string }[]) || [];
        const map: Record<string, string> = {};
        for (const p of list) map[p.name.toLowerCase()] = p.category;
        setProductCategoryMap(map);
      })
      .catch(() => {});
    adminListExpenses()
      .then((data) => {
        const list = (data as { amount: number; quantity: number; category: string; section?: string }[]) || [];
        let sum = 0, compras = 0, gastos = 0;
        for (const e of list) {
          const total = Number(e.amount || 0) * Number(e.quantity || 0);
          sum += total;
          const isCompra = e.section ? e.section === "compras" : e.category === "Insumos";
          if (isCompra) compras += total;
          else gastos += total;
        }
        setExpensesTotal(sum);
        setPurchasesTotal(compras);
        setGastosTotal(gastos);
      })
      .catch(() => {});
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>(Object.values(productCategoryMap));
    return ["todas", ...Array.from(set).sort()];
  }, [productCategoryMap]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (categoryFilter !== "todas") {
      list = list.filter((o) =>
        (o.items || []).some(
          (it) => productCategoryMap[it.name.toLowerCase()] === categoryFilter,
        ),
      );
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (o) =>
          (o.order_number || "").toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_phone.toLowerCase().includes(q),
      );
    }
    if (dateFrom) {
      const from = new Date(dateFrom + "T00:00:00").getTime();
      list = list.filter((o) => new Date(o.created_at).getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59.999").getTime();
      list = list.filter((o) => new Date(o.created_at).getTime() <= to);
    }
    return list;
  }, [orders, categoryFilter, productCategoryMap, searchQuery, dateFrom, dateTo]);

  const metrics = useMemo(() => {
    let sales = 0, cost = 0;
    for (const o of filteredOrders) {
      if (o.status === "cancelado") continue;
      sales += (Number(o.total) || 0) + (Number(o.delivery_fee) || 0);
      cost += computeCost(o);
    }
    const gross = sales - cost;
    const net = gross - expensesTotal;
    return { sales, cost, expenses: expensesTotal, compras: purchasesTotal, gastos: gastosTotal, gross, net };
  }, [filteredOrders, expensesTotal, purchasesTotal, gastosTotal]);

  function exportCSV() {
    const header = [
      "Pedido # día", "Pedido # histórico", "Fecha", "Origen", "Estado", "Estado pago", "Cliente", "Celular", "Dirección",
      "Pago", "Producto", "Cantidad", "Precio unit.", "Costo unit.", "Subtotal", "Costo línea", "Ganancia producto",
      "Notas", "Subtotal pedido", "Domicilio", "Total con domicilio",
    ];
    const rows: (string | number)[][] = [];
    for (const o of filteredOrders) {
  const items = o.items || [];
  const fecha = new Date(o.created_at).toLocaleString("es-CO");
  const dayNum = o.daily_number != null ? String(o.daily_number) : "";
  const orderNum = o.order_number || "";
  const fee = Number(o.delivery_fee) || 0;
  const grand = Number(o.total) + fee;
  const payStatus = o.payment_status === "pagado" ? "Pagado" : "Pendiente";
  // Pedidos manuales (mesa/local): solo se conserva el cliente (mesa) y
  // se dejan vacíos celular y dirección. Pedidos web: se exportan completos.
  const isManual = o.source === "manual";
  const phoneOut = isManual ? "" : o.customer_phone;
  const addressOut = isManual ? "" : o.customer_address;
  if (items.length === 0) {
    rows.push([dayNum, orderNum, fecha, o.source, o.status, payStatus, o.customer_name, phoneOut, addressOut, o.payment_method, "", "", "", "", "", "", "", o.notes || "", o.total, fee, grand]);
    continue;
  }
  items.forEach((i, idx) => {
    const price = Number(i.price) || 0;
    const cost = Number(i.cost) || 0;
    const qty = Number(i.quantity) || 0;
    const isFirst = idx === 0;
    rows.push([
      isFirst ? dayNum : "",
      isFirst ? orderNum : "",
      isFirst ? fecha : "",
      isFirst ? o.source : "",
      isFirst ? o.status : "",
      isFirst ? payStatus : "",
      isFirst ? o.customer_name : "",
      isFirst ? phoneOut : "",
      isFirst ? addressOut : "",
      isFirst ? o.payment_method : "",
      i.name,
      qty,
      price,
      cost,
      price * qty,
      cost * qty,
      (price - cost) * qty,
      isFirst ? (o.notes || "") : "",
      o.total,
      fee,
      grand,
    ]);
  });
}
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pedidos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }


  const allSelected = filteredOrders.length > 0 && filteredOrders.every((o) => selectedIds.has(o.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const o of filteredOrders) next.delete(o.id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const o of filteredOrders) next.add(o.id);
        return next;
      });
    }
  }

  async function removeSelected() {
    if (selectedIds.size === 0) return;
    if (!confirm(`¿Eliminar ${selectedIds.size} pedido(s) seleccionado(s)?`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map((id) => adminDeleteOrder({ data: { id } })));
      toast.success(`${selectedIds.size} pedido(s) eliminados`);
      setSelectedIds(new Set());
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este pedido?")) return;
    try {
      await adminDeleteOrder({ data: { id } });
      toast.success("Pedido eliminado");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  async function changeStatus(id: string, status: string) {
    const prev = orders;
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, status } : o)));
    try {
      await adminUpdateOrderStatus({ data: { id, status } });
    } catch (e) {
      setOrders(prev);
      toast.error(e instanceof Error ? e.message : "Error al actualizar");
    }
  }

  async function changePayment(id: string, payment_status: "pendiente" | "pagado") {
    const prev = orders;
    setOrders((os) => os.map((o) => (o.id === id ? { ...o, payment_status } : o)));
    try {
      await adminUpdateOrderPayment({ data: { id, payment_status } });
    } catch (e) {
      setOrders(prev);
      toast.error(e instanceof Error ? e.message : "Error al actualizar pago");
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Pedidos</h1>
        <div className="flex flex-wrap gap-2">
          {selectedIds.size > 0 && (
            <button
              onClick={removeSelected}
              className="flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4" /> Eliminar {selectedIds.size}
            </button>
          )}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm capitalize hover:bg-secondary focus:border-primary focus:outline-none"
          >
            {categories.map((c) => (
              <option key={c} value={c} className="capitalize">
                {c === "todas" ? "Todas las categorías" : c}
              </option>
            ))}
          </select>
          <button
            onClick={exportCSV}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
          <button
            onClick={() => setShowManual(true)}
            className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Pedido manual
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por # de pedido, cliente o celular…"
          className="w-full flex-1 rounded-full border border-border bg-card px-4 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Desde
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-full border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-1 text-xs text-muted-foreground">
            Hasta
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-full border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </label>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); }}
              className="rounded-full border border-border px-3 py-2 text-xs hover:bg-secondary"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-6">
        <MetricCard label="Ventas" value={formatCOP(metrics.sales)} tone="default" />
        <MetricCard label="Costos" value={formatCOP(metrics.cost)} tone="muted" />
        <MetricCard label="Compras" value={formatCOP(metrics.compras)} tone="expense" />
        <MetricCard label="Gastos" value={formatCOP(metrics.gastos)} tone="expense" />
        <MetricCard label="Ganancia bruta" value={formatCOP(metrics.gross)} tone="profit" />
        <MetricCard label="Ganancia neta" value={formatCOP(metrics.net)} tone="profit" />
      </div>

      {loading ? (
        <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-primary" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-2 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 cursor-pointer accent-primary"
                    title="Seleccionar todos"
                  />
                </th>
                <th className="px-4 py-3">Pedido #</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3">Pago</th>
                <th className="px-4 py-3">Estado pago</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Costo</th>
                <th className="px-4 py-3 text-right">Ganancia</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredOrders.map((o) => {
                const c = computeCost(o);
                const fee = Number(o.delivery_fee) || 0;
                const grand = Number(o.total) + fee;
                const g = grand - c;
                const isSelected = selectedIds.has(o.id);
                return (
                <tr
                  key={o.id}
                  onClick={() => setViewing(o)}
                  className={`cursor-pointer hover:bg-secondary/40 ${isSelected ? "bg-primary/5" : ""}`}
                >
                  <td className="px-2 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(o.id)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-accent">
                    <div>#{o.daily_number ?? "—"}</div>
                    <div className="text-[10px] font-normal text-muted-foreground">Hist: {o.order_number || "—"}</div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(o.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                  </td>
                  <td className="px-4 py-3 font-medium">{o.customer_name}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${o.source === "web" ? "bg-primary/15 text-accent" : "bg-secondary text-muted-foreground"}`}>
                      {o.source}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{o.payment_method}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={o.payment_status === "pagado" ? "pagado" : "pendiente"}
                      onChange={(e) => changePayment(o.id, e.target.value as "pendiente" | "pagado")}
                      className={`rounded-full border border-border bg-card px-2 py-1 text-xs font-semibold focus:border-primary focus:outline-none ${
                        o.payment_status === "pagado"
                          ? "text-[var(--whatsapp)]"
                          : "text-yellow-600"
                      }`}
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="pagado">Pagado</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatCOP(grand)}
                    {fee > 0 && (
                      <div className="text-[10px] font-normal text-muted-foreground">incl. dom. {formatCOP(fee)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCOP(c)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${g >= 0 ? "text-[var(--whatsapp)]" : "text-destructive"}`}>{formatCOP(g)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      {o.source === "manual" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditing(o); }}
                          className="text-muted-foreground hover:text-accent"
                          title="Editar pedido manual"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(o.id); }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {filteredOrders.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-muted-foreground">{searchQuery ? "Sin resultados para esta búsqueda." : categoryFilter === "todas" ? "Sin pedidos aún." : "Sin pedidos en esta categoría."}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {viewing && <OrderDetailModal order={viewing} onClose={() => setViewing(null)} onUpdated={(fee) => { setViewing({ ...viewing, delivery_fee: fee }); load(); }} />}
      {showManual && <ManualOrderModal onClose={() => setShowManual(false)} onSaved={() => { setShowManual(false); load(); }} />}
      {editing && <ManualOrderModal editingOrder={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: "default" | "muted" | "profit" | "expense" }) {
  const valueClass =
    tone === "profit" ? "text-[var(--whatsapp)]" : tone === "muted" ? "text-muted-foreground" : tone === "expense" ? "text-destructive" : "text-accent";
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-display text-2xl ${valueClass}`}>{value}</div>
    </div>
  );
}

function OrderDetailModal({ order, onClose, onUpdated }: { order: Order; onClose: () => void; onUpdated: (fee: number) => void }) {
  const cost = computeCost(order);
  const [feeInput, setFeeInput] = useState<string>(String(Number(order.delivery_fee) || 0));
  const [savingFee, setSavingFee] = useState(false);
  const fee = Number(feeInput) || 0;
  const grand = Number(order.total) + fee;
  const profit = grand - cost;

  async function saveFee() {
    const value = Math.max(0, Number(feeInput) || 0);
    setSavingFee(true);
    try {
      await adminUpdateOrderDeliveryFee({ data: { id: order.id, delivery_fee: value } });
      toast.success("Domicilio actualizado");
      onUpdated(value);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setSavingFee(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-t-2xl bg-card p-6 sm:rounded-2xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Detalle del pedido</h2>
            {(order.daily_number != null || order.order_number) && (
              <p className="mt-1 font-mono text-sm font-semibold text-accent">
                {order.daily_number != null ? `#${order.daily_number} del día` : ""}
                {order.order_number ? ` · Hist #${order.order_number}` : ""}
              </p>
            )}
          </div>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <dl className="space-y-2 text-sm">
          <Row label="Cliente" value={order.customer_name} />
          <Row label="Celular" value={order.customer_phone} />
          <Row label="Dirección" value={order.customer_address} />
          <Row label="Pago" value={order.payment_method} />
          <Row label="Origen" value={order.source} />
          {order.notes && <Row label="Notas" value={order.notes} />}
        </dl>
        <div className="mt-4">
          <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Productos</h3>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {(order.items || []).map((it, idx) => (
              <li key={idx} className="flex justify-between p-3 text-sm">
                <span>
                  {it.quantity}x {it.name}
                  {typeof it.cost === "number" && it.cost > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (costo {formatCOP(it.cost * it.quantity)})
                    </span>
                  )}
                </span>
                <span>{formatCOP(it.price * it.quantity)}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 rounded-lg border border-border bg-secondary/30 p-3">
          <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Domicilio</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              value={feeInput}
              onChange={(e) => setFeeInput(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              placeholder="0"
            />
            <button
              onClick={saveFee}
              disabled={savingFee || Number(feeInput) === Number(order.delivery_fee || 0)}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {savingFee ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
        <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCOP(order.total)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Domicilio</span><span>{formatCOP(fee)}</span></div>
          <div className="flex justify-between"><span className="font-semibold">Total a cobrar</span><span className="font-semibold">{formatCOP(grand)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Costo</span><span>{formatCOP(cost)}</span></div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-semibold">Ganancia</span>
            <span className={`font-display text-xl ${profit >= 0 ? "text-[var(--whatsapp)]" : "text-destructive"}`}>{formatCOP(profit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function ManualOrderModal({ onClose, onSaved, editingOrder }: { onClose: () => void; onSaved: () => void; editingOrder?: Order }) {
  const isEdit = !!editingOrder;
  const [form, setForm] = useState({
    customer_name: editingOrder?.customer_name ?? "",
    customer_phone: editingOrder?.customer_phone ?? "",
    customer_address: editingOrder?.customer_address ?? "",
    payment_method: editingOrder?.payment_method ?? "Efectivo",
    notes: editingOrder?.notes ?? "",
  });
  const [items, setItems] = useState<OrderItem[]>(
    editingOrder?.items?.length
      ? editingOrder.items.map((i) => ({ id: i.id, name: i.name, price: Number(i.price) || 0, cost: Number(i.cost ?? 0), quantity: Number(i.quantity) || 1 }))
      : [{ name: "", price: 0, cost: 0, quantity: 1 }],
  );
  const [deliveryFee, setDeliveryFee] = useState<number>(Number(editingOrder?.delivery_fee) || 0);
  const [busy, setBusy] = useState(false);
  const [catalog, setCatalog] = useState<{ id: string; name: string; price: number; cost: number }[]>([]);

  useEffect(() => {
    adminListProducts()
      .then((data) => {
        const list = (data as { id: string; name: string; price: number; cost_price: number; available: boolean }[]) || [];
        setCatalog(
          list
            .filter((p) => p.available)
            .map((p) => ({ id: p.id, name: p.name, price: Number(p.price) || 0, cost: Number(p.cost_price) || 0 })),
        );
      })
      .catch(() => {});
  }, []);

  const total = items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const totalCost = items.reduce((s, i) => s + Number(i.cost || 0) * Number(i.quantity), 0);
  const grandTotal = total + (Number(deliveryFee) || 0);
  const profit = grandTotal - totalCost;

  function selectProduct(idx: number, p: { id: string; name: string; price: number; cost: number }) {
    const n = [...items];
    n[idx] = { ...n[idx], id: p.id, name: p.name, price: p.price, cost: p.cost };
    setItems(n);
  }

  async function save() {
    if (!form.customer_name.trim() || !form.customer_phone.trim() || !form.customer_address.trim()) {
      return toast.error("Completa los datos del cliente");
    }
    const validItems = items.filter((i) => i.name.trim() && i.quantity > 0);
    if (validItems.length === 0) return toast.error("Agrega al menos un producto");

    setBusy(true);
    try {
      const payload = {
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim(),
        customer_address: form.customer_address.trim(),
        payment_method: form.payment_method,
        notes: form.notes || null,
        items: validItems.map((i) => ({
          id: i.id,
          name: i.name,
          price: Number(i.price),
          cost: Number(i.cost || 0),
          quantity: Number(i.quantity),
        })),
        total,
        delivery_fee: Math.max(0, Number(deliveryFee) || 0),
      };
      if (isEdit && editingOrder) {
        await adminUpdateManualOrder({ data: { id: editingOrder.id, ...payload } });
        toast.success("Pedido actualizado");
      } else {
        await adminCreateManualOrder({ data: payload });
        toast.success("Pedido manual guardado");
      }
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center sm:p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-card p-6 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl">{isEdit ? "Editar pedido" : "Pedido manual"}</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input className={inp} placeholder="Nombre" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          <input className={inp} placeholder="Celular" value={form.customer_phone} onChange={(e) => setForm({ ...form, customer_phone: e.target.value })} />
          <input className={inp + " sm:col-span-2"} placeholder="Dirección" value={form.customer_address} onChange={(e) => setForm({ ...form, customer_address: e.target.value })} />
          <select className={inp} value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
            {["Efectivo", "Nequi", "Datafono", "Transferencia", "Mixto"].map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
            {form.payment_method && !["Efectivo","Nequi","Datafono","Transferencia","Mixto"].includes(form.payment_method) && (
              <option value={form.payment_method}>{form.payment_method}</option>
            )}
          </select>
          <input className={inp} placeholder="Notas" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        <h3 className="mt-5 mb-2 text-xs font-semibold uppercase text-muted-foreground">Items</h3>
        {items.map((it, idx) => (
          <div key={idx} className="mb-2 grid grid-cols-12 gap-2">
            <div className="col-span-12">
              <ProductAutocomplete
                value={it.name}
                catalog={catalog}
                onChangeText={(text) => { const n = [...items]; n[idx] = { ...n[idx], name: text, id: undefined }; setItems(n); }}
                onSelect={(p) => selectProduct(idx, p)}
              />
            </div>
            <input type="number" className={inp + " col-span-3"} placeholder="Cant" value={it.quantity} onChange={(e) => { const n = [...items]; n[idx].quantity = Number(e.target.value); setItems(n); }} />
            <input type="number" className={inp + " col-span-4"} placeholder="Precio" value={it.price} onChange={(e) => { const n = [...items]; n[idx].price = Number(e.target.value); setItems(n); }} />
            <input type="number" className={inp + " col-span-4"} placeholder="Costo" value={it.cost ?? 0} onChange={(e) => { const n = [...items]; n[idx].cost = Number(e.target.value); setItems(n); }} />
            <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="col-span-1 text-muted-foreground hover:text-destructive"><Trash2 className="mx-auto h-4 w-4" /></button>
          </div>
        ))}
        <button onClick={() => setItems([...items, { name: "", price: 0, cost: 0, quantity: 1 }])} className="mt-2 text-sm text-accent">+ Agregar item</button>

        <div className="mt-5 rounded-lg border border-border bg-secondary/30 p-3">
          <label className="mb-1 block text-xs font-semibold uppercase text-muted-foreground">Domicilio</label>
          <input
            type="number"
            min={0}
            value={deliveryFee}
            onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
            className={inp + " w-full"}
            placeholder="0"
          />
        </div>

        <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatCOP(total)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Domicilio</span><span>{formatCOP(deliveryFee)}</span></div>
          <div className="flex justify-between"><span className="font-semibold">Total a cobrar</span><span className="font-semibold">{formatCOP(grandTotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Costo</span><span>{formatCOP(totalCost)}</span></div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-semibold">Ganancia</span>
            <span className={`font-display text-xl ${profit >= 0 ? "text-[var(--whatsapp)]" : "text-destructive"}`}>{formatCOP(profit)}</span>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-2.5">Cancelar</button>
          <button onClick={save} disabled={busy} className="flex-1 rounded-full bg-primary py-2.5 font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? "Guardando..." : "Guardar pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ProductAutocomplete({
  value,
  catalog,
  onChangeText,
  onSelect,
}: {
  value: string;
  catalog: { id: string; name: string; price: number; cost: number }[];
  onChangeText: (text: string) => void;
  onSelect: (p: { id: string; name: string; price: number; cost: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return catalog.slice(0, 8);
    return catalog.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8);
  }, [value, catalog]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <input
        className={inp + " w-full"}
        placeholder="Producto"
        value={value}
        onChange={(e) => { onChangeText(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          {matches.map((p) => (
            <li
              key={p.id}
              onMouseDown={(e) => { e.preventDefault(); onSelect(p); setOpen(false); }}
              className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm hover:bg-secondary"
            >
              <span className="truncate">{p.name}</span>
              <span className="ml-2 shrink-0 text-xs text-muted-foreground">{formatCOP(p.price)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const inp = "rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none";
