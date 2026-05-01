import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Brand } from "@/lib/types";
import { HIDDEN_BRAND_SLUG_SET } from "@/lib/hidden-brands";

export const Route = createFileRoute("/marcas")({
  head: () => ({
    meta: [
      { title: "Marcas — Luxury Parfum" },
      { name: "description", content: "Conocé las casas de perfumería que componen nuestra colección." },
      { property: "og:title", content: "Marcas — Luxury Parfum" },
      { property: "og:description", content: "Conocé las casas de perfumería que componen nuestra colección." },
    ],
  }),
  component: MarcasPage,
});

function brandInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function MarcasPage() {
  const [brands, setBrands] = useState<Brand[] | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("brands").select("*").order("name");
      const visible = ((data as Brand[]) ?? []).filter(
        (b) => !HIDDEN_BRAND_SLUG_SET.has(b.slug),
      );
      setBrands(visible);

      // Conteo de perfumes en stock por marca
      const entries = await Promise.all(
        visible.map(async (b) => {
          const { count } = await supabase
            .from("perfumes")
            .select("id", { count: "exact", head: true })
            .eq("in_stock", true)
            .eq("brand_id", b.id);
          return [b.id, count ?? 0] as const;
        }),
      );
      setCounts(Object.fromEntries(entries));
    })();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
      <header className="text-center max-w-2xl mx-auto mb-20">
        <p className="eyebrow">Casas</p>
        <h1 className="mt-6 text-5xl md:text-6xl font-serif leading-tight">
          Las <em className="text-accent">marcas</em>
        </h1>
        <p className="mt-6 text-foreground/60">
          Casas de perfumería seleccionadas por su excelencia y carácter único.
        </p>
      </header>

      {brands === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/30 border border-border/30">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-background p-12 animate-pulse">
              <div className="h-12 w-12 bg-card rounded-full mx-auto" />
              <div className="h-5 bg-card mt-6 mx-auto w-32" />
            </div>
          ))}
        </div>
      ) : brands.length === 0 ? (
        <div className="border border-border/40 bg-background/40 backdrop-blur-sm p-16 text-center max-w-xl mx-auto">
          <p className="font-serif italic text-2xl text-foreground/70">
            Pronto vas a poder explorar las casas que componen nuestra colección.
          </p>
          <p className="mt-4 text-sm text-foreground/55">
            Mientras tanto, descubrí todo el catálogo curado.
          </p>
          <Link
            to="/catalogo"
            search={{ marca: "", genero: "", tipo: "", q: "", max: 500, p: "", v: "", destacado: "" }}
            className="mt-8 inline-flex items-center justify-center px-10 py-3 border border-accent text-accent eyebrow hover:bg-accent hover:text-accent-foreground transition-all duration-500"
          >
            Ver catálogo →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/30 border border-border/30">
          {brands.map((b) => (
            <Link
              key={b.id}
              to="/catalogo"
              search={{ marca: b.slug, genero: "", tipo: "", q: "", max: 500, p: "", v: "", destacado: "" }}
              className="bg-background p-12 group hover:bg-card transition-colors duration-500 text-center flex flex-col items-center"
            >
              {b.logo_url ? (
                <img
                  src={b.logo_url}
                  alt={`Logo ${b.name}`}
                  className="h-14 w-auto object-contain opacity-85 group-hover:opacity-100 transition-opacity"
                  loading="lazy"
                />
              ) : (
                <div className="h-14 w-14 rounded-full border border-accent/40 flex items-center justify-center brand-serif text-accent text-base tracking-widest group-hover:border-accent group-hover:bg-accent/10 transition-all">
                  {brandInitials(b.name)}
                </div>
              )}
              <div className="font-serif text-3xl mt-5 group-hover:text-accent transition-colors">
                {b.name}
              </div>
              {counts[b.id] !== undefined && (
                <p className="mt-2 eyebrow text-[0.6rem] text-accent/80">
                  {counts[b.id]} fragancia{counts[b.id] === 1 ? "" : "s"}
                </p>
              )}
              {b.description && (
                <p className="mt-4 text-sm text-foreground/60 leading-relaxed max-w-xs mx-auto">
                  {b.description}
                </p>
              )}
              <span className="eyebrow text-foreground/40 mt-6 inline-block group-hover:text-accent transition-colors">
                Ver colección →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
