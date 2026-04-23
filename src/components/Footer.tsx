import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="border-t border-border/30 mt-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 grid md:grid-cols-3 gap-10">
        <div>
          <div className="font-serif italic text-3xl">Luxury Parfum</div>
          <p className="mt-4 text-sm text-muted-foreground max-w-xs leading-relaxed">
            Cada fragancia define un momento. Y cada momento requiere una elección.
          </p>
        </div>

        <div>
          <p className="eyebrow mb-5">Navegación</p>
          <ul className="space-y-3 text-sm text-foreground/70">
            <li><Link to="/catalogo" className="hover:text-accent transition-colors">Catálogo</Link></li>
            <li><Link to="/marcas" className="hover:text-accent transition-colors">Marcas</Link></li>
            <li><Link to="/sobre-nosotros" className="hover:text-accent transition-colors">Filosofía</Link></li>
            <li><Link to="/login" className="hover:text-accent transition-colors">Acceso</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-5">Asesoramiento</p>
          <p className="text-sm text-foreground/70 leading-relaxed">
            Te acompañamos a descubrir la fragancia que define tu identidad.
            Conversemos.
          </p>
        </div>
      </div>

      <div className="border-t border-border/30 py-6 text-center">
        <p className="eyebrow text-foreground/40 text-[0.6rem]">
          © {new Date().getFullYear()} Luxury Parfum — Todos los derechos reservados
        </p>
      </div>
    </footer>
  );
}
