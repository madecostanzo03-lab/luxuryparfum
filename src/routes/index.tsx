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
        .select("*, brand:brands(*)")
        .or("is_recommended.eq.true,is_bestseller.eq.true");
      if (data) {
        setRecommended((data as Perfume[]).filter((p) => p.is_recommended).slice(0, 4));
        setBestsellers((data as Perfume[]).filter((p) => p.is_bestseller).slice(0, 4));
      }
    })();
  }, []);

  return (
    <>
      {/* HERO */}
      <section className="relative h-[92vh] min-h-[600px] w-full overflow-hidden -mt-20">
        <img
          src={heroImg}
          alt="Frasco de perfume de lujo"
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0" style={{ background: "var(--gradient-hero)" }} />
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <p className="eyebrow fade-in" style={{ animationDelay: "0.2s" }}>Luxury Parfum</p>
          <h1 className="mt-8 text-5xl md:text-7xl lg:text-8xl font-serif text-balance max-w-4xl leading-[1.05] fade-up" style={{ animationDelay: "0.4s" }}>
            Cada fragancia<br />
            <em className="text-accent">define</em> un momento.
          </h1>
          <p className="mt-8 max-w-md text-foreground/70 text-lg font-serif italic fade-up" style={{ animationDelay: "0.7s" }}>
            Y cada momento requiere una elección.
          </p>
          <Link
            to="/catalogo"
            className="mt-12 inline-flex items-center gap-4 px-10 py-4 border border-foreground/40 eyebrow hover:border-accent hover:text-accent transition-all duration-700 fade-up"
            style={{ animationDelay: "1s" }}
          >
            Explorar catálogo
          </Link>
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
