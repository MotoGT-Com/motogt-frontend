import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend from "i18next-http-backend";

// TODO: After backend migration, sync language preference with user.preferred_language_id
// When user logs in: read preferred_language_id from user profile and call i18n.changeLanguage()
// When user changes language: update both localStorage and user.preferred_language_id via API

const namespaces = [
  "common",
  "auth",
  "shop",
  "product",
  "cart",
  "checkout",
  "garage",
  "profile",
  "home",
  "guest-checkout",
  "guest-order",
  "track-order",
];

const isBrowser = typeof document !== "undefined";

type InitOptions = {
  language?: string;
  loadPath?: string;
};

const loadServerResources = async (language: string) => {
  const resources: Record<string, Record<string, string>> = {};
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const localesDir = path.join(process.cwd(), "public", "locales");

  await Promise.all(
    namespaces.map(async (ns) => {
      try {
        const filePath = path.join(localesDir, language, `${ns}.json`);
        const raw = await readFile(filePath, "utf-8");
        resources[ns] = JSON.parse(raw);
      } catch {
        resources[ns] = {};
      }
    })
  );

  return { [language]: resources };
};

export async function initI18n(options: InitOptions = {}) {
  const { language, loadPath } = options;
  const initialLanguage = language ?? "ar";

  if (!i18n.isInitialized) {
    if (isBrowser) {
      i18n.use(HttpBackend);
      i18n.use(LanguageDetector);
    }
    i18n.use(initReactI18next);

    const resources = isBrowser ? undefined : await loadServerResources(initialLanguage);

    await i18n.init({
      // Default language
      fallbackLng: "ar",
      lng: initialLanguage,
      resources,

      // Namespaces to load
      ns: namespaces,
      defaultNS: "common",

      // Language detection configuration
      detection: isBrowser
        ? {
            order: ["cookie", "localStorage", "navigator"],
            caches: [],
            lookupCookie: "lng",
            lookupLocalStorage: "motogt-language",
          }
        : undefined,

      // Backend configuration for loading translation files
      backend: isBrowser
        ? {
            loadPath: loadPath ?? "/locales/{{lng}}/{{ns}}.json",
          }
        : undefined,

      // React configuration
      react: {
        useSuspense: false,
      },

      // Interpolation configuration
      interpolation: {
        escapeValue: false,
      },

      // Supported languages
      supportedLngs: ["en", "ar"],

      // Show console warnings in development
      debug: false,
    });
  } else if (language && i18n.language !== language) {
    if (!isBrowser) {
      const serverResources = await loadServerResources(initialLanguage);
      const namespacesForLang = serverResources[initialLanguage] || {};
      Object.entries(namespacesForLang).forEach(([ns, resources]) => {
        i18n.addResourceBundle(initialLanguage, ns, resources, true, true);
      });
    }
    await i18n.changeLanguage(initialLanguage);
  }

  return i18n;
}

export default i18n;
