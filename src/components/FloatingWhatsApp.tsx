import { whatsappGeneralLink } from "@/lib/whatsapp";

/**
 * Botón flotante de WhatsApp visible en todo el sitio.
 * Verde oficial WhatsApp (#25D366) con tooltip en hover.
 */
export function FloatingWhatsApp() {

  return (
    <a
      href={whatsappGeneralLink()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Hablar por WhatsApp"
      className="fixed z-40 bottom-5 right-5 md:bottom-7 md:right-7 group flex items-center gap-3"
    >
      <span className="hidden md:inline-flex items-center px-4 py-2 bg-noir/85 backdrop-blur-sm border border-accent/30 eyebrow text-[0.55rem] text-accent shadow-[var(--shadow-elegant)] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        ¿Necesitás ayuda? Escribinos
      </span>
      <span
        className="relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full text-white shadow-[0_14px_36px_-8px_rgba(0,0,0,0.7)] hover:scale-105 transition-transform duration-500 ring-2 ring-white/20"
        style={{ backgroundColor: "#25D366" }}
      >
        <span className="absolute inset-0 rounded-full opacity-25 animate-ping" style={{ backgroundColor: "#25D366" }} />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="relative w-7 h-7 md:w-6 md:h-6"
          aria-hidden="true"
        >
          <path d="M19.05 4.91A10 10 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.91-7.02ZM12.04 20.15h-.01a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.39c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.22-8.24 8.22Zm4.51-6.16c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.13-.16.25-.64.8-.78.96-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.49-.41-.42-.56-.43-.14-.01-.31-.01-.48-.01-.16 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.57.12.17 1.74 2.66 4.22 3.73.59.25 1.05.4 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.46-.6 1.66-1.18.21-.58.21-1.07.14-1.18-.06-.11-.23-.17-.48-.29Z" />
        </svg>
      </span>
    </a>
  );
}
