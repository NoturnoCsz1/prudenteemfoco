import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type State = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

/**
 * Hook client-only para observar a sessão do Supabase.
 *
 * - Sincroniza estado com `supabase.auth.onAuthStateChange`.
 * - Nunca é usado como guarda de rota — a proteção real vive em
 *   `_authenticated/route.tsx` (RLS + beforeLoad). Este hook alimenta a
 *   UI (mostrar/ocultar botão de "Entrar" ou avatar/logout).
 */
export function useSession(): State {
  const [state, setState] = useState<State>({ session: null, user: null, loading: true });

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setState({ session: data.session, user: data.session?.user ?? null, loading: false });
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      setState({ session, user: session?.user ?? null, loading: false });
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return state;
}
