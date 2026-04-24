// Número de WhatsApp de Luxury Parfum (formato internacional, sin + ni espacios)
export const WHATSAPP_NUMBER = "5492215716077";

export interface WhatsappPerfumeContext {
  name: string;
  brand?: string | null;
  presentation?: string | null; // ej: "EDP · 100 ml"
  price?: number | null; // USD
  fromPrice?: boolean; // true si es "desde"
  url?: string | null; // link directo al producto
}

/** Construye una URL pública al producto dentro del catálogo. */
export function perfumePublicUrl(perfumeId: string, variantId?: string | null): string {
  const params = new URLSearchParams({ p: perfumeId });
  if (variantId) params.set("v", variantId);
  const qs = params.toString();
  if (typeof window !== "undefined") {
    return `${window.location.origin}/catalogo?${qs}`;
  }
  return `/catalogo?${qs}`;
}

function buildMessage(ctx: WhatsappPerfumeContext): string {
  const lines: string[] = [];
  lines.push("Hola! Me interesa este perfume:");
  lines.push("");
  lines.push(`• ${ctx.name}`);
  if (ctx.brand) {
    lines.push(`• ${ctx.brand}`);
  }
  if (ctx.presentation) {
    lines.push(`• ${ctx.presentation}`);
  }
  if (typeof ctx.price === "number") {
    lines.push(`• ${ctx.fromPrice ? "desde " : ""}$${ctx.price.toFixed(0)} USD`);
  }
  if (ctx.url) {
    lines.push("");
    lines.push(ctx.url);
  }
  lines.push("");
  lines.push("¿Lo tenés disponible? Me gustaría que me asesores.");

  return lines.join("\n");
}

export function whatsappLink(ctxOrName: WhatsappPerfumeContext | string): string {
  const ctx: WhatsappPerfumeContext =
    typeof ctxOrName === "string" ? { name: ctxOrName } : ctxOrName;
  const message = buildMessage(ctx);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function whatsappGeneralLink(): string {
  const message =
    "Hola Luxury Parfum, quisiera asesoramiento personalizado para encontrar mi fragancia ideal. ¿Me ayudan?";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
