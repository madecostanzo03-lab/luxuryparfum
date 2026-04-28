import { useEffect, useState } from "react";
import { removeWhiteBackground } from "@/lib/remove-white-bg";

/**
 * Imagen del catálogo del catálogo con remoción REAL y CONSERVADORA de fondo blanco.
 *
 * Comportamiento:
 *   1. Render inmediato de la imagen original (sin blend, sin multiply, sin blur,
 *      sin lavado) sobre el fondo "estudio oscuro premium".
 *   2. En paralelo, se intenta limpiar el fondo con removeWhiteBackground():
 *      - Si funciona limpio: swap por la versión con transparencia binaria real.
 *      - Si NO se puede resolver bien: la imagen original se queda como está.
 *        No aplicamos ningún arreglo "semi". Estos casos quedan listados en
 *        el CSV de revisión manual.
 *   3. `preserveBg=true` desactiva el procesamiento (imágenes editoriales
 *      premium ya vienen con fondo oscuro perfecto).
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
  preserveBg?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProcessedSrc(null);
    if (!src || preserveBg) return;
    removeWhiteBackground(src).then((out) => {
      if (cancelled) return;
      // Solo aplicamos si hay un resultado limpio. Si null → dejamos original.
      if (out) setProcessedSrc(out);
    });
    return () => {
      cancelled = true;
    };
  }, [src, preserveBg]);

  const showFallback = !src || errored;
  const finalSrc = processedSrc ?? src ?? "";

  const studioBg =
    "radial-gradient(ellipse at 50% 30%, oklch(0.24 0.045 250) 0%, oklch(0.14 0.035 250) 55%, oklch(0.08 0.025 250) 100%)";

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div
        className="absolute inset-0"
        style={{ background: studioBg }}
        aria-hidden
      />

      {!loaded && !showFallback && (
        <div className="absolute inset-0 bg-gradient-to-br from-card/40 via-secondary/20 to-card/40 animate-pulse" />
      )}

      {showFallback ? (
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
          src={finalSrc}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={{
            // Realce sutil — sin blur, sin lavado, sin pérdida de definición.
            filter:
              "contrast(1.04) saturate(1.06) drop-shadow(0 12px 24px rgba(0,0,0,0.55))",
          }}
          className={`absolute inset-0 w-full h-full object-contain p-3 sm:p-5 transition-opacity duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${imgClassName}`}
        />
      )}

      {/* Reflejo superior sutil — luz de estudio */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1/3"
        style={{
          background:
            "linear-gradient(to bottom, oklch(0.85 0.05 80 / 0.08), transparent)",
        }}
        aria-hidden
      />

      {/* Sombra inferior bajo el frasco */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[8%] w-[55%] h-3 rounded-[50%] blur-md"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.02 0.02 250 / 0.6) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      {/* Viñeta inferior premium */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 100%, oklch(0.04 0.02 250 / 0.65) 0%, transparent 60%)",
        }}
        aria-hidden
      />
    </div>
  );
}
