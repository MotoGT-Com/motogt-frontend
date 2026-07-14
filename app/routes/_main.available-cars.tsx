import { Search } from "lucide-react";
import { href, Link, useRouteLoaderData, useSearchParams } from "react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getApiCars, getApiCarsBrands } from "~/lib/client";
import { defaultParams } from "~/lib/api-client";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { SimpleCard } from "~/components/ui/card";
import { garageCarsQueryOptions } from "~/lib/queries";
import type { Route } from "./+types/_main.available-cars";
import { useTranslation } from "react-i18next";
import { AddNewCarDialog } from "~/components/add-new-car-dialog";
import { AvailableCarCard } from "~/components/available-car-card";
import type { Route as MainRoute } from "./+types/_main";
import { useAuthModal } from "~/context/AuthModalContext";
import { cn } from "~/lib/utils";

const LIMIT = 24;

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const page = Math.max(Number(url.searchParams.get("page") ?? "1"), 1);
  const selectedBrand = (url.searchParams.get("brand") ?? "").trim();
  const searchTerm = (url.searchParams.get("search") ?? "").trim().toLowerCase();

  const [carsResponse, brandsResponse] = await Promise.all(
    searchTerm
      ? [
          getApiCars({
            query: {
              page: 1,
              limit: 1000,
              brand: selectedBrand || undefined,
            },
          }),
          getApiCarsBrands({
            query: {
              store_id: defaultParams.storeId,
            },
          }),
        ]
      : [
          getApiCars({
            query: {
              page,
              limit: LIMIT,
              brand: selectedBrand || undefined,
            },
          }),
          getApiCarsBrands({
            query: {
              store_id: defaultParams.storeId,
            },
          }),
        ]
  );

  if (carsResponse.error) {
    throw new Response("Failed to load cars", { status: 500 });
  }

  if (searchTerm) {
    const allCars = carsResponse.data.data;
    const filteredCars = allCars.filter((car) =>
      `${car.brand} ${car.model} ${(car as { trim?: string | null }).trim ?? ""}`
        .toLowerCase()
        .includes(searchTerm)
    );
    const total = filteredCars.length;
    const totalPages = Math.max(1, Math.ceil(total / LIMIT));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * LIMIT;
    const paginatedCars = filteredCars.slice(start, start + LIMIT);

    return {
      cars: paginatedCars,
      meta: {
        total,
        page: safePage,
        limit: LIMIT,
        total_pages: totalPages,
        has_next: safePage < totalPages,
        has_prev: safePage > 1,
      },
      selectedBrand,
      brands: brandsResponse.data?.data.brands ?? [],
      searchTerm,
    };
  }

  return {
    cars: carsResponse.data.data,
    meta: carsResponse.data.meta,
    selectedBrand,
    brands: brandsResponse.data?.data.brands ?? [],
    searchTerm,
  };
}

export const meta: Route.MetaFunction = () => {
  return [
    { title: "Available Cars - MotoGT" },
    { property: "og:title", content: "Available Cars - MotoGT" },
    { property: "og:image", content: "https://motogt.com/og-image.jpg" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:type", content: "website" },
  ];
};

export default function AvailableCars({ loaderData }: Route.ComponentProps) {
  const { cars, meta, brands, selectedBrand, searchTerm } = loaderData;
  const mainLoaderData =
    useRouteLoaderData<MainRoute.ComponentProps["loaderData"]>("routes/_main");
  const isAuthenticated = !!mainLoaderData?.isAuthenticated;
  const { openAuthModal } = useAuthModal();
  const [searchParams] = useSearchParams();
  const { t, i18n } = useTranslation("common");
  const isRTL = i18n.language === "ar";
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCarForGarage, setSelectedCarForGarage] = useState<{
    make: string;
    model: string;
  } | null>(null);
  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });

  const userCarIdByCatalogCarId = useMemo(() => {
    const map = new Map<string, string>();
    for (const userCar of garageCarsQuery.data?.userCars ?? []) {
      if (!map.has(userCar.carId)) {
        map.set(userCar.carId, userCar.id);
      }
    }
    return map;
  }, [garageCarsQuery.data?.userCars]);

  const buildPageHref = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set("page", String(page));
    return `${href("/available-cars")}?${params.toString()}`;
  };

  const brandHref = (brand?: string) => {
    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    if (searchTerm) params.set("search", searchTerm);
    params.set("page", "1");
    const qs = params.toString();
    return qs ? `${href("/available-cars")}?${qs}` : href("/available-cars");
  };

  return (
    <div className="min-h-[70vh] bg-neutral-50/60">
      <section
        className="border-b border-neutral-200/80 bg-white"
        aria-labelledby="available-cars-heading"
      >
        <div
          className={cn(
            "mx-auto max-w-[96rem] px-4 pb-6 pt-8 md:px-8 md:pb-8 md:pt-10",
            isRTL && "text-end"
          )}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {t("availableCarsPage.eyebrow")}
          </p>
          <h1
            id="available-cars-heading"
            className="max-w-3xl text-3xl font-black italic tracking-tight text-neutral-950 md:text-4xl"
          >
            {t("availableCarsPage.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-500 md:text-base">
            {t("availableCarsPage.subtitle")}
          </p>

          <form
            method="get"
            action={href("/available-cars")}
            className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-stretch"
          >
            {selectedBrand ? (
              <input type="hidden" name="brand" value={selectedBrand} />
            ) : null}
            <div className="relative min-w-0 flex-1">
              <Search
                className={cn(
                  "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-neutral-400",
                  isRTL ? "right-3.5" : "left-3.5"
                )}
                aria-hidden
              />
              <Input
                name="search"
                defaultValue={searchParams.get("search") ?? ""}
                placeholder={t("availableCarsPage.searchPlaceholder")}
                className={cn(
                  "h-12 rounded-xl border-neutral-200 bg-neutral-50 shadow-none focus-visible:border-primary/40 focus-visible:bg-white focus-visible:shadow-none",
                  isRTL ? "pr-11" : "pl-11"
                )}
              />
            </div>
            <Button
              type="submit"
              className="h-12 shrink-0 rounded-xl bg-[#CF172F] px-8 font-koulen text-base tracking-wide hover:bg-[#b91428] sm:min-w-[8rem]"
            >
              {t("buttons.search")}
            </Button>
          </form>
        </div>

        {brands.length > 0 ? (
          <div className="border-t border-neutral-100">
            <div
              className="mx-auto max-w-[96rem] overflow-x-auto overscroll-x-contain px-4 py-3 [scrollbar-width:thin] md:px-8"
              dir="ltr"
            >
              <div className="flex w-max flex-nowrap gap-2">
                <Link
                  to={brandHref()}
                  className={cn(
                    "inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                    !selectedBrand
                      ? "bg-neutral-950 text-white"
                      : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                  )}
                >
                  {t("availableCarsPage.allBrands")}
                </Link>
                {brands.map((brand: string) => (
                  <Link
                    key={brand}
                    to={brandHref(brand)}
                    className={cn(
                      "inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                      selectedBrand === brand
                        ? "bg-[#CF172F] text-white"
                        : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                    )}
                  >
                    {brand}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <div className="mx-auto max-w-[96rem] px-4 py-6 md:px-8 md:py-8">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-neutral-900">
              {t("availableCarsPage.results", { count: meta.total })}
            </p>
            {(selectedBrand || searchTerm) && (
              <p className="mt-0.5 text-xs text-neutral-500">
                {[
                  selectedBrand
                    ? t("availableCarsPage.filteredBrand", {
                        brand: selectedBrand,
                      })
                    : null,
                  searchTerm
                    ? t("availableCarsPage.filteredSearch", {
                        search: searchTerm,
                      })
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
          </div>
          {(selectedBrand || searchTerm) && (
            <Link
              to={href("/available-cars")}
              className="text-xs font-semibold uppercase tracking-wide text-primary hover:underline"
            >
              {t("availableCarsPage.clearFilters")}
            </Link>
          )}
        </div>

        {cars.length === 0 ? (
          <SimpleCard className="border-dashed p-12 text-center shadow-none">
            <p className="text-base font-medium text-neutral-800">
              {t("availableCarsPage.noResults")}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("availableCarsPage.noResultsHint")}
            </p>
            <Button asChild className="mt-5 rounded-lg font-koulen">
              <Link to={href("/available-cars")}>
                {t("availableCarsPage.clearFilters")}
              </Link>
            </Button>
          </SimpleCard>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-5">
            {cars.map((car) => (
              <AvailableCarCard
                key={car.id}
                car={car}
                userCarId={userCarIdByCatalogCarId.get(car.id)}
                onAddToGarage={() => {
                  if (!isAuthenticated) {
                    openAuthModal("register", {
                      intent: {
                        type: "garage",
                        returnTo: href("/available-cars"),
                      },
                    });
                    return;
                  }
                  setSelectedCarForGarage({
                    make: car.brand,
                    model: car.model,
                  });
                  setIsAddDialogOpen(true);
                }}
              />
            ))}
          </div>
        )}

        {meta.total_pages > 1 ? (
          <div className="mt-10 flex items-center justify-between gap-4 border-t border-neutral-200 pt-6">
            <Button
              variant="outline"
              className="rounded-lg"
              disabled={!meta.has_prev}
              asChild={meta.has_prev}
            >
              {meta.has_prev ? (
                <Link to={buildPageHref(meta.page - 1)}>
                  {t("availableCarsPage.previous")}
                </Link>
              ) : (
                <span>{t("availableCarsPage.previous")}</span>
              )}
            </Button>

            <span className="text-sm text-neutral-500">
              {t("availableCarsPage.page", {
                current: meta.page,
                total: meta.total_pages,
              })}
            </span>

            <Button
              variant="outline"
              className="rounded-lg"
              disabled={!meta.has_next}
              asChild={meta.has_next}
            >
              {meta.has_next ? (
                <Link to={buildPageHref(meta.page + 1)}>
                  {t("availableCarsPage.next")}
                </Link>
              ) : (
                <span>{t("availableCarsPage.next")}</span>
              )}
            </Button>
          </div>
        ) : null}
      </div>

      {selectedCarForGarage ? (
        <AddNewCarDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          prefilledCar={selectedCarForGarage}
          lockPrefilledFields
        />
      ) : null}
    </div>
  );
}
