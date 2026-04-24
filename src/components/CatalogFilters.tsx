import type { Brand, FragranceType, Gender } from "@/lib/types";

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

export interface CatalogFiltersValue {
  marca: string;
  genero: "" | Gender;
  tipo: "" | FragranceType;
  max: number;
}

export function CatalogFilters({
  brands,
  value,
  onChange,
  onReset,
  hasActiveFilters,
}: {
  brands: Brand[];
  value: CatalogFiltersValue;
  onChange: (patch: Partial<CatalogFiltersValue>) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}) {
  return (
    <div className="space-y-8">
      <FilterGroup label="Marca">
        <select
          value={value.marca}
          onChange={(e) => onChange({ marca: e.target.value })}
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
              onClick={() => onChange({ genero: g.value })}
              className={`text-left text-sm py-1 transition-colors ${
                value.genero === g.value ? "text-accent" : "text-foreground/60 hover:text-foreground"
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
              onClick={() => onChange({ tipo: t.value })}
              className={`text-left text-sm py-1 transition-colors ${
                value.tipo === t.value ? "text-accent" : "text-foreground/60 hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label={`Precio máx · USD ${value.max}`}>
        <input
          type="range"
          min={50}
          max={500}
          step={10}
          value={value.max}
          onChange={(e) => onChange({ max: Number(e.target.value) })}
          className="w-full accent-accent"
        />
      </FilterGroup>

      {hasActiveFilters && (
        <button
          onClick={onReset}
          className="eyebrow text-foreground/50 hover:text-accent transition-colors"
        >
          Limpiar filtros
        </button>
      )}
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
