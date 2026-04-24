import type { Perfume } from "./types";

/**
 * Devuelve una línea corta de ayuda para mostrar en la tarjeta del producto.
 * Combina género + tipo de fragancia para sugerir uso/ocasión.
 * Ej: "fresco y versátil", "ideal para la noche", "elegante y duradero"
 */
export function perfumeShortHint(perfume: Perfume): string | null {
  const t = perfume.fragrance_type;
  const g = perfume.gender;

  if (t === "intenso") return "Ideal para la noche";
  if (t === "amaderado") return "Elegante y duradero";
  if (t === "fresco") {
    if (g === "hombre") return "Fresco para el día a día";
    if (g === "mujer") return "Luminoso y versátil";
    return "Fresco y versátil";
  }
  if (t === "dulce") {
    if (g === "mujer") return "Dulce y envolvente";
    return "Cálido y envolvente";
  }
  if (g === "unisex") return "Versátil para cualquier momento";
  return null;
}
