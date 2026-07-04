import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Plus, Trash2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OperationsNav } from "@/components/admin/OperationsNav";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getHotsiteSettings,
  upsertHotsiteSettings,
  listSponsors,
  upsertSponsor,
  deleteSponsor,
  listBanners,
  upsertBanner,
  deleteBanner,
  listNews,
  upsertNews,
  deleteNews,
  listCommercialLinks,
  upsertCommercialLink,
  deleteCommercialLink,
} from "@/lib/hotsite.functions";
import {
  SPONSOR_CATEGORIES,
  SPONSOR_CATEGORY_LABEL,
  BANNER_PLACEMENTS,
  BANNER_PLACEMENT_LABEL,
  COMMERCIAL_LINK_TYPES,
  COMMERCIAL_LINK_TYPE_LABEL,
  NEWS_STATUSES,
  NEWS_STATUS_LABEL,
  slugifyNews,
  type SponsorCategory,
  type BannerPlacement,
  type CommercialLinkType,
  type NewsStatus,
} from "@/lib/hotsite";
import type { Database } from "@/integrations/supabase/types";

type SponsorRow = Database["public"]["Tables"]["event_sponsors"]["Row"];
type BannerRow = Database["public"]["Tables"]["event_banners"]["Row"];
type NewsRow = Database["public"]["Tables"]["event_news"]["Row"];
type LinkRow = Database["public"]["Tables"]["event_commercial_links"]["Row"];

export const Route = createFileRoute("/_authenticated/admin/eventos/$id/hotsite")({
  head: () => ({
    meta: [
      { title: "Hotsite do evento — Admin · Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HotsitePage,
});

function HotsitePage() {
  const { id } = Route.useParams();

  const eventQ = useQuery({
    queryKey: ["admin", "event", "hotsite-owner", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, slug, status, organization_id")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (eventQ.isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  const ev = eventQ.data;
  if (!ev) {
    return (
      <div className="p-5 md:p-8">
        <OperationsNav eventId={id} active="hotsite" />
        <p className="mt-6 text-sm text-destructive">Evento não encontrado.</p>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 overflow-x-hidden p-4 sm:p-5 md:p-8">
      <OperationsNav eventId={id} active="hotsite" eventTitle={ev.title} />
      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="eyebrow-label text-primary">Construtor de hotsite</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Configure blocos, patrocinadores, banners, notícias e links comerciais.
          </p>
        </div>
        {ev.status === "published" ? (
          <a
            href={`/eventos/${ev.slug}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 self-start rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-accent sm:self-auto"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Visualizar hotsite
          </a>
        ) : (
          <p className="text-xs text-muted-foreground">
            Publique o evento para visualizar o hotsite.
          </p>
        )}
      </div>

      <div className="mt-6">
        <Accordion type="multiple" defaultValue={["settings"]} className="w-full">
          <AccordionItem value="settings">
            <AccordionTrigger>Hero, contador e blocos ativos</AccordionTrigger>
            <AccordionContent>
              <SettingsBlock eventId={id} orgId={ev.organization_id} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="links">
            <AccordionTrigger>Ingressos e links comerciais</AccordionTrigger>
            <AccordionContent>
              <CommercialLinksBlock eventId={id} orgId={ev.organization_id} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="sponsors">
            <AccordionTrigger>Patrocinadores e parceiros</AccordionTrigger>
            <AccordionContent>
              <SponsorsBlock eventId={id} orgId={ev.organization_id} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="banners">
            <AccordionTrigger>Banners</AccordionTrigger>
            <AccordionContent>
              <BannersBlock eventId={id} orgId={ev.organization_id} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="news">
            <AccordionTrigger>Notícias</AccordionTrigger>
            <AccordionContent>
              <NewsBlock eventId={id} orgId={ev.organization_id} />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="info">
            <AccordionTrigger>Informações úteis</AccordionTrigger>
            <AccordionContent>
              <p className="text-xs text-muted-foreground">
                Endereço, portões, classificação, estacionamento, mapa e regras são
                configurados no bloco "Hero, contador e blocos ativos".
              </p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="shortcuts">
            <AccordionTrigger>Atalhos operacionais</AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2 sm:grid-cols-2">
                <ShortcutLink to={`/admin/eventos/${id}/lineup`} label="Programação / Line-up" />
                <ShortcutLink to={`/admin/eventos/${id}/espacos`} label="Experiências e espaços" />
                <ShortcutLink to={`/admin/eventos/${id}/reservas`} label="Reservas" />
                <ShortcutLink to={`/admin/eventos/${id}/leads`} label="Leads" />
                <ShortcutLink to={`/admin/eventos/${id}/promoters`} label="Promoters" />
                <ShortcutLink to={`/admin/eventos/${id}/editar`} label="Editar evento (título, capa, datas)" />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

function ShortcutLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
    >
      <span>{label}</span>
      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
    </Link>
  );
}

// ============ Settings ============
function SettingsBlock({ eventId, orgId }: { eventId: string; orgId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "hotsite", "settings", eventId],
    queryFn: () => getHotsiteSettings({ data: { event_id: eventId } }),
  });

  const initial = q.data;
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const values = (form ?? initial ?? {}) as Record<string, unknown>;

  const m = useMutation({
    mutationFn: async () => {
      return upsertHotsiteSettings({
        data: {
          event_id: eventId,
          organization_id: orgId,
          hero_title: (values.hero_title as string) ?? null,
          hero_subtitle: (values.hero_subtitle as string) ?? null,
          cta_primary_label: (values.cta_primary_label as string) ?? null,
          cta_primary_url: (values.cta_primary_url as string) ?? null,
          cta_secondary_label: (values.cta_secondary_label as string) ?? null,
          cta_secondary_url: (values.cta_secondary_url as string) ?? null,
          show_countdown: (values.show_countdown as boolean) ?? true,
          show_lineup: (values.show_lineup as boolean) ?? true,
          show_tickets: (values.show_tickets as boolean) ?? true,
          show_experiences: (values.show_experiences as boolean) ?? true,
          show_sponsors: (values.show_sponsors as boolean) ?? true,
          show_news: (values.show_news as boolean) ?? true,
          show_info: (values.show_info as boolean) ?? true,
          show_banners: (values.show_banners as boolean) ?? true,
          info_address: (values.info_address as string) ?? null,
          info_gates_open_at: (values.info_gates_open_at as string) ?? null,
          info_age_rating: (values.info_age_rating as string) ?? null,
          info_parking: (values.info_parking as string) ?? null,
          info_map_url: (values.info_map_url as string) ?? null,
          info_rules: (values.info_rules as string) ?? null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Configurações salvas.");
      qc.invalidateQueries({ queryKey: ["admin", "hotsite", "settings", eventId] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  function set(k: string, v: unknown) {
    setForm((f) => ({ ...(f ?? initial ?? {}), [k]: v }) as Record<string, unknown>);
  }

  if (q.isLoading) return <Loader2 className="h-4 w-4 animate-spin" />;

  const switches: [string, string][] = [
    ["show_countdown", "Contador regressivo"],
    ["show_lineup", "Line-up"],
    ["show_tickets", "Ingressos externos"],
    ["show_experiences", "Experiências (camarotes, bistrôs, mesas)"],
    ["show_sponsors", "Patrocinadores"],
    ["show_news", "Notícias"],
    ["show_info", "Informações úteis"],
    ["show_banners", "Banners"],
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3">
        <div>
          <Label>Título de destaque</Label>
          <Input
            value={(values.hero_title as string) ?? ""}
            onChange={(e) => set("hero_title", e.target.value)}
            placeholder="Deixe vazio para usar o título do evento"
          />
        </div>
        <div>
          <Label>Subtítulo</Label>
          <Textarea
            value={(values.hero_subtitle as string) ?? ""}
            onChange={(e) => set("hero_subtitle", e.target.value)}
            rows={2}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>CTA principal — rótulo</Label>
            <Input
              value={(values.cta_primary_label as string) ?? ""}
              onChange={(e) => set("cta_primary_label", e.target.value)}
            />
          </div>
          <div>
            <Label>CTA principal — URL</Label>
            <Input
              value={(values.cta_primary_url as string) ?? ""}
              onChange={(e) => set("cta_primary_url", e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div>
            <Label>CTA secundário — rótulo</Label>
            <Input
              value={(values.cta_secondary_label as string) ?? ""}
              onChange={(e) => set("cta_secondary_label", e.target.value)}
            />
          </div>
          <div>
            <Label>CTA secundário — URL</Label>
            <Input
              value={(values.cta_secondary_url as string) ?? ""}
              onChange={(e) => set("cta_secondary_url", e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Blocos ativos</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {switches.map(([k, label]) => (
            <label
              key={k}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <span>{label}</span>
              <Switch
                checked={(values[k] as boolean) ?? true}
                onCheckedChange={(v) => set(k, v)}
              />
            </label>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Informações úteis</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Endereço</Label>
            <Input
              value={(values.info_address as string) ?? ""}
              onChange={(e) => set("info_address", e.target.value)}
            />
          </div>
          <div>
            <Label>Abertura dos portões</Label>
            <Input
              value={(values.info_gates_open_at as string) ?? ""}
              onChange={(e) => set("info_gates_open_at", e.target.value)}
              placeholder="Ex.: 18h"
            />
          </div>
          <div>
            <Label>Classificação</Label>
            <Input
              value={(values.info_age_rating as string) ?? ""}
              onChange={(e) => set("info_age_rating", e.target.value)}
              placeholder="Ex.: 18 anos"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Estacionamento</Label>
            <Input
              value={(values.info_parking as string) ?? ""}
              onChange={(e) => set("info_parking", e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Mapa (URL)</Label>
            <Input
              value={(values.info_map_url as string) ?? ""}
              onChange={(e) => set("info_map_url", e.target.value)}
              placeholder="https://maps.google.com/…"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Regras de acesso</Label>
            <Textarea
              value={(values.info_rules as string) ?? ""}
              onChange={(e) => set("info_rules", e.target.value)}
              rows={4}
            />
          </div>
        </div>
      </div>

      <Button onClick={() => m.mutate()} disabled={m.isPending}>
        {m.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Salvar configurações
          </>
        )}
      </Button>
    </div>
  );
}

// ============ Sponsors ============
function SponsorsBlock({ eventId, orgId }: { eventId: string; orgId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "hotsite", "sponsors", eventId],
    queryFn: () => listSponsors({ data: { event_id: eventId } }),
  });
  const [editing, setEditing] = useState<Partial<SponsorRow> | null>(null);

  const mSave = useMutation({
    mutationFn: async (s: Partial<SponsorRow>) =>
      upsertSponsor({
        data: {
          id: s.id ?? undefined,
          event_id: eventId,
          organization_id: orgId,
          name: (s.name ?? "").trim(),
          category: (s.category ?? "sponsor") as SponsorCategory,
          logo_url: s.logo_url ?? null,
          website_url: s.website_url ?? null,
          sort_order: s.sort_order ?? 0,
          is_active: s.is_active ?? true,
        },
      }),
    onSuccess: () => {
      toast.success("Salvo.");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "hotsite", "sponsors", eventId] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const mDel = useMutation({
    mutationFn: async (id: string) => deleteSponsor({ data: { id } }),
    onSuccess: () => {
      toast.success("Removido.");
      qc.invalidateQueries({ queryKey: ["admin", "hotsite", "sponsors", eventId] });
    },
  });

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {(q.data ?? []).map((s) => (
          <Card key={s.id}>
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">
                  {SPONSOR_CATEGORY_LABEL[s.category]} · ordem {s.sort_order}
                  {!s.is_active && " · inativo"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                  Editar
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => mDel.mutate(s.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(q.data ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum patrocinador.</p>
        )}
      </ul>

      {editing ? (
        <Card>
          <CardContent className="grid gap-3 p-3">
            <Input
              placeholder="Nome"
              value={editing.name ?? ""}
              onChange={(e) => setEditing({ ...editing, name: e.target.value })}
            />
            <Select
              value={(editing.category ?? "sponsor") as string}
              onValueChange={(v) =>
                setEditing({ ...editing, category: v as SponsorCategory })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SPONSOR_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {SPONSOR_CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Logo URL (https://…)"
              value={editing.logo_url ?? ""}
              onChange={(e) => setEditing({ ...editing, logo_url: e.target.value })}
            />
            <Input
              placeholder="Website URL (opcional)"
              value={editing.website_url ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, website_url: e.target.value })
              }
            />
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="Ordem"
                value={editing.sort_order ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, sort_order: Number(e.target.value) })
                }
                className="w-24"
              />
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
                Ativo
              </label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => mSave.mutate(editing)} disabled={mSave.isPending}>
                {mSave.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setEditing({
              name: "",
              category: "sponsor",
              is_active: true,
              sort_order: 0,
            })
          }
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Adicionar patrocinador
        </Button>
      )}
    </div>
  );
}

// ============ Banners ============
function BannersBlock({ eventId, orgId }: { eventId: string; orgId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "hotsite", "banners", eventId],
    queryFn: () => listBanners({ data: { event_id: eventId } }),
  });
  const [editing, setEditing] = useState<Partial<BannerRow> | null>(null);

  const mSave = useMutation({
    mutationFn: async (b: Partial<BannerRow>) =>
      upsertBanner({
        data: {
          id: b.id ?? undefined,
          event_id: eventId,
          organization_id: orgId,
          title: b.title ?? null,
          image_url: (b.image_url ?? "").trim(),
          link_url: b.link_url ?? null,
          placement: (b.placement ?? "below_hero") as BannerPlacement,
          sort_order: b.sort_order ?? 0,
          is_active: b.is_active ?? true,
        },
      }),
    onSuccess: () => {
      toast.success("Salvo.");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "hotsite", "banners", eventId] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const mDel = useMutation({
    mutationFn: async (id: string) => deleteBanner({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "hotsite", "banners", eventId] });
    },
  });

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {(q.data ?? []).map((b) => (
          <Card key={b.id}>
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {b.title || "Banner"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {BANNER_PLACEMENT_LABEL[b.placement]}
                  {!b.is_active && " · inativo"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(b)}>
                  Editar
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => mDel.mutate(b.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(q.data ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum banner.</p>
        )}
      </ul>

      {editing ? (
        <Card>
          <CardContent className="grid gap-3 p-3">
            <Input
              placeholder="Título (opcional)"
              value={editing.title ?? ""}
              onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            />
            <Input
              placeholder="Imagem URL (https://…)"
              value={editing.image_url ?? ""}
              onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
            />
            <Input
              placeholder="Link (opcional)"
              value={editing.link_url ?? ""}
              onChange={(e) => setEditing({ ...editing, link_url: e.target.value })}
            />
            <Select
              value={(editing.placement ?? "below_hero") as string}
              onValueChange={(v) =>
                setEditing({ ...editing, placement: v as BannerPlacement })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BANNER_PLACEMENTS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {BANNER_PLACEMENT_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                placeholder="Ordem"
                value={editing.sort_order ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, sort_order: Number(e.target.value) })
                }
                className="w-24"
              />
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
                Ativo
              </label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => mSave.mutate(editing)} disabled={mSave.isPending}>
                {mSave.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setEditing({
              placement: "below_hero",
              is_active: true,
              sort_order: 0,
            })
          }
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Adicionar banner
        </Button>
      )}
    </div>
  );
}

// ============ News ============
function NewsBlock({ eventId, orgId }: { eventId: string; orgId: string }) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "hotsite", "news", eventId],
    queryFn: () => listNews({ data: { event_id: eventId } }),
  });
  const [editing, setEditing] = useState<Partial<NewsRow> | null>(null);

  const mSave = useMutation({
    mutationFn: async (n: Partial<NewsRow>) =>
      upsertNews({
        data: {
          id: n.id ?? undefined,
          event_id: eventId,
          organization_id: orgId,
          title: (n.title ?? "").trim(),
          slug: (n.slug ?? "").trim() || slugifyNews(n.title ?? ""),
          excerpt: n.excerpt ?? null,
          content: n.content ?? null,
          image_url: n.image_url ?? null,
          status: (n.status ?? "draft") as NewsStatus,
          published_at: n.published_at ?? null,
          is_featured: n.is_featured ?? false,
          sort_order: n.sort_order ?? 0,
        },
      }),
    onSuccess: () => {
      toast.success("Salvo.");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "hotsite", "news", eventId] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const mDel = useMutation({
    mutationFn: async (id: string) => deleteNews({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "hotsite", "news", eventId] });
    },
  });

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        {(q.data ?? []).map((n) => (
          <Card key={n.id}>
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">
                  {NEWS_STATUS_LABEL[n.status]}
                  {n.is_featured && " · destaque"}
                  {n.published_at &&
                    ` · ${new Date(n.published_at).toLocaleDateString("pt-BR")}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(n)}>
                  Editar
                </Button>
                <Button size="icon" variant="ghost" onClick={() => mDel.mutate(n.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {(q.data ?? []).length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhuma notícia.</p>
        )}
      </ul>

      {editing ? (
        <Card>
          <CardContent className="grid gap-3 p-3">
            <Input
              placeholder="Título"
              value={editing.title ?? ""}
              onChange={(e) => {
                const title = e.target.value;
                setEditing((prev) => ({
                  ...prev,
                  title,
                  slug: prev?.id ? prev.slug : slugifyNews(title),
                }));
              }}
            />
            <Input
              placeholder="Slug (URL)"
              value={editing.slug ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, slug: slugifyNews(e.target.value) })
              }
            />
            <Textarea
              placeholder="Resumo (até 600 caracteres)"
              value={editing.excerpt ?? ""}
              onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })}
              rows={2}
            />
            <Textarea
              placeholder="Conteúdo"
              value={editing.content ?? ""}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              rows={6}
            />
            <Input
              placeholder="Imagem URL (opcional)"
              value={editing.image_url ?? ""}
              onChange={(e) => setEditing({ ...editing, image_url: e.target.value })}
            />
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={(editing.status ?? "draft") as string}
                onValueChange={(v) =>
                  setEditing({ ...editing, status: v as NewsStatus })
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NEWS_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {NEWS_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={editing.is_featured ?? false}
                  onCheckedChange={(v) => setEditing({ ...editing, is_featured: v })}
                />
                Destaque
              </label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => mSave.mutate(editing)} disabled={mSave.isPending}>
                {mSave.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setEditing({
              title: "",
              slug: "",
              status: "draft",
              is_featured: false,
              sort_order: 0,
            })
          }
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Adicionar notícia
        </Button>
      )}
    </div>
  );
}

// ============ Commercial links ============
function CommercialLinksBlock({
  eventId,
  orgId,
}: {
  eventId: string;
  orgId: string;
}) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "hotsite", "links", eventId],
    queryFn: () => listCommercialLinks({ data: { event_id: eventId } }),
  });
  const [editing, setEditing] = useState<Partial<LinkRow> | null>(null);

  const mSave = useMutation({
    mutationFn: async (l: Partial<LinkRow>) =>
      upsertCommercialLink({
        data: {
          id: l.id ?? undefined,
          event_id: eventId,
          organization_id: orgId,
          label: (l.label ?? "").trim(),
          event_date: l.event_date ?? null,
          link_type: (l.link_type ?? "ticket") as CommercialLinkType,
          destination_url: (l.destination_url ?? "").trim(),
          sort_order: l.sort_order ?? 0,
          is_active: l.is_active ?? true,
          tracking_enabled: l.tracking_enabled ?? true,
        },
      }),
    onSuccess: () => {
      toast.success("Salvo.");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin", "hotsite", "links", eventId] });
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const mDel = useMutation({
    mutationFn: async (id: string) => deleteCommercialLink({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "hotsite", "links", eventId] });
    },
  });

  const items = useMemo(() => q.data ?? [], [q.data]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Configure links por dia (ex.: 10 SET — Comprar ingresso), passaportes e outros.
        Cliques podem ser registrados quando o rastreamento está ativo.
      </p>
      <ul className="space-y-2">
        {items.map((l) => (
          <Card key={l.id}>
            <CardContent className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{l.label}</p>
                <p className="text-xs text-muted-foreground">
                  {COMMERCIAL_LINK_TYPE_LABEL[l.link_type]}
                  {l.event_date && ` · ${new Date(l.event_date).toLocaleDateString("pt-BR")}`}
                  {!l.is_active && " · inativo"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button size="sm" variant="outline" onClick={() => setEditing(l)}>
                  Editar
                </Button>
                <Button size="icon" variant="ghost" onClick={() => mDel.mutate(l.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum link.</p>
        )}
      </ul>

      {editing ? (
        <Card>
          <CardContent className="grid gap-3 p-3">
            <Input
              placeholder="Rótulo (ex.: 10 SET — Comprar ingresso)"
              value={editing.label ?? ""}
              onChange={(e) => setEditing({ ...editing, label: e.target.value })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Data (opcional)</Label>
                <Input
                  type="date"
                  value={editing.event_date ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, event_date: e.target.value || null })
                  }
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={(editing.link_type ?? "ticket") as string}
                  onValueChange={(v) =>
                    setEditing({ ...editing, link_type: v as CommercialLinkType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMMERCIAL_LINK_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {COMMERCIAL_LINK_TYPE_LABEL[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Input
              placeholder="URL de destino (https://…)"
              value={editing.destination_url ?? ""}
              onChange={(e) =>
                setEditing({ ...editing, destination_url: e.target.value })
              }
            />
            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="number"
                placeholder="Ordem"
                value={editing.sort_order ?? 0}
                onChange={(e) =>
                  setEditing({ ...editing, sort_order: Number(e.target.value) })
                }
                className="w-24"
              />
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
                Ativo
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={editing.tracking_enabled ?? true}
                  onCheckedChange={(v) =>
                    setEditing({ ...editing, tracking_enabled: v })
                  }
                />
                Rastrear cliques
              </label>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => mSave.mutate(editing)} disabled={mSave.isPending}>
                {mSave.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                Salvar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setEditing({
              label: "",
              link_type: "ticket",
              is_active: true,
              tracking_enabled: true,
              sort_order: 0,
            })
          }
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          Adicionar link comercial
        </Button>
      )}
    </div>
  );
}
