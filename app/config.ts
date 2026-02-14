type LanguageIds = {
  en: string;
  ar: string;
};

type AppConfig = {
  googleAnalyticsId: string;
  tidioId: string;
  apiBaseUrl: string;
  defaultStoreId: string;
  languageIds: LanguageIds;
  supportPhoneNumber: string;
  supportWhatsappNumber: string;
};

const env = import.meta.env;

const getEnv = (key: string, fallback = ""): string => {
  // In production server-side, check process.env as well
  if (typeof window === "undefined" && typeof process !== "undefined") {
    const processEnvValue = process.env[key];
    if (processEnvValue) return processEnvValue;
  }
  const value = env[key];
  return value ?? fallback;
};

export const config: AppConfig = {
  googleAnalyticsId: getEnv("VITE_GA_ID", ""),
  tidioId: getEnv("VITE_TIDIO_ID", ""),
  apiBaseUrl: getEnv("VITE_API_BASE_URL", "https://api.motogt.com"),
  defaultStoreId: getEnv(
    "VITE_DEFAULT_STORE_ID",
    "19bf2cb6-1b50-4b95-80d6-9da6560588fc"
  ),
  languageIds: {
    en: getEnv(
      "VITE_LANGUAGE_ID_EN",
      "3a59981f-5f2d-4b3e-a12a-2c2b25b4680b"
    ),
    ar: getEnv(
      "VITE_LANGUAGE_ID_AR",
      "16d69bac-4236-4e4d-8642-5250a4bfcbb8"
    ),
  },
  supportPhoneNumber: getEnv("VITE_SUPPORT_PHONE", "962793003737"),
  supportWhatsappNumber: getEnv(
    "VITE_SUPPORT_WHATSAPP_NUMBER",
    "962793003737"
  ),
};
