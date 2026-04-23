
-- Marcas
CREATE TABLE public.brands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfumes
CREATE TYPE public.gender_type AS ENUM ('hombre', 'mujer', 'unisex');
CREATE TYPE public.fragrance_type AS ENUM ('fresco', 'dulce', 'amaderado', 'intenso');

CREATE TABLE public.perfumes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  price NUMERIC(10,2) NOT NULL,
  gender public.gender_type NOT NULL,
  fragrance_type public.fragrance_type NOT NULL,
  notes TEXT,
  description TEXT,
  image_url TEXT,
  in_stock BOOLEAN NOT NULL DEFAULT true,
  is_recommended BOOLEAN NOT NULL DEFAULT false,
  is_bestseller BOOLEAN NOT NULL DEFAULT false,
  promotion_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_perfumes_brand ON public.perfumes(brand_id);
CREATE INDEX idx_perfumes_in_stock ON public.perfumes(in_stock);

-- Leads (emails captados)
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Lectura pública del catálogo
CREATE POLICY "Brands are viewable by everyone" ON public.brands FOR SELECT USING (true);
CREATE POLICY "In-stock perfumes are viewable by everyone" ON public.perfumes FOR SELECT USING (in_stock = true);

-- Leads: cualquiera puede insertar su email
CREATE POLICY "Anyone can submit a lead" ON public.leads FOR INSERT WITH CHECK (true);

-- Seed data
INSERT INTO public.brands (name, slug, description) VALUES
  ('Maison Noir', 'maison-noir', 'Perfumería de autor parisina, fundada en la tradición del lujo discreto.'),
  ('Aurum', 'aurum', 'Fragancias amaderadas inspiradas en paisajes mediterráneos.'),
  ('Sève', 'seve', 'Composiciones frescas con ingredientes botánicos raros.'),
  ('Velour', 'velour', 'Esencias intensas, sensuales, atemporales.'),
  ('Lumière de Nuit', 'lumiere-de-nuit', 'Edición nocturna, fragancias para la noche eterna.');

INSERT INTO public.perfumes (name, brand_id, price, gender, fragrance_type, notes, description, is_recommended, is_bestseller) VALUES
  ('Nuit Éternelle', (SELECT id FROM public.brands WHERE slug='maison-noir'), 285.00, 'unisex', 'intenso', 'Oud, ámbar negro, vainilla bourbon', 'Una composición que evoca el silencio de la noche y la calidez del fuego.', true, true),
  ('Bois Sauvage', (SELECT id FROM public.brands WHERE slug='aurum'), 240.00, 'hombre', 'amaderado', 'Cedro, vetiver, cuero', 'Maderas nobles que despiertan el instinto.', true, false),
  ('Rosée du Matin', (SELECT id FROM public.brands WHERE slug='seve'), 195.00, 'mujer', 'fresco', 'Bergamota, jazmín blanco, almizcle', 'La frescura del amanecer capturada en un frasco.', false, true),
  ('Velours Rouge', (SELECT id FROM public.brands WHERE slug='velour'), 320.00, 'mujer', 'intenso', 'Rosa de Damasco, oud, pachulí', 'Sensualidad envuelta en terciopelo.', true, true),
  ('Aqua Profonda', (SELECT id FROM public.brands WHERE slug='seve'), 210.00, 'hombre', 'fresco', 'Sal marina, neroli, ámbar gris', 'El océano destilado en su forma más pura.', false, false),
  ('Minuit Bleu', (SELECT id FROM public.brands WHERE slug='lumiere-de-nuit'), 295.00, 'unisex', 'intenso', 'Iris negro, incienso, cuero ahumado', 'Para quienes habitan la medianoche.', true, false),
  ('Miel Doré', (SELECT id FROM public.brands WHERE slug='aurum'), 220.00, 'mujer', 'dulce', 'Miel, tonka, sándalo', 'Dulzura dorada que persiste en la piel.', false, true),
  ('Cuir Noir', (SELECT id FROM public.brands WHERE slug='maison-noir'), 310.00, 'hombre', 'amaderado', 'Cuero negro, tabaco, mirra', 'La elegancia del cuero crudo.', false, false);
