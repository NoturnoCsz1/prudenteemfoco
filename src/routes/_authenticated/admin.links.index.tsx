import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Copy, Plus, ExternalLink, QrCode, BarChart3, Power, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import { useOrgMembership } from "@/hooks/use-org-membership";
import {
  createShortLink,
  listShortLinks,
  updateShortLink,
} from "@/lib/short-links.functions";

export const Route = createFileRoute("/_authenticated/admin/links/")({
  head: () => ({
    meta: [
      { title: "Links · Admin — Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LinksIndex,
});

function shortUrl(slug: string) {
  if (typeof window === "undefined") return `/go/${slug}`;
  return `${window.location.origin}/go/${slug}`;
}

function LinksIndex() {
  const { data: membership } = useOrgMembership();
  const orgId = membership?.organization_id;
  const qc = useQueryClient();
  const list = useServerFn(listShortLinks);
  const create = useServerFn(createShortLink);
  const update = useServerFn(updateShortLink);
  const navigate = useNavigate();

  const linksQ = useQuery({
    queryKey: ["short-links", orgId],
    enabled: !!orgId,
    queryFn: () => list({ data: { organization_id: orgId! } }),
  });

  const createMut = useMutation({
    mutationFn: create,
    onSuccess: () => {
      toast.success("Link criado");
      qc.invalidateQueries({ queryKey: ["short-links", orgId] });
      setForm({ title: "", slug: "", destination_url: "", campaign: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleMut = useMutation({
    mutationFn: update,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["short-links", orgId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const [form, setForm] = useState({ title: "", slug: "", destination_url: "", campaign: "" });

  const canSubmit = useMemo(
    () =>
      !!orgId &&
      form.title.trim() &&
      /^[a-z0-9][a-z0-9_-]{0,63}$/.test(form.slug.trim().toLowerCase()) &&
      /^https?:\/\//i.test(form.destination_url.trim()),
    [orgId, form],
  );

  async function copyShort(slug: string) {
    try {
      await navigator.clipboard.writeText(shortUrl(slug));
      toast.success("Link copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  }

  return (
    <div className="p-5 md:p-8">
      <AdminPageHeader
        title="Links"
        description="Encurtador próprio: cadastre links de campanha, gere QR e acompanhe cliques."
      />

      <section className="mt-6 rounded-lg border border-border bg-card p-4 md:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Novo link
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Título</span>
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Rock in Prudente — Ingresso"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-muted-foreground">Slug (curto)</span>
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm lowercase"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
              placeholder="rock"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
            <span className="text-muted-foreground">URL de destino</span>
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.destination_url}
              onChange={(e) => setForm({ ...form, destination_url: e.target.value })}
              placeholder="https://eventou.com.br/evento/..."
            />
          </label>
          <label className="flex flex-col gap-1 text-xs sm:col-span-2">
            <span className="text-muted-foreground">Campanha (opcional)</span>
            <input
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={form.campaign}
              onChange={(e) => setForm({ ...form, campaign: e.target.value })}
              placeholder="lancamento-outubro"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            Prévia: <code className="text-foreground">{form.slug ? shortUrl(form.slug) : "—"}</code>
          </p>
          <button
            type="button"
            disabled={!canSubmit || createMut.isPending}
            onClick={() =>
              orgId &&
              createMut.mutate({
                data: {
                  organization_id: orgId,
                  title: form.title.trim(),
                  slug: form.slug.trim().toLowerCase(),
                  destination_url: form.destination_url.trim(),
                  campaign: form.campaign.trim() || null,
                },
              })
            }
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {createMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Criar link
          </button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Seus links
        </h2>
        {linksQ.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !linksQ.data || linksQ.data.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nenhum link criado ainda.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {linksQ.data.map((l) => (
              <li
                key={l.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{l.title}</span>
                    {!l.active && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        Inativo
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate text-xs text-primary">
                    {shortUrl(l.slug)}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    → {l.destination_url}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => copyShort(l.slug)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-accent"
                    title="Copiar link curto"
                  >
                    <Copy className="h-3.5 w-3.5" /> Copiar
                  </button>
                  <a
                    href={shortUrl(l.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-accent"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
                  </a>
                  <button
                    type="button"
                    onClick={() =>
                      toggleMut.mutate({ data: { id: l.id, active: !l.active } })
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs hover:bg-accent"
                    title={l.active ? "Desativar" : "Ativar"}
                  >
                    <Power className="h-3.5 w-3.5" />
                    {l.active ? "Desativar" : "Ativar"}
                  </button>
                  <Link
                    to="/admin/links/$id"
                    params={{ id: l.id }}
                    className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    <BarChart3 className="h-3.5 w-3.5" /> Métricas / QR
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
