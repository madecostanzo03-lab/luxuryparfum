import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import {
  confirmCleanImageMatch,
  skipCleanImage,
  getPendingImageUrl,
} from "@/server/clean-images.functions";
import { Loader2, CheckCircle2, SkipForward, Search, ChevronLeft, ChevronRight } from "lucide-react";

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
  const [filter, setFilter] = useState<"pending" | "confirmed" | "skipped">("pending");
  const [cursor, setCursor] = useState(0);

  // signed URL de la imagen pendiente actual
  const [pendingUrl, setPendingUrl] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const confirmFn = useServerFn(confirmCleanImageMatch);
  const skipFn = useServerFn(skipCleanImage);
  const getUrlFn = useServerFn(getPendingImageUrl);

  // Auth + admin gate (mismo patrón que /admin/qa y /admin/precios)
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAuthed(false); return; }
      setAuthed(true);
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
    if (!current) return;
    (async () => {
      try {
        const r = await getUrlFn({ data: { pendingPath: current.pending_path } });
        setPendingUrl(r.url);
      } catch (e: any) {
        setMsg(`Error cargando preview: ${e.message}`);
      }
    })();
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!current || busy) return;
    setBusy(true); setMsg(null);
    try {
      await confirmFn({ data: { queueId: current.id, perfumeId } });
      setMsg("✓ Confirmado y publicado.");
      await loadAll();
      // mantener cursor en la misma posición (siguiente pendiente)
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
    } finally { setBusy(false); }
  };

  const handleSkip = async () => {
    if (!current || busy) return;
    setBusy(true); setMsg(null);
    try {
      await skipFn({ data: { queueId: current.id } });
      setMsg("Saltada.");
      await loadAll();
    } catch (e: any) {
      setMsg(`Error: ${e.message}`);
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
      <div className="flex gap-2 mb-6 border-b border-border/40">
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

      {loading ? (
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
    </div>
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
