import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { SimpleCard } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { CheckCircle2, Copy, Check } from "lucide-react";
import { useAuthModal } from "~/context/AuthModalContext";

export default function GuestOrderConfirmation() {
  const { t } = useTranslation("guest-order");
  const [searchParams] = useSearchParams();
  const { openAuthModal } = useAuthModal();
  const [copied, setCopied] = useState(false);

  const orderNumber = searchParams.get("orderNumber") || "";
  const email = searchParams.get("email") || "";

  const handleCopy = () => {
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!orderNumber) {
    return (
      <div className="bg-background-secondary py-8">
        <div className="max-w-2xl mx-auto px-6 text-center py-16">
          <h3 className="text-xl font-semibold text-gray-600 mb-4">{t("noOrder.title")}</h3>
          <p className="text-gray-500 mb-8">{t("noOrder.description")}</p>
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t("noOrder.continueShopping")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <title>{t("pageTitle")}</title>
      <div className="bg-background-secondary py-8">
        <div className="max-w-2xl mx-auto px-6">
          <SimpleCard className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>

            <h1 className="text-2xl font-black italic text-black mb-2">
              {t("title")}
            </h1>
            <p className="text-gray-600 mb-6">{t("subtitle")}</p>

            {/* Order Number */}
            <div className="bg-gray-50 border rounded-lg p-4 mb-6 inline-block">
              <p className="text-sm text-gray-500 mb-1">{t("orderNumberLabel")}</p>
              <div className="flex items-center gap-2 justify-center">
                <span className="text-xl font-black text-black">{orderNumber}</span>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded hover:bg-gray-200 transition-colors"
                  title={t("copyOrderNumber")}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-2">
              {t("saveOrderNumber")}
            </p>
            {email && (
              <p className="text-sm text-gray-500 mb-6">
                {t("emailConfirmation", { email })}
              </p>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild>
                <Link to="/track-order">{t("trackOrder")}</Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => openAuthModal("register")}
              >
                {t("createAccount")}
              </Button>
              <Button variant="ghost" asChild>
                <Link to="/">{t("continueShopping")}</Link>
              </Button>
            </div>
          </SimpleCard>
        </div>
      </div>
    </>
  );
}
