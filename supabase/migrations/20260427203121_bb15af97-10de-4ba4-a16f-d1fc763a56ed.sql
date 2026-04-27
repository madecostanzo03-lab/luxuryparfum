CREATE TABLE public.price_review_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  perfume_id uuid NOT NULL,
  nombre_db text NOT NULL,
  precio_db numeric NOT NULL,
  nombre_pdf_candidato text,
  precio_pdf numeric,
  score numeric,
  diferencia numeric,
  status text NOT NULL DEFAULT 'pendiente',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.price_review_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view price review queue"
  ON public.price_review_queue FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update price review queue"
  ON public.price_review_queue FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert price review queue"
  ON public.price_review_queue FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));