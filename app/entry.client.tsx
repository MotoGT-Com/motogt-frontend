import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import i18n, { i18nNamespaces, initI18n } from "./lib/i18n";

const initialLang = document.documentElement.lang || "en";

initI18n({ language: initialLang })
  .then(() => i18n.loadNamespaces([...i18nNamespaces]))
  .catch(() => {
  })
  .finally(() => {
    startTransition(() => {
      hydrateRoot(
        document,
        <StrictMode>
          <HydratedRouter />
        </StrictMode>
      );
    });
  });
