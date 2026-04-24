import { useState } from "react";

/**
 * Imagen con lazy loading, fade-in al cargar, skeleton de fondo y
 * fallback elegante (placeholder con inicial) si falla o no carga.
 *
 * Pensado para mantener calidad visual incluso cuando la fuente original
 * es de baja calidad o no carga: nunca dejamos un hueco roto.
 */
export function SmartImage({
  src,
  alt,
  fallbackInitial,
  className = "",
  imgClassName = "",
  eager = false,
}: {
  src: string | null | undefined;
  alt: string;
  fallbackInitial?: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const showFallback = !src || errored;

  return (
    <div className={`relative w-full h-full overflow-hidden bg-card ${className}`}>
      {/* Skeleton shimmer */}
      {!loaded && !showFallback && (
        <div className="absolute inset-0 bg-gradient-to-br from-card via-secondary/40 to-card animate-pulse" />
      )}

      {showFallback ? (
        // Placeholder editorial premium: fondo oscuro azul-noir + filete dorado + inicial serif
        <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 35%, oklch(0.22 0.04 250) 0%, oklch(0.13 0.03 250) 55%, oklch(0.08 0.02 250) 100%)",
            }}
          />
          {/* Filetes dorados sutiles */}
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
          className={`w-full h-full object-cover transition-opacity duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${imgClassName}`}
        />
      )}
    </div>
  );
}
