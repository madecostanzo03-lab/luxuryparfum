import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { assignManualImage } from "@/server/clean-images.functions";
import { HIDDEN_BRAND_SLUG_SET } from "@/lib/hidden-brands";
import { Loader2, Upload, CheckCircle2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/fondos-blancos")({
  head: () => ({
    meta: [
      { title: "Fondos blancos — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: FondosBlancosPage,
});

type PerfumeRow = {
  id: string;
  name: string;
  base_name: string | null;
  image_url: string | null;
  clean_image_url: string | null;
  brand: { name: string; slug: string } | null;
};

type ScanState = "pending" | "scanning" | "white" | "ok" | "error";

interface ScanResult {
  perfume: PerfumeRow;
  state: ScanState;
  whiteRatio: number;
  imageUsed: string | null;
}

// ---- Detección de fondo blanco --------------------------------------------------
//
// Cargamos la imagen vía proxy interno para evitar CORS, dibujamos en canvas y
// muestreamos 5 puntos: 4 esquinas y centro. Si ≥3 esquinas son "muy claras"
// (R,G,B > 235) → fondo blanco. El centro NO se usa para clasificar (puede ser
// el frasco), solo se reporta.
async function detectWhiteBackground(url: string): Promise<{ isWhite: boolean; ratio: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const finalSrc = url.startsWith("/api/") || url.startsWith(window.location.origin)
      ? url
      : `/api/public/image-proxy?url=${encodeURIComponent(url)}`;

    const timeout = setTimeout(() => resolve({ isWhite: false, ratio: 0 }), 8000);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        const w = (canvas.width = 80);
        const h = (canvas.height = 80);
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve({ isWhite: false, ratio: 0 });
        ctx.drawImage(img, 0, 0, w, h);
        const samples = [
          [2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3], // esquinas
        ];
        let lightCorners = 0;
        for (const [x, y] of samples) {
          const d = ctx.getImageData(x, y, 1, 1).data;
          if (d[0] > 235 && d[1] > 235 && d[2] > 235 && d[3] > 200) lightCorners++;
        }
        const ratio = lightCorners / samples.length;
        resolve({ isWhite: lightCorners >= 3, ratio });
      } catch {
        resolve({ isWhite: false, ratio: 0 });
      }
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve({ isWhite: false, ratio: 0 });
    };
    img.src = finalSrc;
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function FondosBlancosPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [perfumes, setPerfumes] = useState<PerfumeRow[]>([]);
  const [results, setResults] = useState<Map<string, ScanResult>>(new Map());
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const assignFn = useServerFn(assignManualImage);

  // Auth + admin gate
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAuthed(false); setIsAdmin(false); return; }
      setAuthed(true);
      setAccessToken(session.access_token);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();
      setIsAdmin(!!roles);
    })();
  }, []);

  // Cargar productos visibles
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { data } = await supabase
        .from("perfumes")
        .select("id, name, base_name, image_url, clean_image_url, brand:brands(name, slug)")
        .eq("in_stock", true)
        .order("name");
      const visible = ((data ?? []) as unknown as PerfumeRow[]).filter(
        (p) => !p.brand || !HIDDEN_BRAND_SLUG_SET.has(p.brand.slug),
      );
      setPerfumes(visible);
    })();
  }, [isAdmin]);

  const startScan = async () => {
    setScanning(true);
    setResults(new Map());
    setProgress({ done: 0, total: perfumes.length });
    const next = new Map<string, ScanResult>();

    // Concurrencia limitada (6 en paralelo) para no saturar el navegador
    const queue = [...perfumes];
    const workers = Array.from({ length: 6 }).map(async () => {
      while (queue.length > 0) {
        const p = queue.shift();
        if (!p) break;
        const url = p.clean_image_url ?? p.image_url;
        if (!url) {
          next.set(p.id, { perfume: p, state: "error", whiteRatio: 0, imageUsed: null });
        } else {
          const r = await detectWhiteBackground(url);
          next.set(p.id, {
            perfume: p,
            state: r.isWhite ? "white" : "ok",
            whiteRatio: r.ratio,
            imageUsed: url,
          });
        }
        setProgress((prev) => ({ ...prev, done: prev.done + 1 }));
      }
    });
    await Promise.all(workers);
    setResults(new Map(next));
    setScanning(false);
  };

  const whiteOnly = useMemo(
    () => Array.from(results.values()).filter((r) => r.state === "white"),
    [results],
  );

  const handleUpload = async (perfumeId: string, file: File) => {
    if (!accessToken) return;
    if (file.size > 5 * 1024 * 1024) {
      setMsg("La imagen excede 5MB");
      return;
    }
    setUploadingId(perfumeId);
    setMsg(null);
    try {
      const b64 = await fileToBase64(file);
      const ct = (file.type as "image/png" | "image/jpeg" | "image/webp") || "image/png";
      const res = await assignFn({
        data: {
          accessToken,
          productId: perfumeId,
          imageBase64: b64,
          contentType: ct,
        },
      });
      // Actualizar resultado local: ya no es "white"
      setResults((prev) => {
        const copy = new Map(prev);
        const cur = copy.get(perfumeId);
        if (cur) {
          copy.set(perfumeId, { ...cur, state: "ok", imageUsed: res.publicUrl });
        }
        return copy;
      });
      setMsg(`✓ Imagen actualizada para ${whiteOnly.find((r) => r.perfume.id === perfumeId)?.perfume.name ?? "el perfume"}`);
    } catch (e) {
      setMsg(`Error: ${e instanceof Error ? e.message : "subida fallida"}`);
    } finally {
      setUploadingId(null);
    }
  };

  if (authed === false || isAdmin === false) {
    return (
      <div className="max-w-md mx-auto p-12 text-center">
        <p className="brand-serif">Acceso restringido. <Link to="/login" className="text-accent underline">Iniciar sesión</Link></p>
      </div>
    );
  }
  if (authed === null || isAdmin === null) {
    return <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
      <header className="mb-8">
        <p className="eyebrow text-accent">Admin</p>
        <h1 className="mt-3 text-3xl sm:text-4xl font-serif">Fondos blancos detectados</h1>
        <p className="mt-3 text-sm text-foreground/65 brand-serif max-w-2xl">
          Escaneamos automáticamente las imágenes de los {perfumes.length} productos visibles
          y mostramos sólo aquellas cuyo fondo (esquinas) es blanco/muy claro. Reemplazá cada
          imagen subiendo una nueva — se actualiza al instante en el catálogo.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-4 mb-8 p-4 border border-border/50 bg-background/40">
        <button
          type="button"
          onClick={startScan}
          disabled={scanning || perfumes.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground text-sm hover:bg-accent/90 disabled:opacity-50"
        >
          {scanning ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {scanning ? "Escaneando…" : results.size === 0 ? "Iniciar escaneo" : "Volver a escanear"}
        </button>
        {scanning && (
          <span className="text-sm text-foreground/70 brand-serif">
            {progress.done} / {progress.total}
          </span>
        )}
        {results.size > 0 && !scanning && (
          <span className="text-sm brand-serif">
            <strong className="text-orange-500">{whiteOnly.length}</strong> perfume{whiteOnly.length === 1 ? "" : "s"} con fondo blanco detectado{whiteOnly.length === 1 ? "" : "s"}
            {" · "}
            <span className="text-foreground/55">
              {results.size - whiteOnly.length} OK
            </span>
          </span>
        )}
      </div>

      {msg && (
        <div className="mb-6 p-3 border border-accent/40 bg-accent/5 text-sm brand-serif">
          {msg}
        </div>
      )}

      {results.size > 0 && whiteOnly.length === 0 && !scanning && (
        <div className="p-10 text-center border border-border/40 bg-background/30">
          <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-3" />
          <p className="brand-serif">Ningún producto visible tiene fondo blanco detectable.</p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {whiteOnly.map((r) => (
          <WhiteCard
            key={r.perfume.id}
            result={r}
            uploading={uploadingId === r.perfume.id}
            onUpload={(file) => handleUpload(r.perfume.id, file)}
          />
        ))}
      </div>
    </div>
  );
}

function WhiteCard({
  result,
  uploading,
  onUpload,
}: {
  result: ScanResult;
  uploading: boolean;
  onUpload: (file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const p = result.perfume;
  const display = p.base_name ?? p.name;

  return (
    <article className="border border-orange-500/40 bg-background/40 flex flex-col">
      <div className="relative aspect-square bg-white overflow-hidden">
        {result.imageUsed ? (
          <img
            src={result.imageUsed}
            alt={display}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-foreground/40">
            <AlertTriangle className="w-8 h-8" />
          </div>
        )}
        <span className="absolute top-2 right-2 text-[0.55rem] eyebrow px-2 py-1 bg-orange-500 text-white">
          Fondo blanco
        </span>
      </div>
      <div className="p-3 flex-1 flex flex-col">
        {p.brand && (
          <p className="eyebrow text-[0.55rem] text-foreground/45">{p.brand.name}</p>
        )}
        <h3 className="mt-1 font-serif text-sm leading-tight line-clamp-2">{display}</h3>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-3 inline-flex items-center justify-center gap-2 px-3 py-2 border border-accent text-accent text-[0.7rem] eyebrow hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploading ? "Subiendo…" : "Reemplazar imagen"}
        </button>
      </div>
    </article>
  );
}
