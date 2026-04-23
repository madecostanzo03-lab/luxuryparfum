import { useState } from "react";
import type { Perfume } from "@/lib/types";
import { whatsappLink } from "@/lib/whatsapp";
import { PerfumeModal } from "./PerfumeModal";

export function PerfumeCard({ perfume }: { perfume: Perfume }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <article
        onClick={() => setOpen(true)}
        className="group cursor-pointer flex flex-col"
      >
        <div className="relative aspect-[3/4] overflow-hidden bg-card">
          {perfume.image_url ? (
            <img
              src={perfume.image_url}
              alt={perfume.name}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-card">
              <div className="font-serif italic text-5xl text-accent/30">
                {perfume.name.charAt(0)}
              </div>
            </div>
          )}
          {perfume.is_recommended && (
            <span className="absolute top-4 left-4 eyebrow text-[0.55rem] text-accent border border-accent/40 px-2 py-1 backdrop-blur-sm">
              Recomendado
            </span>
          )}
          {perfume.is_bestseller && (
            <span className="absolute top-4 right-4 eyebrow text-[0.55rem] text-foreground border border-foreground/40 px-2 py-1 backdrop-blur-sm">
              Más vendido
            </span>
          )}
          <div className="absolute inset-0 bg-noir/0 group-hover:bg-noir/20 transition-colors duration-700" />
        </div>

        <div className="pt-5 pb-2">
          {perfume.brand && (
            <p className="eyebrow text-[0.6rem] text-foreground/50">{perfume.brand.name}</p>
          )}
          <h3 className="mt-2 text-xl font-serif">{perfume.name}</h3>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-foreground/60">USD {perfume.price.toFixed(0)}</span>
            <span className="eyebrow text-[0.55rem] text-accent">Descubrir →</span>
          </div>
        </div>
      </article>

      <PerfumeModal
        perfume={perfume}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export { whatsappLink };
