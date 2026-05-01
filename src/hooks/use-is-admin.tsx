import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Devuelve true si el usuario logueado tiene rol admin.
 * Se usa para mostrar indicadores visuales solo a admins (ej. badge
 * "Fondo blanco" en cards del catálogo). Nunca para autorizar acciones:
 * la autorización real vive en RLS y RPCs server-side.
 */
export function useIsAdmin(): boolean {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const check = async (userId: string | undefined) => {
      if (!userId) {
        if (!cancelled) setIsAdmin(false);
        return;
      }
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();
      if (!cancelled) setIsAdmin(!!data);
    };

    supabase.auth.getUser().then(({ data }) => check(data.user?.id));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      check(session?.user?.id);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return isAdmin;
}
