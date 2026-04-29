import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  confirmCleanImageMatch,
  skipCleanImage,
  getPendingImageUrl,
  setManualImageStatus,
  assignManualImage,
  reuseCleanImage,
} from "@/server/clean-images.functions";
import { Loader2, CheckCircle2, SkipForward, Search, ChevronLeft, ChevronRight, Upload, Flag, ShieldCheck, ExternalLink, Copy, Check, X, ZoomIn } from "lucide-react";

export const Route = createFileRoute("/admin/imagenes-match")({
  head: () => ({
    meta: [
      { title: "Match de imágenes limpias — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminImagesMatchPage,
});

type QueueRow = {
  id: string;
  pending_path: string;
  original_filename: string;
  phash: string | null;
  suggested_perfume_ids: string[];
  suggestion_scores: number[];
  assigned_perfume_id: string | null;
  status: "pending" | "confirmed" | "skipped";
};

type PerfumeLite = {
  id: string;
  name: string;
  base_name: string | null;
  image_url: string | null;
  price: number;
  brand: { name: string; slug: string } | null;
};

const HIDDEN_BRAND_SLUGS = [
  "adyan","afnan","ajmal","al-haramain","al-wataniah","armaf","arqus","avar",
  "bespoke","boulevard","dar-el-ward","emperor","french-avenue","hamidi",
  "jack-hope","jo-milano","lattafa","lovali","maison-alhambra","maison-de-milan",
  "mawwal","mirada","nasma","prime-collection","rasasi","reyane-tradition",
  "riiffs","risala","smart-collection",
];

function AdminImagesMatchPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [perfumes, setPerfumes] = useState<Map<string, PerfumeLite>>(new Map());
  const [filter, setFilter] = useState<"manual" | "pending" | "confirmed" | "skipped">("manual");
  const [cursor, setCursor] = useState(0);

  // signed URL de la imagen pendiente actual
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const confirmFn = useServerFn(confirmCleanImageMatch);
  const skipFn = useServerFn(skipCleanImage);
  const getUrlFn = useServerFn(getPendingImageUrl);

  // Auth + admin gate (mismo patrón que /admin/qa y /admin/precios)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAuthed(false); return; }
      setAuthed(true);
      setAccessToken(session.access_token);
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", session.user.id);
      const admin = (roles ?? []).some((r) => r.role === "admin");
      setIsAdmin(admin);
      if (!admin) return;
      await loadAll();
    })();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    // Cola
    const { data: q } = await supabase
      .from("clean_image_import_queue")
      .select("*")
      .order("created_at", { ascending: true });
    setQueue((q ?? []) as QueueRow[]);

    // Perfumes no árabes en stock (universo de búsqueda y candidatos)
    const { data: brands } = await supabase
      .from("brands").select("id, slug").in("slug", HIDDEN_BRAND_SLUGS);
    const hiddenIds = (brands ?? []).map((b) => b.id);

    let pq = supabase
      .from("perfumes")
      .select("id, name, base_name, image_url, price, brand:brands(name, slug)")
      .eq("in_stock", true);
    if (hiddenIds.length) pq = pq.not("brand_id", "in", `(${hiddenIds.join(",")})`);
    const { data: ps } = await pq;
    const m = new Map<string, PerfumeLite>();
    (ps ?? []).forEach((p: any) => m.set(p.id, p as PerfumeLite));
    setPerfumes(m);
    setLoading(false);
  };

  const visibleQueue = useMemo(
    () => queue.filter((q) => q.status === filter),
    [queue, filter],
  );

  const current = visibleQueue[cursor] ?? null;

  // cuando cambia el item actual, pedir signed URL
  useEffect(() => {
    setPendingUrl(null);
    setSearch("");
    setMsg(null);
    if (!current || !accessToken) return;
    (async () => {
      try {
        const r = await getUrlFn({ data: { accessToken, pendingPath: current.pending_path } });
        setPendingUrl(r.url);
      } catch (e: any) {
        setMsg(`Error cargando preview: ${e.message ?? e}`);
      }
    })();
  }, [current?.id, accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // reset cursor al cambiar filtro
  useEffect(() => { setCursor(0); }, [filter]);

  const counts = useMemo(() => ({
    pending: queue.filter((q) => q.status === "pending").length,
    confirmed: queue.filter((q) => q.status === "confirmed").length,
    skipped: queue.filter((q) => q.status === "skipped").length,
    withSug: queue.filter((q) => q.suggested_perfume_ids.length > 0).length,
    withoutSug: queue.filter((q) => q.suggested_perfume_ids.length === 0).length,
    total: queue.length,
  }), [queue]);

  const handleConfirm = async (perfumeId: string) => {
    if (!current || busy || !accessToken) return;
    setBusy(true); setMsg(null);
    try {
      await confirmFn({ data: { accessToken, queueId: current.id, perfumeId } });
      setMsg("✓ Confirmado y publicado.");
      await loadAll();
    } catch (e: any) {
      setMsg(`Error: ${e.message ?? e}`);
    } finally { setBusy(false); }
  };

  const handleSkip = async () => {
    if (!current || busy || !accessToken) return;
    setBusy(true); setMsg(null);
    try {
      await skipFn({ data: { accessToken, queueId: current.id } });
      setMsg("Saltada.");
      await loadAll();
    } catch (e: any) {
      setMsg(`Error: ${e.message ?? e}`);
    } finally { setBusy(false); }
  };

  const searchResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term || term.length < 2) return [];
    const out: PerfumeLite[] = [];
    for (const p of perfumes.values()) {
      const hay = `${p.name} ${p.base_name ?? ""} ${p.brand?.name ?? ""}`.toLowerCase();
      if (hay.includes(term)) out.push(p);
      if (out.length >= 30) break;
    }
    return out;
  }, [search, perfumes]);

  // ---------- guards ----------
  if (authed === false) {
    return (
      <div className="max-w-md mx-auto px-6 py-32 text-center">
        <p className="eyebrow text-accent">Admin</p>
        <h1 className="mt-6 text-3xl font-serif">Iniciá sesión</h1>
        <p className="mt-4 text-foreground/60 text-sm">Necesitás una cuenta admin.</p>
        <Link to="/login" className="mt-8 inline-block eyebrow text-accent">Ir al login</Link>
      </div>
    );
  }
  if (authed === null) {
    return <div className="max-w-md mx-auto px-6 py-32 text-center text-foreground/60"><Loader2 className="inline animate-spin" /></div>;
  }
  if (isAdmin === false) {
    return (
      <div className="max-w-md mx-auto px-6 py-32 text-center">
        <p className="eyebrow text-accent">403</p>
        <h1 className="mt-6 text-3xl font-serif">Sin permisos</h1>
        <p className="mt-4 text-foreground/60 text-sm">Tu cuenta no tiene rol admin.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <header className="mb-8">
        <p className="eyebrow text-accent">Admin</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-serif">Match manual de imágenes limpias</h1>
        <p className="mt-2 text-sm text-foreground/60">
          Confirmá manualmente cada imagen. Nada se aplica al catálogo sin tu confirmación.
        </p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-8">
        <Stat label="Total cola" value={counts.total} />
        <Stat label="Pendientes" value={counts.pending} accent />
        <Stat label="Confirmadas" value={counts.confirmed} />
        <Stat label="Saltadas" value={counts.skipped} />
        <Stat label="Con sugerencias" value={counts.withSug} />
        <Stat label="Sin sugerencias" value={counts.withoutSug} />
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 border-b border-border/40 flex-wrap">
        <button
          onClick={() => setFilter("manual")}
          className={`px-4 py-2 text-xs eyebrow transition-colors ${
            filter === "manual"
              ? "border-b-2 border-accent text-accent"
              : "text-destructive hover:text-foreground"
          }`}
        >
          Manuales (8)
        </button>
        {(["pending","confirmed","skipped"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-xs eyebrow transition-colors ${
              filter === s ? "border-b-2 border-accent text-accent" : "text-foreground/50 hover:text-foreground"
            }`}
          >
            {s === "pending" ? "Pendientes" : s === "confirmed" ? "Confirmadas" : "Saltadas"}
            {" "}({s === "pending" ? counts.pending : s === "confirmed" ? counts.confirmed : counts.skipped})
          </button>
        ))}
      </div>

      {filter === "manual" ? (
        <MissingCleanSection />
      ) : loading ? (
        <div className="text-center py-20"><Loader2 className="inline animate-spin" /></div>
      ) : !current ? (
        <div className="text-center py-20 text-foreground/60 font-serif italic">
          No hay items en este estado.
        </div>
      ) : (
        <div className="grid lg:grid-cols-[420px_1fr] gap-8">
          {/* IZQ: imagen limpia actual */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setCursor((c) => Math.max(0, c - 1))}
                disabled={cursor === 0}
                className="p-2 disabled:opacity-30 hover:text-accent"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-xs eyebrow text-foreground/50">
                {cursor + 1} / {visibleQueue.length}
              </span>
              <button
                onClick={() => setCursor((c) => Math.min(visibleQueue.length - 1, c + 1))}
                disabled={cursor >= visibleQueue.length - 1}
                className="p-2 disabled:opacity-30 hover:text-accent"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="aspect-square bg-card border border-border/40 flex items-center justify-center overflow-hidden">
              {pendingUrl ? (
                <img src={pendingUrl} alt="Imagen limpia" className="w-full h-full object-contain" />
              ) : (
                <Loader2 className="animate-spin text-foreground/40" />
              )}
            </div>
            <p className="mt-2 text-[0.65rem] text-foreground/40 font-mono break-all">
              {current.original_filename}
            </p>

            {filter === "pending" && (
              <button
                onClick={handleSkip}
                disabled={busy}
                className="mt-4 w-full inline-flex items-center justify-center gap-2 py-2.5 border border-border/60 text-foreground/70 hover:border-foreground/40 text-xs eyebrow disabled:opacity-50"
              >
                <SkipForward size={14} /> Saltar (no aplicar)
              </button>
            )}

            {msg && (
              <p className={`mt-3 text-xs ${msg.startsWith("Error") ? "text-red-400" : "text-accent"}`}>
                {msg}
              </p>
            )}
          </div>

          {/* DER: sugerencias + búsqueda manual */}
          <div>
            {filter === "pending" && (
              <>
                <h3 className="eyebrow text-foreground/60 mb-3">Sugerencias top-3 (pHash · solo ayuda visual)</h3>
                {current.suggested_perfume_ids.length === 0 ? (
                  <p className="text-sm text-foreground/50 italic mb-6">Sin sugerencias automáticas.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
                    {current.suggested_perfume_ids.map((pid, i) => {
                      const p = perfumes.get(pid);
                      if (!p) return null;
                      const dist = current.suggestion_scores[i];
                      return (
                        <SuggestionCard
                          key={pid}
                          perfume={p}
                          distance={dist}
                          onConfirm={() => handleConfirm(pid)}
                          disabled={busy}
                        />
                      );
                    })}
                  </div>
                )}

                <h3 className="eyebrow text-foreground/60 mb-3">Buscar manualmente</h3>
                <div className="relative mb-3">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/40" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nombre o marca..."
                    className="w-full bg-input/40 border border-border pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-accent"
                  />
                </div>
                {searchResults.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[480px] overflow-y-auto">
                    {searchResults.map((p) => (
                      <SuggestionCard
                        key={p.id}
                        perfume={p}
                        onConfirm={() => handleConfirm(p.id)}
                        disabled={busy}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {filter !== "pending" && current.assigned_perfume_id && (
              <div>
                <h3 className="eyebrow text-foreground/60 mb-3">Asignada a</h3>
                {(() => {
                  const p = perfumes.get(current.assigned_perfume_id);
                  return p ? (
                    <div className="flex gap-4 items-center">
                      {p.image_url && <img src={p.image_url} alt="" className="w-24 h-24 object-contain bg-card" />}
                      <div>
                        <p className="text-xs eyebrow text-foreground/50">{p.brand?.name}</p>
                        <p className="font-serif text-lg">{p.base_name ?? p.name}</p>
                        <p className="text-xs text-foreground/50">USD {p.price.toFixed(0)}</p>
                      </div>
                    </div>
                  ) : <p className="text-sm text-foreground/50">Perfume no encontrado.</p>;
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {filter !== "manual" && <MissingCleanSection />}
    </div>
  );
}

// Los 8 productos cuyo image_url original NO se pudo descargar
// (CDN bloqueado / Instagram devuelve HTML / dominios anti-bot).
// Mapping product_id -> motivo legible.
const MANUAL_PENDING_MOTIVES: Record<string, string> = {
  "ec6df0be-8b21-4463-b7d0-a5d16534f993": "dior.com 403 (anti-bot CDN)",
  "cff31433-8509-4091-977a-4546f24c0384": "dior.com 403 (anti-bot CDN)",
  "fab4b006-eef5-4d86-a342-305c0ec66738": "givenchybeauty.com 403",
  "f62b3c26-8de6-48ff-b60b-c978eb8869d0": "Instagram devuelve HTML, no imagen",
  "b825a604-673e-4c59-aab8-9a83d366df61": "tupi.com.py 403",
  "545f54f9-ae2c-4db3-806f-71cc1e7cb980": "Instagram devuelve HTML, no imagen",
  "4d3c3fbd-2314-4d1d-8a10-bb318cf61f5d": "Instagram devuelve HTML, no imagen",
  "001087e8-e929-4c3c-9d6c-05bf469de226": "Instagram devuelve HTML, no imagen",
};
const MANUAL_PENDING_IDS = new Set(Object.keys(MANUAL_PENDING_MOTIVES));

type MissingRow = {
  id: string;
  name: string;
  base_name: string | null;
  size_ml: number | null;
  price: number;
  image_url: string | null;
  brand: { name: string; slug: string } | null;
};

type ManualStatusRow = {
  product_id: string;
  status: "manual_needed" | "fallback_ok" | "priority_pending";
  notes: string | null;
  updated_at: string;
};

type ReusableRow = {
  id: string;
  name: string;
  base_name: string | null;
  size_ml: number | null;
  price: number;
  image_url: string | null;
  clean_image_url: string;
  brand: { name: string; slug: string } | null;
};

function MissingCleanSection() {
  const [rows, setRows] = useState<MissingRow[] | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Map<string, ManualStatusRow>>(new Map());
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [zoomUrl, setZoomUrl] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  // Estado del flujo de confirmación: producto + archivo + dataURL preview
  const [pendingUpload, setPendingUpload] = useState<
    { product: MissingRow; file: File; previewUrl: string } | null
  >(null);
  // Catálogo de imágenes limpias reutilizables
  const [reusable, setReusable] = useState<ReusableRow[]>([]);
  // Tarjeta con panel de "Buscar imagen limpia existente" abierto
  const [expandedReuseId, setExpandedReuseId] = useState<string | null>(null);
  // Modo de listado dentro del panel: "search" | "variants" | "same_base"
  const [reuseMode, setReuseMode] = useState<"search" | "variants" | "same_base">("search");
  const [reuseSearch, setReuseSearch] = useState("");
  // Confirmación de reutilización
  const [pendingReuse, setPendingReuse] = useState<
    { target: MissingRow; source: ReusableRow } | null
  >(null);

  const setStatusFn = useServerFn(setManualImageStatus);
  const assignFn = useServerFn(assignManualImage);
  const reuseFn = useServerFn(reuseCleanImage);

  const loadStatuses = async () => {
    const { data } = await supabase
      .from("pending_manual_images")
      .select("product_id, status, notes, updated_at");
    const m = new Map<string, ManualStatusRow>();
    (data ?? []).forEach((r: any) => m.set(r.product_id, r as ManualStatusRow));
    setStatuses(m);
  };

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setAccessToken(session?.access_token ?? null);

      const { data: hidden } = await supabase
        .from("brands")
        .select("id")
        .in("slug", HIDDEN_BRAND_SLUGS);
      const hiddenIds = (hidden ?? []).map((b) => b.id);
      let q = supabase
        .from("perfumes")
        .select("id, name, base_name, size_ml, price, image_url, brand:brands(name, slug)")
        .eq("in_stock", true)
        .is("clean_image_url", null);
      if (hiddenIds.length > 0) {
        q = q.not("brand_id", "in", `(${hiddenIds.join(",")})`);
      }
      const { data } = await q.order("name");
      setRows((data as unknown as MissingRow[]) ?? []);

      // Catálogo de imágenes limpias reutilizables (todos los perfumes con clean_image_url)
      const { data: reusableData } = await supabase
        .from("perfumes")
        .select("id, name, base_name, size_ml, price, image_url, clean_image_url, brand:brands(name, slug)")
        .not("clean_image_url", "is", null)
        .order("name");
      setReusable((reusableData as unknown as ReusableRow[]) ?? []);

      await loadStatuses();
    })();
  }, []);

  const total = rows?.length ?? 0;
  const manualPending = rows?.filter((r) => MANUAL_PENDING_IDS.has(r.id)) ?? [];
  const otherPending = rows?.filter((r) => !MANUAL_PENDING_IDS.has(r.id)) ?? [];

  const handleSetStatus = async (
    productId: string,
    status: "manual_needed" | "fallback_ok" | "priority_pending",
  ) => {
    if (!accessToken || busyId) return;
    setBusyId(productId);
    setMsg(null);
    try {
      await setStatusFn({ data: { accessToken, productId, status } });
      await loadStatuses();
      setMsg("✓ Estado guardado");
    } catch (e: any) {
      setMsg(`Error: ${e.message ?? e}`);
    } finally {
      setBusyId(null);
    }
  };

  // Paso 1: el usuario elige un archivo -> generamos preview y mostramos modal
  const handlePickFile = (product: MissingRow, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setMsg("Error: imagen excede 5MB");
      return;
    }
    setMsg(null);
    const previewUrl = URL.createObjectURL(file);
    setPendingUpload({ product, file, previewUrl });
  };

  const cancelUpload = () => {
    if (pendingUpload) URL.revokeObjectURL(pendingUpload.previewUrl);
    setPendingUpload(null);
  };

  // Paso 2: confirmación visual explícita -> recién acá se sube y actualiza clean_image_url
  const confirmUpload = async () => {
    if (!accessToken || !pendingUpload || busyId) return;
    const { product, file } = pendingUpload;
    setBusyId(product.id);
    setMsg(null);
    try {
      const arr = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
      const b64 = btoa(bin);
      const ct = (file.type === "image/jpeg" || file.type === "image/webp"
        ? file.type
        : "image/png") as "image/png" | "image/jpeg" | "image/webp";
      await assignFn({
        data: { accessToken, productId: product.id, imageBase64: b64, contentType: ct },
      });
      setMsg("✓ Imagen confirmada y asignada");
      setRows((prev) => (prev ?? []).filter((r) => r.id !== product.id));
      await loadStatuses();
      URL.revokeObjectURL(pendingUpload.previewUrl);
      setPendingUpload(null);
    } catch (e: any) {
      setMsg(`Error: ${e.message ?? e}`);
    } finally {
      setBusyId(null);
    }
  };

  const copyId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="mt-16 pt-10 border-t border-border/40">
      <header className="mb-6">
        <p className="eyebrow text-accent">Revisión</p>
        <h2 className="mt-2 text-2xl md:text-3xl font-serif">Faltantes clean_image_url</h2>
        <p className="mt-2 text-sm text-foreground/60">
          Productos no árabes activos sin imagen limpia confirmada. Mantienen su
          {" "}<code className="text-accent">image_url</code> original como fallback en el catálogo.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Stat label="Total faltantes" value={total} accent />
        <Stat label="8 pendientes manuales" value={manualPending.length} />
        <Stat label="Otros faltantes" value={otherPending.length} />
        <Stat label="Ya con clean" value={292} />
      </div>

      {msg && (
        <p className={`mb-4 text-xs ${msg.startsWith("Error") ? "text-red-400" : "text-accent"}`}>
          {msg}
        </p>
      )}

      {/* SECCIÓN DESTACADA: 8 pendientes manuales — tarjetas grandes */}
      {rows !== null && manualPending.length > 0 && (
        <div className="mb-10 border-2 border-accent/40 bg-accent/5 p-4 sm:p-6">
          <h3 className="font-serif text-xl mb-1">8 pendientes manuales</h3>
          <p className="text-xs text-foreground/60 mb-5">
            Origen bloqueado o no descargable. Subí una imagen alternativa (PNG/JPG/WEBP, máx 5MB).
            Vas a poder confirmar visualmente <strong>antes</strong> de que se aplique al catálogo.
          </p>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            {manualPending.map((r) => {
              const st = statuses.get(r.id);
              const motive = MANUAL_PENDING_MOTIVES[r.id];
              return (
                <div key={r.id} className="border border-border/50 bg-background p-4 flex flex-col sm:flex-row gap-4">
                  {/* Imagen actual GRANDE (≥220px desktop) */}
                  <div className="flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => r.image_url && setZoomUrl(r.image_url)}
                      className="group relative block w-full sm:w-[220px] h-[220px] bg-card border border-border/40 overflow-hidden"
                      title="Click para ampliar"
                    >
                      {r.image_url ? (
                        <>
                          <img src={r.image_url} alt="" className="w-full h-full object-contain" loading="lazy" />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
                            <ZoomIn size={22} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </span>
                        </>
                      ) : (
                        <span className="absolute inset-0 flex items-center justify-center text-foreground/30 text-3xl font-serif">—</span>
                      )}
                    </button>
                    {r.image_url && (
                      <a
                        href={r.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[0.6rem] eyebrow text-foreground/60 hover:text-accent"
                      >
                        <ExternalLink size={11} /> Abrir en pestaña nueva
                      </a>
                    )}
                  </div>

                  {/* Datos + acciones */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[0.65rem] eyebrow text-foreground/50">{r.brand?.name ?? "—"}</p>
                    <p className="font-serif text-lg leading-tight mt-0.5">{r.base_name ?? r.name}</p>
                    <p className="text-xs text-foreground/60 mt-1">
                      {r.size_ml ? `${r.size_ml} ml` : "—"} · USD {r.price.toFixed(0)}
                    </p>

                    <div className="mt-2 flex items-center gap-2">
                      <code className="text-[0.6rem] font-mono text-foreground/50 truncate">{r.id}</code>
                      <button
                        type="button"
                        onClick={() => copyId(r.id)}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[0.55rem] eyebrow border border-border/60 text-foreground/60 hover:text-accent hover:border-accent/60"
                        title="Copiar product_id"
                      >
                        {copiedId === r.id ? <Check size={10} /> : <Copy size={10} />}
                        {copiedId === r.id ? "Copiado" : "Copiar ID"}
                      </button>
                    </div>

                    <p className="text-[0.65rem] text-destructive mt-2">⚠ {motive}</p>

                    {st && (
                      <p className="mt-2 text-[0.6rem] eyebrow text-accent">
                        Estado: {st.status === "fallback_ok"
                          ? "Fallback aceptable"
                          : st.status === "priority_pending"
                          ? "Prioridad pendiente"
                          : "Manual requerido"}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <label className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.65rem] eyebrow border border-accent/60 text-accent bg-accent/5 hover:bg-accent/15 cursor-pointer ${busyId === r.id ? "opacity-50 pointer-events-none" : ""}`}>
                        <Upload size={12} />
                        Subir imagen
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          disabled={busyId === r.id}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handlePickFile(r, f);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => handleSetStatus(r.id, "fallback_ok")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.65rem] eyebrow border ${
                          st?.status === "fallback_ok"
                            ? "border-accent text-accent bg-accent/10"
                            : "border-border/60 text-foreground/70 hover:border-foreground/40"
                        } disabled:opacity-50`}
                      >
                        <ShieldCheck size={12} />
                        Fallback OK
                      </button>
                      <button
                        disabled={busyId === r.id}
                        onClick={() => handleSetStatus(r.id, "priority_pending")}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.65rem] eyebrow border ${
                          st?.status === "priority_pending"
                            ? "border-destructive text-destructive bg-destructive/10"
                            : "border-border/60 text-foreground/70 hover:border-foreground/40"
                        } disabled:opacity-50`}
                      >
                        <Flag size={12} />
                        Prioridad
                      </button>
                      {busyId === r.id && <Loader2 size={14} className="animate-spin text-accent" />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: zoom de imagen actual */}
      {zoomUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6"
          onClick={() => setZoomUrl(null)}
        >
          <button
            type="button"
            onClick={() => setZoomUrl(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
            aria-label="Cerrar"
          >
            <X size={22} />
          </button>
          <img
            src={zoomUrl}
            alt="Imagen ampliada"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Modal: confirmación de subida — comparación lado a lado */}
      {pendingUpload && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div
            className="bg-background border border-border/60 max-w-5xl w-full p-5 sm:p-7 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="eyebrow text-accent text-[0.65rem]">Confirmar imagen</p>
                <h4 className="mt-1 font-serif text-xl">
                  {pendingUpload.product.brand?.name ? `${pendingUpload.product.brand.name} — ` : ""}
                  {pendingUpload.product.base_name ?? pendingUpload.product.name}
                </h4>
                <p className="text-xs text-foreground/60 mt-1">
                  {pendingUpload.product.size_ml ? `${pendingUpload.product.size_ml} ml` : "—"} · USD {pendingUpload.product.price.toFixed(0)}
                </p>
                <code className="text-[0.6rem] font-mono text-foreground/50 mt-1 inline-block">
                  {pendingUpload.product.id}
                </code>
              </div>
              <button
                type="button"
                onClick={cancelUpload}
                className="p-1.5 text-foreground/60 hover:text-foreground"
                aria-label="Cerrar"
                disabled={busyId === pendingUpload.product.id}
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <p className="eyebrow text-[0.6rem] text-foreground/50 mb-2">Actual (fallback image_url)</p>
                <div className="aspect-square bg-card border border-border/40 flex items-center justify-center overflow-hidden">
                  {pendingUpload.product.image_url ? (
                    <img src={pendingUpload.product.image_url} alt="" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-foreground/30 text-4xl font-serif">—</span>
                  )}
                </div>
              </div>
              <div>
                <p className="eyebrow text-[0.6rem] text-accent mb-2">Nueva (a confirmar)</p>
                <div className="aspect-square bg-card border border-accent/60 flex items-center justify-center overflow-hidden">
                  <img src={pendingUpload.previewUrl} alt="" className="w-full h-full object-contain" />
                </div>
              </div>
            </div>

            <p className="text-[0.65rem] text-foreground/50 mb-4">
              Al confirmar, se actualiza solo <code className="text-accent">clean_image_url</code>.
              El <code>image_url</code> original queda intacto.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                type="button"
                onClick={cancelUpload}
                disabled={busyId === pendingUpload.product.id}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs eyebrow border border-border/60 text-foreground/70 hover:border-foreground/40 disabled:opacity-50"
              >
                Cancelar / elegir otra imagen
              </button>
              <button
                type="button"
                onClick={confirmUpload}
                disabled={busyId === pendingUpload.product.id}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs eyebrow bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50"
              >
                {busyId === pendingUpload.product.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Confirmar esta imagen para este producto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabla general */}
      {rows === null ? (
        <div className="text-center py-12"><Loader2 className="inline animate-spin" /></div>
      ) : rows.length === 0 ? (
        <p className="text-foreground/60 italic">No hay productos faltantes.</p>
      ) : (
        <div className="overflow-x-auto border border-border/40">
          <table className="w-full text-xs">
            <thead className="bg-card/50 text-left eyebrow text-[0.6rem] text-foreground/60">
              <tr>
                <th className="p-3">Imagen</th>
                <th className="p-3">Marca</th>
                <th className="p-3">Nombre</th>
                <th className="p-3">ml</th>
                <th className="p-3">USD</th>
                <th className="p-3">Origen</th>
                <th className="p-3">Motivo</th>
                <th className="p-3">ID</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const manual = MANUAL_PENDING_IDS.has(r.id);
                return (
                  <tr key={r.id} className="border-t border-border/30 hover:bg-card/30">
                    <td className="p-2">
                      {r.image_url ? (
                        <img src={r.image_url} alt="" className="w-12 h-12 object-contain bg-card" loading="lazy" />
                      ) : (
                        <div className="w-12 h-12 bg-card flex items-center justify-center text-foreground/30">—</div>
                      )}
                    </td>
                    <td className="p-2 text-foreground/70">{r.brand?.name ?? "—"}</td>
                    <td className="p-2 font-serif">{r.base_name ?? r.name}</td>
                    <td className="p-2 text-foreground/60">{r.size_ml ?? "—"}</td>
                    <td className="p-2 text-foreground/60">{r.price.toFixed(0)}</td>
                    <td className="p-2">
                      {manual ? (
                        <span className="text-destructive eyebrow text-[0.55rem]">MANUAL</span>
                      ) : (
                        <span className="text-accent eyebrow text-[0.55rem]">RECUPERABLE</span>
                      )}
                    </td>
                    <td className="p-2 text-foreground/60">
                      {manual ? MANUAL_PENDING_MOTIVES[r.id] : "pendiente de procesar"}
                    </td>
                    <td className="p-2 font-mono text-[0.55rem] text-foreground/40">{r.id.slice(0, 8)}…</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="border border-border/40 px-3 py-3">
      <p className="text-[0.6rem] eyebrow text-foreground/50">{label}</p>
      <p className={`mt-1 text-2xl font-serif ${accent ? "text-accent" : ""}`}>{value}</p>
    </div>
  );
}

function SuggestionCard({
  perfume,
  distance,
  onConfirm,
  disabled,
}: {
  perfume: PerfumeLite;
  distance?: number;
  onConfirm: () => void;
  disabled: boolean;
}) {
  return (
    <div className="border border-border/40 p-3 flex flex-col">
      <div className="aspect-square bg-card flex items-center justify-center overflow-hidden mb-2">
        {perfume.image_url ? (
          <img src={perfume.image_url} alt="" className="w-full h-full object-contain" loading="lazy" />
        ) : (
          <span className="text-foreground/30 text-3xl font-serif">{perfume.name.charAt(0)}</span>
        )}
      </div>
      <p className="text-[0.6rem] eyebrow text-foreground/50 truncate">{perfume.brand?.name ?? "—"}</p>
      <p className="text-xs font-serif leading-tight line-clamp-2 mt-0.5">
        {perfume.base_name ?? perfume.name}
      </p>
      {typeof distance === "number" && (
        <p className="text-[0.55rem] text-foreground/40 mt-1">
          Hamming: {distance} · {distance <= 10 ? "match alto" : distance <= 20 ? "posible" : "lejano"}
        </p>
      )}
      <button
        onClick={onConfirm}
        disabled={disabled}
        className="mt-2 inline-flex items-center justify-center gap-1.5 py-2 bg-accent text-accent-foreground text-[0.65rem] eyebrow hover:bg-accent/90 disabled:opacity-50"
      >
        <CheckCircle2 size={12} /> Confirmar
      </button>
    </div>
  );
}
