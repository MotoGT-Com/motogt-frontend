import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";
import { initI18n } from "./lib/i18n";

const initialLang = document.documentElement.lang || "ar";

initI18n({ language: initialLang })
  .catch((error) => {
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
