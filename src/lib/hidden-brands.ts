// Marcas temporalmente ocultas del catálogo público.
// Los registros NO se eliminan de la base — solo se filtran del render.
// Para reactivar una marca, removela de este array.
export const HIDDEN_BRAND_SLUGS: readonly string[] = [
  "adyan",
  "afnan",
  "ajmal",
  "al-haramain",
  "al-wataniah",
  "armaf",
  "arqus",
  "avar",
  "bespoke",
  "boulevard",
  "dar-el-ward",
  "emperor",
  "french-avenue",
  "hamidi",
  "jack-hope",
  "jo-milano",
  "lattafa",
  "lovali",
  "maison-alhambra",
  "maison-de-milan",
  "mawwal",
  "mirada",
  "nasma",
  "prime-collection",
  "rasasi",
  "reyane-tradition",
  "riiffs",
  "risala",
  "smart-collection",
];

export const HIDDEN_BRAND_SLUG_SET = new Set(HIDDEN_BRAND_SLUGS);
