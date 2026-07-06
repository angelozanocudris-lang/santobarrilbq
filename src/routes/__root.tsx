import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { CartFab } from "@/components/CartFab";

const Toaster = lazy(() => import("sonner").then((m) => ({ default: m.Toaster })));

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La página que buscas no existe.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "SANTO BARRIL BAQ" },
      { name: "description", content: "Pide tu parrilla favorita en  SANTO BARRIL BAQ Domicilios por WhatsApp." },
      { name: "author", content: "SANTO BARRIL" },
      { property: "og:title", content: "SANTO BARRIL BAQ" },
      { property: "og:description", content: "Pide tu parrilla favorita en  SANTO BARRIL BAQ Domicilios por WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "SANTO BARRIL BAQ" },
      { name: "twitter:description", content: "Pide tu parrilla favorita en  SANTO BARRIL BAQ Domicilios por WhatsApp." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/Sw3yDTWbcdZJMSwtjP1P6R97BAw2/social-images/social-1779250316822-IMG_3192.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/Sw3yDTWbcdZJMSwtjP1P6R97BAw2/social-images/social-1779250316822-IMG_3192.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "dns-prefetch", href: "https://ibvrdeyotaxpgotrhcoh.supabase.co" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
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
  return (
    <>
      <Outlet />
      <CartFab />
      <Suspense fallback={null}>
        <Toaster theme="dark" position="top-center" richColors />
      </Suspense>
    </>
  );
}
