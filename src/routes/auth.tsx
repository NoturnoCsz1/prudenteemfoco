import { createFileRoute, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { LogIn, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const searchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Prudente em Foco" },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (search) => searchSchema.parse(search),
  component: AuthPage,
});

type Mode = "signin" | "signup";

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(true);

  // Se já autenticado, manda direto para o destino ou /admin.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      if (data.user) {
        const dest = safeRedirect(search.redirect) ?? "/admin";
        navigate({ to: dest, replace: true });
      } else {
        setChecking(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [navigate, search.redirect, pathname]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta.");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { display_name: displayName || undefined },
          },
        });
        if (error) throw error;
        toast.success("Conta criada.");
      }
      const dest = safeRedirect(search.redirect) ?? "/admin";
      navigate({ to: dest, replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Falha na autenticação.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-16">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span className="font-display font-semibold text-foreground">Prudente em Foco</span>
        </Link>

        <div className="rounded-2xl border border-border bg-surface p-6 md:p-8">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold">
            {mode === "signin" ? "Acessar plataforma" : "Criar conta"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Área administrativa restrita. Entre com seu e-mail e senha."
              : "Cadastre-se para acessar a área administrativa."}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <Field
                label="Nome de exibição"
                type="text"
                value={displayName}
                onChange={setDisplayName}
                autoComplete="name"
                placeholder="Como devemos te chamar"
              />
            )}
            <Field
              label="E-mail"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
              placeholder="voce@exemplo.com"
            />
            <Field
              label="Senha"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
            />

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Ainda não tem conta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className="font-medium text-foreground hover:text-primary"
                >
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="font-medium text-foreground hover:text-primary"
                >
                  Entrar
                </button>
              </>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Acesso restrito. Todas as ações administrativas serão registradas em
          trilha de auditoria em fases futuras.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  ...rest
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type">) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring"
        {...rest}
      />
    </label>
  );
}

function safeRedirect(input?: string): string | null {
  if (!input) return null;
  // Aceita apenas caminhos relativos same-origin.
  if (!input.startsWith("/") || input.startsWith("//")) return null;
  return input;
}
