import { lazy, Suspense, useEffect, useState } from "react";
import type { Perfume } from "@/lib/types";
import { whatsappLink, perfumePublicUrl } from "@/lib/whatsapp";
import { perfumeShortHint } from "@/lib/perfume-helpers";
import { resolvePerfumeImage } from "@/lib/premium-images";
import { SmartImage } from "./SmartImage";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { looksLikeWhiteBackground } from "@/lib/white-bg-detection";

// Lazy load del modal: no se descarga hasta que el usuario abre un producto.
// Esto reduce el JS inicial del catálogo y evita bloqueos al renderizar la grilla.
const PerfumeModal = lazy(() =>
  import("./PerfumeModal").then((m) => ({ default: m.PerfumeModal })),
);

const FORCE_BG_CLEANUP_TERMS = [
  "sauvage elixir",
  "fahrenheit",
  "antonio banderas",
  "fragluxe",
  "stella dustin",
  "good girl blush",
  "le male",
  "scandal",
];

function shouldForceBackgroundCleanup(perfume: Perfume, displayName: string): boolean {
  const haystack = `${displayName} ${perfume.name} ${perfume.brand?.name ?? ""}`.toLowerCase();
  return FORCE_BG_CLEANUP_TERMS.some((term) => haystack.includes(term));
}


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
  const { src: imageSrc, isPremium } = resolvePerfumeImage(
    perfume.id,
    perfume.clean_image_url ?? perfume.image_url,
  );
  const forceProcess = shouldForceBackgroundCleanup(perfume, displayName);
  const isAdmin = useIsAdmin();
  const flagWhiteBg =
    isAdmin &&
    looksLikeWhiteBackground({
      cleanImageUrl: perfume.clean_image_url,
      imageUrl: perfume.image_url,
    });
  const hasPrice = typeof perfume.price === "number" && perfume.price > 0;
  // Detecta kits/combos por nombre: contienen "KIT", "+", "BODY", "DEO" combinados
  const nameUpper = perfume.name.toUpperCase();
  const isSet =
    /\bKIT\b/.test(nameUpper) ||
    /\+\s*(BODY|DEO|BL\d|LOTION)/i.test(perfume.name) ||
    /BODY\s*LOTION/i.test(perfume.name);

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
            src={imageSrc}
            alt={`${displayName}${perfume.brand ? ` — ${perfume.brand.name}` : ""}`}
            fallbackInitial={displayName.charAt(0)}
            preserveBg={isPremium}
            forceProcess={forceProcess}
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
          {isSet && (
            <span className="absolute bottom-5 left-5 eyebrow text-[0.5rem] tracking-widest uppercase px-2.5 py-1 bg-accent text-accent-foreground shadow-md">
              Set
            </span>
          )}
          {flagWhiteBg && (
            <span
              className="absolute top-5 right-5 eyebrow text-[0.5rem] tracking-widest uppercase px-2.5 py-1 bg-orange-500 text-white shadow-lg pointer-events-none"
              title="Admin: imagen probablemente con fondo blanco. Reemplazar manualmente."
            >
              Fondo blanco
            </span>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-noir/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        </button>

        <div className="pt-5 sm:pt-7 flex flex-col items-center text-center">
          {perfume.brand && (
            <p className="eyebrow text-[0.62rem] sm:text-[0.7rem] text-foreground/45">
              {perfume.brand.name}
            </p>
          )}
          <h3 className="mt-2 sm:mt-3 text-base sm:text-xl font-serif leading-tight tracking-tight px-1">
            {displayName}
          </h3>
          {hint && (
            <p className="mt-1.5 sm:mt-2 text-[0.7rem] sm:text-xs text-foreground/50 brand-serif">
              {hint}
            </p>
          )}
          <span className="mt-2 sm:mt-3 text-[0.85rem] sm:text-sm text-foreground/75 brand-serif">
            {hasPrice ? (
              <>
                {variantsCount > 1 ? "Desde " : ""}
                <span className="text-foreground">USD {perfume.price.toFixed(0)}</span>
              </>
            ) : (
              <span className="text-foreground/60 italic">Consultar precio</span>
            )}
          </span>
          {variantsCount > 1 && (
            <p className="mt-1 text-[0.62rem] sm:text-[0.7rem] text-accent eyebrow">
              {variantsCount} presentaciones
            </p>
          )}
          {hasPrice && (
            <p className="mt-1 text-[0.65rem] sm:text-[0.7rem] text-foreground/40 brand-serif">
              Precio en USD · cotización del día
            </p>
          )}
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
            className="btn-luxury mt-4 sm:mt-5 inline-flex items-center justify-center px-4 sm:px-6 py-3 bg-accent text-accent-foreground text-[0.7rem] sm:text-[0.78rem] hover:bg-accent/90 hover:scale-[1.02] transition-all duration-500 w-full max-w-[220px]"
          >
            Pedir por WhatsApp
          </a>
          <p className="mt-2 text-[0.62rem] sm:text-[0.7rem] text-foreground/45 brand-serif">
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
