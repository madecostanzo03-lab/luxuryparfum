// Número de WhatsApp de Luxury Parfum (placeholder — el dueño puede cambiarlo)
export const WHATSAPP_NUMBER = "5491100000000";

export function whatsappLink(perfumeName: string): string {
  const message = `Hola, me interesa ${perfumeName}, ¿me ayudás a elegir?`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export function whatsappGeneralLink(): string {
  const message = "Hola, quisiera asesoramiento para encontrar mi fragancia ideal.";
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
