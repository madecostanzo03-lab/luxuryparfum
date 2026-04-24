import { useEffect, useState } from "react";
import type { Perfume } from "@/lib/types";
import { whatsappLink, perfumePublicUrl } from "@/lib/whatsapp";
import { PerfumeModal } from "./PerfumeModal";


export function PerfumeCard({
  perfume,
  openInitial = false,
  onOpenChange,
  initialVariantId = null,
  onVariantChange,
}: {
  perfume: Perfume;
  openInitial?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialVariantId?: string | null;
  onVariantChange?: (variantId: string | null) => void;
}) {
  const [open, setOpen] = useState(openInitial);
  const displayName = perfume.base_name ?? perfume.name;
  const variantsCount = perfume.variants?.length ?? 0;

  useEffect(() => {
    setOpen(openInitial);
  }, [openInitial]);

  const handleOpen = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <>
      <article className="group flex flex-col">
        <button
          type="button"
          onClick={() => handleOpen(true)}
          aria-label={`Ver detalles de ${displayName}`}
          className="relative aspect-[4/5] overflow-hidden bg-card block w-full text-left"
        >
          {perfume.image_url ? (
            <img
              src={perfume.image_url}
              alt={`${displayName}${perfume.brand ? ` — ${perfume.brand.name}` : ""}`}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.05]"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-card">
              <div className="font-serif italic text-7xl text-accent/30">
                {displayName.charAt(0)}
              </div>
            </div>
          )}
          {perfume.is_recommended && (
            <span className="absolute top-5 left-5 eyebrow text-[0.5rem] text-accent border border-accent/40 px-2.5 py-1 backdrop-blur-sm bg-background/30">
              Recomendado
            </span>
          )}
          {perfume.is_bestseller && !perfume.is_recommended && (
            <span className="absolute top-5 left-5 eyebrow text-[0.5rem] text-foreground/90 border border-foreground/30 px-2.5 py-1 backdrop-blur-sm bg-background/30">
              Más elegido
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-noir/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </button>

        <div className="pt-7 flex flex-col items-center text-center">
          {perfume.brand && (
            <p className="eyebrow text-[0.55rem] text-foreground/40">{perfume.brand.name}</p>
          )}
          <h3 className="mt-3 text-lg md:text-xl font-serif leading-tight tracking-tight">
            {displayName}
          </h3>
          <span className="mt-3 text-sm text-foreground/70 tracking-wide">
            {variantsCount > 1 ? "Desde " : ""}
            <span className="text-foreground">USD {perfume.price.toFixed(0)}</span>
          </span>
          <a
            href={whatsappLink({
              name: displayName,
              brand: perfume.brand?.name ?? null,
              price: perfume.price,
              fromPrice: variantsCount > 1,
              url: perfumePublicUrl(perfume.id),
            })}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="mt-5 inline-flex items-center justify-center px-6 py-3 border border-accent/60 text-accent eyebrow text-[0.55rem] hover:bg-accent hover:text-accent-foreground transition-all duration-500 w-full max-w-[220px]"
          >
            Consultar por WhatsApp
          </a>
        </div>
      </article>

      <PerfumeModal
        perfume={perfume}
        open={open}
        onClose={() => handleOpen(false)}
        initialVariantId={initialVariantId}
        onVariantChange={onVariantChange}
      />
    </>
  );
}

export { whatsappLink };
