import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/75 backdrop-blur-xl border-b border-border/30">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-12 h-16 sm:h-20 flex items-center justify-between">
        {/* LOGO — misma serif italic en toda la navegación */}
        <Link
          to="/"
          onClick={() => setOpen(false)}
          className="group flex flex-col leading-none"
          aria-label="Luxury Parfum — Inicio"
        >
          <span className="brand-serif text-2xl sm:text-[1.7rem] tracking-tight">
            Luxury
          </span>
          <span className="brand-serif text-[0.62rem] sm:text-[0.7rem] tracking-[0.32em] uppercase -mt-0.5 text-accent/85">
            Parfum
          </span>
        </Link>

        {/* DESKTOP NAV */}
        <nav className="hidden md:flex items-center gap-9">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="brand-serif text-[0.95rem] text-foreground/75 hover:text-accent transition-colors"
              activeProps={{ className: "brand-serif text-[0.95rem] text-accent" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* MOBILE TOGGLE */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden p-2 -mr-2 text-foreground hover:text-accent transition-colors"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
        </button>
      </div>

      {/* MOBILE FULL-SCREEN MENU — premium, sin distracciones */}
      {open && (
        <div className="md:hidden fixed inset-0 top-16 bg-background/98 backdrop-blur-2xl border-t border-border/30 fade-in">
          <nav className="flex flex-col px-7 pt-10 pb-8 gap-1">
            {links.map((l, i) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="brand-serif text-2xl py-4 text-foreground/85 border-b border-border/25 fade-up"
                style={{ animationDelay: `${i * 70}ms` }}
                activeProps={{ className: "brand-serif text-2xl py-4 text-accent border-b border-accent/40 fade-up" }}
                activeOptions={{ exact: l.to === "/" }}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="px-7 mt-6">
            <p className="eyebrow text-[0.65rem] text-foreground/50">
              Asesoramiento premium
            </p>
            <p className="brand-serif mt-2 text-foreground/70 text-base leading-relaxed">
              Te ayudamos a encontrar tu perfume ideal por WhatsApp.
            </p>
          </div>
        </div>
      )}
    </header>
  );
}
