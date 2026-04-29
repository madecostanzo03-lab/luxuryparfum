import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const PENDING_BUCKET = "clean-images-pending";
const FINAL_BUCKET = "clean-images";

/**
 * Verifica que el access token pertenezca a un usuario con rol admin.
 * Retorna el userId verificado.
 */
async function verifyAdmin(accessToken: string): Promise<string> {
  if (!accessToken) throw new Error("Missing access token");
  const { data: userData, error: uErr } = await supabaseAdmin.auth.getUser(accessToken);
  if (uErr || !userData?.user) {
    throw new Error("Invalid session");
  }
  const userId = userData.user.id;
  const { data: roles, error: rErr } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  if (rErr) throw new Error(`Role lookup failed: ${rErr.message}`);
  const isAdmin = (roles ?? []).some((r: { role: string }) => r.role === "admin");
  if (!isAdmin) throw new Error("Forbidden: admin role required");
  return userId;
}

/**
 * Confirma un match: mueve la imagen de clean-images-pending a
 * clean-images/{product_id}.png, actualiza perfumes.clean_image_url y
 * marca la fila de la cola como confirmed.
 *
 * NO toca image_url. NO afecta otros campos del perfume.
 */
export const confirmCleanImageMatch = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        accessToken: z.string().min(10),
        queueId: z.string().uuid(),
        perfumeId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await verifyAdmin(data.accessToken);

    // 1. Cargar fila de cola
    const { data: row, error: rowErr } = await supabaseAdmin
      .from("clean_image_import_queue")
      .select("id, pending_path, status")
      .eq("id", data.queueId)
      .single();
    if (rowErr || !row) throw new Error("Queue row not found");
    if (row.status === "confirmed") {
      throw new Error("Esta imagen ya fue confirmada");
    }

    // 2. Validar que el perfume existe
    const { data: perfume, error: pErr } = await supabaseAdmin
      .from("perfumes")
      .select("id")
      .eq("id", data.perfumeId)
      .single();
    if (pErr || !perfume) throw new Error("Perfume no encontrado");

    // 3. Descargar bytes desde pending
    const { data: blob, error: dlErr } = await supabaseAdmin.storage
      .from(PENDING_BUCKET)
      .download(row.pending_path);
    if (dlErr || !blob) throw new Error(`Download failed: ${dlErr?.message}`);
    const bytes = new Uint8Array(await blob.arrayBuffer());

    // 4. Subir a bucket final como {perfumeId}.png (upsert)
    const finalPath = `${data.perfumeId}.png`;
    const { error: upErr } = await supabaseAdmin.storage
      .from(FINAL_BUCKET)
      .upload(finalPath, bytes, {
        contentType: "image/png",
        upsert: true,
      });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    // 5. URL pública con cache-buster
    const { data: pub } = supabaseAdmin.storage
      .from(FINAL_BUCKET)
      .getPublicUrl(finalPath);
    const publicUrl = `${pub.publicUrl}?v=${Date.now()}`;

    // 6. Actualizar perfumes.clean_image_url (NO toca image_url)
    const { error: updErr } = await supabaseAdmin
      .from("perfumes")
      .update({ clean_image_url: publicUrl })
      .eq("id", data.perfumeId);
    if (updErr) throw new Error(`Perfume update failed: ${updErr.message}`);

    // 7. Marcar cola como confirmed + borrar pending
    const { error: qErr } = await supabaseAdmin
      .from("clean_image_import_queue")
      .update({
        status: "confirmed",
        assigned_perfume_id: data.perfumeId,
        confirmed_by: userId,
        confirmed_at: new Date().toISOString(),
      })
      .eq("id", data.queueId);
    if (qErr) throw new Error(`Queue update failed: ${qErr.message}`);

    await supabaseAdmin.storage.from(PENDING_BUCKET).remove([row.pending_path]);

    return { ok: true, finalPath, publicUrl };
  });

/**
 * Marca una imagen como saltada (no se aplica al catálogo).
 */
export const skipCleanImage = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        accessToken: z.string().min(10),
        queueId: z.string().uuid(),
        reason: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const userId = await verifyAdmin(data.accessToken);
    const { error } = await supabaseAdmin
      .from("clean_image_import_queue")
      .update({
        status: "skipped",
        confirmed_by: userId,
        confirmed_at: new Date().toISOString(),
        notes: data.reason ?? null,
      })
      .eq("id", data.queueId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Devuelve un signed URL temporal para previsualizar una imagen pendiente
 * (el bucket es privado).
 */
export const getPendingImageUrl = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        accessToken: z.string().min(10),
        pendingPath: z.string().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await verifyAdmin(data.accessToken);
    const { data: signed, error } = await supabaseAdmin.storage
      .from(PENDING_BUCKET)
      .createSignedUrl(data.pendingPath, 60 * 60); // 1h
    if (error || !signed) throw new Error(error?.message ?? "Sign failed");
    return { url: signed.signedUrl };
  });
