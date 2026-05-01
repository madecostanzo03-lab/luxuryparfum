import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Brand, Perfume } from "@/lib/types";
import { PerfumeCard } from "@/components/PerfumeCard";
import { CatalogFilters } from "@/components/CatalogFilters";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Search, Loader2, SlidersHorizontal, X } from "lucide-react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { HIDDEN_BRAND_SLUGS, HIDDEN_BRAND_SLUG_SET } from "@/lib/hidden-brands";

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

function CatalogoPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();

  const [perfumes, setPerfumes] = useState<Perfume[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);

  // Cargar marcas una sola vez (no dependen de filtros)
  // Excluimos marcas ocultas del listado del filtro
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("brands").select("*").order("name");
      const visible = ((data as Brand[]) ?? []).filter(
        (b) => !HIDDEN_BRAND_SLUG_SET.has(b.slug),
      );
      setBrands(visible);
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

      // Resolver IDs de marcas ocultas para excluirlas a nivel query
      const { data: hiddenBrands } = await supabase
        .from("brands")
        .select("id")
        .in("slug", HIDDEN_BRAND_SLUGS as unknown as string[]);
      const hiddenIds = (hiddenBrands ?? []).map((b) => b.id);

      let query = supabase
        .from("perfumes")
        .select("*, brand:brands(*), variants:perfume_variants(*)")
        .eq("in_stock", true)
        .lte("price", search.max);

      if (hiddenIds.length > 0) {
        query = query.not("brand_id", "in", `(${hiddenIds.join(",")})`);
      }

      if (search.genero) query = query.eq("gender", search.genero);
      if (search.tipo) query = query.eq("fragrance_type", search.tipo);
      if (selectedBrandId) query = query.eq("brand_id", selectedBrandId);
      if (search.destacado === "bestseller") query = query.eq("is_bestseller", true);
      if (search.q) {
        // búsqueda case-insensitive por nombre
        query = query.ilike("name", `%${search.q}%`);
      }

      const { data, error } = await query.order("price", { ascending: true });
      if (cancelled) return;

      if (error) {
        console.error("Error cargando perfumes:", error);
        setPerfumes([]);
      } else {
        let list = (data as Perfume[]) ?? [];
        // Filtro defensivo client-side por slug (cinturón + tirantes)
        list = list.filter((p) => !p.brand || !HIDDEN_BRAND_SLUG_SET.has(p.brand.slug));
        // "Premium" = brand_tier === 1 (filtrado client-side por estar en relación)
        if (search.destacado === "premium") {
          list = list.filter((p) => (p.brand?.brand_tier ?? 99) === 1);
        }
        // Orden final: bestsellers primero, luego recomendados, luego resto.
        // Dentro de cada grupo: con imagen primero, y precio ascendente para variedad
        // (sin sesgo a premium).
        list.sort((a, b) => {
          const rank = (p: Perfume) => (p.is_bestseller ? 0 : p.is_recommended ? 1 : 2);
          const ra = rank(a);
          const rb = rank(b);
          if (ra !== rb) return ra - rb;
          const ia = a.image_url ? 0 : 1;
          const ib = b.image_url ? 0 : 1;
          if (ia !== ib) return ia - ib;
          return a.price - b.price;
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
    navigate({
      search: (prev: typeof search) => ({ ...prev, ...patch }),
      replace: true,
      resetScroll: false,
    });
  };

  // Buscador estable: input local controlado + debounce a la URL.
  // Evita que cada tecla dispare navegación + re-fetch + scroll reset.
  const [searchInput, setSearchInput] = useState(search.q);
  // Sincronizar si la URL cambia desde fuera (ej. al limpiar filtros)
  useEffect(() => {
    setSearchInput(search.q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.q]);
  // Debounce: aplicar al state de URL 280ms después de la última tecla
  useEffect(() => {
    if (searchInput === search.q) return;
    const t = setTimeout(() => {
      update({ q: searchInput });
    }, 280);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(24);

  // Reset paginación cuando cambian filtros o búsqueda
  useEffect(() => {
    setVisibleCount(24);
  }, [search.marca, search.genero, search.tipo, search.q, search.max, search.destacado]);

  const activeFilterCount =
    (search.marca ? 1 : 0) +
    (search.genero ? 1 : 0) +
    (search.tipo ? 1 : 0) +
    (search.max < 500 ? 1 : 0);

  const hasActiveFilters = Boolean(
    search.marca || search.genero || search.tipo || search.q || search.max < 500 || search.destacado,
  );

  const resetSearch = { marca: "", genero: "", tipo: "", q: "", max: 500, p: "", v: "", destacado: "" } as const;

  const shortcuts: { label: string; patch: Partial<typeof search>; isActive: boolean }[] = [
    {
      label: "Más elegidos",
      patch: { ...resetSearch, destacado: "bestseller" },
      isActive: search.destacado === "bestseller",
    },
    {
      label: "Premium",
      patch: { ...resetSearch, destacado: "premium" },
      isActive: search.destacado === "premium",
    },
    {
      label: "Para la noche",
      patch: { ...resetSearch, tipo: "intenso" },
      isActive: search.tipo === "intenso" && !search.destacado,
    },
    {
      label: "Frescos para el día",
      patch: { ...resetSearch, tipo: "fresco" },
      isActive: search.tipo === "fresco" && !search.destacado,
    },
    {
      label: "Notas dulces",
      patch: { ...resetSearch, tipo: "dulce" },
      isActive: search.tipo === "dulce" && !search.destacado,
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
        <p className="mt-4 text-[0.72rem] text-foreground/45 brand-serif">
          Los precios están expresados en dólares (USD) y se actualizan según la cotización del día.
        </p>
      </header>

      {/* Atajos visuales */}
      <section className="mb-12">
        <p className="eyebrow text-center mb-5 text-foreground/40">¿Qué estás buscando?</p>
        <div className="flex flex-wrap justify-center gap-2">
          {shortcuts.map((s) => (
            <button
              key={s.label}
              onClick={() => navigate({ search: (prev: typeof search) => ({ ...prev, ...s.patch }) })}
              className={`eyebrow text-[0.65rem] px-4 py-2.5 border transition-colors ${
                s.isActive
                  ? "border-accent bg-accent text-accent-foreground font-semibold"
                  : "border-border/60 text-foreground/60 hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      {/* Buscador + botón Filtrar (mobile) */}
      <div className="max-w-xl mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40" size={16} />
          <input
            type="search"
            placeholder="Buscar por nombre o marca..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full bg-input/40 border border-border pl-11 pr-4 py-3 text-sm placeholder:text-foreground/40 focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Botón Filtrar — solo mobile/tablet */}
        <div className="lg:hidden mt-4 flex items-center justify-between gap-3">
          <button
            onClick={() => setFiltersOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-border text-foreground/80 hover:border-accent hover:text-accent transition-colors eyebrow text-[0.6rem]"
          >
            <SlidersHorizontal size={14} />
            <span>Filtrar</span>
            {activeFilterCount > 0 && (
              <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[0.55rem] bg-accent text-accent-foreground rounded-full">
                {activeFilterCount}
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={() => navigate({ search: resetSearch })}
              className="eyebrow text-[0.6rem] text-foreground/50 hover:text-accent transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[240px_1fr] gap-10">
        {/* Filtros desktop */}
        <aside className="hidden lg:block">
          <CatalogFilters
            brands={brands}
            value={{
              marca: search.marca,
              genero: search.genero,
              tipo: search.tipo,
              max: search.max,
            }}
            onChange={(patch) => update(patch)}
            onReset={() => navigate({ search: resetSearch })}
            hasActiveFilters={hasActiveFilters}
          />
        </aside>

        {/* Drawer filtros mobile */}
        <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DrawerContent className="bg-background border-border/40 max-h-[88vh]">
            <DrawerHeader className="flex items-center justify-between border-b border-border/40">
              <DrawerTitle className="eyebrow text-foreground/70">Filtrar catálogo</DrawerTitle>
              <DrawerClose
                className="p-2 text-foreground/60 hover:text-accent transition-colors"
                aria-label="Cerrar filtros"
              >
                <X size={18} />
              </DrawerClose>
            </DrawerHeader>
            <div className="px-6 py-6 overflow-y-auto">
              <CatalogFilters
                brands={brands}
                value={{
                  marca: search.marca,
                  genero: search.genero,
                  tipo: search.tipo,
                  max: search.max,
                }}
                onChange={(patch) => update(patch)}
                onReset={() => navigate({ search: resetSearch })}
                hasActiveFilters={hasActiveFilters}
              />
              <button
                onClick={() => setFiltersOpen(false)}
                className="mt-8 w-full inline-flex items-center justify-center px-6 py-3.5 bg-accent text-accent-foreground eyebrow text-[0.65rem] hover:bg-accent/90 transition-colors"
              >
                Ver {perfumes.length} resultado{perfumes.length === 1 ? "" : "s"}
              </button>
            </div>
          </DrawerContent>
        </Drawer>

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

          {/* Contenedor con min-height estable: el grid no salta cuando
              cambian los resultados o aparece el mensaje "sin resultados" */}
          <div style={{ minHeight: "60vh" }}>
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
                    onClick={() => navigate({ search: resetSearch, resetScroll: false })}
                    className="mt-6 eyebrow text-accent hover:opacity-70 transition-opacity"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <>
                <div
                  className={`grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-10 sm:gap-y-14 transition-opacity duration-300 ${
                    filtering ? "opacity-50" : "opacity-100"
                  }`}
                >
                  {perfumes.slice(0, visibleCount).map((p) => (
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
                {visibleCount < perfumes.length && (
                  <div className="mt-12 text-center">
                    <p className="eyebrow text-foreground/45 mb-4">
                      Mostrando {visibleCount} de {perfumes.length} fragancias
                    </p>
                    <button
                      onClick={() => setVisibleCount((c) => c + 24)}
                      className="btn-luxury inline-flex items-center justify-center px-10 py-3 border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-all duration-500 eyebrow text-[0.65rem]"
                    >
                      Ver más fragancias
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* BANNER MAYORISTA */}
      <section className="mt-24 border border-accent/40 bg-gradient-to-br from-noir/60 via-deep-blue/30 to-noir/60 p-8 sm:p-14 text-center">
        <p className="eyebrow text-accent">Para revendedores</p>
        <h2 className="mt-5 text-2xl sm:text-4xl font-serif leading-tight text-balance max-w-2xl mx-auto">
          ¿Sos revendedor? Tenemos un <em className="text-accent">catálogo mayorista</em> exclusivo para vos.
        </h2>
        <a
          href={`https://wa.me/5492215716077?text=${encodeURIComponent("Hola Luxury Parfum, me interesa acceder al catálogo mayorista.")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-luxury mt-8 inline-flex items-center justify-center px-10 py-4 bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-500"
        >
          Solicitar catálogo mayorista
        </a>
      </section>
    </div>
  );
}
