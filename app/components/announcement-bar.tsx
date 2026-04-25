import flags from "react-phone-number-input/flags";
import * as RPNInput from "react-phone-number-input";
import { useMemo } from "react";
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
  { message: string; countryCode: RPNInput.Country }
> = {
  JOD: {
    message: "Free delivery on all orders across Jordan",
    countryCode: "JO",
  },
  AED: {
    message:
      "Now delivering across the UAE - get your car parts delivered to your door",
    countryCode: "AE",
  },
  SAR: {
    message: "Now delivering across the Kingdom of Saudi Arabia",
    countryCode: "SA",
  },
  QAR: {
    message:
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
  const displayMessage = message ?? bannerContent.message;
  const displayCountryCode = countryCode ?? bannerContent.countryCode;
  const Flag = displayCountryCode ? flags[displayCountryCode] : null;

  return (
    <div className={`${className} w-full py-3`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center gap-2 text-white">
          <span className={textClassName}>
            {displayMessage}
          </span>
          {Flag && displayCountryCode && (
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">
              <Flag title={displayCountryCode} />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

