export type Gender = "hombre" | "mujer" | "unisex";
export type FragranceType = "fresco" | "dulce" | "amaderado" | "intenso";
export type Concentration = "edt" | "edp" | "edc" | "parfum" | "extrait";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
  brand_tier?: number;
}

export interface PerfumeVariant {
  id: string;
  perfume_id: string;
  concentration: Concentration | null;
  size_ml: number | null;
  price: number;
  in_stock: boolean;
}

export interface Perfume {
  id: string;
  name: string;
  base_name: string | null;
  brand_id: string;
  price: number; // minimum variant price ("desde")
  gender: Gender;
  fragrance_type: FragranceType | null;
  concentration: Concentration | null;
  size_ml: number | null;
  notes: string | null;
  description: string | null;
  image_url: string | null;
  clean_image_url: string | null;
  in_stock: boolean;
  is_recommended: boolean;
  is_bestseller: boolean;
  promotion_text: string | null;
  brand?: Brand;
  variants?: PerfumeVariant[];
}
