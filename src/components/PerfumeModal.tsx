import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { Perfume } from "@/lib/types";
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
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl bg-background border-border/40 p-0 overflow-hidden">
        <DialogTitle className="sr-only">{perfume.name}</DialogTitle>
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
                alt={perfume.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-card min-h-[400px]">
                <div className="font-serif italic text-8xl text-accent/20">
                  {perfume.name.charAt(0)}
                </div>
              </div>
            )}
          </div>

          <div className="p-8 md:p-12 flex flex-col">
            {perfume.brand && (
              <p className="eyebrow">{perfume.brand.name}</p>
            )}
            <h2 className="mt-4 text-4xl font-serif leading-tight">{perfume.name}</h2>
            <span className="divider-gold mt-6" />

            {perfume.description && (
              <p className="mt-6 text-foreground/75 leading-relaxed font-serif italic text-lg">
                "{perfume.description}"
              </p>
            )}

            {perfume.notes && (
              <div className="mt-8">
                <p className="eyebrow mb-3">Notas olfativas</p>
                <p className="text-sm text-foreground/80 leading-relaxed">{perfume.notes}</p>
              </div>
            )}

            <div className="mt-8 flex items-center gap-4">
              <span className="eyebrow text-foreground/50">Precio</span>
              <span className="text-2xl font-serif">USD {perfume.price.toFixed(0)}</span>
            </div>

            <a
              href={whatsappLink(perfume.name)}
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
