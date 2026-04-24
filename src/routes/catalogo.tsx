import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Brand, FragranceType, Gender, Perfume } from "@/lib/types";
import { PerfumeCard } from "@/components/PerfumeCard";
import { Search } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

const searchSchema = z.object({
  marca: fallback(z.string(), "").default(""),
  genero: fallback(z.enum(["", "hombre", "mujer", "unisex"]), "").default(""),
  tipo: fallback(z.enum(["", "fresco", "dulce", "amaderado", "intenso"]), "").default(""),
  q: fallback(z.string(), "").default(""),
  max: fallback(z.number(), 500).default(500),
});

export const Route = createFileRoute("/catalogo")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Catálogo — Luxury Parfum" },
      { name: "description", content: "Explorá nuestra colección curada de fragancias de lujo. Filtrá por marca, género, tipo y precio." },
      { property: "og:title", content: "Catálogo — Luxury Parfum" },
      { property: "og:description", content: "Explorá nuestra colección curada de fragancias de lujo." },
    ],
  }),
  component: CatalogoPage,
  errorComponent: ({ error }) => {
    const router = useRouter();
    return (
      <div className="max-w-2xl mx-auto px-6 py-32 text-center">
        <p className="eyebrow text-accent">Error</p>
        <h1 className="mt-6 text-4xl font-serif">No pudimos cargar el catálogo</h1>
        <p className="mt-4 text-foreground/60 text-sm">{error.message}</p>
        <button
          onClick={() => router.invalidate()}
          className="mt-8 eyebrow text-accent hover:opacity-70 transition-opacity"
        >
          Reintentar
        </button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="max-w-2xl mx-auto px-6 py-32 text-center">
      <h1 className="text-4xl font-serif">Página no encontrada</h1>
      <Link to="/" className="mt-8 inline-block eyebrow text-accent">Volver al inicio</Link>
    </div>
  ),
});

const GENDERS: { value: Gender | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "hombre", label: "Hombre" },
  { value: "mujer", label: "Mujer" },
  { value: "unisex", label: "Unisex" },
];

const TYPES: { value: FragranceType | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "fresco", label: "Fresco" },
  { value: "dulce", label: "Dulce" },
  { value: "amaderado", label: "Amaderado" },
  { value: "intenso", label: "Intenso" },
];

function CatalogoPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: ps }, { data: bs }] = await Promise.all([
        supabase
          .from("perfumes")
          .select("*, brand:brands(*), variants:perfume_variants(*)")
          .order("price", { ascending: false }),
        supabase.from("brands").select("*").order("name"),
      ]);
      const list = (ps as Perfume[]) ?? [];
      // Sort: brand_tier ASC (premium first), then image presence, then price DESC
      list.sort((a, b) => {
        const ta = a.brand?.brand_tier ?? 99;
        const tb = b.brand?.brand_tier ?? 99;
        if (ta !== tb) return ta - tb;
        const ia = a.image_url ? 0 : 1;
        const ib = b.image_url ? 0 : 1;
        if (ia !== ib) return ia - ib;
        return b.price - a.price;
      });
      setPerfumes(list);
      setBrands((bs as Brand[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return perfumes.filter((p) => {
      if (search.marca && p.brand?.slug !== search.marca) return false;
      if (search.genero && p.gender !== search.genero) return false;
      if (search.tipo && p.fragrance_type !== search.tipo) return false;
      if (p.price > search.max) return false;
      if (search.q) {
        const q = search.q.toLowerCase();
        const haystack = `${p.name} ${p.brand?.name ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [perfumes, search]);

  const update = (patch: Partial<typeof search>) => {
    navigate({ search: (prev: typeof search) => ({ ...prev, ...patch }) });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
      <header className="text-center max-w-2xl mx-auto mb-16">
        <p className="eyebrow">Colección</p>
        <h1 className="mt-6 text-5xl md:text-6xl font-serif leading-tight">
          El <em className="text-accent">catálogo</em>
        </h1>
        <p className="mt-6 text-foreground/60">
          Cada pieza es seleccionada una a una. Descubrí la que es para vos.
        </p>
      </header>

      {/* Buscador */}
      <div className="relative max-w-xl mx-auto mb-10">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
        <input
          type="search"
          placeholder="Buscar por nombre o marca..."
          value={search.q}
          onChange={(e) => update({ q: e.target.value })}
          className="w-full bg-input/40 border border-border pl-11 pr-4 py-3 text-sm placeholder:text-foreground/40 focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-10">
        {/* Filtros */}
        <aside className="space-y-8">
          <FilterGroup label="Marca">
            <select
              value={search.marca}
              onChange={(e) => update({ marca: e.target.value })}
              className="w-full bg-input/40 border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
            >
              <option value="">Todas</option>
              {brands.map((b) => (
                <option key={b.id} value={b.slug}>{b.name}</option>
              ))}
            </select>
          </FilterGroup>

          <FilterGroup label="Género">
            <div className="flex flex-col gap-2">
              {GENDERS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => update({ genero: g.value })}
                  className={`text-left text-sm py-1 transition-colors ${
                    search.genero === g.value ? "text-accent" : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label="Tipo de fragancia">
            <div className="flex flex-col gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => update({ tipo: t.value })}
                  className={`text-left text-sm py-1 transition-colors ${
                    search.tipo === t.value ? "text-accent" : "text-foreground/60 hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </FilterGroup>

          <FilterGroup label={`Precio máx · USD ${search.max}`}>
            <input
              type="range"
              min={50}
              max={500}
              step={10}
              value={search.max}
              onChange={(e) => update({ max: Number(e.target.value) })}
              className="w-full accent-accent"
            />
          </FilterGroup>

          {(search.marca || search.genero || search.tipo || search.q || search.max < 500) && (
            <button
              onClick={() => navigate({ search: { marca: "", genero: "", tipo: "", q: "", max: 500 } })}
              className="eyebrow text-foreground/50 hover:text-accent transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </aside>

        {/* Grid */}
        <div>
          <p className="eyebrow text-foreground/50 mb-8">{filtered.length} pieza{filtered.length === 1 ? "" : "s"}</p>
          {loading ? (
            <p className="text-foreground/50 text-sm">Cargando...</p>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center text-foreground/50">
              <p className="font-serif italic text-2xl">Ninguna fragancia coincide con tu búsqueda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-14">
              {filtered.map((p) => (
                <PerfumeCard key={p.id} perfume={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-4">{label}</p>
      {children}
    </div>
  );
}
