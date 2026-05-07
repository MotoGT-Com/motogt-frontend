import { Car, Loader2, Search } from "lucide-react";
import { href, Link, useRouteLoaderData, useSearchParams } from "react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getApiCars, getApiCarsBrands } from "~/lib/client";
import { defaultParams } from "~/lib/api-client";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { SimpleCard } from "~/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import {
  garageCarsQueryOptions,
  removeFromGarageMutationOptions,
} from "~/lib/queries";
import type { Route } from "./+types/_main.available-cars";
import { useTranslation } from "react-i18next";
import { serializeShopURL } from "~/lib/shop-search-params";
import { AddNewCarDialog } from "~/components/add-new-car-dialog";
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
      `${car.brand} ${car.model}`.toLowerCase().includes(searchTerm)
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
    };
  }

  return {
    cars: carsResponse.data.data,
    meta: carsResponse.data.meta,
    selectedBrand,
    brands: brandsResponse.data?.data.brands ?? [],
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
  const { cars, meta, brands, selectedBrand } = loaderData;
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
  const removeFromGarageMutation = useMutation(removeFromGarageMutationOptions);
  const cardCtaClass = "w-full h-12 font-koulen text-base md:text-lg";

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

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <section
        className="relative mb-8 overflow-hidden rounded-xl shadow-md"
        aria-labelledby="available-cars-heading"
      >
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url(/cars-banner.webp)" }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/55 via-primary/72 to-primary/60"
          aria-hidden
        />
        <div
          className={cn(
            "relative z-10 flex flex-col gap-6 p-6 md:p-8 md:gap-8",
            isRTL && "text-end"
          )}
        >
          <div
            className={cn(
              "flex items-start gap-3 md:gap-4",
              isRTL && "flex-row-reverse"
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15 ring-1 ring-white/25 md:size-11">
              <Car className="size-5 text-white md:size-6" aria-hidden />
            </span>
            <div className="min-w-0">
              <h1
                id="available-cars-heading"
                className="text-2xl font-black italic tracking-tight text-white md:text-3xl"
              >
                {t("availableCarsPage.title")}
              </h1>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-white/90 md:text-[15px]">
                {t("availableCarsPage.subtitle")}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-white/20 bg-white p-4 shadow-lg md:p-5">
            <form
              method="get"
              action={href("/available-cars")}
              className="flex flex-col gap-3 sm:flex-row sm:items-stretch"
            >
              {selectedBrand ? (
                <input type="hidden" name="brand" value={selectedBrand} />
              ) : null}
              <div className="relative min-w-0 flex-1">
                <Search
                  className={cn(
                    "pointer-events-none absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
                    isRTL ? "right-3" : "left-3"
                  )}
                  aria-hidden
                />
                <Input
                  name="search"
                  defaultValue={searchParams.get("search") ?? ""}
                  placeholder={t("availableCarsPage.searchPlaceholder")}
                  className={cn(
                    "h-11 rounded-lg border-border bg-white shadow-sm",
                    isRTL ? "pr-10" : "pl-10"
                  )}
                />
              </div>
              <Button
                type="submit"
                className="h-11 shrink-0 rounded-lg bg-primary px-8 font-koulen text-base tracking-wide hover:bg-primary/90 sm:min-w-[7.5rem]"
              >
                {t("buttons.search")}
              </Button>
            </form>

            {brands.length > 0 ? (
              <div
                className="mt-4 border-t border-neutral-200 pt-4"
                dir="ltr"
              >
                <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-0.5 [scrollbar-width:thin]">
                  <div className="flex w-max flex-nowrap gap-2 py-0.5">
                    <Link
                      to={href("/available-cars")}
                      className={cn(
                        "inline-flex items-center justify-center rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                        !selectedBrand
                          ? "border-primary bg-primary text-white shadow-sm"
                          : "border-neutral-200 bg-white text-neutral-800 hover:border-primary/40 hover:text-primary"
                      )}
                    >
                      {t("availableCarsPage.allBrands")}
                    </Link>
                    {brands.map((brand: string) => (
                      <Link
                        key={brand}
                        to={`${href("/available-cars")}?${new URLSearchParams({
                          brand,
                          page: "1",
                        }).toString()}`}
                        className={cn(
                          "inline-flex items-center justify-center rounded-full border px-3.5 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
                          selectedBrand === brand
                            ? "border-primary bg-primary text-white shadow-sm"
                            : "border-neutral-200 bg-white text-neutral-800 hover:border-primary/40 hover:text-primary"
                        )}
                      >
                        {brand}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="mb-4 text-sm text-muted-foreground">
        {t("availableCarsPage.results", { count: meta.total })}
      </div>

      {cars.length === 0 ? (
        <SimpleCard className="p-10 text-center">
          <p className="text-muted-foreground">{t("availableCarsPage.noResults")}</p>
        </SimpleCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cars.map((car) => (
            <SimpleCard
              key={car.id}
              className="h-full overflow-hidden border-border/80 p-0 transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="relative h-52 w-full overflow-hidden bg-gradient-to-b from-zinc-100 via-zinc-100 to-zinc-200 px-[13px] sm:h-56">
                <img
                  src={car.car_image || "/car-placeholder.png"}
                  alt={`${car.brand} ${car.model}`}
                  className="h-full w-full object-contain object-center transition duration-500 hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent pl-[52px]" />
                <span className="absolute right-3 top-3 inline-flex rounded-full bg-primary px-2 py-1 text-xs font-semibold text-white">
                  {car.product_count} {t("availableCarsPage.products")}
                </span>
              </div>
              <div className="p-4">
                <h2 className="text-base font-bold leading-tight">
                  {car.brand} {car.model}
                </h2>
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button size="lg" className={cardCtaClass} asChild>
                    <Link
                      to={serializeShopURL({
                        carId: car.id,
                        carYear: car.year_from ?? undefined,
                      })}
                    >
                      {t("availableCarsPage.viewProducts")}
                    </Link>
                  </Button>
                  {userCarIdByCatalogCarId.has(car.id) ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="inverted"
                          size="lg"
                          className={`${cardCtaClass} bg-[#FDECEE] hover:bg-[#FADDE1] text-primary border-[#F8C9CF]`}
                          disabled={removeFromGarageMutation.isPending}
                        >
                          {t("availableCarsPage.removeFromGarage")}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove from garage</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove this car from your
                            garage? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel
                            disabled={removeFromGarageMutation.isPending}
                          >
                            <Button
                              variant="outline"
                              disabled={removeFromGarageMutation.isPending}
                            >
                              Cancel
                            </Button>
                          </AlertDialogCancel>
                          <AlertDialogAction asChild>
                            <Button
                              onClick={async () => {
                                const existingUserCarId =
                                  userCarIdByCatalogCarId.get(car.id);
                                if (!existingUserCarId) return;
                                await removeFromGarageMutation.mutateAsync(
                                  existingUserCarId
                                );
                              }}
                              disabled={removeFromGarageMutation.isPending}
                            >
                              {removeFromGarageMutation.isPending ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                "Remove from garage"
                              )}
                            </Button>
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button
                      variant="inverted"
                      size="lg"
                      className={`${cardCtaClass} bg-[#F2F2F2] hover:bg-[#F2F2F2]/80 text-primary`}
                      onClick={() => {
                        if (!isAuthenticated) {
                          openAuthModal("register", {
                            intent: {
                              type: "garage",
                              returnTo: href("/my-garage"),
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
                    >
                      {t("availableCarsPage.addToGarage")}
                    </Button>
                  )}
                </div>
              </div>
            </SimpleCard>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-8">
        <Button variant="outline" disabled={!meta.has_prev} asChild={meta.has_prev}>
          {meta.has_prev ? (
            <Link to={buildPageHref(meta.page - 1)}>
              {t("availableCarsPage.previous")}
            </Link>
          ) : (
            <span>{t("availableCarsPage.previous")}</span>
          )}
        </Button>

        <span className="text-sm text-muted-foreground">
          {t("availableCarsPage.page", {
            current: meta.page,
            total: meta.total_pages,
          })}
        </span>

        <Button variant="outline" disabled={!meta.has_next} asChild={meta.has_next}>
          {meta.has_next ? (
            <Link to={buildPageHref(meta.page + 1)}>
              {t("availableCarsPage.next")}
            </Link>
          ) : (
            <span>{t("availableCarsPage.next")}</span>
          )}
        </Button>
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
