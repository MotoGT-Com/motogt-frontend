import flags from "react-phone-number-input/flags";
import * as RPNInput from "react-phone-number-input";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useCurrency } from "~/hooks/use-currency";
import type { Currency } from "~/lib/constants";

interface AnnouncementBarProps {
  message?: string;
  countryCode?: RPNInput.Country;
  className?: string;
  textClassName?: string;
}

type SupportedBannerCurrency = "JOD" | "AED" | "SAR" | "QAR";

const COUNTRY_TO_BANNER_CURRENCY: Record<string, SupportedBannerCurrency> = {
  JO: "JOD",
  AE: "AED",
  SA: "SAR",
  QA: "QAR",
};

const BANNER_BY_CURRENCY: Record<
  SupportedBannerCurrency,
  {
    messageKey:
      | "home:announcement.freeDeliveryJO"
      | "home:announcement.deliveryAE"
      | "home:announcement.deliverySA"
      | "home:announcement.deliveryQA";
    fallbackMessage: string;
    countryCode: RPNInput.Country;
  }
> = {
  JOD: {
    messageKey: "home:announcement.freeDeliveryJO",
    fallbackMessage: "Free delivery on all orders across Jordan",
    countryCode: "JO",
  },
  AED: {
    messageKey: "home:announcement.deliveryAE",
    fallbackMessage:
      "Now delivering across the UAE - get your car parts delivered to your door",
    countryCode: "AE",
  },
  SAR: {
    messageKey: "home:announcement.deliverySA",
    fallbackMessage: "Now delivering across the Kingdom of Saudi Arabia",
    countryCode: "SA",
  },
  QAR: {
    messageKey: "home:announcement.deliveryQA",
    fallbackMessage:
      "Now delivering across Qatar - get your car parts delivered to your door",
    countryCode: "QA",
  },
};

function currencyFromDetectedCountry(
  country: string | null | undefined
): SupportedBannerCurrency {
  if (!country) return "JOD";
  const normalized = country.trim().toUpperCase();
  return COUNTRY_TO_BANNER_CURRENCY[normalized] ?? "JOD";
}

function isSupportedBannerCurrency(
  currency: Currency | null | undefined
): currency is SupportedBannerCurrency {
  return currency === "JOD" || currency === "AED" || currency === "SAR" || currency === "QAR";
}

export function AnnouncementBar({
  message,
  countryCode,
  className = "bg-primary",
  textClassName = "text-sm md:text-base font-medium",
}: AnnouncementBarProps) {
  const { t } = useTranslation("home");
  const { selectedCurrency, isManualOverride, detectedCountryCode } =
    useCurrency();

  const effectiveBannerCurrency = useMemo<SupportedBannerCurrency>(() => {
    if (isManualOverride && isSupportedBannerCurrency(selectedCurrency)) {
      return selectedCurrency;
    }

    if (detectedCountryCode) {
      return currencyFromDetectedCountry(detectedCountryCode);
    }

    if (isSupportedBannerCurrency(selectedCurrency)) {
      return selectedCurrency;
    }

    return "JOD";
  }, [detectedCountryCode, isManualOverride, selectedCurrency]);

  const bannerContent = BANNER_BY_CURRENCY[effectiveBannerCurrency];
  const displayMessage =
    message ??
    t(bannerContent.messageKey, { defaultValue: bannerContent.fallbackMessage });
  const displayCountryCode = countryCode ?? bannerContent.countryCode;
  const Flag = displayCountryCode ? flags[displayCountryCode] : null;

  return (
    <div className={`${className} w-full py-3`}>
      <div className="max-w-7xl mx-auto px-6">
        <div
          dir="ltr"
          className="mx-auto flex w-full max-w-3xl items-center justify-center gap-2 text-white md:w-fit md:max-w-none"
        >
          <span className={`${textClassName} text-center leading-snug`}>
            {displayMessage}
          </span>
          <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">
            {Flag && displayCountryCode ? (
              <Flag title={displayCountryCode} />
            ) : null}
          </span>
        </div>
      </div>
    </div>
  );
}

