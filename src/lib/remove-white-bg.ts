/**
 * Remoción determinística de fondos claros de packshot (v4 — adaptativa).
 *
 * Mejoras vs v3:
 *   - Ya NO exige que las 4 esquinas sean blanco puro. Ahora muestrea TODO
 *     el perímetro y calcula el color de fondo dominante adaptativo.
 *   - Acepta blancos rotos, gris muy claro, blanco con compresión JPEG,
 *     sombras suaves y fondos de estudio que no son blanco puro.
 *   - El umbral de "es fondo" se calcula por imagen: el píxel se considera
 *     fondo si está dentro de una distancia perceptual del color de fondo
 *     muestreado y además es claro (luminancia ≥ 200).
 *   - Flood-fill 4-vecinos desde TODO el perímetro (no solo blancos puros).
 *   - Alpha BINARIO (0/255) → bordes nítidos, sin halo, sin lavado, sin blur.
 *   - Validación de resultado: el área eliminada debe ser razonable (8%–92%)
 *     y el "objeto" remanente debe tener masa central — si no, se descarta.
 *   - Conserva resolución original (techo 1800px solo por memoria).
 *
 * Sin IA generativa. Sin blur. Sin multiply. Sin niebla. Sin reemplazo de
 * imagen. Solo limpieza del fondo del proveedor.
 */

const memCache = new Map<string, string | null>();
const inFlight = new Map<string, Promise<string | null>>();
const SS_PREFIX = "rmwbg::v4::";

// Luminancia mínima para considerar un píxel como "claro" (fondo posible)
const MIN_LIGHT_LUMA = 200;
// Distancia perceptual máxima al color de fondo dominante (0–441 espacio RGB)
const MAX_BG_DISTANCE = 26;
// Para considerar el perímetro como "fondo de estudio claro": mediana de
// luminancia del perímetro debe superar este umbral.
const PERIMETER_MIN_MEDIAN_LUMA = 215;
// El color del perímetro debe ser razonablemente uniforme (desviación baja)
const PERIMETER_MAX_STDDEV = 22;

// Aceptamos resultado si removemos entre 8% y 92% del total
const MIN_REMOVED = 0.08;
const MAX_REMOVED = 0.92;

const MAX_DIM = 1800;

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function dist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
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
    } else if (value.length < 400_000) {
      sessionStorage.setItem(SS_PREFIX + url, value);
    }
  } catch {
    /* quota — ignore */
  }
}

export type RemovalStatus =
  | "ok"
  | "no-light-bg"
  | "perimeter-not-uniform"
  | "too-little"
  | "too-much"
  | "no-central-object"
  | "load-error"
  | "tainted";

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

    // === Paso 1: Muestreo del perímetro ===
    // Tomamos cada píxel del borde y calculamos: mediana de luminancia,
    // color promedio del perímetro y desviación.
    const perimSamples: number[][] = [];
    const lumas: number[] = [];

    const sampleBorderPixel = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      const r = px[i], g = px[i + 1], b = px[i + 2];
      perimSamples.push([r, g, b]);
      lumas.push(luma(r, g, b));
    };

    for (let x = 0; x < w; x++) {
      sampleBorderPixel(x, 0);
      sampleBorderPixel(x, h - 1);
    }
    for (let y = 1; y < h - 1; y++) {
      sampleBorderPixel(0, y);
      sampleBorderPixel(w - 1, y);
    }

    lumas.sort((a, b) => a - b);
    const medianLuma = lumas[Math.floor(lumas.length / 2)];

    if (medianLuma < PERIMETER_MIN_MEDIAN_LUMA) {
      // Perímetro no es claro → no es packshot con fondo claro. No tocar.
      statusCache.set(url, "no-light-bg");
      return null;
    }

    // Color de fondo dominante: promedio de los píxeles del perímetro
    // cuya luminancia esté por encima de la mediana (descarta sombras
    // del frasco que pudieran tocar el borde).
    let sumR = 0, sumG = 0, sumB = 0, count = 0;
    for (let i = 0; i < perimSamples.length; i++) {
      const [r, g, b] = perimSamples[i];
      if (luma(r, g, b) >= medianLuma) {
        sumR += r; sumG += g; sumB += b; count++;
      }
    }
    const bgR = sumR / count;
    const bgG = sumG / count;
    const bgB = sumB / count;

    // Desviación del perímetro respecto al color de fondo
    let varSum = 0;
    for (let i = 0; i < perimSamples.length; i++) {
      const [r, g, b] = perimSamples[i];
      if (luma(r, g, b) >= MIN_LIGHT_LUMA) {
        varSum += dist(r, g, b, bgR, bgG, bgB) ** 2;
      }
    }
    const stddev = Math.sqrt(varSum / Math.max(1, count));

    if (stddev > PERIMETER_MAX_STDDEV) {
      // Perímetro inconsistente (no es fondo de estudio uniforme)
      statusCache.set(url, "perimeter-not-uniform");
      return null;
    }

    // === Paso 2: Predicado adaptativo ===
    // Píxel es "fondo" si:
    //   - es claro (luma ≥ MIN_LIGHT_LUMA), Y
    //   - está cerca del color de fondo dominante
    const isBg = (r: number, g: number, b: number): boolean => {
      if (luma(r, g, b) < MIN_LIGHT_LUMA) return false;
      return dist(r, g, b, bgR, bgG, bgB) <= MAX_BG_DISTANCE;
    };

    // === Paso 3: Flood-fill desde TODO el perímetro ===
    const visited = new Uint8Array(total);
    const queue: number[] = [];

    const enqueueIfBg = (x: number, y: number) => {
      const p = y * w + x;
      if (visited[p]) return;
      const i = p * 4;
      if (isBg(px[i], px[i + 1], px[i + 2])) {
        visited[p] = 1;
        queue.push(p);
      }
    };

    for (let x = 0; x < w; x++) {
      enqueueIfBg(x, 0);
      enqueueIfBg(x, h - 1);
    }
    for (let y = 0; y < h; y++) {
      enqueueIfBg(0, y);
      enqueueIfBg(w - 1, y);
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
          if (isBg(px[ni], px[ni + 1], px[ni + 2])) {
            visited[np] = 1; queue.push(np);
          }
        }
      }
      if (x < w - 1) {
        const np = p + 1;
        if (!visited[np]) {
          const ni = np * 4;
          if (isBg(px[ni], px[ni + 1], px[ni + 2])) {
            visited[np] = 1; queue.push(np);
          }
        }
      }
      if (y > 0) {
        const np = p - w;
        if (!visited[np]) {
          const ni = np * 4;
          if (isBg(px[ni], px[ni + 1], px[ni + 2])) {
            visited[np] = 1; queue.push(np);
          }
        }
      }
      if (y < h - 1) {
        const np = p + w;
        if (!visited[np]) {
          const ni = np * 4;
          if (isBg(px[ni], px[ni + 1], px[ni + 2])) {
            visited[np] = 1; queue.push(np);
          }
        }
      }
    }

    // === Paso 4: Validar que el objeto central sigue ahí ===
    // Si el centro de la imagen quedó eliminado, algo salió mal.
    const cx = (w >> 1);
    const cy = (h >> 1);
    let centralMass = 0;
    const sampleR = Math.min(w, h) >> 3; // ventana 1/8
    for (let dy = -sampleR; dy <= sampleR; dy++) {
      for (let dx = -sampleR; dx <= sampleR; dx++) {
        const xx = cx + dx;
        const yy = cy + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        if (!visited[yy * w + xx]) centralMass++;
      }
    }
    const centralArea = (sampleR * 2 + 1) ** 2;
    if (centralMass / centralArea < 0.5) {
      // Más de la mitad del centro fue clasificado como fondo → riesgo
      // de comerse el frasco. Descartar.
      statusCache.set(url, "no-central-object");
      return null;
    }

    // === Paso 5: Aplicar alpha binario ===
    let removed = 0;
    for (let p = 0; p < total; p++) {
      if (visited[p]) {
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
