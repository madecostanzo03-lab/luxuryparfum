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
        <>
          {/*
            CAPA ÚNICA — fusión sutil con el estudio:
            En vez de un `multiply` agresivo (que hacía desaparecer frascos enteros
            cuando la imagen del proveedor tenía mucho contraste), aplicamos:
            - Una máscara radial muy suave que solo desvanece los bordes extremos
              (donde están los recortes blancos típicos), dejando el frasco
              completamente visible en el centro.
            - Un realce de contraste/saturación leve para que el frasco "tenga
              cuerpo" contra el fondo oscuro.
            - Una sombra inferior para integrarlo con el estudio.
            Resultado: el perfume SIEMPRE se ve, los bordes blancos se diluyen
            con el azul, sin riesgo de quedarse sin imagen.
          */}
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
                    WebkitMaskImage:
                      "radial-gradient(ellipse 88% 92% at 50% 50%, #000 72%, transparent 100%)",
                    maskImage:
                      "radial-gradient(ellipse 88% 92% at 50% 50%, #000 72%, transparent 100%)",
                    filter:
                      "contrast(1.05) saturate(1.1) brightness(1.02) drop-shadow(0 8px 18px rgba(0,0,0,0.45))",
                  }
            }
            className={`relative w-full h-full object-contain p-3 sm:p-5 transition-opacity duration-700 ${
              loaded ? "opacity-100" : "opacity-0"
            } ${imgClassName}`}
          />
        </>
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

      {/* Drop shadow inferior bajo el frasco — flotación de estudio */}
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
