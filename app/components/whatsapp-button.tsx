import { Button } from "~/components/ui/button";
import { config } from "~/config";
import {
  buildWhatsAppUrl,
  generateWAMessage,
  type WhatsAppMessageItem,
} from "~/lib/whatsapp";
import { useCurrency } from "~/hooks/use-currency";
import { cn } from "~/lib/utils";
import { useTranslation } from "react-i18next";
import { useRouteLoaderData } from "react-router";
import type { Route as MainRoute } from "../routes/+types/_main";

type WhatsAppButtonProps = {
  items: WhatsAppMessageItem[];
  currency: string;
  totalAmount?: string | number;
  lang: string;
  className?: string;
  disabled?: boolean;
};

export function WhatsAppButton({
  items,
  currency,
  totalAmount,
  lang,
  className,
  disabled = false,
}: WhatsAppButtonProps) {
  const { t } = useTranslation("common");
  const { selectedCurrency } = useCurrency();
  const mainLoaderData =
    useRouteLoaderData<MainRoute.ComponentProps["loaderData"]>("routes/_main");
  const user = mainLoaderData?.isAuthenticated ? mainLoaderData.user : null;
  const customerName = user
    ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()
    : undefined;
  const customerPhone = user?.phone ?? null;

  if ((selectedCurrency ?? "").toUpperCase() !== "JOD") {
    return null;
  }

  const handleClick = () => {
    if (disabled || !items.length) return;
    const resolvedItems = items.map((item) => ({
      ...item,
      productUrl: item.productUrl
        ? new URL(item.productUrl, window.location.origin).toString()
        : undefined,
    }));
    const message = generateWAMessage({
      items: resolvedItems,
      currency,
      totalAmount,
      lang,
      customerName,
      customerPhone,
    });

    const whatsappUrl = buildWhatsAppUrl(message, config.whatsappOrderNumber);
    if (!whatsappUrl) return;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        "w-full rounded-sm border border-gray-300 bg-secondary text-[#128C7E] hover:bg-secondary/80",
        "font-koulen inline-flex items-center justify-center gap-2",
        className
      )}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 16 16"
        fill="none"
        className="size-5 text-current shrink-0"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7.99967 1.33301C4.31767 1.33301 1.33301 4.31767 1.33301 7.99967C1.33301 9.25967 1.68301 10.4397 2.29167 11.445L1.69701 13.4663C1.66286 13.5824 1.66062 13.7055 1.6905 13.8227C1.72039 13.94 1.78131 14.047 1.86685 14.1325C1.95239 14.218 2.0594 14.279 2.17662 14.3088C2.29384 14.3387 2.41695 14.3365 2.53301 14.3023L4.55434 13.7077C5.5935 14.3363 6.78517 14.6679 7.99967 14.6663C11.6817 14.6663 14.6663 11.6817 14.6663 7.99967C14.6663 4.31767 11.6817 1.33301 7.99967 1.33301ZM6.49167 9.50834C7.84034 10.8563 9.12767 11.0343 9.58234 11.051C10.2737 11.0763 10.947 10.5483 11.209 9.93567C11.2418 9.8594 11.2537 9.77576 11.2433 9.69337C11.233 9.61099 11.2009 9.53285 11.1503 9.46701C10.785 9.00034 10.291 8.66501 9.80834 8.33167C9.70762 8.26183 9.58373 8.23378 9.46275 8.25343C9.34177 8.27307 9.23312 8.33888 9.15967 8.43701L8.75967 9.04701C8.73854 9.07968 8.70577 9.10309 8.66801 9.11249C8.63026 9.1219 8.59034 9.11661 8.55634 9.09767C8.28501 8.94234 7.88967 8.67834 7.60567 8.39434C7.32167 8.11034 7.07367 7.73301 6.93434 7.47901C6.91749 7.44665 6.91272 7.40933 6.92091 7.37377C6.9291 7.33821 6.9497 7.30674 6.97901 7.28501L7.59501 6.82767C7.68317 6.7514 7.74009 6.64528 7.75485 6.52964C7.76962 6.414 7.74118 6.29698 7.67501 6.20101C7.37634 5.76367 7.02834 5.20767 6.52367 4.83901C6.45841 4.79211 6.38213 4.76287 6.30224 4.75411C6.22235 4.74535 6.14155 4.75737 6.06767 4.78901C5.45434 5.05167 4.92367 5.72501 4.94901 6.41767C4.96567 6.87234 5.14367 8.15967 6.49167 9.50834Z"
          fill="currentColor"
        />
      </svg>
      {t("buttons.orderOnWhatsApp")}
    </Button>
  );
}

export type { WhatsAppButtonProps };
