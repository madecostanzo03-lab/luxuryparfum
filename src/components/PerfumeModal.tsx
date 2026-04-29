import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Perfume, PerfumeVariant } from "@/lib/types";
import { whatsappLink, perfumePublicUrl } from "@/lib/whatsapp";
import { ArrowLeft, X } from "lucide-react";
import { resolvePerfumeImage } from "@/lib/premium-images";
import { SmartImage } from "./SmartImage";

export function PerfumeModal({
  perfume,
  open,
  onClose,
  initialVariantId,
  onVariantChange,
}: {
  perfume: Perfume;
  open: boolean;
  onClose: () => void;
  initialVariantId?: string | null;
  onVariantChange?: (variantId: string | null) => void;
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

  const resolveInitial = () => {
    if (initialVariantId && sortedVariants.some((v) => v.id === initialVariantId)) {
      return initialVariantId;
    }
    return sortedVariants[0]?.id ?? null;
  };

  const [selectedId, setSelectedId] = useState<string | null>(resolveInitial);

  // Sync when reopening with a different initial variant (e.g. coming from URL)
  useEffect(() => {
    if (open) {
      setSelectedId(resolveInitial());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialVariantId, perfume.id]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onVariantChange?.(id);
  };

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
      <DialogContent className="max-w-4xl w-[calc(100vw-1rem)] sm:w-full max-h-[95vh] overflow-y-auto bg-background border-border/40 p-0 sm:rounded-none">
        <DialogTitle className="sr-only">{displayName}</DialogTitle>

        {/* Barra superior mobile: Volver + Cerrar (sticky para no perder navegación) */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-background/95 backdrop-blur-md border-b border-border/40 md:hidden">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 text-foreground/80 hover:text-accent transition-colors"
            aria-label="Volver al catálogo"
          >
            <ArrowLeft size={16} />
            <span className="eyebrow text-[0.6rem]">Volver</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 -mr-2 text-foreground/60 hover:text-accent transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Botón cerrar solo desktop (esquina absoluta sobre la imagen) */}
        <button
          onClick={onClose}
          className="hidden md:flex absolute top-4 right-4 z-10 p-2 text-foreground/70 hover:text-accent transition-colors bg-background/40 backdrop-blur-sm rounded-full"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <div className="grid md:grid-cols-2">
          <div className="aspect-square md:aspect-auto md:min-h-[500px] bg-card">
            {(() => {
              const { src, isPremium } = resolvePerfumeImage(
                perfume.id,
                perfume.clean_image_url ?? perfume.image_url,
              );
              return (
                <SmartImage
                  src={src}
                  alt={displayName}
                  fallbackInitial={displayName.charAt(0)}
                  preserveBg={isPremium}
                  eager
                />
              );
            })()}
          </div>

          <div className="p-6 sm:p-8 md:p-12 flex flex-col">
            {perfume.brand && (
              <p className="eyebrow">{perfume.brand.name}</p>
            )}
            <h2 className="mt-3 sm:mt-4 text-3xl sm:text-4xl font-serif leading-tight">{displayName}</h2>
            <span className="divider-gold mt-5" />

            {perfume.description && (
              <p className="mt-5 sm:mt-6 text-foreground/75 leading-relaxed font-serif italic text-base sm:text-lg">
                "{perfume.description}"
              </p>
            )}

            {sortedVariants.length > 0 && (
              <div className="mt-7">
                <p className="eyebrow mb-3">
                  {sortedVariants.length > 1 ? "Presentaciones" : "Presentación"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {sortedVariants.map((v) => {
                    const active = v.id === selected?.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => handleSelect(v.id)}
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

            <div className="mt-7 flex items-center gap-4">
              <span className="eyebrow text-foreground/50">Precio</span>
              <span className="text-2xl font-serif">
                USD {(selected?.price ?? perfume.price).toFixed(0)}
              </span>
            </div>

            <a
              href={whatsappLink({
                name: displayName,
                brand: perfume.brand?.name ?? null,
                presentation: selected ? variantLabel(selected) || null : null,
                price: selected?.price ?? perfume.price,
                fromPrice: !selected && (perfume.variants?.length ?? 0) > 1,
                url: perfumePublicUrl(perfume.id, selected?.id ?? null),
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-luxury mt-8 md:mt-auto md:pt-10 inline-flex items-center justify-center gap-3 px-8 py-4 bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-500"
            >
              Consultar por WhatsApp
            </a>
            <p className="mt-3 text-center text-[0.7rem] text-foreground/45 brand-serif">
              Te respondemos en minutos
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
