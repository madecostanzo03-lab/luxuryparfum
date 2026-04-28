/**
 * Remoción determinística de fondos claros de packshot (v5).
 *
 * Objetivo: corregir el render real del catálogo, no disimularlo.
 * - Cache versionado bg-cleanup-v5 para forzar reprocesamiento.
 * - Procesa fondos claros conectados al borde externo.
 * - Alpha binario: transparente o intacto, sin blur, sin lavado, sin blend.
 * - Si queda un borde/rectángulo claro visible, marca failed/manual.
 * - No reemplaza ni inventa imágenes.
 */

export type RemovalStatus =
  | "ok"
  | "skipped"
  | "failed-manual"
  | "load-error"
  | "tainted";

export type RemovalReport = {
  status: RemovalStatus;
  output: string | null;
  removedRatio: number;
  whiteRectVisible: boolean;
  reason: string;
};

const memCache = new Map<string, RemovalReport>();
const inFlight = new Map<string, Promise<RemovalReport>>();
const SS_PREFIX = "bg-cleanup-v5b::";

const MAX_DIM = 1800;
const MIN_EDGE_LIGHT_RATIO = 0.28;
const MIN_REMOVED_RATIO = 0.04;
const MAX_REMOVED_RATIO = 0.965;

const defaultReport = (status: RemovalStatus, reason: string): RemovalReport => ({
  status,
  output: null,
  removedRatio: 0,
  whiteRectVisible: status !== "ok",
  reason,
});

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function chromaSpread(r: number, g: number, b: number): number {
  return Math.max(r, g, b) - Math.min(r, g, b);
}

function dist(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function isLightNeutral(r: number, g: number, b: number, minLuma = 182): boolean {
  const y = luma(r, g, b);
  if (y >= 232) return true;
  if (y < minLuma) return false;
  return chromaSpread(r, g, b) <= 42;
}

function readSession(url: string): RemovalReport | undefined {
  try {
    const raw = sessionStorage.getItem(SS_PREFIX + url);
    if (!raw) return undefined;
    return JSON.parse(raw) as RemovalReport;
  } catch {
    return undefined;
  }
}

function writeSession(url: string, report: RemovalReport) {
  try {
    if (report.output && report.output.length > 420_000) {
      sessionStorage.setItem(SS_PREFIX + url, JSON.stringify({ ...report, output: null, status: "failed-manual", reason: "processed-output-too-large" }));
      return;
    }
    sessionStorage.setItem(SS_PREFIX + url, JSON.stringify(report));
  } catch {
    /* quota — ignore */
  }
}

export function getRemovalStatus(url: string): RemovalStatus | undefined {
  return memCache.get(url)?.status;
}

export async function removeWhiteBackground(url: string, options: { force?: boolean } = {}): Promise<string | null> {
  const report = await removeWhiteBackgroundWithReport(url, options);
  return report.status === "ok" ? report.output : null;
}

export async function removeWhiteBackgroundWithReport(
  url: string,
  options: { force?: boolean } = {},
): Promise<RemovalReport> {
  if (!url) return defaultReport("failed-manual", "missing-url");
  const cacheKey = `${url}::force=${options.force ? "1" : "0"}`;

  if (memCache.has(cacheKey)) return memCache.get(cacheKey)!;

  const cached = readSession(cacheKey);
  if (cached) {
    memCache.set(cacheKey, cached);
    return cached;
  }

  const existing = inFlight.get(cacheKey);
  if (existing) return existing;

  const task = processImage(url, Boolean(options.force));
  inFlight.set(cacheKey, task);
  const result = await task;
  inFlight.delete(cacheKey);
  memCache.set(cacheKey, result);
  writeSession(cacheKey, result);
  return result;
}

async function processImage(url: string, force: boolean): Promise<RemovalReport> {
  let img: HTMLImageElement;
  try {
    img = await loadImage(url);
  } catch {
    return defaultReport("load-error", "image-load-error");
  }

  const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return defaultReport("failed-manual", "canvas-context-error");
  ctx.drawImage(img, 0, 0, w, h);

  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, w, h);
  } catch {
    return defaultReport("tainted", "canvas-tainted");
  }

  const px = data.data;
  const total = w * h;
  const border: number[] = [];

  const pushBorder = (x: number, y: number) => border.push(y * w + x);
  for (let x = 0; x < w; x++) {
    pushBorder(x, 0);
    pushBorder(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    pushBorder(0, y);
    pushBorder(w - 1, y);
  }

  const lightBorder = border.filter((p) => {
    const i = p * 4;
    return isLightNeutral(px[i], px[i + 1], px[i + 2], force ? 170 : 182);
  });
  const edgeLightRatio = lightBorder.length / Math.max(1, border.length);

  if (!force && edgeLightRatio < MIN_EDGE_LIGHT_RATIO) {
    return defaultReport("skipped", "edge-not-light-packshot");
  }
  if (force && lightBorder.length < Math.max(8, border.length * 0.08)) {
    return defaultReport("failed-manual", "forced-but-no-light-edge");
  }

  const bg = sampleBackground(px, lightBorder.length ? lightBorder : border);
  const minLuma = force ? 168 : 178;
  const maxDistance = force ? 92 : 74;

  const isBackground = (p: number): boolean => {
    const i = p * 4;
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const y = luma(r, g, b);
    if (y < minLuma) return false;
    if (y >= 238 && chromaSpread(r, g, b) <= 58) return true;
    if (isLightNeutral(r, g, b, minLuma) && dist(r, g, b, bg.r, bg.g, bg.b) <= maxDistance) return true;
    return y >= 218 && dist(r, g, b, bg.r, bg.g, bg.b) <= maxDistance + 20;
  };

  const visited = new Uint8Array(total);
  const queue: number[] = [];
  const enqueue = (p: number) => {
    if (visited[p]) return;
    if (isBackground(p)) {
      visited[p] = 1;
      queue.push(p);
    }
  };

  for (const p of border) enqueue(p);

  let head = 0;
  while (head < queue.length) {
    const p = queue[head++];
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) enqueue(p - 1);
    if (x < w - 1) enqueue(p + 1);
    if (y > 0) enqueue(p - w);
    if (y < h - 1) enqueue(p + w);
  }

  let removed = 0;
  for (let p = 0; p < total; p++) {
    if (visited[p]) removed++;
  }

  const removedRatio = removed / total;
  if (removedRatio < (force ? 0.025 : MIN_REMOVED_RATIO)) {
    return {
      ...defaultReport(force ? "failed-manual" : "skipped", "too-little-background-removed"),
      removedRatio,
    };
  }
  if (removedRatio > MAX_REMOVED_RATIO) {
    return {
      ...defaultReport("failed-manual", "too-much-background-removed"),
      removedRatio,
    };
  }

  const objectMass = remainingObjectMass(visited, w, h);
  if (objectMass < (force ? 0.012 : 0.02)) {
    return {
      ...defaultReport("failed-manual", "object-mass-too-small"),
      removedRatio,
    };
  }

  for (let p = 0; p < total; p++) {
    if (visited[p]) px[p * 4 + 3] = 0;
  }

  const whiteRectVisible = hasVisibleWhiteRectangle(px, visited, w, h);
  if (whiteRectVisible) {
    return {
      ...defaultReport("failed-manual", "white-rectangle-still-visible"),
      removedRatio,
      whiteRectVisible: true,
    };
  }

  ctx.putImageData(data, 0, 0);
  return {
    status: "ok",
    output: canvas.toDataURL("image/png"),
    removedRatio,
    whiteRectVisible: false,
    reason: "processed-transparent",
  };
}

function sampleBackground(px: Uint8ClampedArray, samples: number[]): { r: number; g: number; b: number } {
  const sorted = samples
    .map((p) => {
      const i = p * 4;
      return { p, y: luma(px[i], px[i + 1], px[i + 2]) };
    })
    .sort((a, b) => b.y - a.y)
    .slice(0, Math.max(12, Math.floor(samples.length * 0.65)));

  let r = 0, g = 0, b = 0;
  for (const s of sorted) {
    const i = s.p * 4;
    r += px[i];
    g += px[i + 1];
    b += px[i + 2];
  }
  const n = Math.max(1, sorted.length);
  return { r: r / n, g: g / n, b: b / n };
}

function remainingObjectMass(visited: Uint8Array, w: number, h: number): number {
  const x0 = Math.floor(w * 0.22);
  const x1 = Math.ceil(w * 0.78);
  const y0 = Math.floor(h * 0.14);
  const y1 = Math.ceil(h * 0.90);
  let kept = 0;
  const area = Math.max(1, (x1 - x0) * (y1 - y0));
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (!visited[y * w + x]) kept++;
    }
  }
  return kept / area;
}

function hasVisibleWhiteRectangle(px: Uint8ClampedArray, removed: Uint8Array, w: number, h: number): boolean {
  const band = Math.max(6, Math.floor(Math.min(w, h) * 0.08));
  let checked = 0;
  let opaqueLight = 0;

  const check = (x: number, y: number) => {
    const p = y * w + x;
    if (removed[p]) return;
    const i = p * 4;
    checked++;
    if (px[i + 3] > 8 && isLightNeutral(px[i], px[i + 1], px[i + 2], 185)) opaqueLight++;
  };

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < band || x >= w - band || y < band || y >= h - band) check(x, y);
    }
  }

  return checked > 0 && opaqueLight / checked > 0.06;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  const attempt = (withCors: boolean) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    if (withCors) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("img load failed"));
    img.src = url;
  });

  return attempt(true).catch(() => attempt(false));
}
