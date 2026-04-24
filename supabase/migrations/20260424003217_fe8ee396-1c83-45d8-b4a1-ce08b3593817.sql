ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS brand_tier INTEGER NOT NULL DEFAULT 4;
CREATE INDEX IF NOT EXISTS idx_brands_tier ON public.brands(brand_tier);
CREATE INDEX IF NOT EXISTS idx_perfumes_brand_id ON public.perfumes(brand_id);