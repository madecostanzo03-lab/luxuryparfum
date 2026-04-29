-- Función segura: limpiar clean_image_url (solo admin, solo esa columna)
CREATE OR REPLACE FUNCTION public.admin_clear_clean_image(_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo administradores pueden modificar imágenes';
  END IF;

  UPDATE public.perfumes
  SET clean_image_url = NULL,
      updated_at = now()
  WHERE id = _product_id;
END;
$$;

-- Función segura: asignar clean_image_url (solo admin, solo esa columna)
CREATE OR REPLACE FUNCTION public.admin_set_clean_image(_product_id uuid, _url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Solo administradores pueden modificar imágenes';
  END IF;

  IF _url IS NULL OR length(trim(_url)) = 0 THEN
    RAISE EXCEPTION 'URL inválida';
  END IF;

  IF _url !~* '^https?://' THEN
    RAISE EXCEPTION 'URL debe ser http(s)';
  END IF;

  UPDATE public.perfumes
  SET clean_image_url = _url,
      updated_at = now()
  WHERE id = _product_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_clear_clean_image(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_set_clean_image(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_clear_clean_image(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_clean_image(uuid, text) TO authenticated;

-- Storage: permitir a admins gestionar el bucket clean-images
CREATE POLICY "Admins can upload clean-images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'clean-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update clean-images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'clean-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete clean-images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'clean-images' AND public.has_role(auth.uid(), 'admin'));