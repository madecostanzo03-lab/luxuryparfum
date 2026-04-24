// Mapa de overrides: id de perfume en Supabase -> imagen editorial premium generada localmente.
// Estas imágenes fueron producidas con AI (Nano Banana Pro) con fondo de estudio uniforme,
// iluminación cinematográfica y notas olfativas como elementos visuales.
// Cuando un perfume tiene override, se usa esta imagen en vez de la del proveedor (URL externa con fondos blancos inconsistentes).

import burberryGoddess from "@/assets/perfumes-premium/burberry-goddess.webp";
import ckOne from "@/assets/perfumes-premium/ck-one.webp";
import ch212VipBlack from "@/assets/perfumes-premium/ch-212-vip-black.webp";
import chBadBoyLeParfum from "@/assets/perfumes-premium/ch-bad-boy-le-parfum.webp";
import chGoodGirlBlush from "@/assets/perfumes-premium/ch-good-girl-blush.webp";
import chGoodGirlVery from "@/assets/perfumes-premium/ch-good-girl-very.webp";
import diorSauvageEdp from "@/assets/perfumes-premium/dior-sauvage-edp.webp";
import bossBottledNight from "@/assets/perfumes-premium/boss-bottled-night.webp";
import jpgLeMaleEdt from "@/assets/perfumes-premium/jpg-le-male-edt.webp";
import jpgLeMaleLeParfum from "@/assets/perfumes-premium/jpg-le-male-le-parfum.webp";
import jpgScandalEdt from "@/assets/perfumes-premium/jpg-scandal-edt.webp";
import jpgScandalLeParfum from "@/assets/perfumes-premium/jpg-scandal-le-parfum.webp";
import lattafaKhamrah from "@/assets/perfumes-premium/lattafa-khamrah.webp";
import lattafaYaraTous from "@/assets/perfumes-premium/lattafa-yara-tous.webp";
import paco1Million from "@/assets/perfumes-premium/paco-1-million.webp";

/**
 * Mapeo por UUID de perfume → imagen editorial premium local.
 * Si el perfume está acá, se usa esta imagen y se renderiza SIN tratamiento
 * de blend (preserveBg=true) porque ya viene perfecta del estudio.
 */
export const PREMIUM_IMAGE_OVERRIDES: Record<string, string> = {
  "d9847555-4c32-411c-b06a-3c784ccec04a": burberryGoddess, // Burberry Goddess EDP Intense
  "e8a951f7-2e3e-4e75-844d-8c18f6d63c61": ckOne, // CK One EDT
  "c658d883-e319-4682-af41-9ed743cdccf8": ch212VipBlack, // 212 VIP Black NYC
  "c10b168b-24d4-450a-9638-558b3c3de12a": chBadBoyLeParfum, // Bad Boy Le Parfum
  "e26f7f04-ec36-4a59-86b7-ed7e22a96431": chGoodGirlBlush, // Good Girl Blush
  "fec562d3-037f-4397-841b-33a4b05c0f93": chGoodGirlVery, // Very Good Girl
  "cff31433-8509-4091-977a-4546f24c0384": diorSauvageEdp, // Dior Sauvage EDP
  "04d6eb68-7eb6-4396-8c02-26a5f2d6bcf8": bossBottledNight, // Boss Bottled Night
  "49793015-8e55-4b66-99d5-f1d3077b8204": jpgLeMaleEdt, // JPG Le Male EDT
  "1282378e-7de3-4f72-acf5-2ddf9a2ddb85": jpgLeMaleLeParfum, // JPG Le Male Le Parfum
  "528e0a4f-ea2e-4f3e-bc0a-422ea8e81af4": jpgScandalEdt, // JPG Scandal EDT
  "fc43bbec-e9aa-466e-ab56-9cc5b793c54c": jpgScandalLeParfum, // JPG Scandal Le Parfum
  "207229fa-b4bb-4e3d-9dce-6f326f9ca22f": lattafaKhamrah, // Lattafa Khamrah
  "af3ac6c9-ce0a-443b-91e7-97deca7cf520": lattafaYaraTous, // Lattafa Yara Tous
  "ec88cae0-98e3-4c0c-bfba-6d0367c3c549": paco1Million, // Paco 1 Million
};

/**
 * Devuelve la imagen premium si existe override para este perfume,
 * o la URL original del proveedor en caso contrario.
 */
export function resolvePerfumeImage(
  perfumeId: string | undefined,
  fallback: string | null | undefined,
): { src: string | null | undefined; isPremium: boolean } {
  if (perfumeId && PREMIUM_IMAGE_OVERRIDES[perfumeId]) {
    return { src: PREMIUM_IMAGE_OVERRIDES[perfumeId], isPremium: true };
  }
  return { src: fallback, isPremium: false };
}
