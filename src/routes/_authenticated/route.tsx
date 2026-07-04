import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Portão de autenticação da área administrativa.
// ssr:false porque a sessão do Supabase mora em localStorage — o servidor
// não a enxerga. A verificação acontece no cliente antes do render.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { redirect: location.href },
      });
    }
    return { user: data.user };
  },
  component: () => <Outlet />,
});
