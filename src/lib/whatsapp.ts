// Número de WhatsApp de Luxury Parfum (placeholder — el dueño puede cambiarlo)
export const WHATSAPP_NUMBER = "5491100000000";

export interface WhatsappPerfumeContext {
  name: string;
  brand?: string | null;
  presentation?: string | null; // ej: "EDP · 100 ml"
  price?: number | null; // USD
  fromPrice?: boolean; // true si es "desde"
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
