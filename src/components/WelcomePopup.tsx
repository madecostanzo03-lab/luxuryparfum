import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Popup premium de bienvenida — captura de email.
 *
 * Reglas:
 * - Aparece automáticamente la PRIMERA vez (con un pequeño delay para no asustar).
 * - Si el usuario deja su email → no vuelve a aparecer (flag persistente).
 * - Si el usuario lo cierra → no vuelve a aparecer en ese navegador (flag persistente).
 * - Sólo se monta del lado del cliente (usa localStorage).
 */

const STORAGE_KEY = "lp_welcome_v1"; // valores: "subscribed" | "dismissed"
const SHOW_DELAY_MS = 2200;

// Regex permisivo y estándar — acepta todos los emails normales.
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, "Email muy corto")
  .max(254, "Email demasiado largo")
  .email("Ingresá un email válido");

export function WelcomePopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const flag = window.localStorage.getItem(STORAGE_KEY);
      if (flag) return;
    } catch {
      // localStorage bloqueado → no mostramos para no molestar
      return;
    }
    const t = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  // Bloquear scroll del body mientras está abierto
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {}
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error: dbError } = await supabase
      .from("leads")
      .insert({ email: parsed.data });
    setLoading(false);

    // 23505 = duplicado → lo tratamos como éxito silencioso
    if (dbError && dbError.code !== "23505") {
      setError("No pudimos registrar tu email. Intentá nuevamente.");
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, "subscribed");
    } catch {}
    setSubmitted(true);
    toast.success("Gracias. Te escribiremos pronto.");
    window.setTimeout(() => setOpen(false), 1800);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8 fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      {/* Backdrop oscuro premium */}
      <button
        type="button"
        aria-label="Cerrar"
        onClick={handleDismiss}
        className="absolute inset-0 bg-noir/85 backdrop-blur-sm"
      />

      {/* Card */}
      <div className="relative w-full max-w-md bg-background border border-accent/20 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
        {/* Filete dorado superior */}
        <span className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/60 to-transparent" />

        {/* Botón cerrar */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-foreground/50 hover:text-accent transition-colors duration-300"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
            <line x1="1" y1="1" x2="13" y2="13" />
            <line x1="13" y1="1" x2="1" y2="13" />
          </svg>
        </button>

        <div className="px-8 sm:px-10 py-12 text-center">
          <p className="eyebrow text-[0.6rem] text-accent/80">Acceso reservado</p>

          <h2
            id="welcome-title"
            className="mt-6 text-3xl sm:text-4xl font-serif leading-[1.1] tracking-tight text-balance"
          >
            Descubrí tu próxima <em className="text-accent">firma</em>
          </h2>

          <span className="divider-gold mt-7" />

          {submitted ? (
            <div className="mt-8 space-y-3">
              <p className="font-serif italic text-lg text-foreground">
                Gracias. Te escribiremos pronto.
              </p>
              <p className="text-xs text-foreground/55 leading-relaxed">
                Quedaste en la lista de novedades curadas.
              </p>
            </div>
          ) : (
            <>
              <p className="mt-6 text-sm text-foreground/65 leading-relaxed max-w-sm mx-auto">
                Recibí recomendaciones exclusivas, ingresos nuevos y oportunidades especiales.
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    required
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error) setError(null);
                    }}
                    aria-invalid={!!error}
                    className={`w-full bg-input/40 border px-4 py-4 text-center text-sm tracking-wide placeholder:text-foreground/35 focus:outline-none transition-colors ${
                      error
                        ? "border-destructive/60 focus:border-destructive"
                        : "border-border focus:border-accent"
                    }`}
                  />
                  {error && (
                    <p className="mt-2 text-[0.7rem] text-destructive/90 tracking-wide">
                      {error}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-8 py-4 bg-accent text-accent-foreground eyebrow text-[0.6rem] hover:bg-accent/90 transition-all duration-500 disabled:opacity-60"
                >
                  {loading ? "Enviando..." : "Quiero acceso"}
                </button>

                <p className="text-[0.65rem] text-foreground/45 leading-relaxed tracking-wide">
                  Sin spam. Solo perfumes que valen la pena.
                </p>
              </form>

              <button
                type="button"
                onClick={handleDismiss}
                className="mt-6 text-[0.6rem] eyebrow text-foreground/35 hover:text-foreground/60 transition-colors"
              >
                Ahora no
              </button>
            </>
          )}
        </div>

        {/* Filete dorado inferior */}
        <span className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      </div>
    </div>
  );
}
