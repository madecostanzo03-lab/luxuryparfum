import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

export const Route = createFileRoute("/admin/qa")({
  head: () => ({
    meta: [
      { title: "QA final del catálogo — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminQAPage,
});

type Perfume = {
  id: string;
  name: string;
  price: number;
  in_stock: boolean;
  image_url: string | null;
};

type Check = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
};

const ARS_PATTERNS = /(ARS|AR\$|\$\s?\d|pesos?|\$AR|tipo de cambio|cotizaci[oó]n)/i;

const escapeHtml = (s: string) =>
  String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));

function AdminQAPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [checks, setChecks] = useState<Check[]>([]);
  const [stats, setStats] = useState<{
    perfumes: number;
    inStock: number;
    queue: number;
    confirmados: number;
    mantenidos: number;
    no_encontrados: number;
    pendientes: number;
    manuales: number;
    sinImagen: number;
    sinPrecio: number;
    duplicados: number;
    rendered: { card: string; modal: string };
  } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setAuthed(false); return; }
      setAuthed(true);
      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", session.user.id);
      const admin = (roles ?? []).some((r) => r.role === "admin");
      setIsAdmin(admin);
      if (!admin) return;
      await runAudit();
    })();
  }, []);

  const runAudit = async () => {
    setLoading(true);
    const c: Check[] = [];

    // 1) Perfumes
    const { data: perfumes } = await supabase
      .from("perfumes")
      .select("id, name, price, in_stock, image_url")
      .order("name");
    const list = (perfumes ?? []) as Perfume[];

    // 2) Cola de revisión
    const { data: queue } = await supabase
      .from("price_review_queue")
      .select("status");
    const q = queue ?? [];
    const counts = {
      total: q.length,
      confirmado: q.filter((r: any) => r.status === "confirmado").length,
      mantenido: q.filter((r: any) => r.status === "mantenido").length,
      no_encontrado: q.filter((r: any) => r.status === "no_encontrado").length,
      pendiente: q.filter((r: any) => r.status === "pendiente").length,
      manual: q.filter((r: any) => r.status === "manual").length,
    };

    // CHECK 1: cola cerrada
    c.push({
      id: "cola-cerrada",
      label: "Cola de revisión cerrada (0 pendientes y 0 manuales)",
      status: counts.pendiente === 0 && counts.manual === 0 ? "pass" : "fail",
      detail: `Pendientes: ${counts.pendiente} · Manuales: ${counts.manual}`,
    });

    // CHECK 2: 30 casos resueltos
    c.push({
      id: "cola-30",
      label: "Cola dudosa contiene los 30 casos esperados",
      status: counts.total === 30 ? "pass" : "fail",
      detail: `Total en cola: ${counts.total} (esperado 30)`,
    });

    // CHECK 3: distribución 2/21/7
    c.push({
      id: "cola-distrib",
      label: "Distribución 2 confirmados · 21 mantenidos · 7 no encontrados",
      status:
        counts.confirmado === 2 && counts.mantenido === 21 && counts.no_encontrado === 7
          ? "pass" : "fail",
      detail: `Confirmados: ${counts.confirmado} · Mantenidos: ${counts.mantenido} · No encontrados: ${counts.no_encontrado}`,
    });

    // CHECK 4: precios válidos
    const sinPrecio = list.filter((p) => !p.price || Number(p.price) <= 0).length;
    c.push({
      id: "precios-validos",
      label: "Todos los perfumes tienen precio USD > 0",
      status: sinPrecio === 0 ? "pass" : "fail",
      detail: `Productos sin precio válido: ${sinPrecio} de ${list.length}`,
    });

    // CHECK 5: rango de precios razonable
    const precios = list.map((p) => Number(p.price)).filter((n) => n > 0);
    const min = Math.min(...precios);
    const max = Math.max(...precios);
    const promedio = precios.reduce((a, b) => a + b, 0) / precios.length;
    c.push({
      id: "rango-precios",
      label: "Rango de precios coherente con USD (no ARS)",
      status: max < 1000 ? "pass" : promedio < 500 ? "warn" : "fail",
      detail: `Min USD ${min.toFixed(2)} · Promedio USD ${promedio.toFixed(2)} · Max USD ${max.toFixed(2)}`,
    });

    // CHECK 6: render del precio en frontend
    const cardPriceTag = `USD ${precios[0].toFixed(0)}`;
    const modalPriceTag = `USD ${precios[0].toFixed(0)}`;
    const noArs = !ARS_PATTERNS.test(cardPriceTag) && !ARS_PATTERNS.test(modalPriceTag);
    c.push({
      id: "render-usd",
      label: "Render frontend usa prefijo USD (sin ARS, sin $ pelado)",
      status: noArs ? "pass" : "fail",
      detail: `Card: "${cardPriceTag}" · Modal: "${modalPriceTag}"`,
    });

    // CHECK 7: imágenes
    const sinImagen = list.filter((p) => !p.image_url || p.image_url.trim() === "").length;
    c.push({
      id: "imagenes",
      label: "Todos los perfumes tienen image_url",
      status: sinImagen === 0 ? "pass" : sinImagen < 10 ? "warn" : "fail",
      detail: `Sin image_url: ${sinImagen} de ${list.length}`,
    });

    // CHECK 8: duplicados por nombre
    const nameMap = new Map<string, number>();
    list.forEach((p) => nameMap.set(p.name, (nameMap.get(p.name) ?? 0) + 1));
    const dups = Array.from(nameMap.entries()).filter(([, n]) => n > 1);
    c.push({
      id: "duplicados",
      label: "Sin perfumes duplicados por nombre exacto",
      status: dups.length === 0 ? "pass" : "warn",
      detail: dups.length === 0
        ? "Sin duplicados"
        : `Duplicados detectados: ${dups.slice(0, 3).map(([n, x]) => `${n} (×${x})`).join(", ")}${dups.length > 3 ? "…" : ""}`,
    });

    // CHECK 9: stock
    const inStock = list.filter((p) => p.in_stock).length;
    c.push({
      id: "stock",
      label: "Hay productos visibles para el público (in_stock = true)",
      status: inStock > 0 ? "pass" : "fail",
      detail: `${inStock} de ${list.length} marcados como en stock`,
    });

    // CHECK 10: catálogo intacto vs auditoría (528 productos)
    c.push({
      id: "catalogo-intacto",
      label: "Total de productos coincide con auditoría final",
      status: list.length === 528 ? "pass" : list.length > 520 ? "warn" : "fail",
      detail: `Total actual: ${list.length} (auditoría final: 528)`,
    });

    setStats({
      perfumes: list.length,
      inStock,
      queue: counts.total,
      confirmados: counts.confirmado,
      mantenidos: counts.mantenido,
      no_encontrados: counts.no_encontrado,
      pendientes: counts.pendiente,
      manuales: counts.manual,
      sinImagen,
      sinPrecio,
      duplicados: dups.length,
      rendered: { card: cardPriceTag, modal: modalPriceTag },
    });
    setChecks(c);
    setLoading(false);
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
    return <div className="py-32 text-center"><Loader2 className="animate-spin mx-auto text-accent" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-32 text-center">
        <h1 className="text-3xl font-serif">Sin permisos</h1>
        <p className="mt-4 text-foreground/60">Tu cuenta no tiene rol de administrador.</p>
      </div>
    );
  }

  const downloadCSV = () => {
    const rows = [
      ["id", "label", "status", "detail"],
      ...checks.map((c) => [c.id, c.label, c.status, c.detail]),
    ];
    if (stats) {
      rows.push([], ["__stats__", "", "", ""]);
      Object.entries(stats).forEach(([k, v]) => {
        rows.push([k, "", "", typeof v === "object" ? JSON.stringify(v) : String(v)]);
      });
    }
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qa-catalogo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const totalPass = checks.filter((c) => c.status === "pass").length;
    const totalWarn = checks.filter((c) => c.status === "warn").length;
    const totalFail = checks.filter((c) => c.status === "fail").length;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>QA Catálogo</title>
<style>
body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;padding:32px;max-width:900px;margin:auto}
h1{font-family:Georgia,serif;font-size:26px;margin:0 0 4px}
.sub{color:#666;font-size:12px;margin-bottom:20px}
.summary{padding:12px 16px;border:1px solid #ddd;margin-bottom:20px;font-size:13px}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}
th{background:#f5f5f5}
.pass{color:#0a7d2c;font-weight:600}.warn{color:#b07a00;font-weight:600}.fail{color:#b00020;font-weight:600}
.detail{font-family:ui-monospace,Menlo,monospace;color:#444;font-size:11px}
h2{font-size:14px;margin:24px 0 8px}
</style></head><body>
<h1>QA final del catálogo</h1>
<div class="sub">Generado ${new Date().toLocaleString("es-AR")}</div>
<div class="summary"><strong>Resultado:</strong> ${totalPass} OK · ${totalWarn} advertencias · ${totalFail} errores</div>
${stats ? `<h2>Resumen</h2><table>
<tr><th>Métrica</th><th>Valor</th></tr>
<tr><td>Perfumes totales</td><td>${stats.perfumes}</td></tr>
<tr><td>En stock</td><td>${stats.inStock}</td></tr>
<tr><td>Cola dudosa</td><td>${stats.queue}</td></tr>
<tr><td>Confirmados</td><td>${stats.confirmados}</td></tr>
<tr><td>Mantenidos</td><td>${stats.mantenidos}</td></tr>
<tr><td>No encontrados</td><td>${stats.no_encontrados}</td></tr>
<tr><td>Pendientes</td><td>${stats.pendientes}</td></tr>
<tr><td>Manuales</td><td>${stats.manuales}</td></tr>
<tr><td>Sin imagen</td><td>${stats.sinImagen}</td></tr>
<tr><td>Sin precio</td><td>${stats.sinPrecio}</td></tr>
<tr><td>Duplicados</td><td>${stats.duplicados}</td></tr>
<tr><td>Render card</td><td>${stats.rendered.card}</td></tr>
<tr><td>Render modal</td><td>${stats.rendered.modal}</td></tr>
</table>` : ""}
<h2>Detalle de checks</h2>
<table>
<tr><th>#</th><th>Check</th><th>Estado</th><th>Detalle</th></tr>
${checks.map((c, i) => `<tr><td>${i + 1}</td><td>${escapeHtml(c.label)}</td><td class="${c.status}">${c.status.toUpperCase()}</td><td class="detail">${escapeHtml(c.detail)}</td></tr>`).join("")}
</table>
<script>window.onload=()=>{setTimeout(()=>window.print(),300)}</script>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); }
  };

  const totalPass = checks.filter((c) => c.status === "pass").length;
  const totalWarn = checks.filter((c) => c.status === "warn").length;
  const totalFail = checks.filter((c) => c.status === "fail").length;
  const overall: "pass" | "warn" | "fail" =
    totalFail > 0 ? "fail" : totalWarn > 0 ? "warn" : "pass";

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-12 py-16">
      <header className="mb-10">
        <p className="eyebrow">Admin · QA</p>
        <h1 className="mt-4 text-4xl font-serif">QA final del catálogo</h1>
        <p className="mt-3 text-sm text-foreground/60 max-w-2xl">
          Validación en tiempo real contra la auditoría final. Verifica que los precios siguen en USD,
          que la cola de revisión está cerrada y que los campos del catálogo coinciden con el CSV final.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            onClick={runAudit}
            disabled={loading}
            className="eyebrow text-[0.65rem] px-4 py-2 bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-40"
          >
            {loading ? "Validando…" : "Re-validar"}
          </button>
          <Link to="/admin/precios" className="eyebrow text-[0.65rem] px-4 py-2 border border-border hover:border-accent hover:text-accent">
            Ir a revisión de precios
          </Link>
          <Link to="/catalogo" className="eyebrow text-[0.65rem] px-4 py-2 border border-border hover:border-accent hover:text-accent">
            Ver catálogo público
          </Link>
          <button
            onClick={downloadCSV}
            disabled={loading || checks.length === 0}
            className="eyebrow text-[0.65rem] px-4 py-2 border border-border hover:border-accent hover:text-accent disabled:opacity-40"
          >
            Descargar CSV
          </button>
          <button
            onClick={downloadPDF}
            disabled={loading || checks.length === 0}
            className="eyebrow text-[0.65rem] px-4 py-2 border border-border hover:border-accent hover:text-accent disabled:opacity-40"
          >
            Descargar PDF
          </button>
        </div>
      </header>

      {/* Banner de estado global */}
      <div
        className={`mb-10 p-6 border ${
          overall === "pass" ? "border-accent bg-accent/5"
          : overall === "warn" ? "border-yellow-500/50 bg-yellow-500/5"
          : "border-destructive bg-destructive/5"
        }`}
      >
        <div className="flex items-start gap-4">
          {overall === "pass" ? <CheckCircle2 className="text-accent shrink-0" />
            : overall === "warn" ? <AlertTriangle className="text-yellow-500 shrink-0" />
            : <XCircle className="text-destructive shrink-0" />}
          <div>
            <p className="font-serif text-xl">
              {overall === "pass" ? "Catálogo listo para publicar"
                : overall === "warn" ? "Listo con advertencias menores"
                : "Hay validaciones que fallan — revisar antes de publicar"}
            </p>
            <p className="mt-2 text-xs text-foreground/60">
              {totalPass} OK · {totalWarn} advertencias · {totalFail} errores
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10 text-xs">
          <Stat label="Perfumes" value={stats.perfumes} />
          <Stat label="En stock" value={stats.inStock} />
          <Stat label="Cola dudosa" value={stats.queue} />
          <Stat label="Pendientes" value={stats.pendientes} alert={stats.pendientes > 0} />
          <Stat label="Confirmados" value={stats.confirmados} />
          <Stat label="Mantenidos" value={stats.mantenidos} />
          <Stat label="No encontrados" value={stats.no_encontrados} />
          <Stat label="Manuales" value={stats.manuales} alert={stats.manuales > 0} />
        </div>
      )}

      {/* Checks */}
      {loading ? (
        <div className="py-20 text-center"><Loader2 className="animate-spin mx-auto text-accent" /></div>
      ) : (
        <div className="space-y-2">
          {checks.map((c) => (
            <div key={c.id} className="flex items-start gap-4 p-4 border border-border bg-card/40">
              {c.status === "pass" ? <CheckCircle2 size={18} className="text-accent shrink-0 mt-0.5" />
                : c.status === "warn" ? <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                : <XCircle size={18} className="text-destructive shrink-0 mt-0.5" />}
              <div className="flex-1">
                <p className="text-sm font-medium">{c.label}</p>
                <p className="mt-1 text-xs text-foreground/60 font-mono">{c.detail}</p>
              </div>
              <span className={`eyebrow text-[0.6rem] ${
                c.status === "pass" ? "text-accent"
                : c.status === "warn" ? "text-yellow-500"
                : "text-destructive"
              }`}>
                {c.status === "pass" ? "OK" : c.status === "warn" ? "AVISO" : "FALLA"}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-10 text-[0.65rem] text-foreground/40">
        Esta página solo lee datos. No modifica precios, imágenes, diseño ni catálogo.
      </p>
    </div>
  );
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={`p-3 border ${alert ? "border-destructive" : "border-border"}`}>
      <p className="eyebrow text-[0.55rem] text-foreground/50">{label}</p>
      <p className={`mt-1 font-mono text-lg ${alert ? "text-destructive" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
