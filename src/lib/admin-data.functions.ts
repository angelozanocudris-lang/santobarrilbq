import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { verifyAdminCookie } from "@/server/admin-auth.server";

function assertAdmin() {
  if (!verifyAdminCookie()) {
    throw new Error("No autorizado");
  }
}

// ---------- Schemas ----------
const uuid = z.string().uuid();

const productInputSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  price: z.number().min(0).max(100_000_000),
  cost_price: z.number().min(0).max(100_000_000),
  category: z.string().trim().min(1).max(100),
  image_url: z
    .string()
    .trim()
    .max(2000)
    .nullable()
    .optional()
    .refine(
      (v) => !v || /^(https?:\/\/|\/)/.test(v),
      "URL de imagen inválida",
    ),
  available: z.boolean(),
  sort_order: z.number().int().min(0).max(100000),
  promo_price: z.number().min(0).max(100_000_000).nullable().optional(),
  promo_active: z.boolean().optional(),
});

const promoToggleSchema = z.object({ id: uuid, promo_active: z.boolean() });


const toggleSchema = z.object({ id: uuid, available: z.boolean() });
const idSchema = z.object({ id: uuid });

const orderStatusSchema = z.object({
  id: uuid,
  status: z.enum(["nuevo", "preparando", "entregado", "cancelado"]),
});

const paymentStatusSchema = z.object({
  id: uuid,
  payment_status: z.enum(["pendiente", "pagado"]),
});

const manualOrderSchema = z.object({
  customer_name: z.string().trim().min(1).max(120),
  customer_phone: z.string().trim().min(1).max(40),
  customer_address: z.string().trim().min(1).max(300),
  payment_method: z.string().trim().min(1).max(40),
  notes: z.string().trim().max(500).nullable().optional(),
  items: z
    .array(
      z.object({
        id: z.string().trim().min(1).optional().nullable(),
        name: z.string().trim().min(1).max(200),
        price: z.number().min(0).max(100_000_000),
        cost: z.number().min(0).max(100_000_000).optional(),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(50),
  total: z.number().min(0).max(100_000_000),
  delivery_fee: z.number().min(0).max(100_000_000).optional(),
});

const deliveryFeeSchema = z.object({
  id: uuid,
  delivery_fee: z.number().min(0).max(100_000_000),
});

// ---------- PRODUCTS ----------

export const adminListProducts = createServerFn({ method: "GET" }).handler(async () => {
  assertAdmin();
  const { data, error } = await supabaseAdmin
    .from("products")
    .select("*")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => productInputSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const payload = {
      name: data.name,
      description: data.description?.trim() || null,
      price: data.price,
      cost_price: data.cost_price,
      category: data.category,
      image_url: data.image_url?.trim() || null,
      available: data.available,
      sort_order: data.sort_order,
      promo_price: data.promo_price ?? null,
      promo_active: data.promo_active ?? false,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("products").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("products").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminToggleProduct = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => toggleSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const { error } = await supabaseAdmin
      .from("products")
      .update({ available: data.available })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminTogglePromo = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => promoToggleSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const { error } = await supabaseAdmin
      .from("products")
      .update({ promo_active: data.promo_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const adminDeleteProduct = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- ORDERS ----------

export const adminListOrders = createServerFn({ method: "GET" }).handler(async () => {
  assertAdmin();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const adminCreateManualOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => manualOrderSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    // Resolve cost from catalog when item.id is provided and cost not set explicitly
    const idsNeedingCost = data.items
      .filter((i) => i.id && (i.cost === undefined || i.cost === null))
      .map((i) => i.id!) as string[];
    const costById = new Map<string, number>();
    if (idsNeedingCost.length > 0) {
      const { data: prods } = await supabaseAdmin
        .from("products")
        .select("id, cost_price")
        .in("id", idsNeedingCost);
      for (const p of prods ?? []) costById.set(p.id, Number(p.cost_price) || 0);
    }
    const itemsWithCost = data.items.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      cost: i.cost !== undefined ? i.cost : (i.id ? costById.get(i.id) ?? 0 : 0),
      quantity: i.quantity,
    }));
    const total_cost = itemsWithCost.reduce((s, i) => s + Number(i.cost) * i.quantity, 0);
    const { error } = await supabaseAdmin.from("orders").insert({
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_address: data.customer_address,
      payment_method: data.payment_method,
      notes: data.notes?.trim() || null,
      items: itemsWithCost,
      total: data.total,
      total_cost,
      delivery_fee: data.delivery_fee ?? 0,
      source: "manual",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderStatusSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateOrderPayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => paymentStatusSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ payment_status: data.payment_status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateManualOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    manualOrderSchema.extend({ id: uuid }).parse(input),
  )
  .handler(async ({ data }) => {
    assertAdmin();
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("orders")
      .select("source")
      .eq("id", data.id)
      .single();
    if (fetchErr) throw new Error(fetchErr.message);
    if (existing?.source !== "manual") {
      throw new Error("Solo se pueden editar pedidos manuales");
    }
    const idsNeedingCost = data.items
      .filter((i) => i.id && (i.cost === undefined || i.cost === null))
      .map((i) => i.id!) as string[];
    const costById = new Map<string, number>();
    if (idsNeedingCost.length > 0) {
      const { data: prods } = await supabaseAdmin
        .from("products")
        .select("id, cost_price")
        .in("id", idsNeedingCost);
      for (const p of prods ?? []) costById.set(p.id, Number(p.cost_price) || 0);
    }
    const itemsWithCost = data.items.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      cost: i.cost !== undefined ? i.cost : (i.id ? costById.get(i.id) ?? 0 : 0),
      quantity: i.quantity,
    }));
    const total_cost = itemsWithCost.reduce((s, i) => s + Number(i.cost) * i.quantity, 0);
    const { error } = await supabaseAdmin
      .from("orders")
      .update({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_address: data.customer_address,
        payment_method: data.payment_method,
        notes: data.notes?.trim() || null,
        items: itemsWithCost,
        total: data.total,
        total_cost,
        delivery_fee: data.delivery_fee ?? 0,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateOrderDeliveryFee = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deliveryFeeSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ delivery_fee: data.delivery_fee })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const { error } = await supabaseAdmin.from("orders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- EXPENSES (EGRESOS) ----------

const sectionSchema = z.enum(["compras", "gastos"]);

const expenseInputSchema = z.object({
  id: uuid.optional(),
  section: sectionSchema,
  category: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional().default(""),
  quantity: z.number().min(0).max(1_000_000),
  amount: z.number().min(0).max(100_000_000),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida"),
  catalog_item_id: uuid.nullable().optional(),
});

export const adminListExpenses = createServerFn({ method: "GET" }).handler(async () => {
  assertAdmin();
  const { data, error } = await supabaseAdmin
    .from("expenses")
    .select("*")
    .order("expense_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const adminUpsertExpense = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => expenseInputSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const payload = {
      section: data.section,
      category: data.category,
      description: data.description ?? "",
      quantity: data.quantity,
      amount: data.amount,
      expense_date: data.expense_date,
      catalog_item_id: data.catalog_item_id ?? null,
    };
    if (data.id) {
      const { error } = await supabaseAdmin.from("expenses").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("expenses").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminDeleteExpense = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const { error } = await supabaseAdmin.from("expenses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- EXPENSE CATEGORIES (editable) ----------

const expenseCategoryInputSchema = z.object({
  id: uuid.optional(),
  section: sectionSchema,
  name: z.string().trim().min(1).max(100),
});

export const adminListExpenseCategories = createServerFn({ method: "GET" }).handler(async () => {
  assertAdmin();
  const { data, error } = await supabaseAdmin
    .from("expense_categories")
    .select("*")
    .order("section", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const adminUpsertExpenseCategory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => expenseCategoryInputSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    if (data.id) {
      const { data: prev } = await supabaseAdmin
        .from("expense_categories")
        .select("name, section")
        .eq("id", data.id)
        .single();
      const { error } = await supabaseAdmin
        .from("expense_categories")
        .update({ name: data.name, section: data.section })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      if (prev && (prev.name !== data.name || prev.section !== data.section)) {
        await supabaseAdmin
          .from("expenses")
          .update({ category: data.name, section: data.section })
          .eq("category", prev.name)
          .eq("section", prev.section);
      }
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("expense_categories")
      .insert({ section: data.section, name: data.name })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row?.id as string };
  });

export const adminDeleteExpenseCategory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const { data: cat } = await supabaseAdmin
      .from("expense_categories")
      .select("name, section")
      .eq("id", data.id)
      .single();
    if (cat) {
      const { count } = await supabaseAdmin
        .from("expenses")
        .select("id", { count: "exact", head: true })
        .eq("category", cat.name)
        .eq("section", cat.section);
      if ((count ?? 0) > 0) {
        throw new Error("No se puede eliminar: hay registros que usan esta categoría.");
      }
    }
    const { error } = await supabaseAdmin
      .from("expense_categories")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- PURCHASE CATALOG ----------

const purchaseCatalogInputSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1).max(200),
  unit: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export const adminListPurchaseCatalog = createServerFn({ method: "GET" }).handler(async () => {
  assertAdmin();
  const { data, error } = await supabaseAdmin
    .from("purchase_catalog")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const adminUpsertPurchaseCatalog = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => purchaseCatalogInputSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const payload = {
      name: data.name,
      unit: data.unit ?? null,
      notes: data.notes ?? null,
    };
    if (data.id) {
      const { error } = await supabaseAdmin
        .from("purchase_catalog")
        .update(payload)
        .eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("purchase_catalog")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row?.id as string };
  });

export const adminDeletePurchaseCatalog = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const { error } = await supabaseAdmin
      .from("purchase_catalog")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListPurchasesByCatalog = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const { data: rows, error } = await supabaseAdmin
      .from("expenses")
      .select("*")
      .eq("catalog_item_id", data.id)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---------- STORE STATUS OVERRIDE ----------
const storeStatusSchema = z.object({
  status_override: z.enum(["auto", "open", "closed"]),
});

export const getStoreStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("store_settings" as any)
    .select("status_override")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return { status_override: ((data as any)?.status_override ?? "auto") as "auto" | "open" | "closed" };
});

export const adminSetStoreStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => storeStatusSchema.parse(input))
  .handler(async ({ data }) => {
    assertAdmin();
    const { error } = await supabaseAdmin
      .from("store_settings" as any)
      .upsert({ id: 1, status_override: data.status_override, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
