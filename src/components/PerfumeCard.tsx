import { lazy, Suspense, useEffect, useState } from "react";
import type { Perfume } from "@/lib/types";
import { whatsappLink, perfumePublicUrl } from "@/lib/whatsapp";
import { perfumeShortHint } from "@/lib/perfume-helpers";
import { SmartImage } from "./SmartImage";

// Lazy load del modal: no se descarga hasta que el usuario abre un producto.
// Esto reduce el JS inicial del catálogo y evita bloqueos al renderizar la grilla.
const PerfumeModal = lazy(() =>
  import("./PerfumeModal").then((m) => ({ default: m.PerfumeModal })),
);


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
  const hint = perfumeShortHint(perfume);

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
          <SmartImage
            src={perfume.image_url}
            alt={`${displayName}${perfume.brand ? ` — ${perfume.brand.name}` : ""}`}
            fallbackInitial={displayName.charAt(0)}
            imgClassName="transition-transform duration-[1400ms] ease-out group-hover:scale-[1.05]"
          />
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
          {hint && (
            <p className="mt-2 text-[0.7rem] text-foreground/45 italic tracking-wide">
              {hint}
            </p>
          )}
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
            className="mt-5 inline-flex items-center justify-center px-6 py-3 bg-accent text-accent-foreground eyebrow text-[0.55rem] hover:bg-accent/90 hover:scale-[1.02] transition-all duration-500 w-full max-w-[220px]"
          >
            Pedir por WhatsApp
          </a>
          <p className="mt-2 text-[0.6rem] text-foreground/40 tracking-wide">
            Te asesoramos en minutos
          </p>
        </div>
      </article>

      {open && (
        <Suspense fallback={null}>
          <PerfumeModal
            perfume={perfume}
            open={open}
            onClose={() => handleOpen(false)}
            initialVariantId={initialVariantId}
            onVariantChange={onVariantChange}
          />
        </Suspense>
      )}
    </>
  );
}

export { whatsappLink };
