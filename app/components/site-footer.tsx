import { href, Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { buildWhatsAppUrl } from "~/lib/whatsapp";

type FooterLinkItem = {
  key: string;
  to: string;
};

const INSTAGRAM_URL = "https://www.instagram.com/motogtofficial/";

function PaymentBadge({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <span
      aria-label={label}
      title={label}
      className="relative inline-flex h-[23px] w-8 items-center justify-center"
    >
      {children}
    </span>
  );
}

export function SiteFooter() {
  const { t, i18n } = useTranslation("common");
  const isRTL = i18n.dir() === "rtl";
  const year = new Date().getFullYear();

  const quickLinks: FooterLinkItem[] = [
    { key: "orders", to: href("/profile/orders") },
    { key: "yourGarage", to: href("/my-garage") },
    { key: "availableCars", to: href("/available-cars") },
    { key: "contactUs", to: href("/profile/support") },
    { key: "faqs", to: href("/profile/support") },
  ];

  const informationLinks: FooterLinkItem[] = [
    { key: "recommended", to: href("/recommended") },
    { key: "bestSellers", to: href("/shop") },
    {
      key: "newArrivals",
      to: `${href("/shop")}?sortBy=createdAt&sortOrder=desc`,
    },
    {
      key: "carParts",
      to: href("/shop/:productType", { productType: "car-parts" }),
    },
    {
      key: "motorcycleGear",
      to: href("/shop/:productType", { productType: "motorcycles" }),
    },
    {
      key: "cleaningCarCare",
      to: href("/shop/:productType", { productType: "car-care-accessiores" }),
    },
  ];

  const policyLinks: FooterLinkItem[] = [
    { key: "terms", to: href("/terms") },
    { key: "privacy", to: href("/privacy") },
    { key: "refund", to: href("/refund-policy") },
  ];

  const whatsappUrl =
    buildWhatsAppUrl(t("footer.community.whatsappMessage")) ||
    "https://wa.me/962793003737";

  const sectionTitleClass =
    "text-sm font-black uppercase tracking-wide text-white/95";
  const sectionBodyClass = "mt-3 space-y-2 text-sm leading-tight";
  const listLinkClass =
    "inline-block leading-tight text-white/95 transition hover:opacity-80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-primary rounded-sm";

  return (
    <footer className="bg-primary text-white py-10 md:py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          <section className={isRTL ? "text-right" : "text-left"}>
            <h2 className={sectionTitleClass}>{t("footer.help.title")}</h2>
            <div className={sectionBodyClass}>
              <p>{t("footer.help.phone")}</p>
              <a
                href={`mailto:${t("footer.help.email")}`}
                className={listLinkClass}
              >
                {t("footer.help.email")}
              </a>
            </div>
            <div className="mt-5 space-y-2 text-sm leading-tight text-white/95">
              <p>{t("footer.help.hours.sunThu")}</p>
              <p>{t("footer.help.hours.sat")}</p>
              <p>{t("footer.help.hours.friday")}</p>
            </div>
          </section>

          <section className={isRTL ? "text-right" : "text-left"}>
            <h2 className={sectionTitleClass}>
              {t("footer.quickLinks.title")}
            </h2>
            <ul className={sectionBodyClass}>
              {quickLinks.map((item) => (
                <li key={item.key}>
                  <Link to={item.to} className={listLinkClass}>
                    {t(`footer.quickLinks.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={isRTL ? "text-right" : "text-left"}>
            <h2 className={sectionTitleClass}>
              {t("footer.information.title")}
            </h2>
            <ul className={sectionBodyClass}>
              {informationLinks.map((item) => (
                <li key={item.key}>
                  <Link to={item.to} className={listLinkClass}>
                    {t(`footer.information.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={isRTL ? "text-right" : "text-left"}>
            <h2 className={sectionTitleClass}>{t("footer.policies.title")}</h2>
            <ul className={sectionBodyClass}>
              {policyLinks.map((item) => (
                <li key={item.key}>
                  <Link to={item.to} className={listLinkClass}>
                    {t(`footer.policies.${item.key}`)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className={isRTL ? "text-right" : "text-left"}>
            <h2 className={sectionTitleClass}>{t("footer.community.title")}</h2>
            <p className="mt-3 max-w-xs text-sm leading-[150%] text-white/95">
              {t("footer.community.description")}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Button
                variant="inverted"
                size="icon"
                className="rounded-full border-white/20 text-primary transition-transform duration-200 hover:-translate-y-0.5 hover:scale-105 hover:shadow-md"
                asChild
              >
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("footer.community.instagram")}
                  title={t("footer.community.instagram")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      d="M8.68539 1.33301C9.43539 1.33501 9.81605 1.33901 10.1447 1.34834L10.2741 1.35301C10.4234 1.35834 10.5707 1.36501 10.7487 1.37301C11.4581 1.40634 11.9421 1.51834 12.3667 1.68301C12.8067 1.85234 13.1774 2.08167 13.5481 2.45167C13.8872 2.78483 14.1495 3.18799 14.3167 3.63301C14.4814 4.05767 14.5934 4.54167 14.6267 5.25167C14.6347 5.42901 14.6414 5.57634 14.6467 5.72634L14.6507 5.85567C14.6607 6.18367 14.6647 6.56434 14.6661 7.31434L14.6667 7.81168V8.68501C14.6683 9.17128 14.6632 9.65755 14.6514 10.1437L14.6474 10.273C14.6421 10.423 14.6354 10.5703 14.6274 10.7477C14.5941 11.4577 14.4807 11.941 14.3167 12.3663C14.1495 12.8114 13.8872 13.2145 13.5481 13.5477C13.2149 13.8868 12.8117 14.1491 12.3667 14.3163C11.9421 14.481 11.4581 14.593 10.7487 14.6263L10.2741 14.6463L10.1447 14.6503C9.81605 14.6597 9.43539 14.6643 8.68539 14.6657L8.18805 14.6663H7.31539C6.82889 14.6681 6.3424 14.6629 5.85605 14.651L5.72672 14.647C5.56846 14.641 5.41024 14.6341 5.25205 14.6263C4.54272 14.593 4.05872 14.481 3.63339 14.3163C3.18861 14.149 2.78568 13.8867 2.45272 13.5477C2.11335 13.2146 1.85079 12.8114 1.68339 12.3663C1.51872 11.9417 1.40672 11.4577 1.37339 10.7477L1.35339 10.273L1.35005 10.1437C1.33776 9.65755 1.33221 9.17128 1.33339 8.68501V7.31434C1.33154 6.82807 1.33643 6.34181 1.34805 5.85567L1.35272 5.72634C1.35805 5.57634 1.36472 5.42901 1.37272 5.25167C1.40605 4.54167 1.51805 4.05834 1.68272 3.63301C1.85052 3.18781 2.11354 2.78463 2.45339 2.45167C2.78616 2.11271 3.18885 1.85039 3.63339 1.68301C4.05872 1.51834 4.54205 1.40634 5.25205 1.37301C5.42939 1.36501 5.57739 1.35834 5.72672 1.35301L5.85605 1.34901C6.34218 1.33716 6.82845 1.33205 7.31472 1.33367L8.68539 1.33301ZM8.00005 4.66634C7.116 4.66634 6.26815 5.01753 5.64303 5.64265C5.01791 6.26777 4.66672 7.11562 4.66672 7.99967C4.66672 8.88373 5.01791 9.73158 5.64303 10.3567C6.26815 10.9818 7.116 11.333 8.00005 11.333C8.88411 11.333 9.73195 10.9818 10.3571 10.3567C10.9822 9.73158 11.3334 8.88373 11.3334 7.99967C11.3334 7.11562 10.9822 6.26777 10.3571 5.64265C9.73195 5.01753 8.88411 4.66634 8.00005 4.66634ZM8.00005 5.99967C8.2627 5.99963 8.52278 6.05132 8.76545 6.15179C9.00811 6.25226 9.22862 6.39954 9.41436 6.58523C9.60011 6.77091 9.74747 6.99137 9.84802 7.234C9.94857 7.47663 10.0003 7.7367 10.0004 7.99934C10.0004 8.26199 9.94874 8.52207 9.84827 8.76473C9.7478 9.0074 9.60052 9.2279 9.41484 9.41365C9.22915 9.5994 9.0087 9.74676 8.76606 9.84731C8.52343 9.94786 8.26336 9.99963 8.00072 9.99967C7.47029 9.99967 6.96158 9.78896 6.58651 9.41389C6.21143 9.03882 6.00072 8.53011 6.00072 7.99967C6.00072 7.46924 6.21143 6.96053 6.58651 6.58546C6.96158 6.21039 7.47029 5.99967 8.00072 5.99967M11.5007 3.66634C11.2797 3.66634 11.0677 3.75414 10.9115 3.91042C10.7552 4.0667 10.6674 4.27866 10.6674 4.49967C10.6674 4.72069 10.7552 4.93265 10.9115 5.08893C11.0677 5.24521 11.2797 5.33301 11.5007 5.33301C11.7217 5.33301 11.9337 5.24521 12.09 5.08893C12.2463 4.93265 12.3341 4.72069 12.3341 4.49967C12.3341 4.27866 12.2463 4.0667 12.09 3.91042C11.9337 3.75414 11.7217 3.66634 11.5007 3.66634Z"
                      fill="#CF172F"
                    />
                  </svg>
                </a>
              </Button>
              <Button
                variant="inverted"
                size="icon"
                className="rounded-full border-white/20 text-primary transition-transform duration-200 hover:-translate-y-0.5 hover:scale-105 hover:shadow-md"
                asChild
              >
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t("footer.community.whatsapp")}
                  title={t("footer.community.whatsapp")}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M7.99967 1.33301C4.31767 1.33301 1.33301 4.31767 1.33301 7.99967C1.33301 9.25967 1.68301 10.4397 2.29167 11.445L1.69701 13.4663C1.66286 13.5824 1.66062 13.7055 1.6905 13.8227C1.72039 13.94 1.78131 14.047 1.86685 14.1325C1.95239 14.218 2.0594 14.279 2.17662 14.3088C2.29384 14.3387 2.41695 14.3365 2.53301 14.3023L4.55434 13.7077C5.5935 14.3363 6.78517 14.6679 7.99967 14.6663C11.6817 14.6663 14.6663 11.6817 14.6663 7.99967C14.6663 4.31767 11.6817 1.33301 7.99967 1.33301ZM6.49167 9.50834C7.84034 10.8563 9.12767 11.0343 9.58234 11.051C10.2737 11.0763 10.947 10.5483 11.209 9.93567C11.2418 9.8594 11.2537 9.77576 11.2433 9.69337C11.233 9.61099 11.2009 9.53285 11.1503 9.46701C10.785 9.00034 10.291 8.66501 9.80834 8.33167C9.70762 8.26183 9.58373 8.23378 9.46275 8.25343C9.34177 8.27307 9.23312 8.33888 9.15967 8.43701L8.75967 9.04701C8.73854 9.07968 8.70577 9.10309 8.66801 9.11249C8.63026 9.1219 8.59034 9.11661 8.55634 9.09767C8.28501 8.94234 7.88967 8.67834 7.60567 8.39434C7.32167 8.11034 7.07367 7.73301 6.93434 7.47901C6.91749 7.44665 6.91272 7.40933 6.92091 7.37377C6.9291 7.33821 6.9497 7.30674 6.97901 7.28501L7.59501 6.82767C7.68317 6.7514 7.74009 6.64528 7.75485 6.52964C7.76962 6.414 7.74118 6.29698 7.67501 6.20101C7.37634 5.76367 7.02834 5.20767 6.52367 4.83901C6.45841 4.79211 6.38213 4.76287 6.30224 4.75411C6.22235 4.74535 6.14155 4.75737 6.06767 4.78901C5.45434 5.05167 4.92367 5.72501 4.94901 6.41767C4.96567 6.87234 5.14367 8.15967 6.49167 9.50834Z"
                      fill="#CF172F"
                    />
                  </svg>
                </a>
              </Button>
            </div>
          </section>
        </div>

        <div className="mt-10 border-t border-white/25 pt-5">
          <div
            className={`flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${
              isRTL ? "md:flex-row-reverse" : ""
            }`}
          >
            <p className="order-2 md:order-1 text-sm text-white/95">
              {t("footer.bottom.copy", { year })}{" "}
              <Link to={href("/")} className="underline underline-offset-4">
                MotoGT
              </Link>
            </p>

            <div
              className={`order-1 md:order-2 flex flex-wrap items-center gap-3 text-xl text-white/90 ${
                isRTL ? "md:flex-row-reverse" : ""
              }`}
            >
              <span className="me-2 text-sm">{t("footer.bottom.accept")}</span>
              <PaymentBadge label="Visa">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="23"
                  viewBox="0 0 32 23"
                  fill="none"
                >
                  <path
                    d="M29.7931 0.275879H2.20691C1.14043 0.275879 0.275879 1.14043 0.275879 2.20691V19.8621C0.275879 20.9286 1.14043 21.7931 2.20691 21.7931H29.7931C30.8596 21.7931 31.7242 20.9286 31.7242 19.8621V2.20691C31.7242 1.14043 30.8596 0.275879 29.7931 0.275879Z"
                    fill="white"
                    stroke="#F3F3F3"
                    strokeWidth="0.551724"
                  />
                  <path
                    d="M13.6735 15.141H11.543L12.8755 7.4165H15.0059L13.6735 15.141Z"
                    fill="#15195A"
                  />
                  <path
                    d="M21.4001 7.60476C20.9799 7.44846 20.3134 7.27588 19.4893 7.27588C17.3853 7.27588 15.9038 8.32769 15.8947 9.83141C15.8772 10.9409 16.9554 11.5571 17.7619 11.927C18.5861 12.3051 18.8663 12.5518 18.8663 12.8887C18.8579 13.4063 18.2003 13.6448 17.5869 13.6448C16.7363 13.6448 16.2806 13.5218 15.5879 13.2339L15.3074 13.1105L15.0093 14.8444C15.509 15.0578 16.4296 15.2472 17.3853 15.2556C19.6208 15.2556 21.0761 14.22 21.0934 12.6176C21.1019 11.7382 20.5325 11.0644 19.3051 10.5138C18.5599 10.1604 18.1036 9.92206 18.1036 9.56046C18.1123 9.23169 18.4896 8.89497 19.3307 8.89497C20.0233 8.87847 20.5322 9.03455 20.9177 9.19075L21.1104 9.27279L21.4001 7.60476Z"
                    fill="#15195A"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M25.2126 7.4165H26.8605L28.5793 15.1409H26.6067C26.6067 15.1409 26.4136 14.2534 26.3525 13.9822H23.6171C23.538 14.1875 23.17 15.1409 23.17 15.1409H20.9346L24.0991 8.05739C24.3184 7.55609 24.7044 7.4165 25.2126 7.4165ZM25.0813 10.2433C25.0813 10.2433 24.4062 11.9607 24.2307 12.4045H26.0016C25.914 12.0183 25.5105 10.1693 25.5105 10.1693L25.3617 9.50373C25.2989 9.6751 25.2083 9.91074 25.1471 10.0697C25.1057 10.1774 25.0777 10.2499 25.0813 10.2433Z"
                    fill="#15195A"
                  />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M2.31095 7.4165H5.73864C6.20331 7.43278 6.5803 7.57248 6.70295 8.06583L7.44788 11.615L7.44811 11.6156L7.67608 12.6839L9.76253 7.4165H12.0153L8.66659 15.1329H6.41368L4.51479 8.42092C3.85962 8.0618 3.11188 7.77297 2.27588 7.57259L2.31095 7.4165Z"
                    fill="#15195A"
                  />
                </svg>
              </PaymentBadge>

              <PaymentBadge label="Mastercard">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="23"
                  viewBox="0 0 32 23"
                  fill="none"
                >
                  <path
                    d="M29.7931 0.275879H2.20691C1.14043 0.275879 0.275879 1.14043 0.275879 2.20691V19.8621C0.275879 20.9286 1.14043 21.7931 2.20691 21.7931H29.7931C30.8596 21.7931 31.7242 20.9286 31.7242 19.8621V2.20691C31.7242 1.14043 30.8596 0.275879 29.7931 0.275879Z"
                    fill="white"
                    stroke="#F3F3F3"
                    strokeWidth="0.551724"
                  />
                  <path
                    d="M18.6892 16.8491H12.9783V6.66187H18.6892V16.8491Z"
                    fill="#FF5F00"
                  />
                  <path
                    d="M13.3436 11.754C13.3436 9.68746 14.3184 7.84663 15.8365 6.66037C14.7263 5.79291 13.3253 5.27515 11.8027 5.27515C8.19811 5.27515 5.27612 8.17579 5.27612 11.754C5.27612 15.3322 8.19811 18.2328 11.8027 18.2328C13.3253 18.2328 14.7263 17.715 15.8365 16.8476C14.3184 15.6613 13.3436 13.8205 13.3436 11.754Z"
                    fill="#EB001B"
                  />
                  <path
                    d="M26.3915 11.754C26.3915 15.3322 23.4695 18.2328 19.865 18.2328C18.3423 18.2328 16.9413 17.715 15.8308 16.8476C17.3493 15.6613 18.3241 13.8205 18.3241 11.754C18.3241 9.68746 17.3493 7.84663 15.8308 6.66037C16.9413 5.79291 18.3423 5.27515 19.865 5.27515C23.4695 5.27515 26.3915 8.17579 26.3915 11.754Z"
                    fill="#F79E1B"
                  />
                </svg>
              </PaymentBadge>

              <PaymentBadge label="Cliq">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="23"
                  viewBox="0 0 32 23"
                  fill="none"
                >
                  <path
                    d="M29.7931 0.275879H2.20691C1.14043 0.275879 0.275879 1.14043 0.275879 2.20691V19.8621C0.275879 20.9286 1.14043 21.7931 2.20691 21.7931H29.7931C30.8596 21.7931 31.7242 20.9286 31.7242 19.8621V2.20691C31.7242 1.14043 30.8596 0.275879 29.7931 0.275879Z"
                    fill="white"
                    stroke="#F3F3F3"
                    strokeWidth="0.551724"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold text-black">
                  Cliq
                </span>
              </PaymentBadge>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
