import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  EVENT_STATUSES,
  EVENT_STATUS_LABEL,
  eventFormSchema,
  isoToLocalInput,
  localInputToIso,
  slugify,
  type EventFormValues,
  type EventStatus,
} from "@/lib/events";
import { useOrgMembership } from "@/hooks/use-org-membership";
import { CoverUpload } from "./CoverUpload";

export type EventFormRecord = {
  id?: string;
  title: string;
  slug: string;
  status: EventStatus;
  starts_at: string | null;
  ends_at: string | null;
  venue_name: string | null;
  city: string | null;
  short_description: string | null;
  cover_image_url: string | null;
  long_description: string | null;
  instagram_url: string | null;
  external_ticket_url: string | null;
};


export function EventForm({
  mode,
  initial,
}: {
  mode: "create" | "edit";
  initial?: EventFormRecord;
}) {
  const navigate = useNavigate();
  const { data: membership } = useOrgMembership();
  const [submitting, setSubmitting] = useState(false);

  type FormInput = import("zod").input<typeof eventFormSchema>;
  const form = useForm<FormInput, unknown, EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: initial?.title ?? "",
      slug: initial?.slug ?? "",
      status: initial?.status ?? "draft",
      starts_at: initial?.starts_at
        ? isoToLocalInput(initial.starts_at)
        : "",
      ends_at: initial?.ends_at ? isoToLocalInput(initial.ends_at) : "",
      venue_name: initial?.venue_name ?? "",
      city: initial?.city ?? "",
      short_description: initial?.short_description ?? "",
      cover_image_url: initial?.cover_image_url ?? "",
      long_description: initial?.long_description ?? "",
      instagram_url: initial?.instagram_url ?? "",
      external_ticket_url: initial?.external_ticket_url ?? "",
    },

  });

  const titleValue = form.watch("title");
  const slugValue = form.watch("slug");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");

  useEffect(() => {
    if (mode === "create" && !slugTouched && titleValue) {
      form.setValue("slug", slugify(titleValue), { shouldValidate: true });
    }
  }, [titleValue, slugTouched, mode, form]);

  async function onSubmit(values: EventFormValues) {
    if (!membership) {
      toast.error("Sem organização ativa.");
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user!.id;
      const orgId = membership.organization_id;

      const payload = {
        organization_id: orgId,
        title: values.title,
        slug: values.slug,
        status: values.status,
        starts_at: values.starts_at
          ? localInputToIso(values.starts_at as unknown as string)
          : null,
        ends_at: values.ends_at
          ? localInputToIso(values.ends_at as unknown as string)
          : null,
        venue_name: values.venue_name,
        city: values.city,
        short_description: values.short_description,
        cover_image_url: values.cover_image_url,
      };

      if (mode === "create") {
        const { data, error } = await supabase
          .from("events")
          .insert(payload)
          .select("id, status")
          .single();
        if (error) throw error;
        await supabase.rpc("record_audit_event", {
          _organization_id: orgId,
          _actor_user_id: uid,
          _action: "event.create",
          _entity_type: "event",
          _entity_id: data.id,
          _metadata: { title: values.title, slug: values.slug, status: values.status },
        });
        toast.success("Evento criado.");
        navigate({ to: "/admin/eventos" });
      } else {
        const id = initial!.id!;
        const { error } = await supabase
          .from("events")
          .update(payload)
          .eq("id", id);
        if (error) throw error;

        const statusChanged = initial!.status !== values.status;
        await supabase.rpc("record_audit_event", {
          _organization_id: orgId,
          _actor_user_id: uid,
          _action: statusChanged ? "event.status_change" : "event.update",
          _entity_type: "event",
          _entity_id: id,
          _metadata: {
            title: values.title,
            slug: values.slug,
            ...(statusChanged
              ? { from: initial!.status, to: values.status }
              : {}),
          },
        });
        toast.success("Evento atualizado.");
        navigate({ to: "/admin/eventos" });
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  const errors = form.formState.errors;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
      <Field label="Título" error={errors.title?.message}>
        <input
          type="text"
          {...form.register("title")}
          className="input"
          placeholder="Ex.: Réveillon Prudente 2026"
          maxLength={200}
        />
      </Field>

      <Field
        label="Slug (URL pública)"
        error={errors.slug?.message}
        hint={slugValue ? `/eventos/${slugValue}` : undefined}
      >
        <input
          type="text"
          {...form.register("slug")}
          onChange={(e) => {
            setSlugTouched(true);
            form.setValue("slug", e.target.value, { shouldValidate: true });
          }}
          className="input"
          placeholder="reveillon-prudente-2026"
          maxLength={120}
        />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Início" error={errors.starts_at?.message}>
          <input
            type="datetime-local"
            {...form.register("starts_at")}
            className="input"
          />
        </Field>
        <Field label="Fim" error={errors.ends_at?.message}>
          <input
            type="datetime-local"
            {...form.register("ends_at")}
            className="input"
          />
        </Field>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Local" error={errors.venue_name?.message}>
          <input
            type="text"
            {...form.register("venue_name")}
            className="input"
            placeholder="Ex.: Espaço Prudente"
            maxLength={160}
          />
        </Field>
        <Field label="Cidade" error={errors.city?.message}>
          <input
            type="text"
            {...form.register("city")}
            className="input"
            placeholder="Ex.: Presidente Prudente"
            maxLength={120}
          />
        </Field>
      </div>

      <Field
        label="Descrição curta"
        error={errors.short_description?.message}
        hint="Máx. 600 caracteres. Aparece em listagens e OG tags."
      >
        <textarea
          {...form.register("short_description")}
          rows={3}
          className="input resize-y"
          maxLength={600}
        />
      </Field>

      {mode === "edit" && initial?.id && membership ? (
        <CoverUpload
          organizationId={membership.organization_id}
          eventId={initial.id}
          value={form.watch("cover_image_url") ?? null}
          onChange={(url) =>
            form.setValue("cover_image_url", url ?? "", { shouldValidate: true, shouldDirty: true })
          }
          onAudit={async (action, metadata) => {
            const { data: userRes } = await supabase.auth.getUser();
            if (!userRes.user) return;
            await supabase.rpc("record_audit_event", {
              _organization_id: membership.organization_id,
              _actor_user_id: userRes.user.id,
              _action: action,
              _entity_type: "event",
              _entity_id: initial.id!,
              _metadata: metadata as unknown as import("@/integrations/supabase/types").Json,
            });
          }}
        />
      ) : (
        <Field
          label="URL da capa (https://)"
          error={errors.cover_image_url?.message}
          hint="Salve o evento primeiro para enviar uma capa pelo storage seguro."
        >
          <input
            type="url"
            {...form.register("cover_image_url")}
            className="input"
            placeholder="https://..."
          />
        </Field>
      )}

      <Field label="Status" error={errors.status?.message}>
        <select {...form.register("status")} className="input">
          {EVENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {EVENT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </Field>

      <div className="flex flex-wrap items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {mode === "create" ? "Criar evento" : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => navigate({ to: "/admin/eventos" })}
          className="rounded-md border border-border-strong px-4 py-2.5 text-sm font-medium hover:bg-accent"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <div className="mt-2">{children}</div>
      {hint && !error && (
        <span className="mt-1.5 block text-xs text-muted-foreground">
          {hint}
        </span>
      )}
      {error && (
        <span className="mt-1.5 block text-xs text-destructive">{error}</span>
      )}
    </label>
  );
}
