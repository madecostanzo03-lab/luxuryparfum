import { Link } from "@tanstack/react-router";
import { useState } from "react";
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/70 backdrop-blur-xl border-b border-border/30">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-20 flex items-center justify-between">
        <Link to="/" className="group flex flex-col leading-none">
          <span className="font-serif italic text-2xl tracking-wide">Luxury</span>
          <span className="eyebrow text-[0.55rem] -mt-1">Parfum</span>
        </Link>

        <nav className="hidden md:flex items-center gap-10">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="eyebrow text-foreground/70 hover:text-accent transition-colors"
              activeProps={{ className: "eyebrow text-accent" }}
              activeOptions={{ exact: l.to === "/" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <button
          onClick={() => setOpen(!open)}
          className="md:hidden text-foreground"
          aria-label="Menú"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/30 bg-background/95 backdrop-blur-xl">
          <nav className="flex flex-col px-6 py-6 gap-5">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="eyebrow text-foreground/80"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
