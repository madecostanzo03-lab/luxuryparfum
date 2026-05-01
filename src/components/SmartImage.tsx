import { useEffect, useState } from "react";
import { removeWhiteBackgroundWithReport, type RemovalStatus } from "@/lib/remove-white-bg";

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
  forceProcess = false,
  showDebug = false,
}: {
  src: string | null | undefined;
  alt: string;
  fallbackInitial?: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
  preserveBg?: boolean;
  forceProcess?: boolean;
  showDebug?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [processedSrc, setProcessedSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<RemovalStatus | "original" | "processed-transparent">("original");
  const [whiteRectVisible, setWhiteRectVisible] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setErrored(false);
    setProcessedSrc(null);
    setWhiteRectVisible(null);
    setStatus(preserveBg ? "original" : "original");
    if (!src || preserveBg) return;
    removeWhiteBackgroundWithReport(src, { force: forceProcess }).then((report) => {
      if (cancelled) return;
      setWhiteRectVisible(report.whiteRectVisible);
      if (report.status === "ok" && report.output) {
        setProcessedSrc(report.output);
        setStatus("processed-transparent");
      } else {
        setStatus(report.status);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [src, preserveBg, forceProcess]);

  const showFallback = !src || errored;
  const finalSrc = processedSrc ?? src ?? "";

  // Sin fondo propio: el contenedor es transparente para fundirse con el fondo
  // global del sitio (noir). Antes pintábamos un radial navy más claro que
  // generaba un rectángulo visible detrás del perfume; ya no.
  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {!loaded && !showFallback && (
        <div className="absolute inset-0 bg-noir/40 animate-pulse" aria-hidden />
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
          className={`absolute inset-0 w-full h-full object-contain p-3 sm:p-5 transition-opacity duration-700 ${
            loaded ? "opacity-100" : "opacity-0"
          } ${imgClassName}`}
        />
      )}

      {showDebug && !showFallback && (
        <div className="pointer-events-none absolute left-2 top-2 z-20 flex max-w-[calc(100%-1rem)] flex-col items-start gap-1">
          <span className="bg-background/90 border border-border px-2 py-1 text-[0.55rem] uppercase tracking-[0.12em] text-foreground/80">
            {status === "ok" ? "processed-transparent" : status}
          </span>
          {whiteRectVisible !== null && (
            <span className="bg-background/90 border border-border px-2 py-1 text-[0.55rem] uppercase tracking-[0.12em] text-foreground/70">
              fondo blanco: {whiteRectVisible ? "sí" : "no"}
            </span>
          )}
        </div>
      )}

      {/* Sombra muy sutil bajo el frasco — integra el producto sin pintar
          un fondo propio. */}
      {!showFallback && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-[6%] w-[50%] h-2 rounded-[50%] blur-md opacity-70"
          style={{
            background:
              "radial-gradient(ellipse at center, oklch(0 0 0 / 0.55) 0%, transparent 70%)",
          }}
          aria-hidden
        />
      )}
    </div>
  );
}
