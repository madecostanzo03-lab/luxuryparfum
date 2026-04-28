/**
 * Remoción determinística y CONSERVADORA de fondo blanco.
 *
 * Principios:
 *   - SOLO se procesa la imagen si los 4 corners son blancos (claro indicio
 *     de packshot con fondo blanco real).
 *   - Flood-fill 4-vecinos desde TODOS los píxeles blancos del borde, con
 *     un umbral estricto (RGB ≥ 244 y diferencia entre canales ≤ 10).
 *   - El resultado se ACEPTA solo si quedó dentro de un rango razonable
 *     (10%–85% removido). Fuera de eso → null (revisión manual).
 *   - NO usamos blur, multiply, overlay, ni feather. El borde queda nítido.
 *   - Conservamos la resolución original — no down-scale agresivo. Solo se
 *     limita a un techo de 1600px para no explotar memoria/tiempo.
 *   - El alpha es binario (0 o 255). Sin halos translúcidos, sin lavado.
 *
 * Cache:
 *   - Memoria + sessionStorage (con quota guard).
 *   - Cache también incluye los URLs descartados (null) para no reintentar.
 */

const memCache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();
const SS_PREFIX = "rmwbg::v3::";

// Umbrales estrictos: solo blanco "real"
const WHITE_THRESHOLD = 244;
const CHANNEL_SPREAD = 10;

// Aceptamos el resultado si removimos entre 10% y 85% del total
const MIN_REMOVED = 0.1;
const MAX_REMOVED = 0.85;

// Techo de resolución para procesar (mantiene la calidad original alta)
const MAX_DIM = 1600;

function isWhitish(r: number, g: number, b: number): boolean {
  if (r < WHITE_THRESHOLD || g < WHITE_THRESHOLD || b < WHITE_THRESHOLD) return false;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max - min <= CHANNEL_SPREAD;
}

function readSession(url: string): string | null | undefined {
  try {
    const v = sessionStorage.getItem(SS_PREFIX + url);
    if (v === "__NULL__") return null;
    return v ?? undefined;
  } catch {
    return undefined;
  }
}

function writeSession(url: string, value: string | null) {
  try {
    if (value === null) {
      sessionStorage.setItem(SS_PREFIX + url, "__NULL__");
    } else if (value.length < 350_000) {
      sessionStorage.setItem(SS_PREFIX + url, value);
    }
  } catch {
    /* quota — ignore */
  }
}

export type RemovalStatus = "ok" | "no-white-bg" | "too-little" | "too-much" | "load-error" | "tainted";

const statusCache = new Map<string, RemovalStatus>();

export function getRemovalStatus(url: string): RemovalStatus | undefined {
  return statusCache.get(url);
}

export async function removeWhiteBackground(url: string): Promise<string | null> {
  if (!url) return null;
  if (memCache.has(url)) return memCache.get(url)!;

  const cached = readSession(url);
  if (cached !== undefined) {
    memCache.set(url, cached);
    return cached;
  }

  const existing = inFlight.get(url);
  if (existing) return existing;

  const task = (async (): Promise<string | null> => {
    let img: HTMLImageElement;
    try {
      img = await loadImage(url);
    } catch {
      statusCache.set(url, "load-error");
      return null;
    }

    // Mantener resolución original con techo conservador
    const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);

    let data: ImageData;
    try {
      data = ctx.getImageData(0, 0, w, h);
    } catch {
      statusCache.set(url, "tainted");
      return null;
    }

    const px = data.data;
    const total = w * h;

    // Heurística: los 4 corners DEBEN ser blancos. Si no, no es packshot
    // con fondo blanco — no tocar.
    const cornerIdx = [
      0,
      (w - 1) * 4,
      (h - 1) * w * 4,
      ((h - 1) * w + (w - 1)) * 4,
    ];
    const cornersWhite = cornerIdx.filter((i) => isWhitish(px[i], px[i + 1], px[i + 2])).length;
    if (cornersWhite < 4) {
      statusCache.set(url, "no-white-bg");
      return null;
    }

    // BFS desde el borde
    const visited = new Uint8Array(total);
    const queue: number[] = [];

    const enqueueIfWhite = (x: number, y: number) => {
      const p = y * w + x;
      if (visited[p]) return;
      const i = p * 4;
      if (isWhitish(px[i], px[i + 1], px[i + 2])) {
        visited[p] = 1;
        queue.push(p);
      }
    };

    for (let x = 0; x < w; x++) {
      enqueueIfWhite(x, 0);
      enqueueIfWhite(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      enqueueIfWhite(0, y);
      enqueueIfWhite(w - 1, y);
    }

    let head = 0;
    while (head < queue.length) {
      const p = queue[head++];
      const x = p % w;
      const y = (p - x) / w;

      if (x > 0) {
        const np = p - 1;
        if (!visited[np]) {
          const ni = np * 4;
          if (isWhitish(px[ni], px[ni + 1], px[ni + 2])) {
            visited[np] = 1;
            queue.push(np);
          }
        }
      }
      if (x < w - 1) {
        const np = p + 1;
        if (!visited[np]) {
          const ni = np * 4;
          if (isWhitish(px[ni], px[ni + 1], px[ni + 2])) {
            visited[np] = 1;
            queue.push(np);
          }
        }
      }
      if (y > 0) {
        const np = p - w;
        if (!visited[np]) {
          const ni = np * 4;
          if (isWhitish(px[ni], px[ni + 1], px[ni + 2])) {
            visited[np] = 1;
            queue.push(np);
          }
        }
      }
      if (y < h - 1) {
        const np = p + w;
        if (!visited[np]) {
          const ni = np * 4;
          if (isWhitish(px[ni], px[ni + 1], px[ni + 2])) {
            visited[np] = 1;
            queue.push(np);
          }
        }
      }
    }

    let removed = 0;
    for (let p = 0; p < total; p++) {
      if (visited[p]) {
        // Alpha BINARIO — sin translucidez, sin halo, sin lavado
        px[p * 4 + 3] = 0;
        removed++;
      }
    }

    const ratio = removed / total;
    if (ratio < MIN_REMOVED) {
      statusCache.set(url, "too-little");
      return null;
    }
    if (ratio > MAX_REMOVED) {
      statusCache.set(url, "too-much");
      return null;
    }

    ctx.putImageData(data, 0, 0);
    const out = canvas.toDataURL("image/png");
    statusCache.set(url, "ok");
    return out;
  })();

  inFlight.set(url, task);
  const result = await task;
  inFlight.delete(url);
  memCache.set(url, result);
  writeSession(url, result);
  return result;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.referrerPolicy = "no-referrer";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img load failed"));
    img.src = url;
  });
}
