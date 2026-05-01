import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Perfume } from "@/lib/types";
import { PerfumeCard } from "@/components/PerfumeCard";
import { whatsappGeneralLink } from "@/lib/whatsapp";
import { HIDDEN_BRAND_SLUG_SET } from "@/lib/hidden-brands";
import heroImg from "@/assets/hero-perfume.jpg";
import sensFresco from "@/assets/sensacion-fresco.jpg";
import sensDulce from "@/assets/sensacion-dulce.jpg";
import sensAmaderado from "@/assets/sensacion-amaderado.jpg";
import sensIntenso from "@/assets/sensacion-intenso.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Luxury Parfum — Elegí cómo querés que te recuerden" },
      {
        name: "description",
        content:
          "Asesoramiento personalizado de perfumería de lujo. Para que tu fragancia hable antes que vos. Originales, curados y enviados a todo el país.",
      },
      { property: "og:title", content: "Luxury Parfum — Elegí cómo querés que te recuerden" },
      {
        property: "og:description",
        content: "Asesoramiento premium por WhatsApp. Tu perfume también habla por vos.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [recommended, setRecommended] = useState<Perfume[]>([]);
  const [bestsellers, setBestsellers] = useState<Perfume[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data: flagged } = await supabase
        .from("perfumes")
        .select("*, brand:brands(*), variants:perfume_variants(*)")
        .or("is_recommended.eq.true,is_bestseller.eq.true");

      if (flagged) {
        const all = (flagged as Perfume[]).filter(
          (p) => !p.brand || !HIDDEN_BRAND_SLUG_SET.has(p.brand.slug),
        );
        const byPriceAsc = (a: Perfume, b: Perfume) => a.price - b.price;
        setRecommended(all.filter((p) => p.is_recommended).sort(byPriceAsc).slice(0, 8));
        setBestsellers(all.filter((p) => p.is_bestseller).sort(byPriceAsc).slice(0, 8));
      }

      // Conteos por tipo de fragancia (universo visible: in_stock + sin marcas ocultas)
      const { data: hiddenBrands } = await supabase
        .from("brands")
        .select("id")
        .in("slug", HIDDEN_BRAND_SLUG_SET ? Array.from(HIDDEN_BRAND_SLUG_SET) : []);
      const hiddenIds = (hiddenBrands ?? []).map((b) => b.id);

      const types = ["fresco", "dulce", "amaderado", "intenso"] as const;
      const next: Record<string, number> = {};
      await Promise.all(
        types.map(async (t) => {
          let q = supabase
            .from("perfumes")
            .select("id", { count: "exact", head: true })
            .eq("in_stock", true)
            .eq("fragrance_type", t);
          if (hiddenIds.length > 0) {
            q = q.not("brand_id", "in", `(${hiddenIds.join(",")})`);
          }
          const { count } = await q;
          next[t] = count ?? 0;
        }),
      );
      setCounts(next);
    })();
  }, []);

  return (
    <>
      {/* HERO EDITORIAL — mobile-first */}
      <section className="relative min-h-[88vh] sm:min-h-[100vh] sm:h-[100vh] w-full overflow-hidden -mt-16 sm:-mt-20">
        <img
          src={heroImg}
          alt="Frasco de perfume Luxury Parfum sobre superficie azul reflectante"
          className="absolute inset-0 w-full h-full object-cover object-center"
          width={1920}
          height={1280}
        />
        <div className="absolute inset-0 bg-noir/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-noir/75 via-transparent to-noir" />

        <div className="relative z-10 h-full min-h-[88vh] sm:min-h-[100vh] flex flex-col items-center justify-center text-center px-5 sm:px-6 pt-20 pb-14">
          <p className="eyebrow text-foreground/65 fade-in" style={{ animationDelay: "0.2s" }}>
            Asesoría de perfumería premium
          </p>

          <div
            className="mt-7 sm:mt-10 w-12 h-px bg-accent/70 fade-in"
            style={{ animationDelay: "0.35s" }}
          />

          <h1
            className="mt-7 sm:mt-10 text-[2.4rem] sm:text-6xl lg:text-[5.5rem] font-serif text-balance max-w-4xl leading-[1.05] tracking-tight fade-up"
            style={{ animationDelay: "0.5s" }}
          >
            Elegí cómo querés que <em className="text-accent">te recuerden</em>
          </h1>

          <p
            className="mt-6 sm:mt-9 max-w-md text-foreground/80 text-base sm:text-lg leading-relaxed brand-serif fade-up"
            style={{ animationDelay: "0.8s" }}
          >
            Asesoramiento personalizado para que tu fragancia hable antes que vos.
          </p>

          <div
            className="mt-9 sm:mt-12 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-5 w-full max-w-sm sm:max-w-none sm:w-auto fade-up"
            style={{ animationDelay: "1.05s" }}
          >
            <a
              href={whatsappGeneralLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-luxury inline-flex items-center justify-center px-10 sm:px-12 py-5 bg-accent text-accent-foreground hover:bg-accent/90 hover:scale-[1.02] transition-all duration-500"
            >
              Asesorame por WhatsApp
            </a>
            <Link
              to="/catalogo"
              search={{ marca: "", genero: "", tipo: "", q: "", max: 500, p: "", v: "", destacado: "" }}
              className="brand-serif text-[0.95rem] inline-flex items-center justify-center px-8 py-5 text-foreground/75 hover:text-accent transition-colors duration-500 underline-offset-4 hover:underline"
            >
              Ver el catálogo →
            </Link>
          </div>

          <div
            className="mt-8 sm:mt-10 flex flex-wrap items-center justify-center gap-2 sm:gap-3 fade-in"
            style={{ animationDelay: "1.25s" }}
          >
            {[
              { icon: "⚡", label: "Respuesta rápida" },
              { icon: "✈", label: "Envíos a todo el país" },
              { icon: "✓", label: "Originales garantizados" },
            ].map((b) => (
              <span
                key={b.label}
                className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 border border-accent/30 bg-background/30 backdrop-blur-md text-[0.68rem] sm:text-[0.75rem] brand-serif text-foreground/85"
              >
                <span className="text-accent text-sm leading-none">{b.icon}</span>
                <span>{b.label}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* SECCIÓN ASESORÍA — la pieza central de conversión */}
      <section className="relative border-y border-accent/15 bg-gradient-to-b from-deep-blue/30 to-noir/0">
        <div className="max-w-5xl mx-auto px-5 sm:px-6 lg:px-12 py-16 sm:py-24 text-center">
          <p className="eyebrow text-accent/85">Asesoramiento personalizado</p>
          <h2 className="mt-6 text-3xl sm:text-5xl lg:text-6xl font-serif leading-[1.05] tracking-tight text-balance">
            ¿No sabés <em className="text-accent">cuál elegir</em>?
          </h2>
          <p className="mt-6 max-w-xl mx-auto text-foreground/70 brand-serif text-base sm:text-lg leading-relaxed">
            Conversamos por WhatsApp y te recomendamos la fragancia perfecta — según tu estilo, tu momento y cómo querés que te recuerden.
          </p>

          {/* Criterios de asesoría — cards con íconos, mobile friendly */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto text-left">
            {[
              { titulo: "Ocasión", desc: "Diaria, oficina, noche, evento", icon: "🌙" },
              { titulo: "Estación", desc: "Primavera, verano, otoño, invierno", icon: "🍂" },
              { titulo: "Estilo", desc: "Clásico, moderno, atrevido, minimal", icon: "✨" },
              { titulo: "Familia", desc: "Dulce, fresco, amaderado, intenso", icon: "🌸" },
              { titulo: "Presencia", desc: "Elegante y sutil o impacto fuerte", icon: "💫" },
              { titulo: "Presupuesto", desc: "Joya accesible o icono de lujo", icon: "💰" },
            ].map((c) => (
              <div
                key={c.titulo}
                className="border border-accent/20 bg-background/40 backdrop-blur-sm p-4 sm:p-5 hover:border-accent/50 transition-colors duration-500"
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-xl sm:text-2xl leading-none" aria-hidden>{c.icon}</span>
                  <p className="brand-serif text-accent text-base sm:text-lg font-semibold">{c.titulo}</p>
                </div>
                <p className="mt-2 text-[0.78rem] sm:text-sm text-foreground/55 leading-snug">
                  {c.desc}
                </p>
              </div>
            ))}
          </div>

          <a
            href={whatsappGeneralLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-luxury mt-12 inline-flex items-center justify-center px-12 py-5 bg-accent text-accent-foreground hover:bg-accent/90 hover:scale-[1.02] transition-all duration-500"
          >
            Quiero que me asesoren
          </a>
          <p className="mt-3 text-[0.7rem] text-foreground/45 brand-serif">
            Te respondemos en minutos · Sin compromiso
          </p>
        </div>
      </section>

      {/* SELECCIÓN DEL EQUIPO */}
      <Section
        eyebrow="Selección del equipo"
        title={<>Nuestras <em className="text-accent">favoritas</em></>}
        subtitle="Las que más recomendamos cuando alguien nos dice 'no sé por dónde empezar'. Variedad de precios, una para cada estilo."
        perfumes={recommended}
      />

      {/* EXPLORAR POR SENSACIONES */}
      <section className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-12 py-20 sm:py-32">
        <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
          <p className="eyebrow">Explorar por sensaciones</p>
          <h2 className="mt-6 sm:mt-8 text-3xl sm:text-5xl lg:text-6xl font-serif leading-[1.05] tracking-tight text-balance">
            Cada fragancia, <em className="text-accent">una emoción</em>
          </h2>
          <span className="divider-gold mt-8" />
          <p className="mt-6 brand-serif text-foreground/65 text-base sm:text-lg max-w-md mx-auto">
            Elegí cómo querés sentirte hoy y te mostramos qué se ajusta.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {[
            { label: "Frescos", subtitle: "Cítricos & luminosos", img: sensFresco, tipo: "fresco" as const },
            { label: "Dulces", subtitle: "Florales & gourmand", img: sensDulce, tipo: "dulce" as const },
            { label: "Amaderados", subtitle: "Profundos & cálidos", img: sensAmaderado, tipo: "amaderado" as const },
            { label: "Intensos", subtitle: "De carácter, de noche", img: sensIntenso, tipo: "intenso" as const },
          ].map((s) => (
            <Link
              key={s.label}
              to="/catalogo"
              search={{
                marca: "",
                genero: "",
                tipo: s.tipo,
                q: "",
                max: 500,
                p: "",
                v: "",
                destacado: "",
              }}
              className="group relative aspect-[3/4] overflow-hidden block"
            >
              <img
                src={s.img}
                alt={`Sensación ${s.label}`}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1600ms] ease-out group-hover:scale-110"
              />
              {/* Overlay reforzado: top transparente -> bottom noir 90%.
                  Garantiza legibilidad del texto blanco en todo dispositivo. */}
              <div
                className="absolute inset-0 transition-all duration-700 group-hover:opacity-100"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.78) 100%)",
                }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-end text-center p-5 sm:p-7 pb-8 sm:pb-10">
                <p className="eyebrow text-[0.65rem] text-accent/85 hidden sm:block opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0 transition-all duration-700">
                  {s.subtitle}
                </p>
                <h3 className="mt-2 text-xl sm:text-3xl lg:text-4xl font-serif tracking-tight text-white drop-shadow-md">
                  {s.label}
                </h3>
                {counts[s.tipo] > 0 && (
                  <p className="mt-1 brand-serif text-[0.7rem] sm:text-xs text-white/70">
                    {counts[s.tipo]} fragancia{counts[s.tipo] === 1 ? "" : "s"}
                  </p>
                )}
                <span className="mt-3 sm:mt-4 brand-serif text-[0.75rem] sm:text-sm text-white/80 group-hover:text-accent transition-colors duration-500">
                  Descubrir →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* MÁS ELEGIDOS */}
      <Section
        eyebrow="Los más pedidos"
        title={<>Los <em className="text-accent">favoritos</em> que no fallan</>}
        subtitle="Iconos reconocibles — los que más gente elige cuando quiere ir a lo seguro."
        perfumes={bestsellers}
      />

      {/* CTA AL CATÁLOGO COMPLETO */}
      <section className="max-w-4xl mx-auto px-5 sm:px-6 py-20 sm:py-24 text-center">
        <p className="eyebrow">El catálogo completo</p>
        <h2 className="mt-6 text-3xl sm:text-4xl font-serif leading-tight text-balance">
          Más de cien fragancias <em className="text-accent">esperándote</em>
        </h2>
        <p className="mt-5 brand-serif text-foreground/65 max-w-md mx-auto">
          Filtrá por marca, género, familia o precio — o pedinos una recomendación.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/catalogo"
            search={{ marca: "", genero: "", tipo: "", q: "", max: 500, p: "", v: "", destacado: "" }}
            className="btn-luxury inline-flex items-center justify-center px-12 py-4 border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all duration-500"
          >
            Ver catálogo
          </Link>
          <a
            href={whatsappGeneralLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="brand-serif text-[0.95rem] text-foreground/70 hover:text-accent transition-colors"
          >
            o pedinos una recomendación →
          </a>
        </div>
      </section>

      {/* CONFIANZA — 3 PILARES */}
      <section className="border-t border-border/40 my-12 sm:my-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-12 py-16 sm:py-20 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {[
            {
              icon: "🏅",
              title: "Perfumes originales",
              text: "100% auténticos. Trabajamos solo con casas de perfumería y distribuidores oficiales.",
            },
            {
              icon: "🎯",
              title: "Selección curada",
              text: "Cada pieza es elegida una a una. No vendemos catálogo masivo: vendemos lo que recomendaríamos.",
            },
            {
              icon: "💬",
              title: "Atención personalizada",
              text: "Te acompañamos por WhatsApp para encontrar la fragancia exacta para tu piel y tu momento.",
            },
          ].map((pillar) => (
            <div key={pillar.title} className="text-center md:text-left">
              <span className="divider-gold mb-5 mx-auto md:mx-0" />
              <div className="text-3xl sm:text-4xl mb-3" aria-hidden>{pillar.icon}</div>
              <h3 className="text-xl sm:text-2xl font-serif tracking-tight">{pillar.title}</h3>
              <p className="mt-4 text-foreground/65 brand-serif text-[0.95rem] leading-relaxed">
                {pillar.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA FINAL — CIERRE EMOCIONAL */}
      <section className="my-20 sm:my-32 text-center max-w-3xl mx-auto px-5 sm:px-6">
        <p className="eyebrow">Encontrá tu firma</p>
        <h2 className="mt-7 text-3xl sm:text-5xl font-serif leading-tight text-balance">
          Tu perfume también <em className="text-accent">habla por vos</em>.
        </h2>
        <p className="mt-7 max-w-md mx-auto text-foreground/75 brand-serif text-base sm:text-lg leading-relaxed">
          Contanos cómo querés que te perciban y te recomendamos la fragancia perfecta.
        </p>
        <a
          href={whatsappGeneralLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-luxury mt-10 inline-flex items-center justify-center px-12 py-5 bg-accent text-accent-foreground hover:bg-accent/90 hover:scale-[1.02] transition-all duration-500"
        >
          Elegí el tuyo por WhatsApp
        </a>
        <p className="mt-3 text-[0.7rem] text-foreground/45 brand-serif">
          Te asesoramos en minutos · Respuesta rápida
        </p>
      </section>
    </>
  );
}

function Section({
  eyebrow,
  title,
  subtitle,
  perfumes,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  perfumes: Perfume[];
}) {
  if (perfumes.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-12 py-16 sm:py-20">
      <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-5 text-3xl sm:text-5xl font-serif leading-tight text-balance">{title}</h2>
        <p className="mt-5 text-foreground/65 brand-serif text-base sm:text-lg">{subtitle}</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-8 gap-y-10 sm:gap-y-14">
        {perfumes.map((p) => (
          <PerfumeCard key={p.id} perfume={p} />
        ))}
      </div>
    </section>
  );
}
