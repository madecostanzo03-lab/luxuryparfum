import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Perfume } from "@/lib/types";
import { HIDDEN_BRAND_SLUGS, HIDDEN_BRAND_SLUG_SET } from "@/lib/hidden-brands";
import {
  GROUP_RULES,
  buildAllCandidateGroups,
  loadDecisions,
  saveDecisions,
  ruleKey,
  presentationLabel,
  type GroupDecision,
  type GroupedPerfume,
} from "@/lib/perfume-grouping";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { whatsappLink, perfumePublicUrl } from "@/lib/whatsapp";
import { resolvePerfumeImage } from "@/lib/premium-images";
import { CheckCircle2, XCircle, Clock, Loader2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/agrupacion-variantes")({
  head: () => ({
    meta: [
      { title: "Agrupación de variantes — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AgrupacionVariantesPage,
});

function AgrupacionVariantesPage() {
  const isAdmin = useIsAdmin();
  const [authChecked, setAuthChecked] = useState(false);
  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [loading, setLoading] = useState(true);
  const [decisions, setDecisions] = useState<Record<string, GroupDecision>>({});

  useEffect(() => {
    setDecisions(loadDecisions());
  }, []);

  // Verificar sesión (client-side gate; los datos públicos son visibles igual,
  // pero la pantalla solo tiene sentido para admins logueados).
  useEffect(() => {
    supabase.auth.getSession().then(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    (async () => {
      // Cargar marcas ocultas para excluirlas
      const { data: hiddenBrands } = await supabase
        .from("brands")
        .select("id")
        .in("slug", HIDDEN_BRAND_SLUGS as unknown as string[]);
      const hiddenIds = (hiddenBrands ?? []).map((b) => b.id);

      let q = supabase
        .from("perfumes")
        .select("*, brand:brands(*), variants:perfume_variants(*)")
        .eq("in_stock", true);
      if (hiddenIds.length > 0) {
        q = q.not("brand_id", "in", `(${hiddenIds.join(",")})`);
      }
      const { data } = await q;
      const list = ((data as Perfume[]) ?? []).filter(
        (p) => !p.brand || !HIDDEN_BRAND_SLUG_SET.has(p.brand.slug),
      );
      setPerfumes(list);
      setLoading(false);
    })();
  }, []);

  const groups = useMemo(() => buildAllCandidateGroups(perfumes), [perfumes]);
  const totalSkusInGroups = useMemo(
    () => groups.reduce((acc, g) => acc + (g.groupedSkus?.length ?? 0), 0),
    [groups],
  );

  const setDecision = (key: string, d: GroupDecision) => {
    const next = { ...decisions, [key]: d };
    setDecisions(next);
    saveDecisions(next);
  };

  const counts = useMemo(() => {
    let approved = 0;
    let rejected = 0;
    let review = 0;
    for (const r of GROUP_RULES) {
      const k = ruleKey(r);
      const d = decisions[k] ?? "approved";
      if (d === "approved") approved++;
      else if (d === "rejected") rejected++;
      else review++;
    }
    return { approved, rejected, review };
  }, [decisions]);

  // Cálculos de cards finales en catálogo
  const visibleSkus = perfumes.length;
  const skusInApprovedGroups = useMemo(() => {
    let n = 0;
    for (const g of groups) {
      const k = ruleKey({
        brandSlug: g.brand?.slug ?? "",
        normalizedName: g.base_name ?? "",
      });
      const d = decisions[k] ?? "approved";
      if (d === "approved") n += g.groupedSkus?.length ?? 0;
    }
    return n;
  }, [groups, decisions]);
  const cardsAfter = visibleSkus - skusInApprovedGroups + counts.approved;

  if (!authChecked) {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <Loader2 className="animate-spin text-accent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-32 text-center">
        <p className="eyebrow text-accent">Acceso restringido</p>
        <h1 className="mt-6 text-3xl font-serif">Solo administradores</h1>
        <p className="mt-4 text-foreground/60">
          Iniciá sesión con una cuenta de administrador para acceder a esta página.
        </p>
        <Link to="/login" className="mt-8 inline-block eyebrow text-accent">
          Ir al login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 lg:px-12 py-16">
      <header className="mb-10">
        <p className="eyebrow text-accent">Admin · Revisión</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-serif">
          Agrupación de variantes
        </h1>
        <p className="mt-4 text-foreground/60 max-w-2xl">
          Revisá los {GROUP_RULES.length} grupos detectados automáticamente. Aprobalos,
          rechazalos o marcalos para revisar después. Las decisiones se guardan
          localmente en este navegador y afectan inmediatamente el catálogo público.{" "}
          <strong className="text-foreground">No se modifica la base de datos.</strong>
        </p>
      </header>

      {/* Resumen */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
        <SummaryCard label="Grupos totales" value={GROUP_RULES.length} />
        <SummaryCard label="Aprobados" value={counts.approved} tone="ok" />
        <SummaryCard label="Rechazados" value={counts.rejected} tone="warn" />
        <SummaryCard label="Revisar después" value={counts.review} tone="muted" />
        <SummaryCard label="SKUs visibles" value={visibleSkus} />
        <SummaryCard
          label="Cards en catálogo"
          value={loading ? "…" : cardsAfter}
          tone="accent"
        />
      </section>

      {loading ? (
        <div className="py-20 text-center text-foreground/50">
          <Loader2 className="inline-block animate-spin text-accent" />
        </div>
      ) : groups.length === 0 ? (
        <div className="py-20 text-center text-foreground/60 font-serif italic">
          No se detectaron grupos. (¿Productos cambiaron de nombre en BD?)
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((g) => {
            const key = ruleKey({
              brandSlug: g.brand?.slug ?? "",
              normalizedName: g.base_name ?? "",
            });
            const decision = decisions[key] ?? "approved";
            return (
              <GroupReviewCard
                key={key}
                group={g}
                decision={decision}
                onDecision={(d) => setDecision(key, d)}
              />
            );
          })}
        </div>
      )}

      <p className="mt-12 text-center text-[0.7rem] text-foreground/40 brand-serif">
        Total de SKUs dentro de grupos detectados: {totalSkusInGroups}.
        Las decisiones se guardan en localStorage de este navegador.
      </p>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number | string;
  tone?: "default" | "ok" | "warn" | "muted" | "accent";
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-500/40 text-emerald-300"
      : tone === "warn"
        ? "border-rose-500/40 text-rose-300"
        : tone === "muted"
          ? "border-amber-500/40 text-amber-300"
          : tone === "accent"
            ? "border-accent text-accent"
            : "border-border text-foreground";
  return (
    <div className={`border ${toneClass} px-4 py-3`}>
      <p className="eyebrow text-[0.55rem] opacity-70">{label}</p>
      <p className="mt-1 text-2xl font-serif">{value}</p>
    </div>
  );
}

function GroupReviewCard({
  group,
  decision,
  onDecision,
}: {
  group: GroupedPerfume;
  decision: GroupDecision;
  onDecision: (d: GroupDecision) => void;
}) {
  const skus = group.groupedSkus ?? [];
  const variants = group.variants ?? [];
  const [selectedSkuId, setSelectedSkuId] = useState<string>(
    variants[0]?.id ?? skus[0]?.id ?? "",
  );
  const selectedSku = skus.find((s) => s.id === selectedSkuId) ?? skus[0];
  const selectedVariant =
    variants.find((v) => v.id === selectedSkuId) ?? variants[0];

  const { src: cardImg } = resolvePerfumeImage(
    group.id,
    group.clean_image_url ?? group.image_url,
  );

  const decisionRing =
    decision === "approved"
      ? "ring-emerald-500/40"
      : decision === "rejected"
        ? "ring-rose-500/40"
        : "ring-amber-500/40";

  // Mensaje preview de WhatsApp para la variante seleccionada
  const presentation = selectedVariant ? presentationLabel(
    skus.find((s) => s.id === selectedVariant.id) ?? group,
  ) : null;
  const waUrl = whatsappLink({
    name: group.base_name ?? group.name,
    brand: group.brand?.name ?? null,
    presentation,
    price: selectedVariant?.price ?? group.price,
    url: perfumePublicUrl(group.id, selectedVariant?.id ?? null),
  });
  // Reconstruir el texto plano para preview (mismo formato que buildMessage)
  const waText = decodeURIComponent(waUrl.split("text=")[1] ?? "");

  return (
    <article
      className={`border border-border bg-card/30 ring-2 ring-offset-2 ring-offset-background ${decisionRing} p-6`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <p className="eyebrow text-foreground/50">{group.brand?.name}</p>
          <h2 className="mt-1 text-2xl font-serif">{group.base_name}</h2>
          <p className="mt-1 text-[0.7rem] text-foreground/45 brand-serif">
            Clave de regla:{" "}
            <code className="text-foreground/70">
              {group.brand?.slug} :: {group.base_name}
            </code>
          </p>
        </div>
        <DecisionBadge decision={decision} />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Card preview + Modal preview */}
        <div className="space-y-6">
          <div>
            <p className="eyebrow text-foreground/50 mb-3">
              Vista previa de la card en catálogo
            </p>
            <div className="border border-border/60 p-5 max-w-[280px]">
              <div className="aspect-[4/5] bg-card overflow-hidden">
                {cardImg ? (
                  <img
                    src={cardImg}
                    alt={group.base_name ?? group.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center text-foreground/30">
                    sin imagen
                  </div>
                )}
              </div>
              <div className="pt-4 text-center">
                <p className="eyebrow text-[0.6rem] text-foreground/45">
                  {group.brand?.name}
                </p>
                <h3 className="mt-2 font-serif text-lg leading-tight">
                  {group.base_name}
                </h3>
                <p className="mt-2 text-sm text-foreground/75 brand-serif">
                  Desde{" "}
                  <span className="text-foreground">
                    USD {group.price.toFixed(0)}
                  </span>
                </p>
                <p className="mt-1 text-[0.62rem] text-accent eyebrow">
                  {variants.length} presentaciones
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="eyebrow text-foreground/50 mb-3">
              Selector del modal · WhatsApp dinámico
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {variants.map((v) => {
                const sku = skus.find((s) => s.id === v.id);
                const label = sku ? presentationLabel(sku) : "Única";
                const active = v.id === selectedSkuId;
                return (
                  <button
                    key={v.id}
                    onClick={() => setSelectedSkuId(v.id)}
                    className={`eyebrow text-[0.6rem] px-3 py-1.5 border transition-colors ${
                      active
                        ? "border-accent text-accent bg-accent/10"
                        : "border-border text-foreground/60 hover:border-foreground/40"
                    }`}
                  >
                    {label} · USD {v.price.toFixed(0)}
                  </button>
                );
              })}
            </div>
            <div className="bg-input/30 border border-border/60 px-4 py-3 text-[0.72rem] whitespace-pre-line font-mono text-foreground/75">
              {waText}
            </div>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[0.7rem] text-accent hover:opacity-70"
            >
              Abrir WhatsApp <ExternalLink size={11} />
            </a>
          </div>
        </div>

        {/* Tabla de SKUs */}
        <div>
          <p className="eyebrow text-foreground/50 mb-3">
            Variantes / SKUs ({skus.length})
          </p>
          <div className="space-y-3">
            {skus.map((s) => {
              const isMain = s.id === selectedSku?.id;
              return (
                <div
                  key={s.id}
                  className={`flex gap-3 p-3 border ${
                    isMain
                      ? "border-accent/60 bg-accent/5"
                      : "border-border/60"
                  }`}
                >
                  <div className="w-16 h-20 bg-card flex-shrink-0 overflow-hidden">
                    {s.image_url || s.clean_image_url ? (
                      <img
                        src={s.clean_image_url ?? s.image_url ?? ""}
                        alt={s.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-[0.6rem] text-foreground/30">
                        s/img
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 text-[0.72rem] space-y-0.5">
                    <p className="font-serif text-sm text-foreground truncate">
                      {s.name}
                    </p>
                    <p className="text-foreground/50">
                      <code>{s.id.slice(0, 8)}…</code> · {presentationLabel(s)}
                      {s.concentration ? ` · ${s.concentration.toUpperCase()}` : ""}
                    </p>
                    <p className="text-foreground/75">
                      USD {s.price.toFixed(0)}
                    </p>
                    <div className="flex gap-2 text-[0.65rem] text-foreground/50">
                      <span>
                        image_url:{" "}
                        {s.image_url ? (
                          <span className="text-emerald-400">sí</span>
                        ) : (
                          <span className="text-rose-400">no</span>
                        )}
                      </span>
                      <span>
                        clean:{" "}
                        {s.clean_image_url ? (
                          <span className="text-emerald-400">sí</span>
                        ) : (
                          <span className="text-foreground/40">no</span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="mt-6 flex flex-wrap gap-2 pt-5 border-t border-border/40">
        <ActionButton
          active={decision === "approved"}
          tone="ok"
          icon={<CheckCircle2 size={14} />}
          onClick={() => onDecision("approved")}
        >
          Aprobar grupo
        </ActionButton>
        <ActionButton
          active={decision === "rejected"}
          tone="warn"
          icon={<XCircle size={14} />}
          onClick={() => onDecision("rejected")}
        >
          No agrupar este grupo
        </ActionButton>
        <ActionButton
          active={decision === "review"}
          tone="muted"
          icon={<Clock size={14} />}
          onClick={() => onDecision("review")}
        >
          Revisar después
        </ActionButton>
      </div>
    </article>
  );
}

function DecisionBadge({ decision }: { decision: GroupDecision }) {
  const map = {
    approved: { label: "Aprobado", cls: "border-emerald-500/50 text-emerald-300" },
    rejected: { label: "Rechazado", cls: "border-rose-500/50 text-rose-300" },
    review: { label: "Revisar después", cls: "border-amber-500/50 text-amber-300" },
  } as const;
  const m = map[decision];
  return (
    <span className={`eyebrow text-[0.6rem] px-3 py-1.5 border ${m.cls}`}>
      {m.label}
    </span>
  );
}

function ActionButton({
  children,
  onClick,
  active,
  tone,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active: boolean;
  tone: "ok" | "warn" | "muted";
  icon: React.ReactNode;
}) {
  const base =
    tone === "ok"
      ? "border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10"
      : tone === "warn"
        ? "border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
        : "border-amber-500/40 text-amber-300 hover:bg-amber-500/10";
  const activeCls =
    active && tone === "ok"
      ? "bg-emerald-500/15"
      : active && tone === "warn"
        ? "bg-rose-500/15"
        : active && tone === "muted"
          ? "bg-amber-500/15"
          : "";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2 border eyebrow text-[0.65rem] transition-colors ${base} ${activeCls}`}
    >
      {icon}
      {children}
    </button>
  );
}
