import { useEffect } from "react";

export function GoogleAnalytics({ id }: { id: string }) {
  useEffect(() => {
    if (!id) return;
    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    script.async = true;
    script.onload = () => {
      window.gtag?.("js", new Date());
      window.gtag?.("config", id);
    };
    document.head.appendChild(script);
  }, [id]);

  return null;
}
