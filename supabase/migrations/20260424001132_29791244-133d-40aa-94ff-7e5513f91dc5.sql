-- Variants table: one row per presentation (size + concentration) of a perfume
CREATE TABLE public.perfume_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  perfume_id UUID NOT NULL REFERENCES public.perfumes(id) ON DELETE CASCADE,
  concentration concentration_type,
  size_ml INTEGER,
  price NUMERIC NOT NULL,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (perfume_id, concentration, size_ml)
);

CREATE INDEX idx_perfume_variants_perfume_id ON public.perfume_variants(perfume_id);

ALTER TABLE public.perfume_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variants are viewable by everyone"
  ON public.perfume_variants FOR SELECT
  TO public
  USING (true);

-- Add base_name to perfumes (clean name without concentration/size)
ALTER TABLE public.perfumes
  ADD COLUMN base_name TEXT;