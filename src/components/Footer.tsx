import { Link } from "@tanstack/react-router";
import { Instagram, Mail } from "lucide-react";
import { WHATSAPP_NUMBER, whatsappGeneralLink } from "@/lib/whatsapp";

const INSTAGRAM_USER = "parfumluxury.1";
const CONTACT_EMAIL = "parfumluxury111@gmail.com";

// Ícono de WhatsApp inline (lucide no incluye uno oficial estable)
function WhatsAppIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.198-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.15-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.611-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-border/30 mt-32">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 grid md:grid-cols-3 gap-10">
        <div>
          <div className="font-serif italic text-3xl">Luxury Parfum</div>
          <p className="mt-4 text-sm text-muted-foreground max-w-xs leading-relaxed">
            Cada fragancia define un momento. Y cada momento requiere una elección.
          </p>

          {/* Redes sociales */}
          <div className="mt-6 flex items-center gap-3">
            <a
              href={`https://instagram.com/${INSTAGRAM_USER}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram Luxury Parfum"
              className="w-10 h-10 inline-flex items-center justify-center border border-border/60 text-foreground/70 hover:text-accent hover:border-accent transition-colors"
            >
              <Instagram size={16} strokeWidth={1.6} />
            </a>
            <a
              href={whatsappGeneralLink()}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp Luxury Parfum"
              className="w-10 h-10 inline-flex items-center justify-center border border-border/60 text-foreground/70 hover:text-accent hover:border-accent transition-colors"
            >
              <WhatsAppIcon className="w-4 h-4" />
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              aria-label="Email Luxury Parfum"
              className="w-10 h-10 inline-flex items-center justify-center border border-border/60 text-foreground/70 hover:text-accent hover:border-accent transition-colors"
            >
              <Mail size={16} strokeWidth={1.6} />
            </a>
          </div>
        </div>

        <div>
          <p className="eyebrow mb-5">Navegación</p>
          <ul className="space-y-3 text-sm text-foreground/70">
            <li><Link to="/catalogo" search={{ marca: "", genero: "", tipo: "", q: "", max: 500, p: "", v: "", destacado: "" }} className="hover:text-accent transition-colors">Catálogo</Link></li>
            <li><Link to="/marcas" className="hover:text-accent transition-colors">Marcas</Link></li>
            <li><Link to="/sobre-nosotros" className="hover:text-accent transition-colors">Filosofía</Link></li>
            <li><Link to="/envios-devoluciones" className="hover:text-accent transition-colors">Política de envíos y devoluciones</Link></li>
          </ul>
        </div>

        <div>
          <p className="eyebrow mb-5">Contacto</p>
          <ul className="space-y-3 text-sm text-foreground/70">
            <li>
              <a
                href={whatsappGeneralLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                WhatsApp +54 9 221 571-6077
              </a>
            </li>
            <li>
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-accent transition-colors break-all">
                {CONTACT_EMAIL}
              </a>
            </li>
            <li>
              <a
                href={`https://instagram.com/${INSTAGRAM_USER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
              >
                @{INSTAGRAM_USER}
              </a>
            </li>
          </ul>
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

// Re-export para evitar warning de import sin uso si en el futuro lo querés mostrar literal
export const _wa = WHATSAPP_NUMBER;
