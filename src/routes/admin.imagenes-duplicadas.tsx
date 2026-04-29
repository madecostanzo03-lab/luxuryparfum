import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ExternalLink, Copy, Check, ShieldCheck, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/imagenes-duplicadas")({
  head: () => ({
    meta: [
      { title: "Auditoría de imágenes duplicadas / variantes — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuditPage,
});

type Product = {
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
  products: Product[];
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

const CLASS_META = {
  error_probable: {
    label: "Error probable",
    bg: "bg-red-500/10 border-red-500/30 text-red-400",
    rank: 0,
  },
  revision_recomendada: {
    label: "Revisión recomendada",
    bg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    rank: 1,
  },
  ok_probable: {
    label: "OK probable",
    bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    rank: 2,
  },
} as const;

function AuditPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "error_probable" | "revision_recomendada" | "ok_probable">("error_probable");
  const [decisions, setDecisions] = useState<Record<string, "ok" | "review_later" | "error" | undefined>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem("dup_audit_decisions") || "{}"); } catch { return {}; }
  });
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const user = sess.session?.user;
      if (!user) { setAuthed(false); setIsAdmin(false); return; }
      setAuthed(true);
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", user.id);
      setIsAdmin(!!roles?.some((r: { role: string }) => r.role === "admin"));
    })();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetch("/admin/auditoria_imagenes_duplicadas.json")
      .then((r) => { if (!r.ok) throw new Error("No se pudo cargar el reporte"); return r.json(); })
      .then((data: Report) => setReport(data))
      .catch((e) => setError(e.message));
  }, [isAdmin]);

  const persistDecision = (gid: string, value: "ok" | "review_later" | "error" | undefined) => {
    setDecisions((prev) => {
      const next = { ...prev };
      if (value === undefined) delete next[gid]; else next[gid] = value;
      try { localStorage.setItem("dup_audit_decisions", JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const copyToClipboard = async (text: string, key: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1200); } catch {}
  };

  const filteredGroups = useMemo(() => {
    if (!report) return [];
    const list = filter === "all" ? report.groups : report.groups.filter((g) => g.classification === filter);
    return [...list].sort((a, b) => CLASS_META[a.classification].rank - CLASS_META[b.classification].rank);
  }, [report, filter]);

  if (authed === null || isAdmin === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" />
      </div>
    );
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
        <h1 className="mt-4 text-4xl font-serif">Auditoría de imágenes duplicadas / variantes</h1>
        <p className="mt-3 text-foreground/60 text-sm max-w-2xl">
          Productos distintos compartiendo la misma imagen renderizada (clean_image_url) o
          la misma fuente original (image_url). Solo revisión — ningún cambio se aplica automáticamente.
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 border border-red-500/30 bg-red-500/10 text-red-400 text-sm">
          {error}
        </div>
      )}

      {!report ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-accent" /></div>
      ) : (
        <>
          {/* Resumen */}
          <section className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-10">
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
            <a
              href="/admin/auditoria_imagenes_duplicadas.json"
              download
              className="ml-auto eyebrow text-[0.6rem] px-4 py-2 border border-border/60 text-foreground/60 hover:border-accent hover:text-accent"
            >
              Descargar JSON
            </a>
          </div>

          {/* Grupos */}
          <div className="space-y-6">
            {filteredGroups.map((g) => {
              const meta = CLASS_META[g.classification];
              const decision = decisions[g.group_id];
              return (
                <article key={g.group_id} className="border border-border/60 bg-card/30">
                  <div className="grid md:grid-cols-[200px_1fr] gap-6 p-5">
                    {/* Imagen */}
                    <div className="space-y-2">
                      <div className="aspect-square bg-secondary/30 border border-border/40 overflow-hidden flex items-center justify-center">
                        <img
                          src={g.rendered_image_url}
                          alt={g.group_id}
                          className="max-w-full max-h-full object-contain"
                          loading="lazy"
                        />
                      </div>
                      <a
                        href={g.rendered_image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[0.6rem] text-foreground/50 hover:text-accent"
                      >
                        <ExternalLink size={11} /> Abrir imagen
                      </a>
                    </div>

                    {/* Info */}
                    <div>
                      <div className="flex items-start gap-3 flex-wrap mb-3">
                        <span className={`eyebrow text-[0.55rem] px-2 py-1 border ${meta.bg}`}>
                          {meta.label}
                        </span>
                        <span className="eyebrow text-[0.55rem] px-2 py-1 border border-border/60 text-foreground/60">
                          {g.match_type === "rendered" ? "imagen renderizada" : "image_url original"}
                        </span>
                        <span className="eyebrow text-[0.55rem] px-2 py-1 border border-border/60 text-foreground/60">
                          {g.source_type}
                        </span>
                        <span className="eyebrow text-[0.55rem] text-foreground/40 ml-auto">{g.group_id}</span>
                      </div>
                      <p className="text-xs text-foreground/70 mb-4 italic">{g.reason}</p>

                      <ul className="divide-y divide-border/40 border-y border-border/40">
                        {g.products.map((p) => (
                          <li key={p.product_id} className="py-3 flex items-start gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <p className="text-[0.65rem] eyebrow text-foreground/50">{p.brand}</p>
                              <p className="text-sm font-medium">{p.name}</p>
                              <p className="text-[0.65rem] text-foreground/50 mt-1">
                                {p.size_ml ? `${p.size_ml}ml` : "—"} · USD {p.price_usd} · {p.has_clean ? "✓ clean" : "✗ sin clean"}
                              </p>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => copyToClipboard(p.product_id, p.product_id)}
                                title="Copiar product_id"
                                className="p-1.5 border border-border/60 hover:border-accent hover:text-accent transition-colors"
                              >
                                {copied === p.product_id ? <Check size={12} /> : <Copy size={12} />}
                              </button>
                              <Link
                                to="/catalogo"
                                search={{ marca: "", genero: "", tipo: "", q: "", max: 500, p: p.product_id, v: "", destacado: "" }}
                                target="_blank"
                                title="Abrir en catálogo"
                                className="p-1.5 border border-border/60 hover:border-accent hover:text-accent transition-colors inline-flex"
                              >
                                <ExternalLink size={12} />
                              </Link>
                            </div>
                          </li>
                        ))}
                      </ul>

                      {/* Decisión (solo local, no aplica cambios) */}
                      <div className="mt-4 flex flex-wrap gap-2 items-center">
                        <span className="eyebrow text-[0.55rem] text-foreground/40">Marcar como:</span>
                        {([
                          ["ok", "OK", "border-emerald-500/40 text-emerald-400"],
                          ["review_later", "Revisar después", "border-amber-500/40 text-amber-400"],
                          ["error", "Error probable", "border-red-500/40 text-red-400"],
                        ] as const).map(([key, label, cls]) => (
                          <button
                            key={key}
                            onClick={() => persistDecision(g.group_id, decision === key ? undefined : key)}
                            className={`eyebrow text-[0.55rem] px-3 py-1.5 border transition-colors ${
                              decision === key ? cls : "border-border/60 text-foreground/60 hover:border-foreground/40"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                        {decision && (
                          <span className="eyebrow text-[0.55rem] text-foreground/40 ml-2">guardado localmente</span>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
