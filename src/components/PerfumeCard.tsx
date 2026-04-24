import { useEffect, useState } from "react";
import type { Perfume } from "@/lib/types";
import { whatsappLink, perfumePublicUrl } from "@/lib/whatsapp";
import { PerfumeModal } from "./PerfumeModal";
import { MessageCircle } from "lucide-react";

export function PerfumeCard({
  perfume,
  openInitial = false,
  onOpenChange,
}: {
  perfume: Perfume;
  openInitial?: boolean;
  onOpenChange?: (open: boolean) => void;
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
              className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-card">
              <div className="font-serif italic text-6xl text-accent/30">
                {displayName.charAt(0)}
              </div>
            </div>
          )}
          {perfume.is_recommended && (
            <span className="absolute top-4 left-4 eyebrow text-[0.55rem] text-accent border border-accent/40 px-2 py-1 backdrop-blur-sm bg-background/40">
              Recomendado
            </span>
          )}
          {perfume.is_bestseller && (
            <span className="absolute top-4 right-4 eyebrow text-[0.55rem] text-foreground border border-foreground/40 px-2 py-1 backdrop-blur-sm bg-background/40">
              Más vendido
            </span>
          )}
          <div className="absolute inset-0 bg-noir/0 group-hover:bg-noir/20 transition-colors duration-700" />
        </button>

        <div className="pt-5 pb-2 flex flex-col flex-1">
          {perfume.brand && (
            <p className="eyebrow text-[0.6rem] text-foreground/50">{perfume.brand.name}</p>
          )}
          <h3 className="mt-2 text-xl font-serif leading-tight">{displayName}</h3>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-sm text-foreground/70">
              {variantsCount > 1 ? "Desde " : ""}
              <span className="text-foreground">USD {perfume.price.toFixed(0)}</span>
            </span>
            <button
              type="button"
              onClick={() => handleOpen(true)}
              className="eyebrow text-[0.55rem] text-accent hover:opacity-70 transition-opacity"
            >
              Detalles →
            </button>
          </div>
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
            className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 border border-accent/60 text-accent eyebrow text-[0.6rem] hover:bg-accent hover:text-accent-foreground transition-all duration-500"
          >
            <MessageCircle size={12} />
            Consultar
          </a>
        </div>
      </article>

      <PerfumeModal
        perfume={perfume}
        open={open}
        onClose={() => handleOpen(false)}
      />
    </>
  );
}

export { whatsappLink };
