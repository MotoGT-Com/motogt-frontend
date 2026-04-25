import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Banknote } from "lucide-react";
import { useId } from "react";
import { useCurrency } from "~/hooks/use-currency";
import {
  SUPPORTED_CURRENCIES,
  CURRENCY_TO_FLAG,
  type Currency,
} from "~/lib/constants";
import { useLocation } from "react-router";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";
import { useTranslation } from "react-i18next";

/**
 * Currency selector component
 * Allows users to switch between supported currencies
 * Disabled on checkout page to prevent mid-flow changes
 * Shows badge when using cached/stale rates
 */
export function CurrencySelector() {
  const {
    selectedCurrency,
    setSelectedCurrency,
    cacheAge,
    isUsingCachedRates,
  } = useCurrency();

  const { t } = useTranslation("common");
  const currencyHintId = useId();
  const location = useLocation();
  const isCheckoutPage = location.pathname === "/checkout";

  const changeCurrency = (currency: Currency) => {
    if (isCheckoutPage) return;
    setSelectedCurrency(currency);
  };

  const getCacheBadge = () => {
    if (!isUsingCachedRates) return null;

    if (cacheAge === null || cacheAge === 0) {
      return "offline";
    }

    if (cacheAge >= 1) {
      return `${cacheAge}h ago`;
    }

    return "cached";
  };

  const cacheBadge = getCacheBadge();
  const geoTooltip = t("currency.geoTooltip");

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="relative"
              disabled={isCheckoutPage}
              title={
                isCheckoutPage
                  ? "Currency locked during checkout"
                  : "Select currency"
              }
              aria-describedby={currencyHintId}
            >
              <Banknote className="h-5 w-5 text-primary" />
              <span className="sr-only">Switch currency</span>
              <span className="absolute -top-1 -right-1 rounded bg-primary px-1 text-[10px] font-bold leading-[1.1] text-white">
                {selectedCurrency}
              </span>
              {cacheBadge ? (
                <span className="absolute -bottom-1 -left-1 rounded bg-muted px-0.5 text-[8px] font-medium leading-none text-muted-foreground">
                  {cacheBadge}
                </span>
              ) : null}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent
          id={currencyHintId}
          side="bottom"
          align="end"
          className="max-w-[260px] text-balance"
        >
          {geoTooltip}
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end">
        {SUPPORTED_CURRENCIES.map((currency) => (
          <DropdownMenuItem
            key={currency}
            onClick={() => changeCurrency(currency)}
            className="cursor-pointer"
            disabled={currency === selectedCurrency || isCheckoutPage}
          >
            <span className="me-2 text-lg">{CURRENCY_TO_FLAG[currency]}</span>
            <span className="font-medium">{currency}</span>
            {currency === selectedCurrency && (
              <span className="ms-auto text-primary">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
