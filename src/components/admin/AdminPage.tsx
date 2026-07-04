import { Construction } from "lucide-react";

export function AdminPageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-border pb-6">
      <h1 className="text-2xl font-semibold md:text-3xl">{title}</h1>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function AdminPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mt-8 rounded-xl border border-dashed border-border-strong bg-surface/40 p-8">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Construction className="h-5 w-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
      <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">
        Fase 0 · Shell administrativo
      </p>
    </div>
  );
}
