import { createFileRoute, Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOrgMembership } from "@/hooks/use-org-membership";
import type { Database } from "@/integrations/supabase/types";

type SitePage = Database["public"]["Enums"]["site_page"];

export const Route = createFileRoute("/_authenticated/admin/site")({
  component: SiteCms,
});

const TABS = [
  { id: "home", label: "Home" },
  { id: "sobre", label: "Nossa História" },
  { id: "memoria", label: "Memória" },
  { id: "contato", label: "Contato" },
  { id: "menu", label: "Menu público" },
  { id: "seo", label: "SEO" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function SiteCms() {
  const search = useRouterState({ select: (s) => s.location.search as Record<string, string> });
  const initial = (search.tab as TabId) || "home";
  const [tab, setTab] = useState<TabId>(initial);
  useEffect(() => {
    const t = (search.tab as TabId) || "home";
    if (TABS.some((x) => x.id === t)) setTab(t);
  }, [search.tab]);

  const { data: membership, isLoading } = useOrgMembership();

  if (isLoading) {
    return <div className="p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (!membership) return null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:py-10">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Conteúdo do site</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Edite os textos das páginas institucionais. Alterações aparecem no site
          público após salvar.
        </p>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((t) => (
          <Link
            key={t.id}
            to="/admin/site"
            search={{ tab: t.id }}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.id
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-surface hover:text-foreground"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === "home" && <HomeForm orgId={membership.organization_id} />}
      {tab === "sobre" && <AboutForm orgId={membership.organization_id} />}
      {tab === "memoria" && <MemoryForm orgId={membership.organization_id} />}
      {tab === "contato" && <ContactForm orgId={membership.organization_id} />}
      {tab === "menu" && <MenuForm orgId={membership.organization_id} />}
      {tab === "seo" && <SeoForm orgId={membership.organization_id} />}
    </div>
  );
}

/* ---------------------- shared UI ---------------------- */
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
const inputCls =
  "w-full rounded-md border border-border-strong bg-background px-3 py-2 text-sm focus:border-foreground focus:outline-none";
const textareaCls = `${inputCls} min-h-[110px] resize-y`;

function SaveButton({ loading }: { loading: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-md bg-foreground px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-background transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
      Salvar
    </button>
  );
}

/* ---------------------- HOME ---------------------- */
function HomeForm({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "site_home", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_home").select("*").eq("organization_id", orgId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  useEffect(() => { if (data) setForm(data as Record<string, string | boolean>); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, organization_id: orgId, is_active: (form.is_active ?? true) as boolean };
      const { error } = await supabase.from("site_home").upsert(payload as never, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Home salva."); qc.invalidateQueries({ queryKey: ["site", "home"] }); qc.invalidateQueries({ queryKey: ["admin", "site_home", orgId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar."),
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const s = (k: string) => (form[k] as string) ?? "";

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Field label="Eyebrow (linha pequena acima do título)"><input className={inputCls} value={s("hero_eyebrow")} onChange={set("hero_eyebrow")} /></Field>
      <Field label="Título principal do hero"><textarea className={textareaCls} value={s("hero_title")} onChange={set("hero_title")} /></Field>
      <Field label="Subtítulo do hero"><textarea className={textareaCls} value={s("hero_subtitle")} onChange={set("hero_subtitle")} /></Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Botão principal — texto"><input className={inputCls} value={s("cta_primary_label")} onChange={set("cta_primary_label")} /></Field>
        <Field label="Botão principal — URL (opcional, vazio = /eventos)"><input className={inputCls} value={s("cta_primary_url")} onChange={set("cta_primary_url")} /></Field>
        <Field label="Botão secundário — texto"><input className={inputCls} value={s("cta_secondary_label")} onChange={set("cta_secondary_label")} /></Field>
        <Field label="Botão secundário — URL (opcional, vazio = /contato)"><input className={inputCls} value={s("cta_secondary_url")} onChange={set("cta_secondary_url")} /></Field>
      </div>
      <Field label="Seção Experiências — título"><input className={inputCls} value={s("experiences_headline")} onChange={set("experiences_headline")} /></Field>
      <Field label="Seção Experiências — texto"><textarea className={textareaCls} value={s("experiences_body")} onChange={set("experiences_body")} /></Field>
      <Field label="CTA final — título"><input className={inputCls} value={s("final_cta_headline")} onChange={set("final_cta_headline")} /></Field>
      <Field label="CTA final — texto de apoio (opcional)"><textarea className={textareaCls} value={s("final_cta_body")} onChange={set("final_cta_body")} /></Field>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="CTA final — botão (texto)"><input className={inputCls} value={s("final_cta_button_label")} onChange={set("final_cta_button_label")} /></Field>
        <Field label="CTA final — botão (URL, opcional)"><input className={inputCls} value={s("final_cta_button_url")} onChange={set("final_cta_button_url")} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={(form.is_active ?? true) as boolean} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> Ativo (visível no site)</label>
      <SaveButton loading={save.isPending} />
    </form>
  );
}

/* ---------------------- ABOUT ---------------------- */
function AboutForm({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "site_about", orgId],
    queryFn: async () => (await supabase.from("site_about").select("*").eq("organization_id", orgId).maybeSingle()).data,
  });
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  useEffect(() => { if (data) setForm(data as Record<string, string | boolean>); }, [data]);
  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, organization_id: orgId, is_active: (form.is_active ?? true) as boolean };
      const { error } = await supabase.from("site_about").upsert(payload as never, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Salvo."); qc.invalidateQueries({ queryKey: ["site", "about"] }); qc.invalidateQueries({ queryKey: ["admin", "site_about", orgId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro."),
  });
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const s = (k: string) => (form[k] as string) ?? "";
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Field label="Título"><input className={inputCls} value={s("title")} onChange={set("title")} /></Field>
      <Field label="Subtítulo"><textarea className={textareaCls} value={s("subtitle")} onChange={set("subtitle")} /></Field>
      <Field label="Origem"><textarea className={textareaCls} value={s("origin_body")} onChange={set("origin_body")} /></Field>
      <Field label="Hoje"><textarea className={textareaCls} value={s("today_body")} onChange={set("today_body")} /></Field>
      <Field label="Memória"><textarea className={textareaCls} value={s("memory_body")} onChange={set("memory_body")} /></Field>
      <Field label="URL da imagem (opcional)"><input className={inputCls} value={s("image_url")} onChange={set("image_url")} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={(form.is_active ?? true) as boolean} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> Ativo</label>
      <SaveButton loading={save.isPending} />
    </form>
  );
}

/* ---------------------- CONTACT ---------------------- */
function ContactForm({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "site_contact", orgId],
    queryFn: async () => (await supabase.from("site_contact").select("*").eq("organization_id", orgId).maybeSingle()).data,
  });
  const [form, setForm] = useState<Record<string, string | boolean>>({});
  useEffect(() => { if (data) setForm(data as Record<string, string | boolean>); }, [data]);
  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, organization_id: orgId, is_active: (form.is_active ?? true) as boolean };
      const { error } = await supabase.from("site_contact").upsert(payload as never, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Salvo."); qc.invalidateQueries({ queryKey: ["site", "contact"] }); qc.invalidateQueries({ queryKey: ["admin", "site_contact", orgId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro."),
  });
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const s = (k: string) => (form[k] as string) ?? "";
  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <Field label="E-mail principal"><input type="email" className={inputCls} value={s("email")} onChange={set("email")} /></Field>
      <Field label="WhatsApp (com DDI+DDD, ex.: 5518999999999)"><input className={inputCls} value={s("whatsapp")} onChange={set("whatsapp")} /></Field>
      <Field label="Instagram (URL completa)"><input className={inputCls} value={s("instagram_url")} onChange={set("instagram_url")} /></Field>
      <Field label="Mensagem institucional (aparece no topo)"><textarea className={textareaCls} value={s("institutional_message")} onChange={set("institutional_message")} /></Field>
      <Field label="Texto de atendimento (aparece abaixo dos canais)"><textarea className={textareaCls} value={s("service_message")} onChange={set("service_message")} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={(form.is_active ?? true) as boolean} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} /> Ativo</label>
      <SaveButton loading={save.isPending} />
    </form>
  );
}

/* ---------------------- MENU ---------------------- */
function MenuForm({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "site_menu", orgId],
    queryFn: async () => (await supabase.from("site_menu").select("*").eq("organization_id", orgId).maybeSingle()).data,
  });
  const [form, setForm] = useState<Record<string, boolean>>({
    show_eventos: true, show_experiencias: true, show_sobre: true, show_contato: true, show_ver_agenda: true,
  });
  useEffect(() => { if (data) setForm(data as unknown as Record<string, boolean>); }, [data]);
  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, organization_id: orgId };
      const { error } = await supabase.from("site_menu").upsert(payload as never, { onConflict: "organization_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Menu salvo."); qc.invalidateQueries({ queryKey: ["site", "menu"] }); qc.invalidateQueries({ queryKey: ["admin", "site_menu", orgId] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro."),
  });
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  const items: [keyof typeof form, string][] = [
    ["show_eventos", "Eventos"],
    ["show_experiencias", "Experiências"],
    ["show_sobre", "Nossa História"],
    ["show_contato", "Contato"],
    ["show_ver_agenda", "Ver Agenda (atalho destacado)"],
  ];
  return (
    <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <p className="text-sm text-muted-foreground">Desmarque para esconder do menu público. As rotas continuam existindo.</p>
      {items.map(([k, label]) => (
        <label key={k} className="flex items-center gap-3 rounded-md border border-border p-3 text-sm">
          <input type="checkbox" checked={!!form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.checked }))} />
          {label}
        </label>
      ))}
      <SaveButton loading={save.isPending} />
    </form>
  );
}

/* ---------------------- MEMORY ITEMS ---------------------- */
type MemoryRow = {
  id: string; title: string; year_label: string | null; description: string | null;
  image_url: string | null; sort_order: number; is_active: boolean;
};
function MemoryForm({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin", "site_memory", orgId],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_memory_items").select("id,title,year_label,description,image_url,sort_order,is_active").eq("organization_id", orgId).order("sort_order").order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as MemoryRow[];
    },
  });
  const invalidate = () => { qc.invalidateQueries({ queryKey: ["admin", "site_memory", orgId] }); qc.invalidateQueries({ queryKey: ["site", "memory"] }); };
  const create = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_memory_items").insert({ organization_id: orgId, title: "Novo item", sort_order: rows.length });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro."),
  });
  const upd = useMutation({
    mutationFn: async (row: Partial<MemoryRow> & { id: string }) => {
      const { id, ...rest } = row;
      const { error } = await supabase.from("site_memory_items").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Salvo."); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro."),
  });
  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_memory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido."); invalidate(); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro."),
  });
  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  return (
    <div className="space-y-4">
      <button type="button" onClick={() => create.mutate()} className="inline-flex items-center gap-2 rounded-md border border-border-strong px-3 py-2 text-xs font-medium hover:bg-surface">
        <Plus className="h-3.5 w-3.5" /> Adicionar item
      </button>
      {rows.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item ainda.</p>}
      {rows.map((r) => (
        <MemoryRowEditor key={r.id} row={r} onSave={(patch) => upd.mutate({ id: r.id, ...patch })} onDelete={() => { if (confirm("Remover este item?")) del.mutate(r.id); }} />
      ))}
    </div>
  );
}
function MemoryRowEditor({ row, onSave, onDelete }: { row: MemoryRow; onSave: (patch: Partial<MemoryRow>) => void; onDelete: () => void }) {
  const [f, setF] = useState<MemoryRow>(row);
  useEffect(() => setF(row), [row]);
  return (
    <div className="space-y-3 rounded-md border border-border p-4">
      <div className="grid gap-3 md:grid-cols-[1fr,140px]">
        <Field label="Título"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
        <Field label="Ano"><input className={inputCls} value={f.year_label ?? ""} onChange={(e) => setF({ ...f, year_label: e.target.value })} /></Field>
      </div>
      <Field label="Descrição"><textarea className={textareaCls} value={f.description ?? ""} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <Field label="URL da imagem"><input className={inputCls} value={f.image_url ?? ""} onChange={(e) => setF({ ...f, image_url: e.target.value })} /></Field>
      <div className="flex flex-wrap items-center gap-3">
        <Field label="Ordem"><input type="number" className={`${inputCls} w-24`} value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: Number(e.target.value) || 0 })} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} /> Ativo</label>
        <div className="ml-auto flex gap-2">
          <button type="button" onClick={onDelete} className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </button>
          <button type="button" onClick={() => onSave(f)} className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-background">
            <Save className="h-3.5 w-3.5" /> Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- SEO ---------------------- */
const SEO_PAGES: { key: SitePage; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "sobre", label: "Nossa História" },
  { key: "contato", label: "Contato" },
  { key: "experiencias", label: "Experiências" },
  { key: "eventos", label: "Eventos (lista)" },
];
function SeoForm({ orgId }: { orgId: string }) {
  return (
    <div className="space-y-6">
      {SEO_PAGES.map((p) => <SeoBlock key={p.key} orgId={orgId} pageKey={p.key} label={p.label} />)}
    </div>
  );
}
function SeoBlock({ orgId, pageKey, label }: { orgId: string; pageKey: SitePage; label: string }) {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin", "site_seo", orgId, pageKey],
    queryFn: async () => (await supabase.from("site_seo").select("*").eq("organization_id", orgId).eq("page_key", pageKey).maybeSingle()).data,
  });
  const [f, setF] = useState<{ title: string; description: string; og_image_url: string }>({ title: "", description: "", og_image_url: "" });
  useEffect(() => { if (data) setF({ title: data.title ?? "", description: data.description ?? "", og_image_url: data.og_image_url ?? "" }); }, [data]);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_seo").upsert({ organization_id: orgId, page_key: pageKey, ...f } as never, { onConflict: "organization_id,page_key" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`${label} salvo.`); qc.invalidateQueries({ queryKey: ["admin", "site_seo", orgId, pageKey] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro."),
  });
  return (
    <form className="space-y-3 rounded-md border border-border p-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
      <h3 className="font-display text-sm font-semibold">{label}</h3>
      <Field label="Title (até ~60 caracteres)"><input className={inputCls} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></Field>
      <Field label="Description (até ~160 caracteres)"><textarea className={textareaCls} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
      <Field label="OG image URL (opcional)"><input className={inputCls} value={f.og_image_url} onChange={(e) => setF({ ...f, og_image_url: e.target.value })} /></Field>
      <SaveButton loading={save.isPending} />
    </form>
  );
}
