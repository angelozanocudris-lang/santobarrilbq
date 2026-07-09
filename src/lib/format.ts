// Formato compacto en miles: 48000 -> $48K, 12500 -> $12.5K, 800 -> $800
export const formatCOP = (value: number) => {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1000) {
    const thousands = n / 1000;
    // máximo 1 decimal, sin ceros sobrantes (12.5K, 48K)
    const str = thousands.toFixed(1).replace(/\.0$/, "");
    return `$${str}K`;
  }
  return `$${n.toLocaleString("es-CO")}`;
};

// WhatsApp number for orders (con código país, sin +)
export const WHATSAPP_NUMBER = "573177921086";
export const RESTAURANT_NAME = "SANTO BARRIL";
