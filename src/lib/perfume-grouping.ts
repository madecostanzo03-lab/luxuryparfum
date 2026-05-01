// Agrupación visual de perfumes — SOLO frontend.
// No modifica la base de datos. Cada SKU sigue existiendo en Supabase.
//
// La agrupación se basa en una WHITELIST explícita de "nombres base" por marca,
// donde sabemos que solo cambia el tamaño (ML). Esto es deliberadamente
// conservador para evitar agrupar versiones distintas (EDT vs EDP, Blush, etc.).
//
// Cada entrada describe el conjunto de productos que deben fusionarse en una
// sola tarjeta visual. Para que dos perfumes se agrupen, deben:
//   1. Pertenecer a la marca indicada (slug).
//   2. Coincidir, tras quitar el sufijo de tamaño, con el "baseName" exacto.
//
// IMPORTANTE: Los nombres base que se muestran en la card son extraídos del
// propio `perfume.name` original (solo se quita el ML). NO se traduce nada.

import type { Perfume, PerfumeVariant } from "./types";

interface GroupRule {
  brandSlug: string;
  // Nombre normalizado (uppercase, sin tamaño, sin espacios dobles) que deben
  // compartir TODAS las variantes para fusionarse.
  normalizedName: string;
}

// Las 7 agrupaciones detectadas en la auditoría — candidatas a aplicar.
export const GROUP_RULES: GroupRule[] = [
  { brandSlug: "hugo-boss", normalizedName: "HUGO BOSS JEANS EDT" },
  { brandSlug: "david-beckham", normalizedName: "DAVID BECKHAM CLASSIC EDT" },
  { brandSlug: "paco-rabanne", normalizedName: "PACO RABANNE OLYMPEA ABSOLU PARFUM INTENSE" },
  { brandSlug: "paco-rabanne", normalizedName: "PACO RABANNE 1 MILLION PARFUM" },
  { brandSlug: "paco-rabanne", normalizedName: "PACO RABANNE PHANTOM INTENSE EDP" },
  { brandSlug: "paco-rabanne", normalizedName: "PACO RABANNE MILLION GOLD ELIXIR PARFUM INTENSE" },
  { brandSlug: "calvin-klein", normalizedName: "CALVIN KLEIN ETERNITY AROMAT ESSENC PARFUM" },
];

export function ruleKey(r: { brandSlug: string; normalizedName: string }): string {
  return `${r.brandSlug}::${r.normalizedName}`;
}

// Decisiones del admin: aprobadas por defecto = TODAS las reglas.
// Si querés revisar manualmente, la página /admin/agrupacion-variantes permite
// rechazar o marcar para revisar después y persiste en localStorage.
const STORAGE_KEY = "lp.grouping.decisions.v1";

export type GroupDecision = "approved" | "rejected" | "review";

export function loadDecisions(): Record<string, GroupDecision> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, GroupDecision>;
  } catch {
    return {};
  }
}

export function saveDecisions(decisions: Record<string, GroupDecision>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
}

/** Devuelve el set de keys de reglas que el admin aprobó (default: todas). */
function getActiveRuleSet(): Set<string> {
  const decisions = loadDecisions();
  const active = new Set<string>();
  for (const r of GROUP_RULES) {
    const k = ruleKey(r);
    // Por defecto: aprobado. Solo se desactiva si fue marcado "rejected" o "review".
    const d = decisions[k] ?? "approved";
    if (d === "approved") active.add(k);
  }
  return active;
}

// Detecta kits/sets — NUNCA se agrupan.
const KIT_PAT = /\bKIT\b|\+|\bBODY\b|\bDEO\b|\bLOTION\b|BODY\s*LOTION/i;

// Quita SOLO el sufijo de tamaño del nombre, conservando todo lo demás.
// Ej: "PACO RABANNE 1 MILLION PARFUM 100ML" → "PACO RABANNE 1 MILLION PARFUM"
export function stripSizeSuffix(name: string): string {
  let n = name.toUpperCase().trim();
  // Quitar "100ML", "100 ML", "100ML.", etc.
  n = n.replace(/\b\d{2,3}\s*(ML|ML\.|M\.L\.|G|GR|GRS)\b/gi, " ");
  // Quitar números sueltos al final (ej: "EDT 100")
  n = n.replace(/\s+\d{2,3}\s*$/g, " ");
  // Colapsar espacios y limpiar
  n = n.replace(/\s+/g, " ").trim();
  n = n.replace(/[.\-+\s]+$/g, "");
  return n;
}

// Extrae el tamaño en ml desde el nombre del producto. Devuelve null si no se encuentra.
export function extractSizeMl(name: string): number | null {
  const m = name.match(/\b(\d{2,3})\s*ML\b/i);
  return m ? parseInt(m[1], 10) : null;
}

// Etiqueta de presentación para el selector del modal.
export function presentationLabel(p: Perfume): string {
  const ml = extractSizeMl(p.name);
  if (ml) return `${ml} ml`;
  if (p.size_ml) return `${p.size_ml} ml`;
  return "Única";
}

export interface GroupedPerfume extends Perfume {
  // Cuando es un grupo, guarda los SKUs originales que lo componen
  // (cada uno mantiene su id, precio, name, image_url, etc. intactos).
  groupedSkus?: Perfume[];
}

/**
 * Agrupa visualmente los perfumes según la whitelist.
 * No muta los inputs. Cada producto agrupado expone:
 *   - perfume principal con el menor precio del grupo (para "desde")
 *   - groupedSkus[] con cada variante original
 *   - variants[] sintéticas para que el modal muestre el selector
 */
export function groupPerfumes(perfumes: Perfume[]): GroupedPerfume[] {
  const activeRules = getActiveRuleSet();
  const buckets = new Map<string, Perfume[]>();
  const standalone: Perfume[] = [];

  for (const p of perfumes) {
    if (KIT_PAT.test(p.name)) {
      standalone.push(p);
      continue;
    }
    const brandSlug = p.brand?.slug ?? "";
    const norm = stripSizeSuffix(p.name);
    const key = `${brandSlug}::${norm}`;

    if (activeRules.has(key)) {
      const bucket = buckets.get(key) ?? [];
      bucket.push(p);
      buckets.set(key, bucket);
    } else {
      standalone.push(p);
    }
  }

  const grouped: GroupedPerfume[] = [];

  for (const [, skus] of buckets) {
    if (skus.length < 2) {
      // Si por algún motivo solo cayó 1 SKU en una regla, lo dejamos individual.
      grouped.push(...skus);
      continue;
    }
    // Ordenar por tamaño ascendente
    const sorted = [...skus].sort((a, b) => {
      const sa = extractSizeMl(a.name) ?? a.size_ml ?? 0;
      const sb = extractSizeMl(b.name) ?? b.size_ml ?? 0;
      return sa - sb;
    });

    // El "principal" es el de menor precio (para mostrar "desde USD X")
    const cheapest = [...sorted].sort((a, b) => a.price - b.price)[0];
    // Mejor imagen disponible: primera variante que tenga clean_image_url, sino image_url
    const bestImg =
      sorted.find((s) => s.clean_image_url)?.clean_image_url ??
      sorted.find((s) => s.image_url)?.image_url ??
      cheapest.image_url ??
      null;
    const bestCleanImg =
      sorted.find((s) => s.clean_image_url)?.clean_image_url ?? null;

    // Construir variantes sintéticas para el modal. El id es el id del SKU
    // original — esto permite que WhatsApp/URL apunten al SKU correcto.
    const syntheticVariants: PerfumeVariant[] = sorted.map((s) => ({
      id: s.id,
      perfume_id: cheapest.id,
      concentration: s.concentration,
      size_ml: extractSizeMl(s.name) ?? s.size_ml ?? null,
      price: s.price,
      in_stock: s.in_stock,
    }));

    // base_name visible en la card: nombre original sin el ML.
    // Usamos el nombre del SKU más barato como base, le quitamos el sufijo.
    const baseName = stripSizeSuffix(cheapest.name);

    grouped.push({
      ...cheapest,
      base_name: baseName,
      price: cheapest.price, // menor precio del grupo
      image_url: bestImg,
      clean_image_url: bestCleanImg,
      variants: syntheticVariants,
      groupedSkus: sorted,
    });
  }

  return [...grouped, ...standalone];
}

/**
 * Para búsqueda: dado un texto de búsqueda, indica si el grupo contiene
 * alguna variante cuyo nombre coincida. Usado solo en filtrado client-side
 * cuando ya tenemos los grupos armados.
 */
export function groupMatchesQuery(g: GroupedPerfume, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (g.name.toLowerCase().includes(q)) return true;
  if (g.base_name?.toLowerCase().includes(q)) return true;
  if (g.brand?.name.toLowerCase().includes(q)) return true;
  if (g.groupedSkus) {
    return g.groupedSkus.some((s) => s.name.toLowerCase().includes(q));
  }
  return false;
}
