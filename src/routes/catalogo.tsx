import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Brand, FragranceType, Gender, Perfume } from "@/lib/types";
import { PerfumeCard } from "@/components/PerfumeCard";
import { Search, Loader2 } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

const searchSchema = z.object({
  marca: fallback(z.string(), "").default(""),
  genero: fallback(z.enum(["", "hombre", "mujer", "unisex"]), "").default(""),
  tipo: fallback(z.enum(["", "fresco", "dulce", "amaderado", "intenso"]), "").default(""),
  q: fallback(z.string(), "").default(""),
  max: fallback(z.number(), 500).default(500),
  p: fallback(z.string(), "").default(""),
  v: fallback(z.string(), "").default(""),
  destacado: fallback(z.enum(["", "bestseller", "premium"]), "").default(""),
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
  const [filtering, setFiltering] = useState(false);

  // Cargar marcas una sola vez (no dependen de filtros)
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("brands").select("*").order("name");
      setBrands((data as Brand[]) ?? []);
    })();
  }, []);

  // Resolver brand_id desde slug para filtrar en Supabase
  const selectedBrandId = search.marca
    ? brands.find((b) => b.slug === search.marca)?.id
    : undefined;

  // Refetch cuando cambian los filtros server-side
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      // Si filtra por marca pero todavía no llegaron las brands, esperar
      if (search.marca && brands.length === 0) return;

      setFiltering(true);
      let query = supabase
        .from("perfumes")
        .select("*, brand:brands(*), variants:perfume_variants(*)")
        .eq("in_stock", true)
        .lte("price", search.max);

      if (search.genero) query = query.eq("gender", search.genero);
      if (search.tipo) query = query.eq("fragrance_type", search.tipo);
      if (selectedBrandId) query = query.eq("brand_id", selectedBrandId);
      if (search.destacado === "bestseller") query = query.eq("is_bestseller", true);
      if (search.q) {
        // búsqueda case-insensitive por nombre
        query = query.ilike("name", `%${search.q}%`);
      }

      const { data, error } = await query.order("price", { ascending: false });
      if (cancelled) return;

      if (error) {
        console.error("Error cargando perfumes:", error);
        setPerfumes([]);
      } else {
        let list = (data as Perfume[]) ?? [];
        // "Premium" = brand_tier === 1 (filtrado client-side por estar en relación)
        if (search.destacado === "premium") {
          list = list.filter((p) => (p.brand?.brand_tier ?? 99) === 1);
        }
        // Orden final: brand_tier ASC, imagen primero, precio DESC
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
      }
      setLoading(false);
      setFiltering(false);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [search.genero, search.tipo, search.max, search.q, search.destacado, selectedBrandId, search.marca, brands.length]);

  const update = (patch: Partial<typeof search>) => {
    navigate({ search: (prev: typeof search) => ({ ...prev, ...patch }) });
  };

  const hasActiveFilters =
    search.marca || search.genero || search.tipo || search.q || search.max < 500;

  const shortcuts: { label: string; emoji: string; patch: Partial<typeof search>; isActive: boolean }[] = [
    {
      label: "Más vendidos",
      emoji: "🔥",
      patch: { genero: "", tipo: "", marca: "", max: 500 },
      isActive: false,
    },
    {
      label: "Perfumes premium",
      emoji: "💎",
      patch: { genero: "", tipo: "", marca: "", max: 500 },
      isActive: false,
    },
    {
      label: "Para la noche",
      emoji: "🌙",
      patch: { tipo: "intenso", genero: "", marca: "", max: 500 },
      isActive: search.tipo === "intenso",
    },
    {
      label: "Frescos para el día",
      emoji: "☀️",
      patch: { tipo: "fresco", genero: "", marca: "", max: 500 },
      isActive: search.tipo === "fresco",
    },
    {
      label: "Perfumes dulces",
      emoji: "💖",
      patch: { tipo: "dulce", genero: "", marca: "", max: 500 },
      isActive: search.tipo === "dulce",
    },
  ];

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

          {hasActiveFilters && (
            <button
              onClick={() => navigate({ search: { marca: "", genero: "", tipo: "", q: "", max: 500, p: "", v: "" } })}
              className="eyebrow text-foreground/50 hover:text-accent transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </aside>

        {/* Grid */}
        <div>
          <div className="flex items-center gap-3 mb-8">
            <p className="eyebrow text-foreground/50">
              {loading ? "Cargando..." : `${perfumes.length} pieza${perfumes.length === 1 ? "" : "s"}`}
            </p>
            {filtering && !loading && (
              <Loader2 size={12} className="text-accent animate-spin" />
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-14">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-[4/5] bg-card" />
                  <div className="pt-5 space-y-2">
                    <div className="h-2 bg-card w-1/3" />
                    <div className="h-4 bg-card w-2/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : perfumes.length === 0 ? (
            <div className="py-20 text-center text-foreground/50">
              <p className="font-serif italic text-2xl">No hay perfumes para este filtro.</p>
              {hasActiveFilters && (
                <button
                  onClick={() => navigate({ search: { marca: "", genero: "", tipo: "", q: "", max: 500, p: "", v: "" } })}
                  className="mt-6 eyebrow text-accent hover:opacity-70 transition-opacity"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          ) : (
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-8 gap-y-14 transition-opacity duration-300 ${
                filtering ? "opacity-50" : "opacity-100"
              }`}
            >
              {perfumes.map((p) => (
                <PerfumeCard
                  key={p.id}
                  perfume={p}
                  openInitial={search.p === p.id}
                  initialVariantId={search.p === p.id ? search.v || null : null}
                  onOpenChange={(o) => update({ p: o ? p.id : "", v: o ? search.v : "" })}
                  onVariantChange={(vid) => update({ p: p.id, v: vid ?? "" })}
                />
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
