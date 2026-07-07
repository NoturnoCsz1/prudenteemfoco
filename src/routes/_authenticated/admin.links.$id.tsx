import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Download, Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { AdminPageHeader } from "@/components/admin/AdminPage";
import {
  deleteShortLink,
  getShortLink,
  getShortLinkMetrics,
  updateShortLink,
} from "@/lib/short-links.functions";

export const Route = createFileRoute("/_authenticated/admin/links/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do link · Admin — Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LinkDetail,
});

function shortUrl(slug: string) {
  if (typeof window === "undefined") return `/go/${slug}`;
  return `${window.location.origin}/go/${slug}`;
}

function LinkDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const getFn = useServerFn(getShortLink);
  const metricsFn = useServerFn(getShortLinkMetrics);
  const updateFn = useServerFn(updateShortLink);
  const deleteFn = useServerFn(deleteShortLink);

  const linkQ = useQuery({
    queryKey: ["short-link", id],
    queryFn: () => getFn({ data: { id } }),
  });
  const metricsQ = useQuery({
    queryKey: ["short-link-metrics", id],
    queryFn: () => metricsFn({ data: { id } }),
    refetchInterval: 30000,
  });

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [campaign, setCampaign] = useState("");

  useEffect(() => {
    if (linkQ.data) {
      setTitle(linkQ.data.title);
      setDestination(linkQ.data.destination_url);
      setCampaign(linkQ.data.campaign ?? "");
    }
  }, [linkQ.data]);

  const url = linkQ.data ? shortUrl(linkQ.data.slug) : "";

  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 512, margin: 2 }).then(setQrDataUrl).catch(() => {});
  }, [url]);

  const saveMut = useMutation({
    mutationFn: updateFn,
    onSuccess: () => {
      toast.success("Alterações salvas");
      qc.invalidateQueries({ queryKey: ["short-link", id] });
      qc.invalidateQueries({ queryKey: ["short-links"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: deleteFn,
    onSuccess: () => {
      toast.success("Link excluído");
      qc.invalidateQueries({ queryKey: ["short-links"] });
      navigate({ to: "/admin/links" });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSave = useMemo(
    () => title.trim() && /^https?:\/\//i.test(destination.trim()),
    [title, destination],
  );

  async function copyShort() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    } catch {
      toast.error("Falha ao copiar");
    }
  }

  if (linkQ.isLoading) {
    return (
      <div className="flex items-center justify-center p-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!linkQ.data) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Link não encontrado.{" "}
        <Link to="/admin/links" className="text-primary underline">
          Voltar
        </Link>
      </div>
    );
  }

  const m = metricsQ.data;

  return (
    <div className="p-5 md:p-8">
      <Link
        to="/admin/links"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Todos os links
      </Link>
      <div className="mt-3">
        <AdminPageHeader title={linkQ.data.title} description={url} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Configuração
          </h2>
          <div className="mt-3 space-y-3">
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Título</span>
              <input
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">URL de destino</span>
              <input
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              <span className="text-muted-foreground">Campanha</span>
              <input
                className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
              />
            </label>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={copyShort}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs hover:bg-accent"
              >
                <Copy className="h-3.5 w-3.5" /> Copiar link curto
              </button>
              <button
                type="button"
                disabled={!canSave || saveMut.isPending}
                onClick={() =>
                  saveMut.mutate({
                    data: {
                      id,
                      title: title.trim(),
                      destination_url: destination.trim(),
                      campaign: campaign.trim() || null,
                    },
                  })
                }
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
              >
                {saveMut.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Save className="h-3.5 w-3.5" />
                )}
                Salvar
              </button>
              <button
                type="button"
                onClick={() =>
                  updateFn({ data: { id, active: !linkQ.data!.active } })
                    .then(() => {
                      qc.invalidateQueries({ queryKey: ["short-link", id] });
                      qc.invalidateQueries({ queryKey: ["short-links"] });
                    })
                    .catch((e: Error) => toast.error(e.message))
                }
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-xs hover:bg-accent"
              >
                {linkQ.data.active ? "Desativar" : "Ativar"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm("Excluir este link? Cliques serão removidos.")) {
                    deleteMut.mutate({ data: { id } });
                  }
                }}
                className="ml-auto inline-flex items-center gap-1 rounded-md border border-destructive/40 px-3 py-2 text-xs text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            QR Code do link curto
          </h2>
          {qrDataUrl ? (
            <>
              <img
                src={qrDataUrl}
                alt={`QR ${url}`}
                className="mt-3 aspect-square w-full rounded-md bg-white p-3"
              />
              <a
                href={qrDataUrl}
                download={`qr-${linkQ.data.slug}.png`}
                className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-md border border-border px-3 py-2 text-xs hover:bg-accent"
              >
                <Download className="h-3.5 w-3.5" /> Baixar PNG
              </a>
            </>
          ) : (
            <div className="mt-3 flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </section>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Métricas
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Total" value={m?.total} />
          <Stat label="Hoje" value={m?.today} />
          <Stat label="7 dias" value={m?.d7} />
          <Stat label="30 dias" value={m?.d30} />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Breakdown title="Referrers" rows={m?.referrers} />
          <Breakdown title="Dispositivo" rows={m?.devices} />
          <Breakdown title="Navegador" rows={m?.browsers} />
          <Breakdown title="UTM source" rows={m?.utm_sources} />
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-semibold">{value ?? "—"}</div>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number }[] | undefined;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      {!rows || rows.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">Sem dados ainda.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {rows.map((r) => (
            <li
              key={r.label}
              className="flex items-center justify-between gap-2 text-xs"
            >
              <span className="truncate text-foreground">{r.label}</span>
              <span className="text-muted-foreground">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
