type LanguageIds = {
  en: string;
  ar: string;
};

type AppConfig = {
  /** Google Tag Manager container ID, e.g. GTM-XXXXXXX */
  googleTagManagerId: string;
  /**
   * Session replay / UX analytics script URL (Contentsquare tag, formerly Hotjar-style).
   * Set empty via env to disable.
   */
  sessionReplayScriptSrc: string;
  apiBaseUrl: string;
  defaultStoreId: string;
  languageIds: LanguageIds;
  supportPhoneNumber: string;
  supportWhatsappNumber: string;
  whatsappOrderNumber: string;
};

const env = import.meta.env;

const getEnv = (key: string, fallback = ""): string => {
  // In production server-side, check process.env as well
  if (typeof window === "undefined" && typeof process !== "undefined") {
    const processEnvValue = process.env[key];
    if (processEnvValue && processEnvValue.trim() !== "") return processEnvValue;
  }
  const value = env[key];
  if (typeof value === "string" && value.trim() !== "") return value;
  return fallback;
};

export const config: AppConfig = {
  googleTagManagerId: getEnv("VITE_GTM_ID", "GTM-NJF7T45N"),
  sessionReplayScriptSrc: getEnv(
    "VITE_SESSION_REPLAY_SCRIPT_SRC",
    "https://t.contentsquare.net/uxa/7047d6ef9a0cb.js"
  ),
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
  whatsappOrderNumber: getEnv(
    "VITE_WHATSAPP_NUMBER",
    getEnv("VITE_SUPPORT_WHATSAPP_NUMBER", "962793003737")
  ),
};
