import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ProductCard } from "~/components/product-card";
import { AddNewCarDialog } from "~/components/add-new-car-dialog";
import { GuestBanner } from "~/components/guest-banner";
import { accessTokenCookie } from "~/lib/auth-middleware";
import { defaultParams } from "~/lib/api-client";
import { getApiProductsPublic, getApiProductTypes, getApiUsersMeGarageCars, } from "~/lib/client";
import type { Route } from "./+types/_main.recommended";
import { useRevalidator } from "react-router";
import { getLocaleFromRequest } from "~/lib/i18n-cookie";
import { config } from "~/config";
import { resolveProductSlug } from "~/lib/get-locale-translation";
import { getGuestGarage } from "~/lib/guest-garage-manager";
import { Loader2 } from "lucide-react";
import type { ProductItem } from "~/lib/client/types.gen";

const PRODUCTS_LIMIT = 12;
const CARE_ACCESSORIES_SLUG = "car-care-accessiores";

function productMatchesGarageCars(
  product: { carCompatibility?: Array<{
    carBrand: string;
    carModel: string;
    carYearFrom?: number | null;
    carYearTo?: number | null;
  }> | null },
  garageCars: Array<{ carDetails: { brand: string; model: string; year?: number } }>
): boolean {
  if (!product.carCompatibility || product.carCompatibility.length === 0) {
    return false;
  }
  return garageCars.some((userCar) =>
    product.carCompatibility!.some((car) => {
      const matchesCar =
        `${car.carBrand} ${car.carModel}` ===
        `${userCar.carDetails.brand} ${userCar.carDetails.model}`;
      if (matchesCar && userCar.carDetails.year) {
        const yearFrom = car.carYearFrom ?? 0;
        const yearTo = car.carYearTo;
        return (
          yearFrom <= userCar.carDetails.year &&
          (yearTo === null || yearTo === undefined || yearTo >= userCar.carDetails.year)
        );
      }
      return matchesCar;
    })
  );
}

export async function loader({ request }: Route.LoaderArgs) {
  const locale = await getLocaleFromRequest(request);
  const languageId =
    locale === "ar" ? config.languageIds.ar : config.languageIds.en;
  const accessToken = await accessTokenCookie.parse(
    request.headers.get("Cookie")
  );

  if (!accessToken) {
    return { isAuthenticated: false, hasCars: false, carProducts: [], careProducts: [] };
  }

  const garageResponse = await getApiUsersMeGarageCars({
    query: {
      storeId: defaultParams.storeId,
      page: 1,
      limit: 50,
    },
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const userCars = garageResponse.data?.data.userCars ?? [];
  const primaryCar = garageResponse.data?.data.summary.primaryCar ?? null;
  const carIds = Array.from(
    new Set(
      [primaryCar?.carId, ...userCars.map((car) => car.carId)].filter(
        (id): id is string => Boolean(id)
      )
    )
  );

  if (carIds.length === 0) {
    return {
      isAuthenticated: true,
      hasCars: false,
      carProducts: [],
      careProducts: [],
    };
  }

  const productTypesResponse = await getApiProductTypes();
  const productTypes = productTypesResponse.data?.data ?? [];
  const careType = productTypes.find(
    (type) => type.slug === CARE_ACCESSORIES_SLUG
  );

  const [carProductsResponses, careProductsResponse] = await Promise.all([
    Promise.all(
      carIds.map((carId) =>
        getApiProductsPublic({
          query: {
            storeId: defaultParams.storeId,
            languageId,
            carId,
            limit: PRODUCTS_LIMIT,
            page: 1,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
        })
      )
    ),
    careType
      ? getApiProductsPublic({
          query: {
            storeId: defaultParams.storeId,
            languageId,
            productTypeId: careType.id,
            limit: PRODUCTS_LIMIT,
            page: 1,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
        })
      : Promise.resolve({ data: { data: [], meta: { total: 0 } } }),
  ]);

  const uniqueCarProducts = new Map<string, ProductItem>();
  carProductsResponses.forEach((response) => {
    response.data?.data?.forEach((product) => {
      if (!uniqueCarProducts.has(product.id)) {
        uniqueCarProducts.set(product.id, product);
      }
    });
  });

  const carProducts = Array.from(uniqueCarProducts.values()).filter((product) =>
    productMatchesGarageCars(product, userCars)
  );
  const careProducts = careProductsResponse.data?.data ?? [];

  if (locale === "ar") {
    const uniqueProductIds = Array.from(
      new Set([...carProducts, ...careProducts].map((product) => product.id))
    );

    if (uniqueProductIds.length > 0) {
      const englishProductsResponse = await getApiProductsPublic({
        query: {
          storeId: defaultParams.storeId,
          languageId: config.languageIds.en,
          productIds: uniqueProductIds.join(","),
        },
      });

      const englishSlugById = new Map<string, string>();
      for (const product of englishProductsResponse.data?.data ?? []) {
        const slug = resolveProductSlug(product, {
          preferEnglish: true,
          language: "en",
        });
        if (slug) {
          englishSlugById.set(product.id, slug);
        }
      }

      return {
        isAuthenticated: true,
        hasCars: true,
        carProducts: carProducts.map((product) => ({
          ...product,
          slug_en: englishSlugById.get(product.id),
        })),
        careProducts: careProducts.map((product) => ({
          ...product,
          slug_en: englishSlugById.get(product.id),
        })),
      };
    }
  }

  return {
    isAuthenticated: true,
    hasCars: true,
    carProducts,
    careProducts,
  };
}

export default function Recommended({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation("common");
  const revalidator = useRevalidator();
  const { isAuthenticated } = loaderData;

  // Guest: read cars from localStorage
  const [guestCarIds, setGuestCarIds] = useState<string[]>([]);
  useEffect(() => {
    if (!isAuthenticated) {
      const cars = getGuestGarage();
      setGuestCarIds(cars.map((c) => c.carId));
    }
  }, [isAuthenticated]);

  const guestQuery = useQuery({
    queryKey: ["guest-recommended", guestCarIds],
    queryFn: async () => {
      const guestCars = getGuestGarage();
      const carIds = [
        ...new Set(guestCars.map((c) => c.carId).filter(Boolean)),
      ] as string[];
      if (carIds.length === 0) {
        return { carProducts: [] as any[], careProducts: [] as any[] };
      }

      const productTypesResponse = await getApiProductTypes();
      const productTypes = productTypesResponse.data?.data ?? [];
      const careType = productTypes.find((t) => t.slug === CARE_ACCESSORIES_SLUG);

      const [carProductsResponses, careProductsResponse] = await Promise.all([
        Promise.all(
          carIds.map((carId) =>
            getApiProductsPublic({
              query: {
                storeId: defaultParams.storeId,
                languageId: defaultParams.languageId,
                carId,
                limit: PRODUCTS_LIMIT,
                page: 1,
                sortBy: "createdAt",
                sortOrder: "desc",
              },
            })
          )
        ),
        careType
          ? getApiProductsPublic({
              query: {
                storeId: defaultParams.storeId,
                languageId: defaultParams.languageId,
                productTypeId: careType.id,
                limit: PRODUCTS_LIMIT,
                page: 1,
                sortBy: "createdAt",
                sortOrder: "desc",
              },
            })
          : Promise.resolve({ data: { data: [] as any[] } }),
      ]);

      const uniqueCarProducts = new Map<string, any>();
      carProductsResponses.forEach((response) => {
        response.data?.data?.forEach((product: any) => {
          if (!uniqueCarProducts.has(product.id)) {
            uniqueCarProducts.set(product.id, product);
          }
        });
      });

      const carProducts = Array.from(uniqueCarProducts.values()).filter(
        (product) => productMatchesGarageCars(product, guestCars)
      );

      return {
        carProducts,
        careProducts: (careProductsResponse as any).data?.data ?? [],
      };
    },
    enabled: !isAuthenticated && guestCarIds.length > 0,
  });

  // Resolve data source
  const isGuest = !isAuthenticated;
  const hasCars = isGuest ? guestCarIds.length > 0 : loaderData.hasCars;
  const isLoading = isGuest && guestQuery.isPending && guestCarIds.length > 0;
  const carProducts = isGuest ? (guestQuery.data?.carProducts ?? []) : loaderData.carProducts;
  const careProducts = isGuest ? (guestQuery.data?.careProducts ?? []) : loaderData.careProducts;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <Loader2 className="size-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!hasCars) {
    return (
      <>
        <title>{t("nav.recommendedForYou")} - MotoGT</title>
        {isGuest && <GuestBanner type="garage" />}
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-black italic mb-6">
            {t("nav.recommendedForYou")}
          </h1>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="flex flex-col items-center justify-center">
            <img
              loading="lazy"
              src="/car-placeholder.png"
              className="w-auto h-[100px] mb-10"
              alt="Garage Empty"
            />
            <div className="text-muted-foreground space-y-2 mb-6">
              <div className="font-bold">
                {t("garage.empty.noCarsTitle", { defaultValue: "It looks like you haven't added any cars to your garage yet!" })}
              </div>
              <div>
                {t("garage.empty.noCarsDescription", { defaultValue: "Adding your car will help us make your shopping experience even better." })}
              </div>
            </div>
            <AddNewCarDialog onSuccess={() => {
              if (isGuest) setGuestCarIds(getGuestGarage().map((c) => c.carId));
              else revalidator.revalidate();
            }} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <title>{t("nav.recommendedForYou")} - MotoGT</title>
      {isGuest && <GuestBanner type="garage" />}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-black italic mb-6">
          {t("nav.recommendedForYou")}
        </h1>

        {carProducts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold italic mb-4">
              {t("nav.carParts")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {carProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {careProducts.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-bold italic mb-4">
              {t("nav.carCareAccessories")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {careProducts.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {carProducts.length === 0 && careProducts.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-bold mb-2">
              {t("recommended.noProducts", { defaultValue: "No recommendations found for your car yet." })}
            </p>
            <p>
              {t("recommended.checkBack", { defaultValue: "Check back soon as we're always adding new products." })}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
