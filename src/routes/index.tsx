import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Perfume } from "@/lib/types";
import { PerfumeCard } from "@/components/PerfumeCard";
import { whatsappGeneralLink } from "@/lib/whatsapp";
import heroImg from "@/assets/hero-perfume.jpg";
import emotionalImg from "@/assets/emotional-block.jpg";

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
      const { data } = await supabase
        .from("perfumes")
        .select("*, brand:brands(*), variants:perfume_variants(*)")
        .or("is_recommended.eq.true,is_bestseller.eq.true");
      if (data) {
        const sortByTier = (a: Perfume, b: Perfume) => {
          const ta = a.brand?.brand_tier ?? 99;
          const tb = b.brand?.brand_tier ?? 99;
          if (ta !== tb) return ta - tb;
          const ia = a.image_url ? 0 : 1;
          const ib = b.image_url ? 0 : 1;
          if (ia !== ib) return ia - ib;
          return b.price - a.price;
        };
        const all = data as Perfume[];
        setRecommended(all.filter((p) => p.is_recommended).sort(sortByTier).slice(0, 4));
        setBestsellers(all.filter((p) => p.is_bestseller).sort(sortByTier).slice(0, 4));
      }
    })();
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="relative h-[92vh] min-h-[640px] w-full overflow-hidden -mt-20">
        <img
          src={heroImg}
          alt="Colección de perfumes de lujo sobre mármol"
          className="absolute inset-0 w-full h-full object-cover scale-105"
          width={1920}
          height={1080}
        />
        {/* Capa oscura para legibilidad */}
        <div className="absolute inset-0 bg-gradient-to-b from-noir/70 via-noir/55 to-noir/90" />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />

        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <p className="eyebrow fade-in" style={{ animationDelay: "0.2s" }}>Luxury Parfum</p>

          <h1 className="mt-8 text-5xl md:text-7xl lg:text-8xl font-serif text-balance max-w-4xl leading-[1.05] fade-up" style={{ animationDelay: "0.4s" }}>
            Encontrá tu <em className="text-accent">perfume ideal</em>
          </h1>

          <p className="mt-8 max-w-xl text-foreground/85 text-lg md:text-xl leading-relaxed fade-up" style={{ animationDelay: "0.7s" }}>
            Asesoramiento personalizado para descubrir la fragancia que te define.
            Conversamos con vos y te guiamos hacia la elección perfecta.
          </p>

          <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 fade-up" style={{ animationDelay: "1s" }}>
            <a
              href={whatsappGeneralLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-3 px-10 py-5 bg-accent text-accent-foreground eyebrow text-sm shadow-[0_20px_50px_-15px_oklch(0.78_0.11_80/0.5)] hover:shadow-[0_25px_60px_-10px_oklch(0.78_0.11_80/0.7)] hover:scale-[1.02] transition-all duration-500"
              aria-label="Conversar por WhatsApp"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
              Asesorame por WhatsApp
            </a>

            <Link
              to="/catalogo"
              className="inline-flex items-center justify-center gap-3 px-10 py-5 border border-foreground/40 eyebrow text-sm hover:border-accent hover:text-accent transition-all duration-500"
            >
              Ver catálogo
            </Link>
          </div>
        </div>
      </section>

      {/* RECOMENDADOS */}
      <Section
        eyebrow="Recomendados"
        title={<>Selección <em className="text-accent">curada</em></>}
        subtitle="Las fragancias que nuestro equipo elige esta temporada."
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

      {/* MÁS VENDIDOS */}
      <Section
        eyebrow="Más vendidos"
        title={<>Las <em className="text-accent">favoritas</em> de nuestra casa</>}
        subtitle="Las elecciones que más han conquistado a nuestra comunidad."
        perfumes={bestsellers}
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
