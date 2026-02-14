import { Car, Loader2, Search } from "lucide-react";
import { href, Link, useNavigate, useRouteLoaderData, useSearchParams } from "react-router";
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
import { serializeShopURL } from "./_main.shop._index";
import { AddNewCarDialog } from "~/components/add-new-car-dialog";
import type { Route as MainRoute } from "./+types/_main";

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
  return [{ title: "Available Cars - MotoGT" }];
};

export default function AvailableCars({ loaderData }: Route.ComponentProps) {
  const { cars, meta, brands, selectedBrand } = loaderData;
  const navigate = useNavigate();
  const mainLoaderData =
    useRouteLoaderData<MainRoute.ComponentProps["loaderData"]>("routes/_main");
  const isAuthenticated = !!mainLoaderData?.isAuthenticated;
  const [searchParams] = useSearchParams();
  const { t } = useTranslation("common");
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
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary to-[#ac0f28] p-6 text-white mb-8">
        <div className="pointer-events-none absolute -right-8 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-14 -bottom-14 h-52 w-52 rounded-full bg-black/10 blur-2xl" />
        <div className="flex items-start gap-3">
          <Car className="size-6 mt-0.5" />
          <div>
            <h1 className="text-2xl font-black italic">
              {t("availableCarsPage.title")}
            </h1>
            <p className="text-sm text-white/90 mt-1">
              {t("availableCarsPage.subtitle")}
            </p>
          </div>
        </div>
      </div>

      <SimpleCard className="p-4 md:p-5 mb-6 border-primary/10 shadow-sm">
        <form
          method="get"
          action={href("/available-cars")}
          className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3 items-center"
        >
          {selectedBrand ? (
            <input type="hidden" name="brand" value={selectedBrand} />
          ) : null}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              name="search"
              defaultValue={searchParams.get("search") ?? ""}
              placeholder={t("availableCarsPage.searchPlaceholder")}
              className="h-11 pl-9"
            />
          </div>
          <Button type="submit" className="h-11">
            {t("buttons.search")}
          </Button>
        </form>

        {brands.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <div className="flex min-w-max flex-wrap gap-2 pb-1">
            <Link
              to={href("/available-cars")}
              className={`px-3 py-1.5 rounded-full text-xs border transition ${
                !selectedBrand
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-foreground border-border hover:border-primary"
              }`}
            >
              {t("availableCarsPage.allBrands")}
            </Link>
            {brands.slice(0, 12).map((brand: string) => (
              <Link
                key={brand}
                to={`${href("/available-cars")}?${new URLSearchParams({
                  brand,
                  page: "1",
                }).toString()}`}
                className={`px-3 py-1.5 rounded-full text-xs border transition ${
                  selectedBrand === brand
                    ? "bg-primary text-white border-primary"
                    : "bg-white text-foreground border-border hover:border-primary"
                }`}
              >
                {brand}
              </Link>
            ))}
            </div>
          </div>
        ) : null}
      </SimpleCard>

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
              <div className="relative h-52 w-full overflow-hidden bg-gradient-to-b from-zinc-100 via-zinc-100 to-zinc-200 sm:h-56">
                <img
                  src={car.car_image || "/car-placeholder.png"}
                  alt={`${car.brand} ${car.model}`}
                  className="h-full w-full object-contain object-center transition duration-500 hover:scale-[1.02]"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent" />
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
                          navigate(href("/login"));
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
