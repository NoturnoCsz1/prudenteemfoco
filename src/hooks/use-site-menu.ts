import { useQuery } from "@tanstack/react-query";
import { getSiteMenu, type SiteMenu } from "@/lib/site.functions";

const FALLBACK: SiteMenu = {
  show_eventos: true,
  show_experiencias: true,
  show_sobre: true,
  show_contato: true,
  show_ver_agenda: true,
};

/**
 * Menu público. Se a RPC falhar ou não houver registro, retorna todos os itens
 * visíveis para não quebrar a navegação.
 */
export function useSiteMenu(): SiteMenu {
  const { data } = useQuery({
    queryKey: ["site", "menu"],
    queryFn: () => getSiteMenu(),
    staleTime: 60_000,
  });
  return data ?? FALLBACK;
}
