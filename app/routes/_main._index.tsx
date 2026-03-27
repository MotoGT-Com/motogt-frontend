import { Await, href, Link } from "react-router";
import type { Route } from "./+types/_main._index";
import { ProductSearch } from "~/components/product-search";
import { SimpleCard } from "~/components/ui/card";
import { getApiHomeExteriorProducts, getApiHomeInteriorProducts, getApiHomeSubcategories, getApiProductsPublic, getApiProductTypes } from "~/lib/client";
import { defaultParams } from "~/lib/api-client";
import { serializeShopURL } from "./_main.shop._index";
import { accessTokenCookie } from "~/lib/auth-middleware";
import { Suspense } from "react";
import { exteriorProductsQueryOptions, interiorProductsQueryOptions } from "~/lib/queries";
import { HomeCarousel } from "~/components/garage-carousel";
import { GarageFeaturedBanner } from "~/components/garage-featured-banner";
import { garageCarsQueryOptions } from "~/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { Faq } from "~/components/faq";
import { Logo } from "~/components/logo";
import ProductsHorizontalScroll from "~/components/ProductsHorizontalScroll";
import { AnnouncementBar } from "~/components/announcement-bar";
import { useTranslation } from 'react-i18next';
import getLocalizedTranslation from "~/lib/get-locale-translation";
import { config } from "~/config";
import { getLocaleFromRequest } from "~/lib/i18n-cookie";
import { resolveProductSlug } from "~/lib/get-locale-translation";

const enrichProductsResponseWithEnglishSlug = async (
  responsePromise: Promise<any>,
  locale: string
) => {
  const response = await responsePromise;
  const products = response?.data?.data;

  if (!Array.isArray(products) || products.length === 0 || locale !== "ar") {
    return response;
  }

  const productIds = products.map((product: any) => product.id);
  const englishProductsResponse = await getApiProductsPublic({
    query: {
      storeId: defaultParams.storeId,
      languageId: config.languageIds.en,
      productIds: productIds.join(","),
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
    ...response,
    data: {
      ...response.data,
      data: products.map((product: any) => ({
        ...product,
        slug_en: englishSlugById.get(product.id),
      })),
    },
  };
};

// Loader function to fetch data on the server
export async function loader({ request }: Route.LoaderArgs) {
  const locale = await getLocaleFromRequest(request);
  const languageId =
    locale === "ar" ? config.languageIds.ar : config.languageIds.en;
  const accessToken = await accessTokenCookie.parse(
    request.headers.get("Cookie")
  );
  const categoriesResponse = getApiHomeSubcategories({
    query: {
      storeId: defaultParams.storeId,
      languageId,
    },
  });
  const exteriorProductsResponse = enrichProductsResponseWithEnglishSlug(
    getApiHomeExteriorProducts({
      query: {
        storeId: defaultParams.storeId,
        languageId,
        page: 1,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
    locale
  );
  const interiorProductsResponse = enrichProductsResponseWithEnglishSlug(
    getApiHomeInteriorProducts({
      query: {
        storeId: defaultParams.storeId,
        languageId,
        page: 1,
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }),
    locale
  );
  const productTypesResponse = await getApiProductTypes();
  const productTypes = productTypesResponse.data?.data ?? [];
  const motorcyclesType = productTypes.find((type) => type.slug === "motorcycles");
  const cleaningType = productTypes.find((type) => type.slug === "car-care-accessiores");
  const ridingGearProductsResponse = enrichProductsResponseWithEnglishSlug(
    getApiProductsPublic({
      query: {
        storeId: defaultParams.storeId,
        languageId,
        categoryId: "3523d127-7fe6-4e8e-b575-8ce20b44a77d",
        page: 1,
        limit: 20,
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    }),
    locale
  );
  const cleaningProductsResponse = cleaningType
    ? enrichProductsResponseWithEnglishSlug(
        getApiProductsPublic({
          query: {
            storeId: defaultParams.storeId,
            languageId,
            productTypeId: cleaningType.id,
            page: 1,
            limit: 20,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
        }),
        locale
      )
    : Promise.resolve({ data: { data: [], meta: { total: 0 } } });
  const motorcycleAccessoriesResponse = motorcyclesType
    ? enrichProductsResponseWithEnglishSlug(
        getApiProductsPublic({
          query: {
            storeId: defaultParams.storeId,
            languageId,
            productTypeId: motorcyclesType.id,
            categoryId: "1157bae5-379a-485e-a4c4-4abeb1b8ef9b",
            page: 1,
            limit: 20,
            sortBy: "createdAt",
            sortOrder: "desc",
          },
        }),
        locale
      )
    : Promise.resolve({ data: { data: [], meta: { total: 0 } } });
  return {
    categoriesResponse,
    exteriorProductsResponse,
    interiorProductsResponse,
    ridingGearProductsResponse,
    cleaningProductsResponse,
    motorcycleAccessoriesResponse,
    isAuthenticated: !!accessToken,
  };
}

function HomeFeaturedBanner({ isAuthenticated }: { isAuthenticated: boolean }) {
  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });
  const cars = garageCarsQuery.data?.userCars ?? [];
  return <GarageFeaturedBanner userCars={cars} />;
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const {
    categoriesResponse,
    exteriorProductsResponse,
    interiorProductsResponse,
    ridingGearProductsResponse,
    cleaningProductsResponse,
    motorcycleAccessoriesResponse,
    isAuthenticated,
  } = loaderData;

  const { t } = useTranslation(['home', 'common']);

  return (
    <>
      <title>{t('home:meta.title')}</title>
      {/* Free Delivery Banner */}
      <AnnouncementBar 
        message={t('home:announcement.freeDeliveryJO')}
        countryCode="JO"
      />
      {/* Search Section */}
      <section className="relative w-full min-h-[200px] md:min-h-[300px] flex items-center justify-center mb-8 overflow-x-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/hero-banner.png"
            alt=""
            className="w-full h-full object-cover"
            fetchPriority="high"
            loading="eager"
            aria-hidden="true"
          />
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 md:py-8">
          <h1 className="text-2xl md:text-4xl font-bold italic mb-4 md:mb-6 text-white">
            {t('home:hero.searchTitle')}
          </h1>
            <ProductSearch />
       
        </div>
      </section>

      {/* Hero Banners */}
      <section className="max-w-7xl mx-auto px-6 mb-8">
        <h2 className="text-2xl font-bold italic mb-4">
          {t('home:sections.theHottest')} <span className="sr-only">Moto GT</span>
          <Logo className="w-32 inline pb-1" />
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <Link
            to="/shop/motorcycles?categories=3523d127-7fe6-4e8e-b575-8ce20b44a77d"
            prefetch="render"
            className="group"
          >
            <SimpleCard className="relative aspect-[21/9] overflow-hidden rounded-md transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/30 to-black/0 z-10 transition-opacity duration-300 group-hover:opacity-80" />
              <img
                src="/hero1.png"
                aria-hidden="true"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                fetchPriority="high"
                loading="eager"
              />
              <div className="absolute md:bottom-8 bottom-4 md:left-8 left-4 z-20 text-white transition-all duration-300 group-hover:translate-y-[-4px]">
                <h3>
                  <span className="md:text-2xl text-xl transition-all duration-300">{t('home:sections.exploreOur')}</span>
                  <br />
                  <span className="md:text-4xl text-2xl font-black italic uppercase transition-all duration-300 group-hover:scale-105">
                    {t('home:sections.ridingGear')}
                  </span>
                </h3>
              </div>
            </SimpleCard>
          </Link>

          <Link
            to={serializeShopURL({
              productIds: [
                "59ef9ee4-4c81-4f3a-9f20-8cb2d50d118c",
                "c9ec9918-cc19-4552-afc1-f3b1f7ecdfaf",
              ],
            })}
            prefetch="render"
            className="group"
          >
            <SimpleCard className="relative aspect-[21/9] overflow-hidden rounded-md transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-l from-black/90 via-black/30 to-black/0 z-10 transition-opacity duration-300 group-hover:opacity-80" />
              <img
              loading="lazy"
                aria-hidden="true"
                src="/hero2.webp"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute md:bottom-8 bottom-4 md:right-8 right-4 z-20 text-white flex flex-col items-end text-end transition-all duration-300 group-hover:translate-y-[-4px]">
                <div className="font-koulen bg-primary text-white px-2 text-lg rounded-md mb-2 transition-all duration-300 group-hover:scale-105 group-hover:bg-[#CF172F]/90">
                  {t('home:sections.limitedQuantity')}
                </div>
                <h3>
                  <span className="md:text-2xl text-xl transition-all duration-300">{t('home:sections.jetourT2')}</span>
                  <br />
                  <span className="md:text-4xl text-2xl font-black italic uppercase transition-all duration-300 group-hover:scale-105">
                    {t('home:sections.blackCarbonKit')}
                  </span>
                </h3>
              </div>
            </SimpleCard>
          </Link>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-6 mb-8">
        <h2 className="text-2xl font-bold italic mb-6">{t('home:sections.everythingYouNeed')}</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <Suspense
            fallback={Array.from({ length: 10 }).map((_, index) => (
              <SimpleCard
                key={index}
                className="aspect-[5/4] font-koulen uppercase p-6 flex flex-col justify-end animate-pulse"
              >
                <h3 className="text-2xl max-w-20 text-background-secondary bg-background-secondary">
                  {t('home:loading.categoryName')}
                </h3>
              </SimpleCard>
            ))}
          >
            <Await resolve={categoriesResponse}>
              {(categoriesResponse) =>
                categoriesResponse.data &&
                categoriesResponse.data.data.map((category) => {
                  return (
                    <Link
                      key={category.id}
                      to={serializeShopURL({
                        categories: [category.id],
                      })}
                      prefetch="render"
                    >
                      <SimpleCard className="aspect-[5/4] font-koulen group bg-primary text-white uppercase p-6 flex flex-col justify-end relative overflow-hidden">
                        <img
                          src={category.image_url ?? ""}
                          alt={category.name}
                          loading="lazy"
                          className="absolute -top-10 -end-10 w-full h-full object-contain group-hover:scale-110 hover:-rotate-3 transition-all duration-500"
                        />
                        <h3 className="text-2xl max-w-20 z-10">
                          {getLocalizedTranslation(category.translations)?.name || category.name}
                        </h3>
                      </SimpleCard>
                    </Link>
                  );
                })
              }
            </Await>
          </Suspense>
        </div>
      </section>

      <ProductsHorizontalScroll
        sectionTitle={t('home:products.exterior')}
        productsResponse={exteriorProductsResponse}
      />

      <ProductsHorizontalScroll
        sectionTitle={t('home:products.interior')}
        productsResponse={interiorProductsResponse}
      />

      {/* Car Showcase Section */}
      {isAuthenticated ? <HomeCarousel /> : null}
      <HomeFeaturedBanner isAuthenticated={isAuthenticated} />

      <ProductsHorizontalScroll
        sectionTitle={t('home:sections.cleaningProducts')}
        productsResponse={cleaningProductsResponse}
      />

      <section className="bg-primary pt-12 pb-4 mb-12">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-4xl font-bold italic text-white">
              {t('home:bestSellers.title')}
            </h2>
            <Link to={href("/shop")} className="text-sm md:text-xl font-bold text-white whitespace-nowrap">
              {t('home:bestSellers.viewAll')}
            </Link>
          </div>
        </div>

        <ProductsHorizontalScroll
          productsResponse={exteriorProductsResponse}
        />
      </section>

      <ProductsHorizontalScroll
        sectionTitle={t('home:newArrivals.title')}
        productsResponse={exteriorProductsResponse}
      />

      <ProductsHorizontalScroll
        sectionTitle={t('home:sections.ridingGear')}
        productsResponse={ridingGearProductsResponse}
      />

      <img
      loading="lazy"
        src="/bottom-banner.webp"
        alt={t('home:banner.ownYourLook')}
        className="w-full h-full"
      />

      <ProductsHorizontalScroll
        sectionTitle={t('home:sections.motorcycleAccessories')}
        productsResponse={motorcycleAccessoriesResponse}
      />

      <Faq />
    </>
  );
}
