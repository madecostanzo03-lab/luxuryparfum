import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Brand } from "@/lib/types";

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

function MarcasPage() {
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    supabase.from("brands").select("*").order("name").then(({ data }) => {
      setBrands((data as Brand[]) ?? []);
    });
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/30 border border-border/30">
        {brands.map((b) => (
          <Link
            key={b.id}
            to="/catalogo"
            search={{ marca: b.slug, genero: "", tipo: "", q: "", max: 500 }}
            className="bg-background p-12 group hover:bg-card transition-colors duration-500 text-center"
          >
            <div className="font-serif text-3xl group-hover:text-accent transition-colors">
              {b.name}
            </div>
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
    </div>
  );
}
