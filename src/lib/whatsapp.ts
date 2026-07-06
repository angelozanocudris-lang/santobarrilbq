import type { CartItem } from "./cart";
import { WHATSAPP_NUMBER } from "./format";

type OrderForm = {
  name: string;
  phone: string;
  address: string;
  paymentMethod: string;
  notes?: string;
};

export function buildOrderMessage(items: CartItem[], form: OrderForm) {
  const lines: string[] = [];
  lines.push(`Hola soy ${form.name}. Estoy interesado/a en lo siguiente:`);
  lines.push("");

  const fmt = (n: number) => new Intl.NumberFormat("es-CO").format(n);

  let total = 0;
  for (const item of items) {
    const subtotal = item.price * item.quantity;
    total += subtotal;
    lines.push(`*${item.quantity} ${item.name.toUpperCase()}*`);
    lines.push("");
    lines.push(`Precio: $${fmt(item.price)}`);
    lines.push("");
    lines.push("------------------------");
    lines.push("");
  }

  lines.push(`*Total (NO incluye domicilio):* $${fmt(total)}`);
  lines.push("");
  lines.push(`*Nombre:* ${form.name}`);
  lines.push("");
  lines.push(`*Celular:* ${form.phone}`);
  lines.push("");
  lines.push(`*Dirección:* ${form.address}`);
  lines.push("");
  lines.push(`*Método de pago:* ${form.paymentMethod}`);
  lines.push("");
  lines.push(`*Nota especial:* ${form.notes || "Ninguna"}`);

  return lines.join("\n");
}

export function buildWhatsAppUrl(message: string) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function openWhatsApp(message: string) {
  const url = buildWhatsAppUrl(message);
  window.location.href = url;
}
