/**
 * Remoción determinística de fondo blanco desde los bordes de una imagen.
 *
 * Algoritmo:
 *   1. Cargar la imagen en un <canvas> (intentando CORS).
 *   2. Flood fill (BFS) desde TODOS los píxeles del borde externo.
 *   3. Marcar como transparente solo los píxeles "casi blancos" CONECTADOS
 *      al borde — preservando blancos internos (etiquetas, reflejos, líquido).
 *   4. Devolver un dataURL PNG con transparencia real (alpha = 0 en el fondo).
 *
 * No usa blend, multiply, blur ni IA. Es un recorte real del fondo conectado
 * al borde. Si la imagen no carga por CORS, devolvemos null y el caller hace
 * fallback al src original.
 *
 * Cache en memoria + sessionStorage para no re-procesar la misma URL.
 */

const memCache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();
const SS_PREFIX = "rmwbg::v2::";

// Umbral: un píxel es "blanco/casi blanco" si R,G,B >= THRESHOLD y la
// diferencia max-min entre canales es baja (es decir, gris muy claro o blanco).
const WHITE_THRESHOLD = 238; // 238..255
const CHANNEL_SPREAD = 14; // max - min permitido para considerarlo "blanco neutro"

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
    // No guardar dataURLs gigantes en sessionStorage (limit ~5MB total)
    if (value && value.length < 250_000) {
      sessionStorage.setItem(SS_PREFIX + url, value);
    } else if (value === null) {
      sessionStorage.setItem(SS_PREFIX + url, "__NULL__");
    }
  } catch {
    /* quota exceeded — ignore */
  }
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
    try {
      const img = await loadImage(url);

      // Limitar tamaño para performance (no procesamos > 800px lado mayor)
      const MAX = 800;
      const scale = Math.min(1, MAX / Math.max(img.naturalWidth, img.naturalHeight));
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
        // Tainted canvas (CORS) — no podemos leer píxeles
        return null;
      }

      const px = data.data;
      const total = w * h;

      // Heurística rápida: si los 4 corners no son blancos, probablemente la
      // imagen ya tiene fondo transparente / oscuro. No hacer nada.
      const cornerIdx = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
      const cornersWhite = cornerIdx.filter((i) => isWhitish(px[i], px[i + 1], px[i + 2])).length;
      if (cornersWhite < 2) {
        return null;
      }

      // BFS desde todos los píxeles del borde que sean blancos
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

      // BFS 4-vecinos
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

      // Aplicar transparencia a los píxeles marcados
      let removed = 0;
      for (let p = 0; p < total; p++) {
        if (visited[p]) {
          px[p * 4 + 3] = 0;
          removed++;
        }
      }

      // Si removimos casi nada (<2%) o todo (>98%), descartar
      const ratio = removed / total;
      if (ratio < 0.02 || ratio > 0.98) {
        return null;
      }

      // Anti-aliasing 1px: para los píxeles opacos VECINOS de un transparente,
      // si son casi blancos, bajar su alpha a 128 para evitar borde dentado.
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = y * w + x;
          if (visited[p]) continue;
          const i = p * 4;
          if (!isWhitish(px[i], px[i + 1], px[i + 2])) continue;
          // Es opaco y casi blanco: ¿tiene vecino transparente?
          const hasTransparentNeighbor =
            (x > 0 && visited[p - 1]) ||
            (x < w - 1 && visited[p + 1]) ||
            (y > 0 && visited[p - w]) ||
            (y < h - 1 && visited[p + w]);
          if (hasTransparentNeighbor) {
            px[i + 3] = 110;
          }
        }
      }

      ctx.putImageData(data, 0, 0);
      const out = canvas.toDataURL("image/png");
      return out;
    } catch {
      return null;
    }
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
