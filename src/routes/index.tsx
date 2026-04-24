import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Perfume } from "@/lib/types";
import { PerfumeCard } from "@/components/PerfumeCard";
import { whatsappGeneralLink } from "@/lib/whatsapp";
import heroImg from "@/assets/hero-perfume.jpg";
import sensFresco from "@/assets/sensacion-fresco.jpg";
import sensDulce from "@/assets/sensacion-dulce.jpg";
import sensAmaderado from "@/assets/sensacion-amaderado.jpg";
import sensIntenso from "@/assets/sensacion-intenso.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Luxury Parfum — Fragancias de autor" },
      { name: "description", content: "Cada fragancia define un momento. Descubre nuestra colección curada de perfumería de lujo." },
      { property: "og:title", content: "Luxury Parfum — Fragancias de autor" },
      { property: "og:description", content: "Cada fragancia define un momento. Descubre nuestra colección curada." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [recommended, setRecommended] = useState<Perfume[]>([]);
  const [bestsellers, setBestsellers] = useState<Perfume[]>([]);

  useEffect(() => {
    (async () => {
      // Selección del equipo + más elegidos (manuales, no por precio)
      const { data: flagged } = await supabase
        .from("perfumes")
        .select("*, brand:brands(*), variants:perfume_variants(*)")
        .or("is_recommended.eq.true,is_bestseller.eq.true");

      if (flagged) {
        const all = flagged as Perfume[];
        // Variedad de precio — orden ascendente
        const byPriceAsc = (a: Perfume, b: Perfume) => a.price - b.price;
        setRecommended(all.filter((p) => p.is_recommended).sort(byPriceAsc).slice(0, 8));
        setBestsellers(all.filter((p) => p.is_bestseller).sort(byPriceAsc).slice(0, 8));
      }
    })();
  }, []);

  return (
    <>
      {/* HERO EDITORIAL */}
      <section className="relative h-[100vh] min-h-[720px] w-full overflow-hidden -mt-20">
        <img
          src={heroImg}
          alt="Frasco de perfume Luxury Parfum sobre superficie azul reflectante"
          className="absolute inset-0 w-full h-full object-cover object-center"
          width={1920}
          height={1280}
        />
        {/* Overlays editoriales — profundidad y legibilidad */}
        <div className="absolute inset-0 bg-noir/45" />
        <div className="absolute inset-0 bg-gradient-to-b from-noir/70 via-transparent to-noir" />
        <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/20 to-noir/60" />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <p className="eyebrow text-foreground/60 fade-in" style={{ animationDelay: "0.2s" }}>
            Luxury Parfum
          </p>

          <div className="mt-12 w-16 h-px bg-accent/70 fade-in" style={{ animationDelay: "0.35s" }} />

          <h1
            className="mt-12 text-[2.75rem] md:text-7xl lg:text-[6rem] font-serif text-balance max-w-5xl leading-[1.0] tracking-tight fade-up"
            style={{ animationDelay: "0.5s" }}
          >
            Elegí tu <em className="text-accent">fragancia ideal</em>
          </h1>

          <p
            className="mt-12 max-w-md text-foreground/65 text-base md:text-lg leading-relaxed tracking-wide fade-up"
            style={{ animationDelay: "0.8s" }}
          >
            Te asesoramos para encontrar el perfume perfecto.
          </p>

          <div
            className="mt-16 flex flex-col sm:flex-row items-center gap-6 fade-up"
            style={{ animationDelay: "1.05s" }}
          >
            <a
              href={whatsappGeneralLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center px-14 py-5 bg-accent text-accent-foreground eyebrow text-[0.65rem] hover:bg-accent/90 hover:scale-[1.02] transition-all duration-500"
              aria-label="Hablar por WhatsApp"
            >
              Hablar por WhatsApp
            </a>

            <Link
              to="/catalogo"
              className="inline-flex items-center justify-center px-10 py-5 eyebrow text-[0.65rem] text-foreground/60 hover:text-accent transition-colors duration-500"
            >
              Ver catálogo →
            </Link>
          </div>
        </div>

        {/* Indicador scroll */}
        <div
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 fade-in"
          style={{ animationDelay: "1.4s" }}
        >
          <div className="w-px h-14 bg-gradient-to-b from-transparent to-foreground/30" />
        </div>
      </section>

      {/* EXPLORAR POR SENSACIONES */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 py-32">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <p className="eyebrow">Explorar por sensaciones</p>
          <h2 className="mt-8 text-4xl md:text-5xl lg:text-6xl font-serif leading-[1.05] tracking-tight text-balance">
            Cada fragancia, <em className="text-accent">una emoción</em>
          </h2>
          <span className="divider-gold mt-10" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
              <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/40 to-noir/10 group-hover:from-noir/95 transition-all duration-700" />
              <div className="absolute inset-0 flex flex-col items-center justify-end text-center p-8 pb-12">
                <p className="eyebrow text-[0.55rem] text-accent/80 opacity-0 group-hover:opacity-100 -translate-y-2 group-hover:translate-y-0 transition-all duration-700">
                  {s.subtitle}
                </p>
                <h3 className="mt-3 text-3xl md:text-4xl font-serif tracking-tight">
                  {s.label}
                </h3>
                <span className="mt-5 eyebrow text-[0.5rem] text-foreground/50 group-hover:text-accent transition-colors duration-500">
                  Descubrir →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* RECOMENDADOS DEL EQUIPO */}
      <Section
        eyebrow="Recomendados del equipo"
        title={<>Selección <em className="text-accent">curada</em></>}
        subtitle="Una mezcla equilibrada — desde joyas accesibles hasta clásicos atemporales — pensada para que encuentres tu match sin importar el presupuesto."
        perfumes={recommended}
      />

      {/* BLOQUE EMOCIONAL */}
      <section className="relative my-32">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative aspect-[3/4] overflow-hidden">
            <img
              src={emotionalImg}
              alt="Descubrimiento de fragancia"
              loading="lazy"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="lg:pl-12">
            <p className="eyebrow">Asesoramiento personalizado</p>
            <h2 className="mt-6 text-4xl md:text-5xl font-serif leading-tight text-balance">
              Te ayudamos a elegir tu <em className="text-accent">fragancia ideal</em>.
            </h2>
            <span className="divider-gold mt-8" />
            <p className="mt-8 text-foreground/70 leading-relaxed text-lg">
              Cada piel cuenta una historia. Conversamos contigo para entender tu rutina,
              tus recuerdos y tu deseo, y te guiamos hacia la fragancia que verdaderamente
              te define.
            </p>
            <a
              href={whatsappGeneralLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-10 inline-flex items-center gap-3 px-8 py-4 border border-accent text-accent eyebrow hover:bg-accent hover:text-accent-foreground transition-all duration-500"
            >
              Conversar por WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* MÁS ELEGIDOS */}
      <Section
        eyebrow="Más elegidos"
        title={<>Las <em className="text-accent">favoritas</em> de siempre</>}
        subtitle="Iconos reconocibles que nunca fallan — los que más recomendamos a quienes no saben por dónde empezar."
        perfumes={bestsellers}
      />

      {/* SELECCIÓN PREMIUM */}
      <Section
        eyebrow="Selección premium"
        title={<>Para los que buscan <em className="text-accent">alta gama</em></>}
        subtitle="Casas de perfumería de autor — Xerjoff, Parfums de Marly, Creed, Tom Ford — para quien ya sabe lo que quiere."
        perfumes={premium}
      />

      {/* CTA FINAL */}
      <section className="my-40 text-center max-w-3xl mx-auto px-6">
        <p className="eyebrow">Acceso exclusivo</p>
        <h2 className="mt-6 text-4xl md:text-5xl font-serif leading-tight text-balance">
          Recibí <em className="text-accent">recomendaciones</em><br />y beneficios reservados.
        </h2>
        <Link
          to="/login"
          className="mt-12 inline-flex items-center gap-4 px-10 py-4 border border-foreground/40 eyebrow hover:border-accent hover:text-accent transition-all duration-700"
        >
          Acceder
        </Link>
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
    <section className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-6 text-4xl md:text-5xl font-serif leading-tight text-balance">{title}</h2>
        <p className="mt-6 text-foreground/60 text-base">{subtitle}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-14">
        {perfumes.map((p) => (
          <PerfumeCard key={p.id} perfume={p} />
        ))}
      </div>
    </section>
  );
}
