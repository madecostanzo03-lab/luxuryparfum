import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Copy, Check, ShieldCheck, Loader2, X, Upload, Search, Trash2, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/admin/imagenes-duplicadas")({
  head: () => ({
    meta: [
      { title: "Auditoría y corrección de imágenes duplicadas — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuditPage,
});

type ReportProduct = {
  product_id: string;
  brand: string;
  name: string;
  size_ml: string | number | null;
  price_usd: string | number | null;
  has_clean: boolean;
};

type Group = {
  group_id: string;
  rendered_image_url: string;
  match_type: "rendered" | "original";
  source_type: "clean_image_url" | "image_url";
  classification: "ok_probable" | "revision_recomendada" | "error_probable";
  reason: string;
  products: ReportProduct[];
};

type Report = {
  summary: {
    total_visible_analyzed: number;
    unique_rendered_images: number;
    shared_groups_detected: number;
    ok_probable: number;
    revision_recomendada: number;
    error_probable: number;
  };
  groups: Group[];
};

type LiveProduct = {
  id: string;
  name: string;
  image_url: string | null;
  clean_image_url: string | null;
};

type PendingAction =
  | { kind: "clear"; product: ReportProduct; current: string | null; fallback: string | null }
  | { kind: "set_existing"; product: ReportProduct; current: string | null; newUrl: string; sourceProduct: LiveProduct }
  | { kind: "upload"; product: ReportProduct; current: string | null; file: File; previewUrl: string }
  | { kind: "mark_later"; product: ReportProduct; current: string | null };

// 4 productos críticos sin imagen visible (ni clean_image_url ni image_url cargan)
// Detectados en auditoría restringida a los 323 visibles. Los image_url externos
// devuelven HTTP 403 (hotlink bloqueado) y no hay clean_image_url asignada.
const CRITICAL_PRODUCTS: ReportProduct[] = [
  { product_id: "ec6df0be-8b21-4463-b7d0-a5d16534f993", brand: "Christian Dior", name: "CHRISTIAN DIOR FAHRENHEIT EDT 200ML", size_ml: 200, price_usd: 165.9, has_clean: false },
  { product_id: "cff31433-8509-4091-977a-4546f24c0384", brand: "Christian Dior", name: "CHRISTIAN DIOR SAUVAGE EDP 100ML", size_ml: 100, price_usd: 137.9, has_clean: false },
  { product_id: "fab4b006-eef5-4d86-a342-305c0ec66738", brand: "Givenchy", name: "GIVENCHY GENTLEMAN ONLY EDT 100ML", size_ml: 100, price_usd: 84.7, has_clean: false },
  { product_id: "b825a604-673e-4c59-aab8-9a83d366df61", brand: "Stella Dustin", name: "STELLA DUSTIN LOS ANGELES EDP 30ML", size_ml: 30, price_usd: 17.5, has_clean: false },
];
const CRITICAL_REASON = "image_url externo devuelve HTTP 403 (hotlink bloqueado) y clean_image_url está vacío → producto sin imagen visible.";

const CLASS_META = {
  error_probable: { label: "Error probable", bg: "bg-red-500/10 border-red-500/30 text-red-400", rank: 0 },
  revision_recomendada: { label: "Revisión recomendada", bg: "bg-amber-500/10 border-amber-500/30 text-amber-400", rank: 1 },
  ok_probable: { label: "OK probable", bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", rank: 2 },
} as const;

type Progress = Record<string, "kept" | "fallback" | "replaced" | "uploaded" | "later">;

function loadProgress(): Progress {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("dup_correction_progress") || "{}"); } catch { return {}; }
}

function saveProgress(p: Progress) {
  try { localStorage.setItem("dup_correction_progress", JSON.stringify(p)); } catch { /* noop */ }
}

function AuditPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [liveMap, setLiveMap] = useState<Record<string, LiveProduct>>({});
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "error_probable" | "revision_recomendada" | "ok_probable">("error_probable");
  const [progress, setProgress] = useState<Progress>(loadProgress);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [applying, setApplying] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Search-existing modal state
  const [searchOpen, setSearchOpen] = useState<ReportProduct | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searchResults, setSearchResults] = useState<LiveProduct[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) { setAuthed(false); setIsAdmin(false); return; }
      setAuthed(true);
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsAdmin(!!roles?.some((r: { role: string }) => r.role === "admin"));
    })();
  }, []);

  // Carga el reporte y los productos vivos referenciados (para conocer image_url y clean_image_url actual)
  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      try {
        const r = await fetch("/admin/auditoria_imagenes_duplicadas.json");
        if (!r.ok) throw new Error("No se pudo cargar el reporte");
        const data: Report = await r.json();
        setReport(data);

        const ids = Array.from(new Set([
          ...data.groups.flatMap((g) => g.products.map((p) => p.product_id)),
          ...CRITICAL_PRODUCTS.map((p) => p.product_id),
        ]));
        if (ids.length) {
          const { data: rows, error: e } = await supabase
            .from("perfumes")
            .select("id, name, image_url, clean_image_url")
            .in("id", ids);
          if (e) throw e;
          const map: Record<string, LiveProduct> = {};
          (rows ?? []).forEach((row: LiveProduct) => { map[row.id] = row; });
          setLiveMap(map);
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error cargando datos");
      }
    })();
  }, [isAdmin]);

  const refreshLive = useCallback(async (productId: string) => {
    const { data } = await supabase
      .from("perfumes")
      .select("id, name, image_url, clean_image_url")
      .eq("id", productId)
      .maybeSingle();
    if (data) setLiveMap((m) => ({ ...m, [productId]: data as LiveProduct }));
  }, []);

  const updateProgress = (productId: string, status: Progress[string]) => {
    setProgress((prev) => {
      const next = { ...prev, [productId]: status };
      saveProgress(next);
      return next;
    });
  };

  const copyToClipboard = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1200); } catch { /* noop */ }
  };

  // Búsqueda de imagen limpia existente en otros productos
  const runSearch = useCallback(async (q: string) => {
    setSearching(true);
    try {
      let query = supabase
        .from("perfumes")
        .select("id, name, image_url, clean_image_url")
        .not("clean_image_url", "is", null)
        .limit(30);
      if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
      const { data } = await query;
      setSearchResults((data ?? []) as LiveProduct[]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    runSearch(searchQ || searchOpen.name);
  }, [searchOpen, searchQ, runSearch]);

  const applyAction = async () => {
    if (!pending) return;
    setApplying(true);
    setError(null);
    try {
      if (pending.kind === "clear") {
        const { error: e } = await supabase.rpc("admin_clear_clean_image", { _product_id: pending.product.product_id });
        if (e) throw e;
        updateProgress(pending.product.product_id, "fallback");
      } else if (pending.kind === "set_existing") {
        const { error: e } = await supabase.rpc("admin_set_clean_image", {
          _product_id: pending.product.product_id,
          _url: pending.newUrl,
        });
        if (e) throw e;
        updateProgress(pending.product.product_id, "replaced");
      } else if (pending.kind === "upload") {
        const ext = pending.file.name.split(".").pop()?.toLowerCase() || "png";
        const path = `${pending.product.product_id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("clean-images")
          .upload(path, pending.file, { upsert: true, contentType: pending.file.type });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("clean-images").getPublicUrl(path);
        const url = `${pub.publicUrl}?v=${Date.now()}`;
        const { error: e } = await supabase.rpc("admin_set_clean_image", {
          _product_id: pending.product.product_id,
          _url: url,
        });
        if (e) throw e;
        updateProgress(pending.product.product_id, "uploaded");
      } else if (pending.kind === "mark_later") {
        updateProgress(pending.product.product_id, "later");
      }

      await refreshLive(pending.product.product_id);
      if (pending.kind === "upload") URL.revokeObjectURL(pending.previewUrl);
      setPending(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error aplicando cambio");
    } finally {
      setApplying(false);
    }
  };

  const cancelPending = () => {
    if (pending?.kind === "upload") URL.revokeObjectURL(pending.previewUrl);
    setPending(null);
  };

  const filteredGroups = useMemo(() => {
    if (!report) return [];
    const list = filter === "all" ? report.groups : report.groups.filter((g) => g.classification === filter);
    return [...list].sort((a, b) => CLASS_META[a.classification].rank - CLASS_META[b.classification].rank);
  }, [report, filter]);

  const stats = useMemo(() => {
    const totalProducts = Object.keys(progress).length;
    return {
      fallback: Object.values(progress).filter((v) => v === "fallback").length,
      replaced: Object.values(progress).filter((v) => v === "replaced").length,
      uploaded: Object.values(progress).filter((v) => v === "uploaded").length,
      later: Object.values(progress).filter((v) => v === "later").length,
      kept: Object.values(progress).filter((v) => v === "kept").length,
      total: totalProducts,
    };
  }, [progress]);

  if (authed === null || isAdmin === null) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-accent" /></div>;
  }
  if (!authed) {
    return (
      <div className="max-w-md mx-auto px-6 py-32 text-center">
        <h1 className="text-3xl font-serif">Acceso restringido</h1>
        <p className="mt-4 text-foreground/60">Necesitás iniciar sesión.</p>
        <Link to="/login" className="mt-8 inline-block eyebrow text-accent">Iniciar sesión</Link>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-6 py-32 text-center">
        <ShieldCheck className="mx-auto text-accent mb-4" />
        <h1 className="text-3xl font-serif">Solo administradores</h1>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
      <header className="mb-10">
        <p className="eyebrow">Admin</p>
        <h1 className="mt-4 text-4xl font-serif">Imágenes duplicadas — auditoría y corrección</h1>
        <p className="mt-3 text-foreground/60 text-sm max-w-3xl">
          Cada acción requiere confirmación manual. Solo se modifica <code className="text-accent">clean_image_url</code> mediante funciones seguras
          (<code className="text-accent">admin_clear_clean_image</code> / <code className="text-accent">admin_set_clean_image</code>).
          <strong className="text-foreground/80"> No se tocan</strong> precios, nombres, stock, textos, filtros ni <code>image_url</code>.
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 border border-red-500/30 bg-red-500/10 text-red-400 text-sm flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {!report ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-accent" /></div>
      ) : (
        <>
          {/* 4 críticos sin imagen visible */}
          <section className="mb-10 border-2 border-red-500/50 bg-red-500/5">
            <div className="p-5 border-b border-red-500/30 flex items-center gap-3 flex-wrap">
              <AlertTriangle className="text-red-400" size={20} />
              <h2 className="font-serif text-xl text-red-400">4 críticos sin imagen visible</h2>
              <span className="eyebrow text-[0.55rem] text-foreground/60 ml-auto">{CRITICAL_REASON}</span>
            </div>
            <ul className="divide-y divide-red-500/20">
              {CRITICAL_PRODUCTS.map((p) => {
                const live = liveMap[p.product_id];
                const status = progress[p.product_id];
                const cleanUrl = live?.clean_image_url ?? null;
                const fallbackUrl = live?.image_url ?? null;
                const resolved = !!cleanUrl;
                return (
                  <li key={p.product_id} className="p-5 grid md:grid-cols-[140px_1fr] gap-5">
                    <div className="space-y-2">
                      <div className="aspect-square bg-secondary/30 border border-border/40 overflow-hidden flex items-center justify-center relative">
                        {cleanUrl ? (
                          <img src={cleanUrl} alt={p.name} className="max-w-full max-h-full object-contain" loading="lazy" />
                        ) : fallbackUrl ? (
                          <img src={fallbackUrl} alt={p.name} className="max-w-full max-h-full object-contain" loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        ) : null}
                        {!cleanUrl && (
                          <span className="absolute inset-0 flex items-center justify-center text-[0.55rem] text-red-400/70 eyebrow text-center px-2">
                            sin imagen<br />visible
                          </span>
                        )}
                      </div>
                      {resolved && <p className="text-[0.55rem] text-emerald-400 eyebrow text-center">✓ Resuelto</p>}
                    </div>
                    <div>
                      <div className="flex items-start gap-3 flex-wrap mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.65rem] eyebrow text-foreground/50">{p.brand}</p>
                          <p className="text-sm font-medium">{p.name}</p>
                          <p className="text-[0.65rem] text-foreground/50 mt-1">{p.size_ml}ml · USD {p.price_usd}</p>
                          <p className="text-[0.55rem] text-foreground/30 mt-0.5 font-mono break-all">{p.product_id}</p>
                        </div>
                        <button onClick={() => copyToClipboard(p.product_id, `crit-${p.product_id}`)} title="Copiar product_id" className="p-1.5 border border-border/60 hover:border-accent hover:text-accent transition-colors">
                          {copied === `crit-${p.product_id}` ? <Check size={12} /> : <Copy size={12} />}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3 text-[0.6rem]">
                        <div className="border border-border/40 p-2 bg-background/40">
                          <p className="eyebrow text-foreground/50 mb-1">image_url actual</p>
                          <p className="font-mono break-all text-foreground/70">{fallbackUrl ?? "—"}</p>
                          {fallbackUrl && (
                            <a href={fallbackUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-accent hover:underline">
                              <ExternalLink size={10} /> Abrir image_url
                            </a>
                          )}
                        </div>
                        <div className="border border-border/40 p-2 bg-background/40">
                          <p className="eyebrow text-foreground/50 mb-1">clean_image_url actual</p>
                          <p className="font-mono break-all text-foreground/70">{cleanUrl ?? "—"}</p>
                        </div>
                      </div>

                      <p className="text-[0.65rem] text-red-400/80 mb-3 italic">
                        Error detectado: {fallbackUrl ? "image_url devuelve HTTP 403 (hotlink bloqueado por el dominio externo)" : "image_url vacío"} · clean_image_url no asignado.
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => { setSearchOpen(p); setSearchQ(""); }}
                          className="eyebrow text-[0.55rem] px-3 py-1.5 border border-purple-500/40 text-purple-400 hover:bg-purple-500/10 transition-colors inline-flex items-center gap-1"
                          title="Buscar imagen limpia existente en otro producto"
                        >
                          <Search size={11} /> Buscar imagen limpia existente
                        </button>
                        <label
                          className="eyebrow text-[0.55rem] px-3 py-1.5 border border-accent/60 text-accent hover:bg-accent/10 transition-colors inline-flex items-center gap-1 cursor-pointer"
                          title="Subir imagen manual a clean-images/{product_id}.png"
                        >
                          <Upload size={11} /> Subir imagen manual
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (!f) return;
                              const previewUrl = URL.createObjectURL(f);
                              setPending({ kind: "upload", product: p, current: cleanUrl, file: f, previewUrl });
                              e.target.value = "";
                            }}
                          />
                        </label>
                        <button
                          onClick={() => setPending({ kind: "clear", product: p, current: cleanUrl, fallback: fallbackUrl })}
                          disabled={!cleanUrl}
                          className="eyebrow text-[0.55rem] px-3 py-1.5 border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
                          title="Usar fallback (limpia clean_image_url solo si fallback funciona)"
                        >
                          <Trash2 size={11} /> Usar fallback si funciona
                        </button>
                        <button
                          onClick={() => copyToClipboard(p.product_id, `crit2-${p.product_id}`)}
                          className="eyebrow text-[0.55rem] px-3 py-1.5 border border-border/60 text-foreground/60 hover:border-foreground/40 transition-colors inline-flex items-center gap-1"
                        >
                          {copied === `crit2-${p.product_id}` ? <Check size={11} /> : <Copy size={11} />} Copiar product_id
                        </button>
                        {fallbackUrl && (
                          <a href={fallbackUrl} target="_blank" rel="noopener noreferrer"
                            className="eyebrow text-[0.55rem] px-3 py-1.5 border border-border/60 text-foreground/60 hover:border-accent hover:text-accent transition-colors inline-flex items-center gap-1">
                            <ExternalLink size={11} /> Abrir image_url
                          </a>
                        )}
                        {status && (
                          <span className="eyebrow text-[0.55rem] text-foreground/50 ml-auto self-center">
                            estado: <span className="text-foreground/80">{status}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Resumen auditoría */}
          <section className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
            {[
              { label: "Productos analizados", value: report.summary.total_visible_analyzed },
              { label: "Imágenes únicas", value: report.summary.unique_rendered_images },
              { label: "Grupos compartidos", value: report.summary.shared_groups_detected },
              { label: "Error probable", value: report.summary.error_probable, accent: "text-red-400" },
              { label: "Revisión", value: report.summary.revision_recomendada, accent: "text-amber-400" },
              { label: "OK probable", value: report.summary.ok_probable, accent: "text-emerald-400" },
            ].map((s) => (
              <div key={s.label} className="border border-border/60 p-4">
                <p className="eyebrow text-[0.55rem] text-foreground/50">{s.label}</p>
                <p className={`mt-2 text-2xl font-serif ${s.accent ?? ""}`}>{s.value}</p>
              </div>
            ))}
          </section>

          {/* Resumen de progreso de correcciones */}
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-10">
            {[
              { label: "Mantenidas", value: stats.kept, accent: "text-emerald-400" },
              { label: "→ fallback", value: stats.fallback, accent: "text-blue-400" },
              { label: "Reemplazadas", value: stats.replaced, accent: "text-purple-400" },
              { label: "Subidas", value: stats.uploaded, accent: "text-accent" },
              { label: "Para después", value: stats.later, accent: "text-amber-400" },
            ].map((s) => (
              <div key={s.label} className="border border-border/40 p-3 bg-card/30">
                <p className="eyebrow text-[0.55rem] text-foreground/50">{s.label}</p>
                <p className={`mt-1 text-xl font-serif ${s.accent}`}>{s.value}</p>
              </div>
            ))}
          </section>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2 mb-8">
            {(["error_probable", "revision_recomendada", "ok_probable", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`eyebrow text-[0.6rem] px-4 py-2 border transition-colors ${
                  filter === f ? "border-accent text-accent" : "border-border/60 text-foreground/60 hover:border-foreground/40"
                }`}
              >
                {f === "all" ? `Todos (${report.groups.length})` : `${CLASS_META[f].label} (${report.summary[f]})`}
              </button>
            ))}
          </div>

          {/* Grupos */}
          <div className="space-y-6">
            {filteredGroups.map((g) => {
              const meta = CLASS_META[g.classification];
              return (
                <article key={g.group_id} className="border border-border/60 bg-card/30">
                  <div className="grid md:grid-cols-[220px_1fr] gap-6 p-5">
                    <div className="space-y-2">
                      <div className="aspect-square bg-secondary/30 border border-border/40 overflow-hidden flex items-center justify-center">
                        <img src={g.rendered_image_url} alt={g.group_id} className="max-w-full max-h-full object-contain" loading="lazy" />
                      </div>
                      <a href={g.rendered_image_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[0.6rem] text-foreground/50 hover:text-accent">
                        <ExternalLink size={11} /> Abrir imagen compartida
                      </a>
                    </div>

                    <div>
                      <div className="flex items-start gap-3 flex-wrap mb-3">
                        <span className={`eyebrow text-[0.55rem] px-2 py-1 border ${meta.bg}`}>{meta.label}</span>
                        <span className="eyebrow text-[0.55rem] px-2 py-1 border border-border/60 text-foreground/60">
                          {g.match_type === "rendered" ? "imagen renderizada" : "image_url original"}
                        </span>
                        <span className="eyebrow text-[0.55rem] px-2 py-1 border border-border/60 text-foreground/60">{g.source_type}</span>
                        <span className="eyebrow text-[0.55rem] text-foreground/40 ml-auto">{g.group_id}</span>
                      </div>
                      <p className="text-xs text-foreground/70 mb-4 italic">{g.reason}</p>

                      <ul className="divide-y divide-border/40 border-y border-border/40">
                        {g.products.map((p) => {
                          const live = liveMap[p.product_id];
                          const status = progress[p.product_id];
                          return (
                            <li key={p.product_id} className="py-3">
                              <div className="flex items-start gap-3 flex-wrap">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[0.65rem] eyebrow text-foreground/50">{p.brand}</p>
                                  <p className="text-sm font-medium">{p.name}</p>
                                  <p className="text-[0.65rem] text-foreground/50 mt-1">
                                    {p.size_ml ? `${p.size_ml}ml` : "—"} · USD {p.price_usd}
                                    {" · "}
                                    {live?.clean_image_url ? "✓ clean activa" : "fallback (sin clean)"}
                                  </p>
                                  <p className="text-[0.55rem] text-foreground/30 mt-0.5 font-mono break-all">{p.product_id}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => copyToClipboard(p.product_id, p.product_id)} title="Copiar product_id" className="p-1.5 border border-border/60 hover:border-accent hover:text-accent transition-colors">
                                    {copied === p.product_id ? <Check size={12} /> : <Copy size={12} />}
                                  </button>
                                </div>
                              </div>

                              {/* Acciones */}
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  onClick={() => updateProgress(p.product_id, "kept")}
                                  className={`eyebrow text-[0.55rem] px-3 py-1.5 border transition-colors ${
                                    status === "kept" ? "border-emerald-500/40 text-emerald-400" : "border-border/60 text-foreground/60 hover:border-foreground/40"
                                  }`}
                                  title="A) Mantener esta imagen (no cambia DB)"
                                >
                                  A · Mantener
                                </button>
                                <button
                                  onClick={() => setPending({ kind: "clear", product: p, current: live?.clean_image_url ?? null, fallback: live?.image_url ?? null })}
                                  disabled={!live?.clean_image_url}
                                  className="eyebrow text-[0.55rem] px-3 py-1.5 border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1"
                                  title="B) Quitar clean_image_url y usar fallback image_url"
                                >
                                  <Trash2 size={11} /> B · Usar fallback
                                </button>
                                <button
                                  onClick={() => { setSearchOpen(p); setSearchQ(""); }}
                                  className="eyebrow text-[0.55rem] px-3 py-1.5 border border-purple-500/40 text-purple-400 hover:bg-purple-500/10 transition-colors inline-flex items-center gap-1"
                                  title="C) Buscar clean_image_url en otro producto"
                                >
                                  <Search size={11} /> C · Reutilizar existente
                                </button>
                                <label
                                  className="eyebrow text-[0.55rem] px-3 py-1.5 border border-accent/60 text-accent hover:bg-accent/10 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                  title="D) Subir imagen manual"
                                >
                                  <Upload size={11} /> D · Subir manual
                                  <input
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (!f) return;
                                      const previewUrl = URL.createObjectURL(f);
                                      setPending({ kind: "upload", product: p, current: live?.clean_image_url ?? null, file: f, previewUrl });
                                      e.target.value = "";
                                    }}
                                  />
                                </label>
                                <button
                                  onClick={() => setPending({ kind: "mark_later", product: p, current: live?.clean_image_url ?? null })}
                                  className={`eyebrow text-[0.55rem] px-3 py-1.5 border transition-colors ${
                                    status === "later" ? "border-amber-500/40 text-amber-400" : "border-border/60 text-foreground/60 hover:border-amber-500/40 hover:text-amber-400"
                                  }`}
                                  title="E) Marcar para resolver después"
                                >
                                  E · Para después
                                </button>
                                {status && (
                                  <span className="eyebrow text-[0.55rem] text-foreground/50 ml-auto self-center">
                                    estado: <span className="text-foreground/80">{status}</span>
                                  </span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {/* Modal: buscar imagen limpia existente */}
      {searchOpen && (
        <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-border/60">
              <div>
                <p className="eyebrow text-[0.6rem] text-foreground/50">Buscar imagen limpia existente para</p>
                <h3 className="font-serif text-lg mt-1">{searchOpen.name}</h3>
              </div>
              <button onClick={() => setSearchOpen(null)} className="p-2 hover:text-accent"><X size={18} /></button>
            </div>
            <div className="p-5 border-b border-border/60">
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Buscar por nombre, marca, ml…"
                className="w-full bg-background border border-border/60 px-3 py-2 text-sm focus:border-accent outline-none"
              />
            </div>
            <div className="overflow-y-auto p-5 grid grid-cols-2 md:grid-cols-3 gap-3">
              {searching ? (
                <div className="col-span-full text-center py-8"><Loader2 className="animate-spin mx-auto text-accent" /></div>
              ) : searchResults.length === 0 ? (
                <p className="col-span-full text-center text-foreground/50 text-sm py-8">Sin resultados</p>
              ) : (
                searchResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => {
                      if (!r.clean_image_url) return;
                      setPending({
                        kind: "set_existing",
                        product: searchOpen,
                        current: liveMap[searchOpen.product_id]?.clean_image_url ?? null,
                        newUrl: r.clean_image_url,
                        sourceProduct: r,
                      });
                      setSearchOpen(null);
                    }}
                    className="border border-border/60 hover:border-accent p-2 text-left transition-colors"
                  >
                    <div className="aspect-square bg-secondary/30 mb-2 overflow-hidden flex items-center justify-center">
                      {r.clean_image_url && <img src={r.clean_image_url} alt={r.name} className="max-w-full max-h-full object-contain" loading="lazy" />}
                    </div>
                    <p className="text-[0.65rem] line-clamp-2">{r.name}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación */}
      {pending && (
        <ConfirmModal pending={pending} applying={applying} onCancel={cancelPending} onConfirm={applyAction} />
      )}
    </div>
  );
}

function ConfirmModal({
  pending, applying, onCancel, onConfirm,
}: {
  pending: PendingAction;
  applying: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const p = pending.product;
  const titles: Record<PendingAction["kind"], string> = {
    clear: "B) Quitar clean_image_url y usar fallback",
    set_existing: "C) Reutilizar imagen limpia existente",
    upload: "D) Subir imagen manual",
    mark_later: "E) Marcar para resolver después",
  };
  const newPreview =
    pending.kind === "clear" ? pending.fallback :
    pending.kind === "set_existing" ? pending.newUrl :
    pending.kind === "upload" ? pending.previewUrl :
    pending.current;

  return (
    <div className="fixed inset-0 bg-background/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-accent/60 w-full max-w-3xl">
        <div className="p-5 border-b border-border/60 flex items-center justify-between">
          <h3 className="font-serif text-lg">{titles[pending.kind]}</h3>
          <button onClick={onCancel} disabled={applying} className="p-2 hover:text-accent disabled:opacity-40"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-background/50 border border-border/40 p-4 text-xs space-y-1">
            <p><span className="eyebrow text-[0.55rem] text-foreground/50">Marca</span> <span className="ml-2">{p.brand}</span></p>
            <p><span className="eyebrow text-[0.55rem] text-foreground/50">Nombre</span> <span className="ml-2">{p.name}</span></p>
            <p><span className="eyebrow text-[0.55rem] text-foreground/50">ML</span> <span className="ml-2">{p.size_ml || "—"}</span></p>
            <p><span className="eyebrow text-[0.55rem] text-foreground/50">Precio</span> <span className="ml-2">USD {p.price_usd}</span></p>
            <p><span className="eyebrow text-[0.55rem] text-foreground/50">product_id</span> <span className="ml-2 font-mono text-[0.65rem]">{p.product_id}</span></p>
          </div>

          {pending.kind === "mark_later" ? (
            <p className="text-sm text-foreground/70">
              No se modifica la base de datos. Solo se marca como pendiente local para revisar después.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="eyebrow text-[0.55rem] text-foreground/50 mb-2">Imagen actual</p>
                <div className="aspect-square bg-secondary/30 border border-border/40 flex items-center justify-center overflow-hidden">
                  {pending.current ? (
                    <img src={pending.current} alt="actual" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-[0.6rem] text-foreground/40">sin clean_image_url</span>
                  )}
                </div>
              </div>
              <div>
                <p className="eyebrow text-[0.55rem] text-foreground/50 mb-2">
                  {pending.kind === "clear" ? "Fallback (image_url)" : "Nueva imagen"}
                </p>
                <div className="aspect-square bg-secondary/30 border border-accent/40 flex items-center justify-center overflow-hidden">
                  {newPreview ? (
                    <img src={newPreview} alt="nueva" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-[0.6rem] text-foreground/40">sin imagen</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {pending.kind === "clear" && (
            <p className="text-[0.7rem] text-foreground/60 border-l-2 border-blue-500/40 pl-3">
              Solo se limpiará <code>clean_image_url</code>. <code>image_url</code> queda intacto. No se borran archivos del storage.
            </p>
          )}
          {pending.kind === "set_existing" && (
            <p className="text-[0.7rem] text-foreground/60 border-l-2 border-purple-500/40 pl-3">
              Se copiará la URL limpia desde <strong>{pending.sourceProduct.name}</strong>. <code>image_url</code> no se modifica.
            </p>
          )}
          {pending.kind === "upload" && (
            <p className="text-[0.7rem] text-foreground/60 border-l-2 border-accent/40 pl-3">
              Se subirá a <code>clean-images/{p.product_id}.{pending.file.name.split(".").pop()}</code> y se asignará a <code>clean_image_url</code>. <code>image_url</code> no se modifica.
            </p>
          )}
        </div>

        <div className="p-5 border-t border-border/60 flex items-center justify-end gap-2">
          <button onClick={onCancel} disabled={applying} className="eyebrow text-[0.6rem] px-4 py-2 border border-border/60 hover:border-foreground/40 disabled:opacity-40">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={applying} className="eyebrow text-[0.6rem] px-4 py-2 border border-accent text-accent hover:bg-accent/10 disabled:opacity-40 inline-flex items-center gap-2">
            {applying && <Loader2 size={12} className="animate-spin" />}
            Confirmar cambio
          </button>
        </div>
      </div>
    </div>
  );
}
