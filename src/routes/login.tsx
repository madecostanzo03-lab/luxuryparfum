import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Acceso — Luxury Parfum" },
      { name: "description", content: "Accedé a recomendaciones y beneficios exclusivos." },
      { property: "og:title", content: "Acceso — Luxury Parfum" },
      { property: "og:description", content: "Accedé a recomendaciones y beneficios exclusivos." },
    ],
  }),
  component: LoginPage,
});

const emailSchema = z.string().trim().email("Email inválido").max(254);

function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("leads")
      .insert({ email: parsed.data })
      .select();

    setLoading(false);
    if (error && error.code !== "23505") {
      toast.error("No pudimos registrar tu email. Intentá nuevamente.");
      return;
    }
    setSubmitted(true);
    toast.success("Bienvenido a Luxury Parfum.");
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md text-center">
        <p className="eyebrow">Acceso reservado</p>
        <h1 className="mt-6 text-4xl md:text-5xl font-serif leading-tight">
          Recomendaciones<br /><em className="text-accent">y beneficios</em><br />exclusivos.
        </h1>

        <span className="divider-gold inline-block mt-10" />

        {submitted ? (
          <div className="mt-12 space-y-4">
            <p className="font-serif italic text-xl text-foreground">
              Gracias. Te escribiremos muy pronto.
            </p>
            <p className="text-sm text-foreground/60">
              Hemos recibido tu acceso. Pronto recibirás novedades curadas para vos.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-12 space-y-6">
            <input
              type="email"
              required
              placeholder="Tu correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-input/40 border border-border px-4 py-4 text-center text-sm tracking-wider placeholder:text-foreground/40 focus:outline-none focus:border-accent transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full px-8 py-4 border border-accent text-accent eyebrow hover:bg-accent hover:text-accent-foreground transition-all duration-500 disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Acceder"}
            </button>
            <p className="text-xs text-foreground/50 leading-relaxed">
              Sin contraseña. Solo tu email para mantener la conversación.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
