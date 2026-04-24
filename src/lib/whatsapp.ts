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
  lines.push("Hola Luxury Parfum 👋");
  lines.push("");
  lines.push("Estoy interesado/a en esta fragancia:");

  const titleParts = [ctx.brand, ctx.name].filter(Boolean).join(" — ");
  lines.push(`• ${titleParts}`);

  if (ctx.presentation) {
    lines.push(`• Presentación: ${ctx.presentation}`);
  }
  if (typeof ctx.price === "number") {
    lines.push(`• Precio${ctx.fromPrice ? " desde" : ""}: USD ${ctx.price.toFixed(0)}`);
  }
  if (ctx.url) {
    lines.push(`• Link: ${ctx.url}`);
  }

  lines.push("");
  lines.push("¿Está disponible? Quiero confirmar stock y coordinar la compra. ¡Gracias!");

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
    "Hola Luxury Parfum 👋 Quisiera asesoramiento personalizado para encontrar mi fragancia ideal. ¿Me ayudan?";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
