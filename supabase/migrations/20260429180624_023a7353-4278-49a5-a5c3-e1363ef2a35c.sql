-- Tabla para tracking de imágenes manuales pendientes (los 8 que no se pudieron descargar)
CREATE TABLE public.pending_manual_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'manual_needed'
    CHECK (status IN ('manual_needed', 'fallback_ok', 'priority_pending')),
  notes TEXT,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_pending_manual_images_status ON public.pending_manual_images(status);

ALTER TABLE public.pending_manual_images ENABLE ROW LEVEL SECURITY;

-- Mismas políticas que clean_image_import_queue / price_review_queue: solo admin
CREATE POLICY "Admins can view pending manual images"
  ON public.pending_manual_images
  FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert pending manual images"
  ON public.pending_manual_images
  FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update pending manual images"
  ON public.pending_manual_images
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para mantener updated_at
CREATE TRIGGER set_pending_manual_images_updated_at
  BEFORE UPDATE ON public.pending_manual_images
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();