const SUPPORTED_LANGUAGES = ["en", "ar"] as const;
const DEFAULT_LANGUAGE = "en";

const getCookieValue = (cookieHeader: string | null, name: string) => {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
};

const parseCookieLanguage = (cookieHeader: string | null) => {
  const raw = getCookieValue(cookieHeader, "lng");
  return normalizeLanguage(raw);
};

export const normalizeLanguage = (lang: string | null | undefined) => {
  if (!lang) return null;
  const normalized = lang.toLowerCase().split("-")[0];
  return SUPPORTED_LANGUAGES.includes(
    normalized as (typeof SUPPORTED_LANGUAGES)[number]
  )
    ? normalized
    : null;
};

export async function getLocaleFromRequest(request: Request): Promise<string> {
  const cookieHeader = request.headers.get("Cookie");
  const cookieLang = parseCookieLanguage(cookieHeader);
  if (cookieLang) {
    return cookieLang;
  }
  return DEFAULT_LANGUAGE;
}

export async function getLocaleWithCookie(
  request: Request
): Promise<{ locale: string; setCookie?: string }> {
  const cookieHeader = request.headers.get("Cookie");
  const cookieLang = parseCookieLanguage(cookieHeader);
  if (cookieLang) {
    return { locale: cookieLang };
  }
  const locale = DEFAULT_LANGUAGE;
  const setCookie = serializeLanguageCookie(locale);
  return { locale, setCookie };
}

export function serializeLanguageCookie(language: string) {
  const maxAge = 60 * 60 * 24 * 365;
  return `lng=${encodeURIComponent(language)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}
