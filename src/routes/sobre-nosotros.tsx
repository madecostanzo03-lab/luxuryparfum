import { createFileRoute } from "@tanstack/react-router";
import { whatsappGeneralLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/sobre-nosotros")({
  head: () => ({
    meta: [
      { title: "Filosofía — Luxury Parfum" },
      { name: "description", content: "Nuestra filosofía: guiar a cada cliente para encontrar su fragancia ideal." },
      { property: "og:title", content: "Filosofía — Luxury Parfum" },
      { property: "og:description", content: "Guiar a cada cliente para encontrar su fragancia ideal." },
    ],
  }),
  component: SobrePage,
});

function SobrePage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-24">
      <header className="text-center mb-20">
        <p className="eyebrow">Filosofía</p>
        <h1 className="mt-6 text-5xl md:text-6xl font-serif leading-tight">
          Una elección, <em className="text-accent">una identidad</em>.
        </h1>
      </header>

      <div className="space-y-12 text-lg leading-relaxed text-foreground/80">
        <p className="font-serif italic text-2xl text-center text-foreground">
          "Cada fragancia define un momento. Y cada momento requiere una elección."
        </p>

        <span className="divider-gold block mx-auto" />

        <div>
          <p className="eyebrow text-accent mb-4">Filosofía</p>
          <p>
            En Luxury Parfum creemos que el perfume no es un accesorio, sino
            una declaración. Cada frasco que ofrecemos es seleccionado por su
            carácter, su historia y su capacidad de transformar un instante
            en memoria.
          </p>
        </div>

        <div>
          <p className="eyebrow text-accent mb-4">El diferencial</p>
          <p>
            No vendemos perfumes: te acompañamos en la búsqueda de la
            fragancia que te define. Conversamos, escuchamos, entendemos
            tu rutina y tus recuerdos. Solo entonces sugerimos.
          </p>
          <p className="mt-4">
            Es asesoramiento personalizado, no transacción.
          </p>
        </div>

        <div>
          <p className="eyebrow text-accent mb-4">Nuestro lema</p>
          <p className="font-serif italic text-2xl text-foreground">
            Una piel. Una historia. Una fragancia.
          </p>
        </div>
      </div>

      <div className="mt-20 text-center">
        <a
          href={whatsappGeneralLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-10 py-4 border border-accent text-accent eyebrow hover:bg-accent hover:text-accent-foreground transition-all duration-500"
        >
          Conversemos
        </a>
      </div>
    </div>
  );
}
