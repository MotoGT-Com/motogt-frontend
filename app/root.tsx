import { data, isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, type MiddlewareFunction, useLoaderData, } from "react-router";
import { NuqsAdapter } from "nuqs/adapters/react-router/v7";

import type { Route } from "./+types/root";
import "./app.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "~/components/ui/sonner";
import { globalAuthMiddleware } from "./lib/auth-middleware";
import "@fontsource/koulen";
import "@fontsource-variable/inter";
import "@fontsource-variable/inter/wght-italic.css";
import { I18nextProvider } from "react-i18next";
import i18n from "./lib/i18n";
import { useEffect } from "react";
import { config } from "./config";
import { getLocaleWithCookie } from "./lib/i18n-cookie";
import { AuthModalProvider } from "./context/AuthModalContext";
import { AuthModal } from "./components/auth/AuthModal";

const queryClient = new QueryClient();

export const middleware: MiddlewareFunction[] = [globalAuthMiddleware];

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
  const loaderData = useLoaderData<typeof loader>();
  const currentLang = loaderData?.locale ?? "en";
  const dir = currentLang === "ar" ? "rtl" : "ltr";

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
        {/* <!-- Google tag (gtag.js) --> */}
        {config.googleAnalyticsId && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${config.googleAnalyticsId}`}
            ></script>
            <script
              dangerouslySetInnerHTML={{
                __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());

                gtag('config', '${config.googleAnalyticsId}');`,
              }}
            ></script>
          </>
        )}
        {config.tidioId && (
          <script
            src={`//code.tidio.co/${config.tidioId}.js`}
            async
          ></script>
        )}
        {/* Hide Tidio widget by default */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // MotoGT Application Version
              window.__MOTOGT_VERSION__ = '1.1.1';
              window.__MOTOGT_BUILD_INFO__ = {
                version: '1.1.1'
              };
              
              window.addEventListener('load', function() {
                // Hide Tidio widget by default on all pages
                const hideTidioWidget = () => {
                  if (window.tidioChatApi) {
                    window.tidioChatApi.hide();
                  } else {
                    setTimeout(hideTidioWidget, 100);
                  }
                };
                hideTidioWidget();
              });
            `,
          }}
        />
      </head>
      <body className="font-sans min-h-screen flex flex-col bg-background-secondary">
        <I18nextProvider i18n={i18n}>
          <QueryClientProvider client={queryClient}>
            <AuthModalProvider>
              {children}
              <AuthModal />
            </AuthModalProvider>
          </QueryClientProvider>
        </I18nextProvider>
        <Toaster className="hidden" />
        <ScrollRestoration />
        <Scripts />
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
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
