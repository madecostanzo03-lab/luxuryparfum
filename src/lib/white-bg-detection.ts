/**
 * Heurística client-side para marcar productos cuya imagen probablemente
 * tiene fondo blanco/muy claro y necesita reemplazo manual.
 *
 * Importante: NO modifica ninguna imagen. Solo devuelve un booleano para
 * mostrar un badge admin-only en el catálogo. La detección verdadera
 * (análisis de píxeles) ya se hace en SmartImage; acá usamos una pista
 * por URL para no tener que pintar el canvas en cada card.
 *
 * Reglas:
 *  - Si la imagen vive en el bucket `clean-images/` se asume sin fondo blanco.
 *  - Cualquier URL que tenga el segmento `/clean-images/` también se considera limpia.
 *  - El resto (image_url externo, fallback, vacío) se marca como "revisar".
 */
export function looksLikeWhiteBackground(opts: {
  cleanImageUrl: string | null | undefined;
  imageUrl: string | null | undefined;
}): boolean {
  const clean = opts.cleanImageUrl?.trim();
  if (clean && clean.length > 0) {
    // Imagen ya curada en nuestro bucket: confiamos en que no tiene fondo blanco.
    if (clean.includes("/clean-images/")) return false;
    // clean_image_url externo (raro): no podemos garantizarlo, marcamos.
    return true;
  }
  // No hay clean_image_url: usa fallback image_url externo => probable fondo blanco.
  return !!opts.imageUrl;
}
