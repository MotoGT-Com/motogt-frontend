import { useState, useEffect } from "react";
import { X, UserCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthModal } from "~/context/AuthModalContext";

const SESSION_KEY_PREFIX = "guest_banner_dismissed_";

export function GuestBanner({ type }: { type: "garage" | "wishlist" }) {
  const { t } = useTranslation("common");
  const { i18n } = useTranslation();
  const { openAuthModal } = useAuthModal();
  const isRTL = (i18n.language || "").startsWith("ar");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = sessionStorage.getItem(`${SESSION_KEY_PREFIX}${type}`);
      if (!dismissed) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [type]);

  function dismiss() {
    try {
      sessionStorage.setItem(`${SESSION_KEY_PREFIX}${type}`, "1");
    } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  const isGarage = type === "garage";

  const message = isRTL
    ? isGarage
      ? "أنت تتصفح كضيف. سيارتك محفوظة على هذا الجهاز فقط."
      : "أنت تتصفح كضيف. قائمة أمنياتك محفوظة على هذا الجهاز فقط."
    : isGarage
    ? "You're browsing as a guest. Your garage is saved on this device only."
    : "You're browsing as a guest. Your wishlist is saved on this device only.";

  const ctaText = isRTL ? "إنشاء حساب" : "Create an account";
  const ctaSuffix = isRTL ? "للوصول من أي جهاز." : "to sync across all your devices.";

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="w-full border-b border-[#e0e0e0] bg-[#f5f5f5]"
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Left: icon + text */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 flex items-center justify-center w-7 h-7 rounded-full bg-[#cf172f]/10">
            <UserCircle className="size-4 text-[#cf172f]" />
          </div>
          <p className="text-sm text-[#333] leading-snug min-w-0">
            {message}{" "}
            <button
              type="button"
              onClick={() => openAuthModal("register", { intent: { type: "none" } })}
              className="text-[#cf172f] font-semibold hover:text-[#a01124] transition-colors duration-150 underline underline-offset-2"
            >
              {ctaText}
            </button>{" "}
            <span className="text-[#555]">{ctaSuffix}</span>
          </p>
        </div>

        {/* Right: Sign in link + dismiss */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => openAuthModal("login", { intent: { type: "none" } })}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#cf172f] border border-[#cf172f] rounded-[2px] hover:bg-[#cf172f] hover:text-white transition-colors duration-150 whitespace-nowrap"
          >
            {isRTL ? "تسجيل الدخول" : "Sign in"}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="text-[#999] hover:text-[#333] transition-colors duration-150"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
