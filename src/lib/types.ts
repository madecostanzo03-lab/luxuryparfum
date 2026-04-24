export type Gender = "hombre" | "mujer" | "unisex";
export type FragranceType = "fresco" | "dulce" | "amaderado" | "intenso";
export type Concentration = "edt" | "edp" | "edc" | "parfum" | "extrait";

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  description: string | null;
}

export interface Perfume {
  id: string;
  name: string;
  brand_id: string;
  price: number;
  gender: Gender;
  fragrance_type: FragranceType | null;
  concentration: Concentration | null;
  size_ml: number | null;
  notes: string | null;
  description: string | null;
  image_url: string | null;
  in_stock: boolean;
  is_recommended: boolean;
  is_bestseller: boolean;
  promotion_text: string | null;
  brand?: Brand;
}
