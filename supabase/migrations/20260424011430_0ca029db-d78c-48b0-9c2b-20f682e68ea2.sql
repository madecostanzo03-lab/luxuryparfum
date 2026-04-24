
-- Auto-clasificar fragrance_type desde notas + nombre
UPDATE public.perfumes
SET fragrance_type = CASE
  -- INTENSO: oud, tabaco, cuero, especias intensas
  WHEN (
    lower(coalesce(notes,'') || ' ' || name) ~ '(oud|tabaco|tobacco|cuero|leather|incienso|incense|azafr[áa]n|saffron|whisky|whiskey|ron|rum|absoluto|extrait|intense)'
  ) THEN 'intenso'::fragrance_type
  -- AMADERADO: maderas, sándalo, cedro, vetiver, pachulí
  WHEN (
    lower(coalesce(notes,'') || ' ' || name) ~ '(s[áa]ndalo|sandalwood|cedro|cedar|vetiver|pachul[íi]|patchouli|madera|wood|guaiac|palo santo)'
  ) THEN 'amaderado'::fragrance_type
  -- DULCE: vainilla, caramelo, frutos rojos, gourmand, miel, chocolate
  WHEN (
    lower(coalesce(notes,'') || ' ' || name) ~ '(vainilla|vanilla|caramelo|caramel|miel|honey|chocolate|gourmand|az[úu]car|sugar|fresa|strawberry|frutos rojos|cereza|cherry|durazno|peach|coco|coconut|praliné|praline|tonka|dulce|candy|fantasy)'
  ) THEN 'dulce'::fragrance_type
  -- FRESCO: cítricos, acuáticos, verde, menta, marino
  WHEN (
    lower(coalesce(notes,'') || ' ' || name) ~ '(c[íi]trico|citrus|bergamota|bergamot|lim[óo]n|lemon|naranja|orange|pomelo|mandarina|mint|menta|acu[áa]tico|aqua|marino|marine|fresco|fresh|verde|green|hierba|grass|albahaca|basil|cool|sport|aqua|ozonic)'
  ) THEN 'fresco'::fragrance_type
  -- FALLBACK: si tiene flores → dulce, si no → amaderado
  WHEN lower(coalesce(notes,'') || ' ' || name) ~ '(rosa|rose|jazm[íi]n|jasmine|peon[íi]a|peony|lirio|lily|magnolia|tuberosa|floral|flores)' THEN 'dulce'::fragrance_type
  ELSE 'amaderado'::fragrance_type
END
WHERE fragrance_type IS NULL;
