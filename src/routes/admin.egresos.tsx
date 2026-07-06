import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Loader2, Trash2, Pencil, X, BookOpen, History, Tag, Download } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import {
  adminListExpenses,
  adminUpsertExpense,
  adminDeleteExpense,
  adminListPurchaseCatalog,
  adminUpsertPurchaseCatalog,
  adminDeletePurchaseCatalog,
  adminListPurchasesByCatalog,
  adminListExpenseCategories,
  adminUpsertExpenseCategory,
  adminDeleteExpenseCategory,
} from "@/lib/admin-data.functions";
import { formatCOP } from "@/lib/format";

export const Route = createFileRoute("/admin/egresos")({
  component: () => (
    <AdminLayout>
      <EgresosAdmin />
    </AdminLayout>
  ),
});

type SectionKey = "compras" | "gastos";
const SECTION_LABELS: Record<SectionKey, string> = {
  compras: "Compras",
  gastos: "Gastos",
};

type Expense = {
  id: string;
  section: SectionKey;
  category: string;
  description: string;
  quantity: number;
  amount: number;
  expense_date: string;
  created_at: string;
  catalog_item_id?: string | null;
};

type CatalogItem = {
  id: string;
  name: string;
  unit: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ExpenseCategory = {
  id: string;
  section: SectionKey;
  name: string;
};

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60_000).toISOString().slice(0, 10);
}

function exportCSV(
  items: Expense[],
  catalogMap: Record<string, CatalogItem>,
  section: SectionKey,
) {
  const header = [
    "Fecha", "Sección", "Categoría", "Descripción", "Ítem catálogo", "Unidad",
    "Cantidad", "Monto unitario", "Monto total",
  ];
  const rows = items.map((i) => {
    const cat = i.catalog_item_id ? catalogMap[i.catalog_item_id] : null;
    const qty = Number(i.quantity) || 0;
    const total = Number(i.amount) || 0;
    const unit = qty > 0 ? total / qty : total;
    return [
      i.expense_date,
      SECTION_LABELS[i.section],
      i.category,
      i.description,
      cat?.name || "",
      cat?.unit || "",
      qty,
      Math.round(unit),
      total,
    ];
  });
  const csv = [header, ...rows]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${section}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function EgresosAdmin() {
  const [items, setItems] = useState<Expense[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [filterCat, setFilterCat] = useState<string>("todas");
  const [section, setSection] = useState<SectionKey>("compras");
  const [showCatalog, setShowCatalog] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [historyItem, setHistoryItem] = useState<CatalogItem | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [data, cat, cats] = await Promise.all([
        adminListExpenses(),
        adminListPurchaseCatalog(),
        adminListExpenseCategories(),
      ]);
      setItems((data as unknown as Expense[]) || []);
      setCatalog((cat as unknown as CatalogItem[]) || []);
      setCategories((cats as unknown as ExpenseCategory[]) || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const catalogMap = useMemo(() => {
    const m: Record<string, CatalogItem> = {};
    for (const c of catalog) m[c.id] = c;
    return m;
  }, [catalog]);

  const sectionCategories = useMemo(
    () => categories.filter((c) => c.section === section),
    [categories, section],
  );

  const sectionItems = useMemo(
    () => items.filter((i) => i.section === section),
    [items, section],
  );

  const filtered = useMemo(
    () => (filterCat === "todas" ? sectionItems : sectionItems.filter((i) => i.category === filterCat)),
    [sectionItems, filterCat],
  );

  const totals = useMemo(() => {
    const today = todayISO();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    const weekStartISO = weekStart.toISOString().slice(0, 10);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    let day = 0,
      week = 0,
      month = 0;
    for (const e of filtered) {
      const total = Number(e.amount) * Number(e.quantity);
      if (e.expense_date === today) day += total;
      if (e.expense_date >= weekStartISO) week += total;
      if (e.expense_date >= monthStart) month += total;
    }
    return { day, week, month };
  }, [filtered]);

  async function remove(id: string) {
    if (!confirm("¿Eliminar este registro?")) return;
    try {
      await adminDeleteExpense({ data: { id } });
      toast.success("Registro eliminado");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">Compras y Gastos</h1>
      </div>

      <div className="mb-5 inline-flex rounded-full border border-border bg-card p-1">
        {(Object.keys(SECTION_LABELS) as SectionKey[]).map((k) => (
          <button
            key={k}
            onClick={() => {
              setSection(k);
              setFilterCat("todas");
            }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              section === k
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {SECTION_LABELS[k]}
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-end gap-2">
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-full border border-border bg-card px-4 py-2 text-sm hover:bg-secondary focus:border-primary focus:outline-none"
        >
          <option value="todas">Todas las categorías</option>
          {sectionCategories.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => setShowCategories(true)}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary"
        >
          <Tag className="h-4 w-4" /> Categorías
        </button>
        <button
          onClick={() => setShowCatalog(true)}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary"
        >
          <BookOpen className="h-4 w-4" /> Catálogo
        </button>
        <button
          onClick={() => exportCSV(filtered, catalogMap, section)}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> Exportar Excel
        </button>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nuevo registro
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card label="Hoy" value={formatCOP(totals.day)} />
        <Card label="Últimos 7 días" value={formatCOP(totals.week)} />
        <Card label="Este mes" value={formatCOP(totals.month)} />
      </div>

      {loading ? (
        <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-primary" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3 text-right">Cantidad</th>
                <th className="px-4 py-3 text-right">Valor unit.</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((e) => {
                const total = Number(e.amount) * Number(e.quantity);
                const catItem = e.catalog_item_id ? catalogMap[e.catalog_item_id] : null;
                const displayName = catItem ? catItem.name : e.description || "—";
                return (
                  <tr key={e.id} className="hover:bg-secondary/40">
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(e.expense_date + "T00:00:00").toLocaleDateString("es-CO")}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs text-accent">
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {displayName}
                      {catItem?.unit && (
                        <span className="ml-1 text-xs text-muted-foreground">({catItem.unit})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">{e.quantity}</td>
                    <td className="px-4 py-3 text-right">{formatCOP(Number(e.amount))}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCOP(total)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {catItem && (
                          <button
                            onClick={() => setHistoryItem(catItem)}
                            className="text-muted-foreground hover:text-accent"
                            title="Ver historial"
                          >
                            <History className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditing(e);
                            setShowForm(true);
                          }}
                          className="text-muted-foreground hover:text-accent"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(e.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    Sin registros aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ExpenseFormModal
          editing={editing}
          section={section}
          catalog={catalog}
          categories={sectionCategories}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            load();
          }}
        />
      )}

      {showCatalog && (
        <CatalogModal
          catalog={catalog}
          onClose={() => setShowCatalog(false)}
          onChanged={load}
        />
      )}

      {showCategories && (
        <CategoriesModal
          section={section}
          categories={sectionCategories}
          onClose={() => setShowCategories(false)}
          onChanged={load}
        />
      )}

      {historyItem && (
        <HistoryModal
          item={historyItem}
          onClose={() => setHistoryItem(null)}
        />
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 font-display text-2xl text-destructive">{value}</div>
    </div>
  );
}

function ExpenseFormModal({
  editing,
  section,
  catalog,
  categories,
  onClose,
  onSaved,
}: {
  editing: Expense | null;
  section: SectionKey;
  catalog: CatalogItem[];
  categories: ExpenseCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const defaultCat = editing?.category || categories[0]?.name || "";
  const [category, setCategory] = useState<string>(defaultCat);
  const [catalogItemId, setCatalogItemId] = useState<string>(editing?.catalog_item_id || "");
  const [description, setDescription] = useState(editing?.description || "");
  const [quantity, setQuantity] = useState<number>(editing?.quantity ?? 1);
  const initialTotal = (editing?.amount ?? 0) * (editing?.quantity ?? 1);
  const [totalValue, setTotalValue] = useState<number>(initialTotal);
  const [date, setDate] = useState<string>(editing?.expense_date || todayISO());
  const [busy, setBusy] = useState(false);

  const unitValue = quantity > 0 ? totalValue / quantity : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) {
      toast.error("Selecciona una categoría");
      return;
    }
    setBusy(true);
    try {
      const qty = Number(quantity) || 0;
      const total = Number(totalValue) || 0;
      await adminUpsertExpense({
        data: {
          id: editing?.id,
          section,
          category,
          description: description.trim(),
          quantity: qty,
          amount: qty > 0 ? total / qty : 0,
          expense_date: date,
          catalog_item_id: catalogItemId || null,
        },
      });
      toast.success(editing ? "Registro actualizado" : "Registro creado");
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-card p-6 shadow-card sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">
            {editing ? "Editar registro" : `Nuevo ${SECTION_LABELS[section].toLowerCase().slice(0, -1)}`}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              {categories.length === 0 && <option value="">— Agrega una categoría —</option>}
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">
              Producto del catálogo <span className="text-muted-foreground/70">(opcional)</span>
            </label>
            <select
              value={catalogItemId}
              onChange={(e) => setCatalogItemId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">— Sin producto del catálogo —</option>
              {catalog.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.unit ? ` (${c.unit})` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Descripción</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Pago de servicios"
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground">Cantidad</label>
              <input
                type="number"
                min={0}
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Valor total pagado</label>
              <input
                type="number"
                min={0}
                step="any"
                value={totalValue}
                onChange={(e) => setTotalValue(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Fecha</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="rounded-lg bg-secondary/50 px-3 py-2 text-sm">
            Valor unitario: <span className="font-semibold">{formatCOP(unitValue)}</span>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {editing ? "Guardar cambios" : "Registrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CategoriesModal({
  section,
  categories,
  onClose,
  onChanged,
}: {
  section: SectionKey;
  categories: ExpenseCategory[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit(c: ExpenseCategory | null) {
    setEditing(c);
    setName(c?.name || "");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ingresa un nombre");
      return;
    }
    setBusy(true);
    try {
      await adminUpsertExpenseCategory({
        data: { id: editing?.id, section, name: name.trim() },
      });
      toast.success(editing ? "Categoría actualizada" : "Categoría creada");
      startEdit(null);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar esta categoría?")) return;
    try {
      await adminDeleteExpenseCategory({ data: { id } });
      toast.success("Categoría eliminada");
      if (editing?.id === id) startEdit(null);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-card p-6 shadow-card sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">Categorías de {SECTION_LABELS[section]}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={save} className="mb-4 flex gap-2 rounded-lg border border-border p-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={editing ? "Nuevo nombre" : "Nombre de categoría"}
            className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {editing ? "Guardar" : "Agregar"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => startEdit(null)}
              className="rounded-full border border-border px-3 text-sm hover:bg-secondary"
            >
              Cancelar
            </button>
          )}
        </form>

        <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
          {categories.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Sin categorías aún.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(c)}
                      className="text-muted-foreground hover:text-accent"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function CatalogModal({
  catalog,
  onClose,
  onChanged,
}: {
  catalog: CatalogItem[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit(c: CatalogItem | null) {
    setEditing(c);
    setName(c?.name || "");
    setUnit(c?.unit || "");
    setNotes(c?.notes || "");
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ingresa un nombre");
      return;
    }
    setBusy(true);
    try {
      await adminUpsertPurchaseCatalog({
        data: {
          id: editing?.id,
          name: name.trim(),
          unit: unit.trim() || null,
          notes: notes.trim() || null,
        },
      });
      toast.success(editing ? "Producto actualizado" : "Producto agregado");
      startEdit(null);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este producto del catálogo? Los registros anteriores se conservan.")) return;
    try {
      await adminDeletePurchaseCatalog({ data: { id } });
      toast.success("Producto eliminado");
      if (editing?.id === id) startEdit(null);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl bg-card p-6 shadow-card sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">Catálogo</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={save} className="mb-4 space-y-3 rounded-lg border border-border p-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {editing ? "Editar producto" : "Nuevo producto"}
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre"
              className="col-span-2 rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <input
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="Unidad (kg, lt...)"
              className="rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas (opcional)"
            className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? "Guardar" : "Agregar"}
            </button>
            {editing && (
              <button
                type="button"
                onClick={() => startEdit(null)}
                className="rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
          {catalog.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Catálogo vacío. Agrega tu primer producto.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {catalog.map((c) => (
                <li key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="font-medium">{c.name}</div>
                    {(c.unit || c.notes) && (
                      <div className="text-xs text-muted-foreground">
                        {c.unit ? `Unidad: ${c.unit}` : ""}
                        {c.unit && c.notes ? " · " : ""}
                        {c.notes || ""}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(c)}
                      className="text-muted-foreground hover:text-accent"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(c.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function HistoryModal({
  item,
  onClose,
}: {
  item: CatalogItem;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    adminListPurchasesByCatalog({ data: { id: item.id } })
      .then((data) => {
        if (alive) setRows((data as unknown as Expense[]) || []);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Error al cargar"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [item.id]);

  const total = rows.reduce(
    (s, r) => s + Number(r.amount || 0) * Number(r.quantity || 0),
    0,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-lg rounded-t-2xl bg-card p-6 shadow-card sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl">Historial: {item.name}</h2>
            {item.unit && (
              <div className="text-xs text-muted-foreground">Unidad: {item.unit}</div>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        {loading ? (
          <Loader2 className="mx-auto my-10 h-8 w-8 animate-spin text-primary" />
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Sin registros.
          </div>
        ) : (
          <>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2 text-right">Cant.</th>
                    <th className="px-3 py-2 text-right">Valor unit.</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="px-3 py-2 text-muted-foreground">
                        {new Date(r.expense_date + "T00:00:00").toLocaleDateString("es-CO")}
                      </td>
                      <td className="px-3 py-2 text-right">{r.quantity}</td>
                      <td className="px-3 py-2 text-right">{formatCOP(Number(r.amount))}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatCOP(Number(r.amount) * Number(r.quantity))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2 text-sm">
              <span>Total de este producto</span>
              <span className="font-semibold">{formatCOP(total)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
