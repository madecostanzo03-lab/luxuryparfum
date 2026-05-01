import { createFileRoute, Link } from "@tanstack/react-router";
import { whatsappGeneralLink } from "@/lib/whatsapp";

export const Route = createFileRoute("/envios-devoluciones")({
  head: () => ({
    meta: [
      { title: "Envíos y devoluciones — Luxury Parfum" },
      { name: "description", content: "Política de envíos a todo el país y proceso de cambios y devoluciones." },
      { property: "og:title", content: "Envíos y devoluciones — Luxury Parfum" },
      { property: "og:description", content: "Cómo enviamos, cuánto tarda y cómo gestionar un cambio." },
    ],
  }),
  component: EnviosPage,
});

function EnviosPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-24">
      <header className="text-center mb-16">
        <p className="eyebrow">Logística</p>
        <h1 className="mt-6 text-5xl md:text-6xl font-serif leading-tight">
          Envíos y <em className="text-accent">devoluciones</em>
        </h1>
        <p className="mt-6 text-foreground/60">
          Trabajamos para que la experiencia, antes y después de la compra, esté a la altura del producto.
        </p>
      </header>

      <div className="space-y-10 text-foreground/80 leading-relaxed">
        <section>
          <p className="eyebrow text-accent mb-3">Envíos</p>
          <p>
            Realizamos envíos a todo el país. Una vez confirmado tu pedido, coordinamos
            por WhatsApp el método más conveniente según tu ubicación: Correo Argentino,
            punto de retiro o envío coordinado por nosotros en La Plata.
          </p>
          <p className="mt-4">
            Trabajamos con perfumes importados y proveedores del exterior, por lo que
            los tiempos de entrega pueden variar según disponibilidad y logística. El
            plazo estimado es a partir de 7 días hábiles, pudiendo extenderse en envíos
            al interior del país.
          </p>
        </section>

        <section>
          <p className="eyebrow text-accent mb-3">Cambios y devoluciones</p>
          <p>
            Si recibís un producto que no coincide con lo solicitado o presenta algún
            defecto de fábrica, tenés 7 días desde la recepción para informarlo.
            Evaluamos cada caso y coordinamos el reemplazo o la devolución
            correspondiente.
          </p>
          <p className="mt-4">
            Por tratarse de artículos de perfumería, no aceptamos cambios ni devoluciones
            de productos abiertos o utilizados, salvo defecto comprobable.
          </p>
        </section>

        <section>
          <p className="eyebrow text-accent mb-3">Garantía de originalidad</p>
          <p>
            Todos nuestros perfumes son 100% originales. Trabajamos con proveedores
            seleccionados y canales de importación confiables para ofrecer productos
            auténticos y cuidadosamente elegidos.
          </p>
          <p className="mt-4">
            Si tenés dudas sobre un producto, una fragancia o una presentación,
            escribinos por WhatsApp y te asesoramos personalmente.
          </p>
        </section>
      </div>

      <div className="mt-16 text-center flex flex-col sm:flex-row items-center justify-center gap-4">
        <a
          href={whatsappGeneralLink()}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-10 py-4 bg-accent text-accent-foreground eyebrow hover:bg-accent/90 transition-all duration-500"
        >
          Consultar por WhatsApp
        </a>
        <Link
          to="/catalogo"
          search={{ marca: "", genero: "", tipo: "", q: "", max: 500, p: "", v: "", destacado: "" }}
          className="brand-serif text-[0.95rem] text-foreground/70 hover:text-accent transition-colors"
        >
          Ver catálogo →
        </Link>
      </div>
    </div>
  );
}
