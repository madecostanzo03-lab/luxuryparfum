import { createFileRoute } from "@tanstack/react-router";
import { whatsappGeneralLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/revendedores")({
  head: () => ({
    meta: [
      { title: "Revendedores — Luxury Parfum" },
      { name: "description", content: "Catálogo mayorista exclusivo para revendedores de perfumes originales." },
    ],
  }),
  component: RevendedoresPage,
});

function RevendedoresPage() {
  const whatsappLink = whatsappGeneralLink(
    "Hola, me interesa información sobre el catálogo mayorista para revendedores."
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-32">
      <div className="max-w-xl w-full text-center">
        <p className="eyebrow text-accent">Para revendedores</p>

        <h1 className="mt-6 text-4xl md:text-5xl font-serif leading-tight">
          ¿Sos revendedor?{" "}
          <span className="text-accent italic">Tenemos un catálogo mayorista</span>{" "}
          exclusivo para vos.
        </h1>

        <p className="mt-6 text-foreground/60 text-sm leading-relaxed max-w-sm mx-auto">
          Accedé a precios especiales, márgenes reales y productos originales garantizados.
          Escribinos por WhatsApp y te enviamos el catálogo mayorista en privado.
        </p>

        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-10 inline-flex items-center justify-center gap-3 px-10 py-4 bg-accent text-accent-foreground hover:bg-accent/90 transition-all duration-300 eyebrow text-sm tracking-widest"
        >
          Solicitar catálogo mayorista
        </a>
      </div>
    </div>
  );
}
