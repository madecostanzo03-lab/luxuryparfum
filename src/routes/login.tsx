import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Acceso — Luxury Parfum" },
      { name: "description", content: "Acceso reservado para administración." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoginPage,
});

const credentialsSchema = z.object({
  email: z.string().trim().email("Email inválido").max(254),
  password: z.string().min(6, "Mínimo 6 caracteres").max(128),
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  // If already logged in, route based on role
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await routeByRole(session.user.id);
      }
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const routeByRole = async (userId: string) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (isAdmin) {
      navigate({ to: "/admin/precios" });
    } else {
      navigate({ to: "/" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);

    if (error || !data.session) {
      toast.error(error?.message === "Invalid login credentials"
        ? "Email o contraseña incorrectos."
        : (error?.message ?? "No pudimos iniciar sesión."));
      return;
    }
    toast.success("Bienvenido.");
    await routeByRole(data.session.user.id);
  };

  if (checking) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md text-center">
        <p className="eyebrow">Acceso reservado</p>
        <h1 className="mt-6 text-4xl md:text-5xl font-serif leading-tight">
          Panel<br /><em className="text-accent">de administración</em>
        </h1>

        <span className="divider-gold inline-block mt-10" />

        <form onSubmit={handleSubmit} className="mt-12 space-y-4">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-input/40 border border-border px-4 py-4 text-center text-sm tracking-wider placeholder:text-foreground/40 focus:outline-none focus:border-accent transition-colors"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-input/40 border border-border px-4 py-4 text-center text-sm tracking-wider placeholder:text-foreground/40 focus:outline-none focus:border-accent transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full px-8 py-4 border border-accent text-accent eyebrow hover:bg-accent hover:text-accent-foreground transition-all duration-500 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Ingresando...</> : "Ingresar"}
          </button>
          <p className="text-xs text-foreground/50 leading-relaxed pt-4">
            Si no tenés cuenta de administrador, no podrás acceder al panel.
          </p>
        </form>
      </div>
    </div>
  );
}
