import { href, Link } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "~/components/ui/button";
import { SimpleCard } from "~/components/ui/card";
import { SparePartsNavIcon } from "~/components/nav-icons";
import {
  CAR_CARE_PRODUCT_TYPE_SLUG,
  CAR_PARTS_PRODUCT_TYPE_SLUG,
} from "~/lib/constants";
import { cn } from "~/lib/utils";
import type { Route } from "./+types/_main.spare-parts";
import { CheckCircle2, Clock3, Package, Wrench } from "lucide-react";

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Spare Parts - Coming Soon - MotoGT" },
    {
      name: "description",
      content:
        "MotoGT spare parts are coming soon. OEM-quality parts with garage fitment — browse car accessories and car care while you wait.",
    },
    { property: "og:title", content: "Spare Parts - Coming Soon - MotoGT" },
    { property: "og:image", content: "https://motogt.com/og-image.jpg" },
    { property: "og:type", content: "website" },
  ];
};

const FEATURE_KEYS = ["fitment", "quality", "catalog"] as const;

const FEATURE_ICONS = {
  fitment: Wrench,
  quality: CheckCircle2,
  catalog: Package,
} as const;

export default function SparePartsComingSoon() {
  const { t, i18n } = useTranslation("common");
  const isRTL = i18n.language === "ar";

  return (
    <>
      <title>{t("sparePartsPage.pageTitle")}</title>
      <div className="max-w-[96rem] mx-auto px-4 md:px-8 py-8">
        <section
          className="relative mb-10 overflow-hidden rounded-xl shadow-md"
          aria-labelledby="spare-parts-heading"
        >
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url(/hero5-1200w.webp)" }}
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-primary/75 to-primary/65"
            aria-hidden
          />
          <div className="relative z-10 flex flex-col items-center gap-6 px-6 py-14 text-center md:px-10 md:py-20">
            <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm md:size-16">
              <SparePartsNavIcon className="brightness-0 invert size-8 md:size-9" />
            </span>
            <div className="max-w-3xl">
              <span className="mb-4 inline-flex rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-white ring-1 ring-white/25">
                {t("sparePartsPage.badge")}
              </span>
              <h1
                id="spare-parts-heading"
                className="mt-4 text-3xl font-black italic tracking-tight text-white md:text-5xl"
              >
                {t("sparePartsPage.title")}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-white/90 md:text-lg">
                {t("sparePartsPage.subtitle")}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                variant="secondary"
                className="h-11 bg-white font-koulen text-base text-primary hover:bg-white/90"
              >
                <Link to={href("/shop/:productType", { productType: CAR_PARTS_PRODUCT_TYPE_SLUG })}>
                  {t("sparePartsPage.browseCarAccessories")}
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 border-white/40 bg-white/10 font-koulen text-base text-white hover:bg-white/20 hover:text-white"
              >
                <Link to={href("/shop/:productType", { productType: CAR_CARE_PRODUCT_TYPE_SLUG })}>
                  {t("sparePartsPage.browseCarCare")}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="mb-12" aria-labelledby="spare-parts-features">
          <h2
            id="spare-parts-features"
            className="mb-6 text-xl font-black italic text-foreground md:text-2xl"
          >
            {t("sparePartsPage.featuresHeading")}
          </h2>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {FEATURE_KEYS.map((key) => {
              const Icon = FEATURE_ICONS[key];
              return (
                <SimpleCard
                  key={key}
                  className="border-border/80 p-6 transition-shadow hover:shadow-md"
                >
                  <span className="mb-4 inline-flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="text-lg font-bold italic">
                    {t(`sparePartsPage.features.${key}.title`)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`sparePartsPage.features.${key}.description`)}
                  </p>
                </SimpleCard>
              );
            })}
          </div>
        </section>

        <section className="mb-4">
          <SimpleCard className="flex flex-col gap-5 border-primary/20 bg-primary/[0.04] p-6 md:flex-row md:items-center md:justify-between md:p-8">
            <div className={cn("flex items-start gap-4", isRTL && "flex-row-reverse")}>
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Clock3 className="size-6" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-black italic md:text-xl">
                  {t("sparePartsPage.notify.title")}
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
                  {t("sparePartsPage.notify.description")}
                </p>
              </div>
            </div>
            <Button asChild className="h-11 shrink-0 font-koulen text-base md:min-w-[11rem]">
              <Link to={href("/support")}>{t("sparePartsPage.contactSupport")}</Link>
            </Button>
          </SimpleCard>
        </section>
      </div>
    </>
  );
}