import { useState } from "react";

/**
 * Imagen con lazy loading, fade-in al cargar, skeleton de fondo y
 * fallback elegante (placeholder con inicial) si falla o no carga.
 *
 * UNIFICACIÓN VISUAL PREMIUM:
 * Todas las imágenes se renderizan sobre un mismo "estudio" oscuro azul-noir
 * con viñeta y un reflejo superior dorado muy sutil. Esto neutraliza la
 * mezcla de fondos blancos / grises / mockups que vienen del proveedor y
 * hace que el catálogo entero se sienta editorial y coherente.
 *
 * - Para imágenes con fondo claro (lo más común en perfumes), usamos
 *   `mix-blend-multiply` que las funde con el fondo oscuro premium.
 * - Para imágenes con fondo oscuro o ya editoriales, usar `preserveBg`.
 * - El placeholder de fallback mantiene la misma paleta para no romper el ritmo.
 */
export function SmartImage({
  src,
  alt,
  fallbackInitial,
  className = "",
  imgClassName = "",
  eager = false,
  preserveBg = false,
}: {
  src: string | null | undefined;
  alt: string;
  fallbackInitial?: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
  /**
   * Si true, NO se aplica el blend ni la mezcla con el fondo oscuro
   * (úsalo cuando la imagen ya viene en estética premium / fondo oscuro).
   */
  preserveBg?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const showFallback = !src || errored;

  // Fondo "estudio premium" reutilizado por la imagen real Y el fallback
  const studioBg =
    "radial-gradient(ellipse at 50% 30%, oklch(0.24 0.045 250) 0%, oklch(0.14 0.035 250) 55%, oklch(0.08 0.025 250) 100%)";

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Estudio oscuro premium (siempre presente para coherencia) */}
      <div
        className="absolute inset-0"
        style={{ background: studioBg }}
        aria-hidden
      />

      {/* Skeleton shimmer mientras carga */}
      {!loaded && !showFallback && (
        <div className="absolute inset-0 bg-gradient-to-br from-card/40 via-secondary/20 to-card/40 animate-pulse" />
      )}

      {showFallback ? (
        // Placeholder editorial premium: misma paleta, filete dorado, inicial serif
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="absolute top-6 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
          <span className="absolute bottom-6 left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />
          <div className="relative flex flex-col items-center">
            <div className="font-serif italic text-6xl md:text-7xl text-accent/40 select-none leading-none">
              {(fallbackInitial ?? alt.charAt(0) ?? "·").toUpperCase()}
            </div>
            <span className="mt-4 eyebrow text-[0.5rem] text-foreground/30">
              Luxury Parfum
            </span>
          </div>
        </div>
      ) : (
        <img
          src={src!}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={
            preserveBg
              ? undefined
              : {
                  // Máscara radial: difumina los bordes de la imagen original
                  // hacia el fondo oscuro, fundiendo cualquier fondo (blanco,
                  // gris, mockup) con nuestro "estudio" premium. El frasco,
                  // al estar centrado, queda perfectamente visible.
                  WebkitMaskImage:
                    "radial-gradient(ellipse 75% 80% at 50% 50%, #000 55%, transparent 92%)",
                  maskImage:
                    "radial-gradient(ellipse 75% 80% at 50% 50%, #000 55%, transparent 92%)",
                  filter:
                    "contrast(1.06) saturate(1.08) brightness(1.02) drop-shadow(0 12px 24px rgba(0,0,0,0.45))",
                }
          }
          className={`relative w-full h-full object-contain p-3 sm:p-5 transition-opacity duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${imgClassName}`}
        />
      )}

      {/* Reflejo superior sutil — luz de estudio */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.85 0.05 80 / 0.06), transparent)",
        }}
        aria-hidden
      />

      {/* Viñeta inferior premium */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, oklch(0.04 0.02 250 / 0.55) 0%, transparent 60%)",
        }}
        aria-hidden
      />
    </div>
  );
}
