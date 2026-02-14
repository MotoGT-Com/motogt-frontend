import { useTranslation } from "react-i18next";
import { ProductCard } from "~/components/product-card";
import { AddNewCarDialog } from "~/components/add-new-car-dialog";
import { accessTokenCookie } from "~/lib/auth-middleware";
import { defaultParams } from "~/lib/api-client";
import { getApiProductsPublic, getApiProductTypes, getApiUsersMeGarageCars, } from "~/lib/client";
import type { Route } from "./+types/_main.recommended";
import { redirect, useRevalidator } from "react-router";
import { getLocaleFromRequest } from "~/lib/i18n-cookie";
import { config } from "~/config";
import { resolveProductSlug } from "~/lib/get-locale-translation";

const PRODUCTS_LIMIT = 12;
const CARE_ACCESSORIES_SLUG = "car-care-accessiores";

export async function loader({ request }: Route.LoaderArgs) {
  const locale = await getLocaleFromRequest(request);
  const languageId =
    locale === "ar" ? config.languageIds.ar : config.languageIds.en;
  const accessToken = await accessTokenCookie.parse(
    request.headers.get("Cookie")
  );

  if (!accessToken) {
    throw redirect("/login");
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

  const uniqueCarProducts = new Map<
    string,
    (typeof careProductsResponse.data.data)[number]
  >();
  carProductsResponses.forEach((response) => {
    response.data?.data?.forEach((product) => {
      if (!uniqueCarProducts.has(product.id)) {
        uniqueCarProducts.set(product.id, product);
      }
    });
  });

  const matchesGarageCar = (
    product: (typeof careProductsResponse.data.data)[number]
  ) => {
    if (!product.carCompatibility || product.carCompatibility.length === 0) {
      return false;
    }
    return userCars.some((userCar) =>
      product.carCompatibility?.some((car) => {
        const matchesCar =
          `${car.carBrand} ${car.carModel}` ===
          `${userCar.carDetails.brand} ${userCar.carDetails.model}`;
        if (matchesCar && userCar.carDetails.year) {
          const yearFrom = car.carYearFrom ?? 0;
          const yearTo = car.carYearTo;
          return (
            yearFrom <= userCar.carDetails.year &&
            (yearTo === null || yearTo >= userCar.carDetails.year)
          );
        }
        return matchesCar;
      })
    );
  };

  const carProducts = Array.from(uniqueCarProducts.values()).filter(
    matchesGarageCar
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

  if (!loaderData.hasCars) {
    return (
      <>
        <title>{t("nav.recommendedForYou")} - MotoGT</title>
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
              className="w-auto h-[200px] mb-10"
              alt="Garage Empty"
            />
            <div className="text-muted-foreground space-y-2 mb-6">
              <div className="font-bold">
                It looks like you haven't added any cars to your garage yet!
              </div>
              <div>
                Adding your car will help us make your shopping experience even
                better.
              </div>
            </div>
            <AddNewCarDialog onSuccess={() => revalidator.revalidate()} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <title>{t("nav.recommendedForYou")} - MotoGT</title>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-black italic mb-6">
          {t("nav.recommendedForYou")}
        </h1>

        {loaderData.carProducts.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-bold italic mb-4">
              {t("nav.carParts")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {loaderData.carProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}

        {loaderData.careProducts.length > 0 && (
          <section className="mb-6">
            <h2 className="text-lg font-bold italic mb-4">
              {t("nav.carCareAccessories")}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {loaderData.careProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
