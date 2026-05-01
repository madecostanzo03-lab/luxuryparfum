import { createFileRoute } from "@tanstack/react-router";
import { whatsappGeneralLink } from "@/lib/whatsapp";
import heroImg from "@/assets/hero-perfume.jpg";

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
    <div className="relative min-h-screen -mt-16 sm:-mt-20">
      {/* Imagen de fondo fija para acompañar el copy */}
      <div className="fixed inset-0 -z-10">
        <img
          src={heroImg}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-noir/80" />
        <div className="absolute inset-0 bg-gradient-to-b from-noir/60 via-noir/70 to-noir" />
      </div>

      <div className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <header className="text-center mb-16">
          <p className="eyebrow text-accent/85">Filosofía</p>
          <h1 className="mt-6 text-5xl md:text-6xl font-serif leading-tight">
            Una elección, <em className="text-accent">una identidad</em>.
          </h1>
        </header>

        {/* Panel oscuro semitransparente sobre la imagen */}
        <div className="bg-background/70 backdrop-blur-md border border-border/30 p-8 sm:p-14 space-y-12 text-lg leading-relaxed text-foreground/85">
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

        <div className="mt-14 text-center">
          <a
            href={whatsappGeneralLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-4 bg-accent text-accent-foreground eyebrow hover:bg-accent/90 transition-all duration-500"
          >
            Conversemos
          </a>
        </div>
      </div>
    </div>
  );
}
