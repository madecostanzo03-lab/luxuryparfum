import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/use-is-admin";
import auditData from "@/lib/audit-variants-data.json";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/auditoria-variantes-no-agrupadas")({
  head: () => ({
    meta: [
      { title: "Auditoría de variantes no agrupadas — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuditPage,
});

type SuspicionType =
  | "A_nombre_inconsistente"
  | "B_imagen_compartida"
  | "C_descripcion_incorrecta"
  | "D_distintos_no_agrupar";

type Decision =
  | "agrupar"
  | "mantener"
  | "imagen_mal"
  | "nombre_revisar"
  | "notas_revisar"
  | "luego";

interface AuditProduct {
  id: string;
  brand: string;
  name: string;
  size_ml: number | null;
  concentration: string | null;
  price: number;
  description: string | null;
  notes: string | null;
  image_url: string | null;
  clean_image_url: string | null;
  grouped_currently: boolean;
  shares_image_with_n: number;
}

interface AuditCase {
  id: string;
  suspicion_type: SuspicionType;
  reason: string;
  recommended_action: string;
  shared_image: boolean;
  products: AuditProduct[];
}

const STORAGE_KEY = "lp.audit.variants.decisions.v1";

function loadDecisions(): Record<string, Decision> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveDecisions(d: Record<string, Decision>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
}

const SUSPICION_LABEL: Record<SuspicionType, { label: string; color: string }> = {
  A_nombre_inconsistente: { label: "A · Nombre inconsistente", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" },
  B_imagen_compartida: { label: "B · Imagen compartida", color: "bg-rose-500/20 text-rose-300 border-rose-500/40" },
  C_descripcion_incorrecta: { label: "C · Notas/descripción", color: "bg-violet-500/20 text-violet-300 border-violet-500/40" },
  D_distintos_no_agrupar: { label: "D · Productos distintos", color: "bg-sky-500/20 text-sky-300 border-sky-500/40" },
};

const DECISION_BTNS: { key: Decision; label: string; cls: string }[] = [
  { key: "agrupar", label: "Agrupar visualmente", cls: "bg-emerald-600 hover:bg-emerald-500 text-white" },
  { key: "mantener", label: "Mantener separados", cls: "bg-slate-700 hover:bg-slate-600 text-white" },
  { key: "imagen_mal", label: "Imagen equivocada", cls: "bg-rose-700 hover:bg-rose-600 text-white" },
  { key: "nombre_revisar", label: "Nombre a revisar", cls: "bg-amber-700 hover:bg-amber-600 text-white" },
  { key: "notas_revisar", label: "Notas/descripción a revisar", cls: "bg-violet-700 hover:bg-violet-600 text-white" },
  { key: "luego", label: "Resolver después", cls: "bg-zinc-700 hover:bg-zinc-600 text-white" },
];

function AuditPage() {
  const isAdmin = useIsAdmin();
  const [authChecked, setAuthChecked] = useState(false);
  const [decisions, setDecisions] = useState<Record<string, Decision>>({});
  const [filter, setFilter] = useState<SuspicionType | "all" | "pending">("all");

  useEffect(() => {
    supabase.auth.getSession().then(() => setAuthChecked(true));
    setDecisions(loadDecisions());
  }, []);

  const cases = auditData as AuditCase[];

  const filtered = useMemo(() => {
    if (filter === "all") return cases;
    if (filter === "pending") return cases.filter((c) => !decisions[c.id]);
    return cases.filter((c) => c.suspicion_type === filter);
  }, [cases, filter, decisions]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, total: cases.length };
    cases.forEach((x) => {
      if (x.suspicion_type === "A_nombre_inconsistente") c.A++;
      else if (x.suspicion_type === "B_imagen_compartida") c.B++;
      else if (x.suspicion_type === "C_descripcion_incorrecta") c.C++;
      else if (x.suspicion_type === "D_distintos_no_agrupar") c.D++;
    });
    return c;
  }, [cases]);

  const decisionStats = useMemo(() => {
    const s: Record<string, number> = {
      agrupar: 0, mantener: 0, imagen_mal: 0, nombre_revisar: 0, notas_revisar: 0, luego: 0, pendiente: 0,
    };
    cases.forEach((c) => {
      const d = decisions[c.id];
      if (!d) s.pendiente++;
      else s[d]++;
    });
    return s;
  }, [cases, decisions]);

  function setDecision(id: string, d: Decision) {
    const next = { ...decisions, [id]: d };
    setDecisions(next);
    saveDecisions(next);
  }

  function clearDecision(id: string) {
    const next = { ...decisions };
    delete next[id];
    setDecisions(next);
    saveDecisions(next);
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Acceso restringido</h1>
          <p className="text-muted-foreground">
            Esta sección es solo para administradores.
          </p>
          <Link to="/" className="text-primary underline">Volver al inicio</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h1 className="text-2xl md:text-3xl font-bold">
              Auditoría de variantes no agrupadas
            </h1>
            <Link
              to="/admin/agrupacion-variantes"
              className="text-sm text-primary underline"
            >
              ← Ver agrupaciones aprobadas
            </Link>
          </div>
          <p className="text-muted-foreground text-sm">
            Casos sospechosos de duplicados, variantes no agrupadas o imágenes compartidas.
            <strong className="text-foreground"> No se modifica nada en la base de datos.</strong> Solo
            queda registrada tu decisión en este navegador.
          </p>
        </header>

        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Stat label="Total casos" value={counts.total} />
          <Stat label="A · Nombre" value={counts.A} accent="amber" />
          <Stat label="B · Imagen" value={counts.B} accent="rose" />
          <Stat label="C · Notas" value={counts.C} accent="violet" />
          <Stat label="D · Distintos" value={counts.D} accent="sky" />
          <Stat label="Pendientes" value={decisionStats.pendiente} />
          <Stat label="Decididos" value={counts.total - decisionStats.pendiente} accent="emerald" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-xs">
          {DECISION_BTNS.map((b) => (
            <div key={b.key} className="rounded border border-border bg-card/50 px-3 py-2">
              <div className="text-muted-foreground">{b.label}</div>
              <div className="text-foreground font-bold text-base">{decisionStats[b.key]}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2">
          {([
            ["all", "Todos"],
            ["pending", "Pendientes"],
            ["A_nombre_inconsistente", "A · Nombre"],
            ["B_imagen_compartida", "B · Imagen"],
            ["D_distintos_no_agrupar", "D · Distintos"],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k as typeof filter)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                filter === k
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Casos */}
        <div className="space-y-4">
          {filtered.map((c) => {
            const decision = decisions[c.id];
            const susp = SUSPICION_LABEL[c.suspicion_type];
            return (
              <div
                key={c.id}
                className={`rounded-xl border bg-card p-4 md:p-6 space-y-4 ${
                  decision ? "opacity-60 border-border/50" : "border-border"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-mono text-muted-foreground">
                      {c.id}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded border ${susp.color}`}>
                      {susp.label}
                    </span>
                    {c.shared_image && (
                      <span className="text-xs px-2 py-1 rounded border border-rose-500/40 bg-rose-500/10 text-rose-300">
                        Imagen compartida
                      </span>
                    )}
                    {decision && (
                      <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        Decisión: {DECISION_BTNS.find((b) => b.key === decision)?.label}
                      </span>
                    )}
                  </div>
                  {decision && (
                    <button
                      onClick={() => clearDecision(c.id)}
                      className="text-xs text-muted-foreground hover:text-foreground underline"
                    >
                      Resetear decisión
                    </button>
                  )}
                </div>

                <div className="text-sm">
                  <div className="text-muted-foreground">Motivo:</div>
                  <div className="text-foreground">{c.reason}</div>
                  <div className="text-muted-foreground mt-1">
                    Acción recomendada: <span className="text-foreground">{c.recommended_action}</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {c.products.map((p) => (
                    <ProductCard key={p.id} p={p} />
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
                  {DECISION_BTNS.map((b) => (
                    <button
                      key={b.key}
                      onClick={() => setDecision(c.id, b.key)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                        decision === b.key ? b.cls : "bg-muted hover:bg-muted/80 text-foreground"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <footer className="text-xs text-muted-foreground border-t border-border pt-4">
          CSV completo disponible en <code>/mnt/documents/auditoria_variantes_no_agrupadas.csv</code>.
          Esta auditoría es solo de revisión — no toca BD, precios, nombres, descripciones ni imágenes.
        </footer>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  const colors: Record<string, string> = {
    amber: "text-amber-300",
    rose: "text-rose-300",
    violet: "text-violet-300",
    sky: "text-sky-300",
    emerald: "text-emerald-300",
  };
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${accent ? colors[accent] : "text-foreground"}`}>
        {value}
      </div>
    </div>
  );
}

function ProductCard({ p }: { p: AuditProduct }) {
  const img = p.clean_image_url || p.image_url;
  return (
    <div className="rounded-lg border border-border bg-background/50 p-3 space-y-2">
      <div className="aspect-square w-full max-w-[260px] mx-auto bg-transparent rounded overflow-hidden flex items-center justify-center">
        {img ? (
          <img
            src={img}
            alt={p.name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="text-muted-foreground text-xs">sin imagen</div>
        )}
      </div>
      <div className="space-y-1 text-sm">
        <div className="text-xs text-muted-foreground font-mono break-all">{p.id}</div>
        <div className="font-semibold text-foreground">{p.name}</div>
        <div className="text-xs text-muted-foreground">
          {p.brand} · {p.concentration?.toUpperCase() || "—"} · {p.size_ml ?? "?"}ml · USD {p.price}
        </div>
        {p.shares_image_with_n > 1 && (
          <div className="text-xs text-rose-400">
            ⚠ Esta imagen está usada por {p.shares_image_with_n} productos
          </div>
        )}
        {p.grouped_currently && (
          <div className="text-xs text-emerald-400">✓ Ya agrupado actualmente</div>
        )}
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Notas / descripción
          </summary>
          <div className="mt-1 text-foreground/80 whitespace-pre-wrap">
            {p.notes || p.description || "—"}
          </div>
        </details>
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            URLs de imagen
          </summary>
          <div className="mt-1 space-y-1">
            <div><span className="text-muted-foreground">image_url:</span> <span className="break-all">{p.image_url || "—"}</span></div>
            <div><span className="text-muted-foreground">clean_image_url:</span> <span className="break-all">{p.clean_image_url || "—"}</span></div>
          </div>
        </details>
      </div>
    </div>
  );
}
