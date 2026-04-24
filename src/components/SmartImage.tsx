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
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-secondary to-card">
          <div className="font-serif italic text-7xl md:text-8xl text-accent/25 select-none">
            {(fallbackInitial ?? alt.charAt(0) ?? "·").toUpperCase()}
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
