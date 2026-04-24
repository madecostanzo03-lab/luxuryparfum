import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Perfume, PerfumeVariant } from "@/lib/types";
import { whatsappLink } from "@/lib/whatsapp";
import { X } from "lucide-react";

export function PerfumeModal({
  perfume,
  open,
  onClose,
}: {
  perfume: Perfume;
  open: boolean;
  onClose: () => void;
}) {
  // Sort variants: by concentration order, then by size
  const sortedVariants = useMemo(() => {
    const order: Record<string, number> = { edc: 0, edt: 1, edp: 2, parfum: 3, extrait: 4 };
    return [...(perfume.variants ?? [])].sort((a, b) => {
      const ca = a.concentration ? (order[a.concentration] ?? 9) : 9;
      const cb = b.concentration ? (order[b.concentration] ?? 9) : 9;
      if (ca !== cb) return ca - cb;
      return (a.size_ml ?? 0) - (b.size_ml ?? 0);
    });
  }, [perfume.variants]);

  const [selectedId, setSelectedId] = useState<string | null>(
    sortedVariants[0]?.id ?? null
  );

  const selected: PerfumeVariant | null =
    sortedVariants.find((v) => v.id === selectedId) ?? sortedVariants[0] ?? null;

  const displayName = perfume.base_name ?? perfume.name;
  const variantLabel = (v: PerfumeVariant) => {
    const conc = v.concentration ? v.concentration.toUpperCase() : "";
    const size = v.size_ml ? `${v.size_ml} ml` : "";
    return [conc, size].filter(Boolean).join(" · ");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl bg-background border-border/40 p-0 overflow-hidden">
        <DialogTitle className="sr-only">{displayName}</DialogTitle>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 text-foreground/60 hover:text-accent transition-colors"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="grid md:grid-cols-2">
          <div className="aspect-square md:aspect-auto bg-card">
            {perfume.image_url ? (
              <img
                src={perfume.image_url}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-card min-h-[400px]">
                <div className="font-serif italic text-8xl text-accent/20">
                  {displayName.charAt(0)}
                </div>
              </div>
            )}
          </div>

          <div className="p-8 md:p-12 flex flex-col">
            {perfume.brand && (
              <p className="eyebrow">{perfume.brand.name}</p>
            )}
            <h2 className="mt-4 text-4xl font-serif leading-tight">{displayName}</h2>
            <span className="divider-gold mt-6" />

            {perfume.description && (
              <p className="mt-6 text-foreground/75 leading-relaxed font-serif italic text-lg">
                "{perfume.description}"
              </p>
            )}

            {sortedVariants.length > 0 && (
              <div className="mt-8">
                <p className="eyebrow mb-3">
                  {sortedVariants.length > 1 ? "Presentaciones" : "Presentación"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sortedVariants.map((v) => {
                    const active = v.id === selected?.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setSelectedId(v.id)}
                        className={`eyebrow text-[0.65rem] px-3 py-2 border transition-all ${
                          active
                            ? "border-accent text-accent bg-accent/5"
                            : "border-border text-foreground/60 hover:border-accent/40 hover:text-foreground"
                        }`}
                      >
                        {variantLabel(v) || "Única"}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center gap-4">
              <span className="eyebrow text-foreground/50">Precio</span>
              <span className="text-2xl font-serif">
                USD {(selected?.price ?? perfume.price).toFixed(0)}
              </span>
            </div>

            <a
              href={whatsappLink(
                selected
                  ? `${displayName}${variantLabel(selected) ? ` (${variantLabel(selected)})` : ""}`
                  : displayName
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-auto pt-10 inline-flex items-center justify-center gap-3 px-8 py-4 border border-accent text-accent eyebrow hover:bg-accent hover:text-accent-foreground transition-all duration-500"
            >
              Consultar por WhatsApp
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
