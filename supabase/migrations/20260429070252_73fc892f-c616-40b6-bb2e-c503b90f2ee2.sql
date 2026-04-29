-- 1. Agregar columna clean_image_url a perfumes (sin tocar image_url)
ALTER TABLE public.perfumes
  ADD COLUMN IF NOT EXISTS clean_image_url text;

-- 2. Crear tabla de cola de importación de imágenes limpias
CREATE TABLE IF NOT EXISTS public.clean_image_import_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pending_path text NOT NULL UNIQUE,            -- path en bucket clean-images-pending
  original_filename text NOT NULL,              -- nombre original del archivo dentro del ZIP
  phash text,                                   -- perceptual hash (hex 16 chars) calculado luego
  suggested_perfume_ids uuid[] NOT NULL DEFAULT '{}',  -- top-3 candidatos sugeridos por pHash
  suggestion_scores numeric[] NOT NULL DEFAULT '{}',   -- distancias (0..64) alineadas con sugeridos
  assigned_perfume_id uuid,                     -- perfume confirmado manualmente (NULL hasta confirmar)
  status text NOT NULL DEFAULT 'pending',       -- pending | confirmed | skipped
  confirmed_by uuid,                            -- auth.uid() del admin que confirmó
  confirmed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clean_image_import_queue_status_check
    CHECK (status IN ('pending', 'confirmed', 'skipped'))
);

CREATE INDEX IF NOT EXISTS idx_clean_image_queue_status
  ON public.clean_image_import_queue(status);

-- Enable RLS
ALTER TABLE public.clean_image_import_queue ENABLE ROW LEVEL SECURITY;

-- Solo admins pueden ver / insertar / actualizar la cola
CREATE POLICY "Admins can view import queue"
ON public.clean_image_import_queue
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert import queue"
ON public.clean_image_import_queue
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update import queue"
ON public.clean_image_import_queue
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger updated_at (reusa función existente si existe; si no, la creamos)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clean_image_queue_updated_at ON public.clean_image_import_queue;
CREATE TRIGGER trg_clean_image_queue_updated_at
BEFORE UPDATE ON public.clean_image_import_queue
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Crear buckets de storage
-- clean-images-pending: privado (solo admins via service role / signed URLs)
-- clean-images: público (destino final de imágenes confirmadas)
INSERT INTO storage.buckets (id, name, public)
VALUES ('clean-images-pending', 'clean-images-pending', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('clean-images', 'clean-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies storage: clean-images-pending (privado, solo admins)
CREATE POLICY "Admins can read pending images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'clean-images-pending' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can upload pending images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clean-images-pending' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete pending images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'clean-images-pending' AND has_role(auth.uid(), 'admin'::app_role));

-- Policies storage: clean-images (público lectura, admin escritura)
CREATE POLICY "Clean images are publicly readable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'clean-images');

CREATE POLICY "Admins can upload clean images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clean-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update clean images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'clean-images' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete clean images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'clean-images' AND has_role(auth.uid(), 'admin'::app_role));