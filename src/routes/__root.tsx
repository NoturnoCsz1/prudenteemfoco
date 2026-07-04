import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-primary">
          404
        </p>
        <h1 className="mt-4 text-4xl font-semibold text-foreground">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          O conteúdo que você procura não existe ou foi movido. A plataforma
          está em evolução — novas seções serão publicadas em breve.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Voltar para o início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-foreground">
          Algo não carregou como esperado
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Tente novamente. Se persistir, retorne ao início.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
          >
            Tentar novamente
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-border-strong bg-transparent px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Ir para o início
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#0b0b0d" },
      { title: "Prudente em Foco — Eventos, experiências e produção" },
      {
        name: "description",
        content:
          "Plataforma institucional da Prudente em Foco: eventos, experiências, produção e operação profissional. Uma nova fase, construída com tecnologia e memória.",
      },
      { name: "author", content: "Prudente em Foco" },
      { property: "og:title", content: "Prudente em Foco — Eventos, experiências e produção" },
      {
        property: "og:description",
        content:
          "Plataforma própria de eventos, experiências e operação. Uma nova fase da Prudente em Foco.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Prudente em Foco" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Prudente em Foco — Eventos, experiências e produção" },
      {
        name: "twitter:description",
        content: "Plataforma institucional de eventos e experiências.",
      },
      { name: "description", content: "Plataforma institucional da Prudente em Foco: eventos, experiências, produção e operação profissional. Uma nova fase, construída com tecnologia e memória." },
      { property: "og:description", content: "Plataforma institucional da Prudente em Foco: eventos, experiências, produção e operação profissional. Uma nova fase, construída com tecnologia e memória." },
      { name: "twitter:description", content: "Plataforma institucional da Prudente em Foco: eventos, experiências, produção e operação profissional. Uma nova fase, construída com tecnologia e memória." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9b3548b4-d3cc-4b3a-aee6-76e566678ea8/id-preview-883861b2--ba325010-9cf7-4950-8a26-4620486464b7.lovable.app-1783175577907.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/9b3548b4-d3cc-4b3a-aee6-76e566678ea8/id-preview-883861b2--ba325010-9cf7-4950-8a26-4620486464b7.lovable.app-1783175577907.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=Anton&family=Archivo+Black&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();

  useEffect(() => {
    // Sincroniza rotas e cache com transições de sessão.
    // Filtrado para não disparar em TOKEN_REFRESHED/INITIAL_SESSION.
    import("../integrations/supabase/client").then(({ supabase }) => {
      const { data: sub } = supabase.auth.onAuthStateChange((event) => {
        if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
        router.invalidate();
        if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      });
      // Guarda subscription no window para cleanup em HMR
      (window as unknown as { __pfSub?: typeof sub.subscription }).__pfSub = sub.subscription;
    });
    return () => {
      const w = window as unknown as { __pfSub?: { unsubscribe: () => void } };
      w.__pfSub?.unsubscribe();
      w.__pfSub = undefined;
    };
  }, [router, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-right" theme="dark" richColors />
    </QueryClientProvider>
  );
}
