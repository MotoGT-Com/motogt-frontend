import { data, isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, type MiddlewareFunction, useLoaderData, } from "react-router";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";

import type { Route } from "./+types/root";
import "./app.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "~/components/ui/sonner";
import { globalAuthMiddleware } from "./lib/auth-middleware";
import { I18nextProvider } from "react-i18next";
import i18n from "./lib/i18n";
import { lazy, Suspense, useEffect, useState } from "react";
import { config } from "./config";
import { getLocaleWithCookie } from "./lib/i18n-cookie";
import { AuthModalProvider } from "./context/AuthModalContext";
import { useIdleReady, idleReadyRootNonCriticalScripts } from "~/hooks/use-idle-ready";
import { CurrencyProvider } from "~/hooks/use-currency";

const GoogleAnalytics = lazy(() =>
  import("~/components/google-analytics").then((module) => ({
    default: module.GoogleAnalytics,
  }))
);
const SpeedInsights = lazy(() =>
  import("@vercel/speed-insights/react").then((module) => ({
    default: module.SpeedInsights,
  }))
);
const AuthModal = lazy(() =>
  import("~/components/auth/AuthModal").then((m) => ({ default: m.AuthModal }))
);

export const middleware: MiddlewareFunction[] = [globalAuthMiddleware];

export function links() {
  return [
    { rel: "preconnect", href: "https://api.motogt.com" },
    { rel: "preconnect", href: "https://www.googletagmanager.com" },
    { rel: "dns-prefetch", href: "https://api.motogt.com" },
    { rel: "dns-prefetch", href: "https://www.googletagmanager.com" },
    {
      rel: "preload",
      href: "/fonts/inter-latin-wght-normal.woff2",
      as: "font",
      type: "font/woff2",
      crossOrigin: "anonymous",
    },
    {
      rel: "preload",
      href: "/fonts/koulen-latin-400-normal.woff2",
      as: "font",
      type: "font/woff2",
      crossOrigin: "anonymous",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const { locale, setCookie } = await getLocaleWithCookie(request);
  const headers = new Headers();
  if (setCookie) {
    headers.append("Set-Cookie", setCookie);
  }
  return data(
    { locale },
    {
      headers,
    }
  );
}

export const meta: Route.MetaFunction = () => {
  return [
    { title: "MotoGT - Transform Your Ride" },
    {
      name: "description",
      content:
        "Transform your ride with MotoGT. The MENA platform for car styling and cars accessories. Guaranteed fitment, creator built proof, fast delivery, and diverse options.",
    },
    {
      property: "og:type",
      content: "website",
    },
    {
      property: "og:site_name",
      content: "MotoGT",
    },
    {
      property: "og:title",
      content: "MotoGT - Transform Your Ride",
    },
    {
      property: "og:url",
      content: "https://motogt.com",
    },
    {
      property: "og:description",
      content:
        "Transform your ride with MotoGT. The MENA platform for car styling and cars accessories. Guaranteed fitment, creator built proof, fast delivery, and diverse options.",
    },
    {
      property: "og:image",
      content: "https://motogt.com/og-image.jpg",
    },
    {
      property: "og:image:width",
      content: "1200",
    },
    {
      property: "og:image:height",
      content: "630",
    },
    {
      name: "twitter:card",
      content: "summary_large_image",
    },
    {
      name: "twitter:title",
      content: "MotoGT - Transform Your Ride",
    },
    {
      name: "twitter:description",
      content:
        "Transform your ride with MotoGT. The MENA platform for car styling and cars accessories. Guaranteed fitment, creator built proof, fast delivery, and diverse options.",
    },
    {
      name: "twitter:image",
      content: "https://motogt.com/og-image.jpg",
    },
  ];
};

export function Layout({ children }: { children: React.ReactNode }) {
  // Create a new QueryClient per request to prevent cross-user data leaks during SSR
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
      },
    },
  }));
  const loaderData = useLoaderData<typeof loader>();
  const currentLang = loaderData?.locale ?? "ar";
  const dir = currentLang === "ar" ? "rtl" : "ltr";
  const loadNonCriticalScripts = useIdleReady(idleReadyRootNonCriticalScripts);

  useEffect(() => {
    // Update HTML attributes when language changes (client-side only)
    const updateHtmlAttributes = () => {
      const lang = i18n.language;
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    };

    // Listen for language changes
    i18n.on('languageChanged', updateHtmlAttributes);

    return () => {
      i18n.off('languageChanged', updateHtmlAttributes);
    };
  }, []);

  return (
    <html lang={currentLang} dir={dir}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="google-site-verification" content="ifoBponjdgiewA3DS35cQdKfaLusWjmlFcOGDrhggME" />
        <meta name="msvalidate.01" content="28C371A61003CC50B7A16D28779F1B74" />
        <meta name="version" content="1.1.1" />
        <meta name="application-version" content="1.1.1" />
        {/* Version: 1.1.1 */}
        <Meta />
        <Links />
        {/* dataLayer stub — buffers gtag() calls until the GA script loads post-hydration */}
        {config.googleAnalyticsId && (
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}`,
            }}
          />
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__MOTOGT_VERSION__='1.1.1';window.__MOTOGT_BUILD_INFO__={version:'1.1.1'}`,
          }}
        />
      </head>
      <body className="font-sans min-h-screen flex flex-col bg-background-secondary">
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <CurrencyProvider>
              <AuthModalProvider>
                {children}
                <Suspense fallback={null}>
                  <AuthModal />
                </Suspense>
              </AuthModalProvider>
            </CurrencyProvider>
          </QueryClientProvider>
        </I18nextProvider>
        <Toaster className="hidden" />
        <ScrollRestoration />
        <Scripts />
        {loadNonCriticalScripts ? (
          <Suspense fallback={null}>
            {config.googleAnalyticsId && <GoogleAnalytics id={config.googleAnalyticsId} />}
            <SpeedInsights />
          </Suspense>
        ) : null}
      </body>
    </html>
  );
}

export default function App() {
  return (
    <NuqsAdapter>
      <Outlet />
    </NuqsAdapter>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (error && error instanceof Error) {
    // Always log the real error so it appears in server logs (AWS App Runner / CloudWatch)
    console.error("[MotoGT] Uncaught error:", error.message, error.stack);
    if (import.meta.env.DEV) {
      details = error.message;
      stack = error.stack;
    }
  }

  return (
    <main className="pt-16 p-4 container mx-auto flex flex-col items-center justify-center min-h-[50vh]">
      <h1 className="text-3xl font-bold mb-4">{message}</h1>
      <p className="text-lg text-muted-foreground mb-6">{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
      {!stack && (
        <a href="/" className="text-primary underline">
          Go back to the homepage
        </a>
      )}
    </main>
  );
}
