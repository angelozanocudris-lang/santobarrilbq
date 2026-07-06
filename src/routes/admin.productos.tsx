import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Loader2, X, Flame } from "lucide-react";
import { toast } from "sonner";
import { AdminLayout } from "@/components/AdminLayout";
import {
  adminListProducts,
  adminUpsertProduct,
  adminToggleProduct,
  adminDeleteProduct,
  adminTogglePromo,
} from "@/lib/admin-data.functions";

import { formatCOP } from "@/lib/format";

export const Route = createFileRoute("/admin/productos")({
  component: () => (
    <AdminLayout>
      <ProductsAdmin />
    </AdminLayout>
  ),
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost_price: number;
  category: string;
  image_url: string | null;
  available: boolean;
  sort_order: number;
  promo_price: number | null;
  promo_active: boolean;
};

const empty = {
  name: "",
  description: "",
  price: 0,
  cost_price: 0,
  category: "Principales",
  image_url: "",
  available: true,
  sort_order: 0,
  promo_price: 0,
  promo_active: false,
};


function ProductsAdmin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<null | (typeof empty & { id?: string })>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("");

  async function load() {
    setLoading(true);
    try {
      const data = await adminListProducts();
      setProducts((data as Product[]) || []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!editing) return;
    if (!editing.name.trim()) return toast.error("Nombre requerido");
    try {
      await adminUpsertProduct({
        data: {
          id: editing.id,
          name: editing.name,
          description: editing.description || null,
          price: Number(editing.price),
          cost_price: Number(editing.cost_price) || 0,
          category: editing.category,
          image_url: editing.image_url || null,
          available: editing.available,
          sort_order: Number(editing.sort_order) || 0,
          promo_price: editing.promo_price && Number(editing.promo_price) > 0 ? Number(editing.promo_price) : null,
          promo_active: editing.promo_active,
        },
      });

      toast.success(editing.id ? "Producto actualizado" : "Producto creado");
      setEditing(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al guardar");
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await adminDeleteProduct({ data: { id } });
      toast.success("Eliminado");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error al eliminar");
    }
  }

  async function toggle(p: Product) {
    try {
      await adminToggleProduct({ data: { id: p.id, available: !p.available } });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }

  async function togglePromo(p: Product) {
    if (!p.promo_active && (!p.promo_price || Number(p.promo_price) <= 0)) {
      toast.error("Primero define un precio promocional editando el producto");
      return;
    }
    try {
      await adminTogglePromo({ data: { id: p.id, promo_active: !p.promo_active } });
      toast.success(!p.promo_active ? "Promoción activada" : "Promoción desactivada");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Error");
    }
  }


  const categories = useMemo(() => {
    const set = new Set<string>(products.map((p) => p.category).filter(Boolean));
    return Array.from(set).sort();
  }, [products]);

  useEffect(() => {
    if (categories.length > 0 && !categories.includes(categoryFilter)) {
      setCategoryFilter(categories[0]);
    }
  }, [categories, categoryFilter]);

  const filteredProducts = useMemo(() => {
    if (!categoryFilter) return products;
    return products.filter((p) => p.category === categoryFilter);
  }, [products, categoryFilter]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl">Productos</h1>
        <button
          onClick={() => setEditing({ ...empty })}
          className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Nuevo producto
        </button>
      </div>

      <div className="mb-4 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {categories.map((c) => {
          const active = c === categoryFilter;
          return (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-sm capitalize transition-colors ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:bg-secondary"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Loader2 className="mx-auto mt-10 h-8 w-8 animate-spin text-primary" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <p className="px-4 py-2 text-xs text-muted-foreground sm:hidden">← Desliza horizontalmente para ver más →</p>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">Costo</th>
                <th className="px-4 py-3 text-right">Ganancia</th>
                <th className="px-4 py-3 text-center">Disponible</th>
                <th className="px-4 py-3 text-center">Promo</th>
                <th className="px-4 py-3 text-right">Acciones</th>

              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredProducts.map((p) => {
                const profit = Number(p.price) - Number(p.cost_price || 0);
                return (
                <tr key={p.id} className="hover:bg-secondary/40">
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-3 text-right">{formatCOP(p.price)}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{formatCOP(p.cost_price || 0)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--whatsapp)]">{formatCOP(profit)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggle(p)}
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        p.available
                          ? "bg-[var(--whatsapp)]/20 text-[var(--whatsapp)]"
                          : "bg-destructive/20 text-destructive"
                      }`}
                    >
                      {p.available ? "Sí" : "No"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => togglePromo(p)}
                      title={p.promo_price ? `Promo: ${formatCOP(p.promo_price)}` : "Define un precio promocional"}
                      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold transition ${
                        p.promo_active
                          ? "bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Flame className="h-3 w-3" />
                      {p.promo_active ? "ON" : "OFF"}
                    </button>
                  </td>

                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing({ ...p, description: p.description || "", image_url: p.image_url || "", cost_price: p.cost_price || 0, promo_price: p.promo_price ?? 0, promo_active: p.promo_active ?? false })}
                      className="mr-2 inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Sin productos en esta categoría.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4">
          <div className="w-full max-w-lg rounded-t-2xl bg-card p-6 shadow-card sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-2xl">{editing.id ? "Editar producto" : "Nuevo producto"}</h2>
              <button onClick={() => setEditing(null)} aria-label="Cerrar">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <Field label="Nombre">
                <input className={inputClass} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </Field>
              <Field label="Descripción">
                <textarea className={inputClass} rows={2} value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Precio venta (COP)">
                  <input type="number" className={inputClass} value={editing.price} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
                </Field>
                <Field label="Precio costo (COP) · privado">
                  <input type="number" className={inputClass} value={editing.cost_price} onChange={(e) => setEditing({ ...editing, cost_price: Number(e.target.value) })} />
                </Field>
              </div>
              <Field label="Categoría">
                <input className={inputClass} value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })} />
              </Field>
              <Field label="URL de imagen">
                <input className={inputClass} placeholder="/assets/mi-producto.jpg" value={editing.image_url} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Orden">
                  <input type="number" className={inputClass} value={editing.sort_order} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
                </Field>
                <label className="flex items-center gap-2 pt-7 text-sm">
                  <input
                    type="checkbox"
                    checked={editing.available}
                    onChange={(e) => setEditing({ ...editing, available: e.target.checked })}
                    className="h-4 w-4"
                  />
                  Disponible
                </label>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-primary">
                  <Flame className="h-4 w-4" /> Promoción del día
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Precio promo (COP)">
                    <input
                      type="number"
                      className={inputClass}
                      placeholder="0 = sin promo"
                      value={editing.promo_price ?? 0}
                      onChange={(e) => setEditing({ ...editing, promo_price: Number(e.target.value) })}
                    />
                  </Field>
                  <label className="flex items-center gap-2 pt-7 text-sm">
                    <input
                      type="checkbox"
                      checked={editing.promo_active}
                      onChange={(e) => setEditing({ ...editing, promo_active: e.target.checked })}
                      className="h-4 w-4"
                    />
                    Promo activa
                  </label>
                </div>
                {editing.promo_active && editing.promo_price > 0 && editing.price > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Descuento: <span className="font-semibold text-primary">
                      {Math.round(100 - (Number(editing.promo_price) / Number(editing.price)) * 100)}%
                    </span> · Ahorro: {formatCOP(Number(editing.price) - Number(editing.promo_price))}
                  </p>
                )}
              </div>

            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 rounded-full border border-border py-2.5">Cancelar</button>
              <button onClick={save} className="flex-1 rounded-full bg-primary py-2.5 font-semibold text-primary-foreground">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-border bg-input px-3 py-2 text-sm focus:border-primary focus:outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
