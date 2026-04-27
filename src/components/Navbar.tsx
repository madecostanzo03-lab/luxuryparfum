import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { whatsappGeneralLink } from "@/lib/whatsapp";

const links = [
  { to: "/" as const, label: "Inicio" },
  { to: "/catalogo" as const, label: "Catálogo" },
  { to: "/marcas" as const, label: "Marcas" },
  { to: "/sobre-nosotros" as const, label: "Filosofía" },
  { to: "/login" as const, label: "Acceso" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);

  // Bloqueo de scroll cuando el menú mobile está abierto (UX premium)
  useEffect(() => {
    if (open) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [open]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-12 h-16 sm:h-20 flex items-center justify-between">
          {/* LOGO */}
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="group flex flex-col leading-none"
            aria-label="Luxury Parfum — Inicio"
          >
            <span className="brand-serif text-2xl sm:text-[1.7rem] tracking-tight font-semibold">
              Luxury
            </span>
            <span className="brand-serif text-[0.62rem] sm:text-[0.7rem] tracking-[0.32em] uppercase -mt-0.5 text-accent/90 font-semibold">
              Parfum
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hidden md:flex items-center gap-9">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="brand-serif text-[0.98rem] font-medium text-foreground/80 hover:text-accent transition-colors"
                activeProps={{ className: "brand-serif text-[0.98rem] font-semibold text-accent" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* MOBILE TOGGLE */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden p-2 -mr-2 text-foreground hover:text-accent transition-colors relative z-[60]"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            {open ? <X size={26} strokeWidth={1.6} /> : <Menu size={26} strokeWidth={1.6} />}
          </button>
        </div>
      </header>

      {/* MOBILE FULL-SCREEN MENU — fondo SÓLIDO, totalmente opaco, sin contenido detrás */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-[55] flex flex-col"
          role="dialog"
          aria-modal="true"
        >
          {/* Capa sólida noir + degradé azul muy sutil — bloquea totalmente el fondo */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, oklch(0.07 0.005 240) 0%, oklch(0.10 0.025 235) 60%, oklch(0.07 0.005 240) 100%)",
            }}
          />
          {/* Filete dorado superior */}
          <span className="absolute top-16 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

          <div className="relative flex flex-col h-full pt-20 pb-10 px-7 overflow-y-auto">
            <p className="eyebrow text-[0.6rem] text-accent/85 fade-in">Navegación</p>

            <nav className="mt-6 flex flex-col">
              {links.map((l, i) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setOpen(false)}
                  className="brand-serif text-[1.65rem] font-semibold py-5 text-foreground border-b border-border/30 fade-up flex items-center justify-between group"
                  style={{ animationDelay: `${i * 60}ms` }}
                  activeProps={{
                    className:
                      "brand-serif text-[1.65rem] font-semibold py-5 text-accent border-b border-accent/40 fade-up flex items-center justify-between group",
                  }}
                  activeOptions={{ exact: l.to === "/" }}
                >
                  <span>{l.label}</span>
                  <span className="text-accent/40 group-hover:text-accent transition-colors text-xl">
                    →
                  </span>
                </Link>
              ))}
            </nav>

            {/* Bloque WhatsApp dentro del menú */}
            <div className="mt-auto pt-10">
              <p className="eyebrow text-[0.6rem] text-foreground/50">
                Asesoramiento premium
              </p>
              <p className="brand-serif mt-3 text-foreground/80 text-base leading-relaxed font-medium">
                Te ayudamos a encontrar tu fragancia ideal por WhatsApp.
              </p>
              <a
                href={whatsappGeneralLink()}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="btn-luxury mt-5 inline-flex w-full items-center justify-center px-8 py-4 bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-500"
              >
                Hablar por WhatsApp
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
