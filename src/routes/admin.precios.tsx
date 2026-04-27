import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, X, HelpCircle, Eye } from "lucide-react";

export const Route = createFileRoute("/admin/precios")({
  head: () => ({
    meta: [
      { title: "Revisión de precios — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPreciosPage,
});

type ReviewRow = {
  id: string;
  perfume_id: string;
  nombre_db: string;
  precio_db: number;
  nombre_pdf_candidato: string | null;
  precio_pdf: number | null;
  score: number | null;
  diferencia: number | null;
  status: string;
  notas: string | null;
};

const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmado: "Corrección aplicada",
  mantenido: "Precio actual mantenido",
  no_encontrado: "Marcado como no encontrado",
  manual: "Revisar manualmente",
};

function AdminPreciosPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"todos" | "pendiente">("pendiente");

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      const admin = (roles ?? []).some((r) => r.role === "admin");
      setIsAdmin(admin);
      if (!admin) return;
      await loadRows();
    })();
  }, []);

  const loadRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("price_review_queue")
      .select("*")
      .order("status", { ascending: true })
      .order("score", { ascending: false });
    if (error) {
      toast.error("Error cargando: " + error.message);
    } else {
      setRows((data as ReviewRow[]) ?? []);
    }
    setLoading(false);
  };

  const updateStatus = async (row: ReviewRow, status: string, applyPrice = false) => {
    setBusyId(row.id);
    try {
      if (applyPrice && row.precio_pdf != null) {
        const { error: pErr } = await supabase
          .from("perfumes")
          .update({ price: row.precio_pdf })
          .eq("id", row.perfume_id);
        if (pErr) throw pErr;
      }
      const { error } = await supabase
        .from("price_review_queue")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw error;
      toast.success(STATUS_LABELS[status] ?? "Actualizado");
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, status } : r)));
    } catch (e) {
      toast.error("Error: " + (e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  if (authed === false) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-32 text-center">
        <h1 className="text-3xl font-serif">Acceso restringido</h1>
        <p className="mt-4 text-foreground/60">Iniciá sesión como administrador.</p>
        <Link to="/login" className="mt-8 inline-block eyebrow text-accent">Ir al login</Link>
      </div>
    );
  }

  if (authed === null || (authed && isAdmin === null)) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-32 text-center">
        <Loader2 className="animate-spin mx-auto text-accent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-32 text-center">
        <h1 className="text-3xl font-serif">Sin permisos</h1>
        <p className="mt-4 text-foreground/60">Tu cuenta no tiene rol de administrador.</p>
      </div>
    );
  }

  const visible = filter === "pendiente" ? rows.filter((r) => r.status === "pendiente") : rows;
  const counts = {
    total: rows.length,
    pendiente: rows.filter((r) => r.status === "pendiente").length,
    confirmado: rows.filter((r) => r.status === "confirmado").length,
    mantenido: rows.filter((r) => r.status === "mantenido").length,
    no_encontrado: rows.filter((r) => r.status === "no_encontrado").length,
    manual: rows.filter((r) => r.status === "manual").length,
  };

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16">
      <header className="mb-10">
        <p className="eyebrow">Admin</p>
        <h1 className="mt-4 text-4xl font-serif">Revisión manual de precios</h1>
        <p className="mt-3 text-sm text-foreground/60">
          Casos dudosos detectados al comparar la base de datos contra los catálogos PDF del proveedor.
          Solo se aplica el cambio cuando confirmás explícitamente la fila.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-xs">
          <span className="px-3 py-1 border border-border">Total: {counts.total}</span>
          <span className="px-3 py-1 border border-border">Pendientes: {counts.pendiente}</span>
          <span className="px-3 py-1 border border-border">Corregidos: {counts.confirmado}</span>
          <span className="px-3 py-1 border border-border">Mantenidos: {counts.mantenido}</span>
          <span className="px-3 py-1 border border-border">No encontrados: {counts.no_encontrado}</span>
          <span className="px-3 py-1 border border-border">Manuales: {counts.manual}</span>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setFilter("pendiente")}
            className={`eyebrow text-[0.65rem] px-3 py-2 border ${filter === "pendiente" ? "border-accent text-accent" : "border-border text-foreground/60"}`}
          >
            Solo pendientes
          </button>
          <button
            onClick={() => setFilter("todos")}
            className={`eyebrow text-[0.65rem] px-3 py-2 border ${filter === "todos" ? "border-accent text-accent" : "border-border text-foreground/60"}`}
          >
            Ver todos
          </button>
        </div>
      </header>

      {loading ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-accent" /></div>
      ) : visible.length === 0 ? (
        <p className="py-20 text-center text-foreground/60 font-serif italic text-xl">
          No hay casos {filter === "pendiente" ? "pendientes" : ""}.
        </p>
      ) : (
        <div className="space-y-4">
          {visible.map((row) => {
            const diffPct = row.precio_db > 0 && row.precio_pdf != null
              ? ((row.precio_pdf - row.precio_db) / row.precio_db) * 100
              : 0;
            const isPending = row.status === "pendiente";
            return (
              <div key={row.id} className="border border-border bg-card/40 p-5">
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="eyebrow text-foreground/40 text-[0.6rem]">Producto en la base</p>
                    <p className="mt-1 text-sm font-medium">{row.nombre_db}</p>
                    <p className="mt-2 text-xs text-foreground/60">
                      Precio actual: <span className="font-mono text-foreground">USD {Number(row.precio_db).toFixed(2)}</span>
                    </p>
                  </div>
                  <div>
                    <p className="eyebrow text-foreground/40 text-[0.6rem]">Coincidencia sugerida del PDF</p>
                    <p className="mt-1 text-sm font-medium">{row.nombre_pdf_candidato ?? "—"}</p>
                    <p className="mt-2 text-xs text-foreground/60">
                      Precio PDF: <span className="font-mono text-accent">
                        {row.precio_pdf != null ? `USD ${Number(row.precio_pdf).toFixed(2)}` : "—"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-foreground/70 mb-4 pb-4 border-b border-border/40">
                  <span>Score: <span className="font-mono">{row.score?.toFixed(3) ?? "—"}</span></span>
                  <span>
                    Diferencia: <span className={`font-mono ${Math.abs(diffPct) > 20 ? "text-destructive" : ""}`}>
                      {row.diferencia != null ? `${row.diferencia > 0 ? "+" : ""}${Number(row.diferencia).toFixed(2)} (${diffPct.toFixed(1)}%)` : "—"}
                    </span>
                  </span>
                  <span>Estado: <span className="text-accent">{STATUS_LABELS[row.status] ?? row.status}</span></span>
                </div>
                {isPending ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      disabled={busyId === row.id || row.precio_pdf == null}
                      onClick={() => updateStatus(row, "confirmado", true)}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-accent text-accent-foreground eyebrow text-[0.6rem] hover:bg-accent/90 disabled:opacity-40"
                    >
                      <CheckCircle2 size={14} /> Confirmar corrección
                    </button>
                    <button
                      disabled={busyId === row.id}
                      onClick={() => updateStatus(row, "mantenido")}
                      className="inline-flex items-center gap-2 px-3 py-2 border border-border eyebrow text-[0.6rem] hover:border-accent hover:text-accent disabled:opacity-40"
                    >
                      <X size={14} /> Mantener precio actual
                    </button>
                    <button
                      disabled={busyId === row.id}
                      onClick={() => updateStatus(row, "no_encontrado")}
                      className="inline-flex items-center gap-2 px-3 py-2 border border-border eyebrow text-[0.6rem] hover:border-accent hover:text-accent disabled:opacity-40"
                    >
                      <HelpCircle size={14} /> Marcar como no encontrado
                    </button>
                    <button
                      disabled={busyId === row.id}
                      onClick={() => updateStatus(row, "manual")}
                      className="inline-flex items-center gap-2 px-3 py-2 border border-border eyebrow text-[0.6rem] hover:border-accent hover:text-accent disabled:opacity-40"
                    >
                      <Eye size={14} /> Revisar manualmente
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={busyId === row.id}
                    onClick={() => updateStatus(row, "pendiente")}
                    className="text-xs text-foreground/50 hover:text-accent transition-colors"
                  >
                    Reabrir caso
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
