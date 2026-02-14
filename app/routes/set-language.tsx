import { data } from "react-router";
import { normalizeLanguage, serializeLanguageCookie } from "~/lib/i18n-cookie";

export async function loader({ request }: { request: Request }) {
  const url = new URL(request.url);
  const lang = normalizeLanguage(url.searchParams.get("lang")) ?? "ar";
  const setCookie = await serializeLanguageCookie(lang);
  return data(
    { ok: true, lang },
    {
      headers: {
        "Set-Cookie": setCookie,
      },
    }
  );
}
