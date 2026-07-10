import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyWaiterCookie } from "@/server/waiter-auth.server";

function assertWaiter() {
  if (!verifyWaiterCookie()) throw new Error("No autorizado");
}

const uuid = z.string().uuid();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const baseProductId = (id?: string | null): string | null => {
  if (!id) return null;
  const base = id.split("__")[0];
  return UUID_RE.test(base) ? base : null;
};

const waiterItemSchema = z.object({
  id: z.string().trim().min(1).max(200).optional(),
  name: z.string().trim().min(1).max(200),
  quantity: z.number().int().min(1).max(100),
});

const manualOrderSchema = z.object({
  customer_name: z.string().trim().min(1).max(120),
  customer_phone: z.string().trim().min(1).max(40).optional(),
  customer_address: z.string().trim().max(300).optional(),
  payment_method: z.string().trim().min(1).max(40).optional(),
  delivery_fee: z.number().min(0).max(100_000_000).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  items: z.array(waiterItemSchema).min(1).max(50),
});

type PricedItem = { id?: string; name: string; price: number; cost: number; quantity: number };

async function priceWaiterItems(
  items: Array<{ id?: string; name: string; quantity: number }>,
): Promise<{ priced: PricedItem[]; total: number; total_cost: number }> {
  const baseIds = Array.from(
    new Set(items.map((i) => baseProductId(i.id)).filter((x): x is string => !!x)),
  );
  const byId = new Map<string, { id: string; name: string; price: number; cost_price: number | null; available: boolean | null; promo_active: boolean | null; promo_price: number | null }>();
  if (baseIds.length > 0) {
    const { data: prods, error } = await supabaseAdmin
      .from("products")
      .select("id, name, price, cost_price, available, promo_active, promo_price")
      .in("id", baseIds);
    if (error) throw new Error("No se pudieron validar los productos");
    for (const p of prods ?? []) byId.set(p.id, p as never);
  }
  const priced: PricedItem[] = [];
  let total = 0;
  let total_cost = 0;
  for (const it of items) {
    const base = baseProductId(it.id);
    if (!base) throw new Error(`Producto inválido: ${it.name}`);
    const p = byId.get(base);
    if (!p) throw new Error(`Producto no disponible: ${it.name}`);
    if (p.available === false) throw new Error(`"${p.name}" no está disponible`);
    const basePrice = Number(p.price) || 0;
    const promo = p.promo_active && p.promo_price && Number(p.promo_price) > 0 ? Number(p.promo_price) : null;
    const price = promo ?? basePrice;
    const cost = Number(p.cost_price) || 0;
    priced.push({ id: it.id, name: it.name, price, cost, quantity: it.quantity });
    total += price * it.quantity;
    total_cost += cost * it.quantity;
  }
  if (total < 0 || total > 100_000_000) throw new Error("Total inválido");
  return { priced, total, total_cost };
}

export const waiterListProducts = createServerFn({ method: "GET" }).handler(async () => {
  assertWaiter();
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("id, name, price, cost_price, category, image_url, available, sort_order")
    .eq("available", true)
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const waiterCreateOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => manualOrderSchema.parse(input))
  .handler(async ({ data }) => {
    assertWaiter();
    const { priced, total, total_cost } = await priceWaiterItems(data.items);
    const { error } = await supabaseAdmin.from("orders").insert({
      customer_name: data.customer_name,
      customer_phone: data.customer_phone?.trim() || "En sitio",
      customer_address: data.customer_address?.trim() || "Mesa en local",
      payment_method: data.payment_method?.trim() || "Efectivo",
      notes: data.notes?.trim() || null,
      items: priced,
      total,
      total_cost,
      source: "manual",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const waiterListOrders = createServerFn({ method: "GET" }).handler(async () => {
  assertWaiter();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("id, order_number, daily_number, created_at, customer_name, customer_phone, payment_method, payment_status, payment_notes, notes, items, total, delivery_fee, status")
    .eq("source", "manual")
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw new Error(error.message);
  return data ?? [];
});

const addItemsSchema = z.object({
  id: uuid,
  items: z.array(waiterItemSchema).min(1).max(50),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const waiterAddItemsToOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => addItemsSchema.parse(input))
  .handler(async ({ data }) => {
    assertWaiter();
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("items, total, total_cost, notes, source")
      .eq("id", data.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (existing?.source !== "manual") throw new Error("Solo se pueden editar pedidos manuales");

    const { priced: newItems, total: addTotal, total_cost: addCost } = await priceWaiterItems(data.items);

    const prevItems = Array.isArray(existing.items)
      ? (existing.items as Array<{ id?: string; name: string; price: number; cost?: number; quantity: number }>)
      : [];
    const merged = [...prevItems];
    for (const ni of newItems) {
      const idx = merged.findIndex((p) => ni.id && p.id === ni.id);
      if (idx >= 0) merged[idx] = { ...merged[idx], quantity: Number(merged[idx].quantity) + ni.quantity };
      else merged.push(ni);
    }
    const newTotal = Number(existing.total || 0) + addTotal;
    const newTotalCost = Number(existing.total_cost || 0) + addCost;

    const combinedNotes = data.notes?.trim()
      ? existing.notes
        ? `${existing.notes}\n[+] ${data.notes.trim()}`
        : data.notes.trim()
      : existing.notes;

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ items: merged, total: newTotal, total_cost: newTotalCost, notes: combinedNotes })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const updatePaymentSchema = z.object({
  id: uuid,
  payment_method: z.string().trim().min(1).max(40),
});

export const waiterUpdatePaymentMethod = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updatePaymentSchema.parse(input))
  .handler(async ({ data }) => {
    assertWaiter();
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("source")
      .eq("id", data.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (existing?.source !== "manual") throw new Error("Solo se pueden editar pedidos manuales");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ payment_method: data.payment_method })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const deliveryFeeSchema = z.object({
  id: uuid,
  delivery_fee: z.number().min(0).max(100_000_000),
});

export const waiterUpdateOrderDeliveryFee = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deliveryFeeSchema.parse(input))
  .handler(async ({ data }) => {
    assertWaiter();
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("source")
      .eq("id", data.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (existing?.source !== "manual") throw new Error("Solo se pueden editar pedidos manuales");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ delivery_fee: data.delivery_fee })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const paymentStatusSchema = z.object({
  id: uuid,
  payment_status: z.enum(["pendiente", "pagado"]),
});

export const waiterUpdatePaymentStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => paymentStatusSchema.parse(input))
  .handler(async ({ data }) => {
    assertWaiter();
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("source")
      .eq("id", data.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (existing?.source !== "manual") throw new Error("Solo se pueden editar pedidos manuales");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: data.payment_status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const paymentNotesSchema = z.object({
  id: uuid,
  payment_notes: z.string().trim().max(300).nullable().optional(),
});

export const waiterUpdatePaymentNotes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => paymentNotesSchema.parse(input))
  .handler(async ({ data }) => {
    assertWaiter();
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("source")
      .eq("id", data.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (existing?.source !== "manual") throw new Error("Solo se pueden editar pedidos manuales");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ payment_notes: data.payment_notes?.trim() || null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
