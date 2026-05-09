import { Await, href, Link } from "react-router";
import type { Route } from "./+types/_main._index";

export function links() {
  return [
    {
      rel: "preload",
      as: "image",
      href: "/hero-banner-1280w.webp",
      imageSrcSet:
        "/hero-banner-640w.webp 640w, /hero-banner-1280w.webp 1280w, /hero-banner-2560w.webp 2560w",
      imageSizes: "100vw",
    },
  ];
}
import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Fade from "embla-carousel-fade";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductSearch } from "~/components/product-search";
import { SimpleCard } from "~/components/ui/card";
import { getApiHomeExteriorProducts, getApiHomeInteriorProducts, getApiHomeSubcategories, getApiProductsPublic, getApiProductTypes } from "~/lib/client";
import { defaultParams } from "~/lib/api-client";
import { serializeShopURL } from "~/lib/shop-search-params";
import { accessTokenCookie } from "~/lib/auth-middleware";
import { Suspense } from "react";
import { useIdleReady, idleReadyHomeDeferredSections } from "~/hooks/use-idle-ready";
import { exteriorProductsQueryOptions, interiorProductsQueryOptions } from "~/lib/queries";
import { HomeCarousel } from "~/components/garage-carousel";
import { GarageFeaturedBanner } from "~/components/garage-featured-banner";
import { garageCarsQueryOptions } from "~/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { useGuestGarageCars } from "~/hooks/use-guest-garage-cars";
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

const removeBmwProductsFromResponse = async (responsePromise: Promise<any>) => {
  const response = await responsePromise;
  const products = response?.data?.data;

  if (!Array.isArray(products) || products.length === 0) {
    return response;
  }

  const filteredProducts = products.filter((product: any) => {
    const hasBmwCompatibility = (product?.carCompatibility ?? []).some(
      (car: any) => car?.carBrand?.toLowerCase() === "bmw"
    );

    const hasBmwInName =
      product?.name?.toLowerCase?.().includes("bmw") ||
      (product?.translations ?? []).some((translation: any) =>
        translation?.name?.toLowerCase?.().includes("bmw")
      );

    return !hasBmwCompatibility && !hasBmwInName;
  });

  return {
    ...response,
    data: {
      ...response.data,
      data: filteredProducts,
    },
  };
};
//comment

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
  const justArrivedProductsResponse = enrichProductsResponseWithEnglishSlug(
    getApiProductsPublic({
      query: {
        storeId: defaultParams.storeId,
        languageId,
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
  const motorcycleRidersProductsResponse =
    removeBmwProductsFromResponse(motorcycleAccessoriesResponse);
  return {
    categoriesResponse,
    exteriorProductsResponse,
    interiorProductsResponse,
    ridingGearProductsResponse,
    justArrivedProductsResponse,
    cleaningProductsResponse,
    motorcycleRidersProductsResponse,
    motorcycleAccessoriesResponse,
    isAuthenticated: !!accessToken,
  };
}

const SLIDE_DURATION = 5000;

const heroBannerSlides = [
  {
    key: "riding-gear",
    to: "/shop/motorcycles?categories=3523d127-7fe6-4e8e-b575-8ce20b44a77d",
    image: (
      <picture>
        <source
          type="image/webp"
          srcSet="/hero1-400w.webp 400w, /hero1-800w.webp 800w, /hero1-1200w.webp 1200w"
          sizes="(min-width: 1280px) 1200px, 100vw"
        />
        <img
          src="/hero1-1200w.webp"
          aria-hidden="true"
          width={1184}
          height={317}
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
      </picture>
    ),
    gradient: "bg-gradient-to-r from-black/80 via-black/20 to-transparent",
    textAlign: "items-start text-start",
    badge: null,
    titleKey: "home:sections.ridingGear" as const,
    subtitleKey: "home:sections.exploreOur" as const,
  },
  {
    key: "jetour-t2",
    to: serializeShopURL({ productIds: ["59ef9ee4-4c81-4f3a-9f20-8cb2d50d118c", "c9ec9918-cc19-4552-afc1-f3b1f7ecdfaf"] }),
    image: (
      <picture>
        <source type="image/webp" srcSet="/hero2.webp" />
        <img src="/hero2.webp" aria-hidden="true" loading="eager" className="absolute inset-0 w-full h-full object-cover" />
      </picture>
    ),
    gradient: "bg-gradient-to-r from-black/80 via-black/20 to-transparent",
    textAlign: "items-start text-start",
    badge: "home:sections.limitedQuantity" as const,
    titleKey: "home:sections.blackCarbonKit" as const,
    subtitleKey: "home:sections.jetourT2" as const,
  },
  {
    key: "exterior-parts",
    to: "/shop",
    image: (
      <picture>
        <source
          type="image/webp"
          srcSet="/hero5-400w.webp 400w, /hero5-800w.webp 800w, /hero5-1200w.webp 1200w"
          sizes="(min-width: 1280px) 1200px, 100vw"
        />
        <img
          src="/hero5-1200w.webp"
          aria-hidden="true"
          width={1047}
          height={343}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </picture>
    ),
    gradient: "bg-gradient-to-r from-black/80 via-black/20 to-transparent",
    textAlign: "items-start text-start",
    badge: null,
    titleKey: "home:sections.exteriorParts" as const,
    subtitleKey: "home:sections.exploreOur" as const,
  },
  {
    key: "car-care",
    to: "/shop/car-care-accessiores",
    image: (
      <picture>
        <source type="image/webp" srcSet="/hero3-400w.webp 400w, /hero3-800w.webp 800w" sizes="100vw" />
        <img src="/hero3-800w.webp" aria-hidden="true" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      </picture>
    ),
    gradient: "bg-gradient-to-r from-black/80 via-black/20 to-transparent",
    textAlign: "items-start text-start",
    badge: null,
    titleKey: "home:sections.cleaningProducts" as const,
    subtitleKey: "home:sections.exploreOur" as const,
  },
  {
    key: "garage",
    to: href("/my-garage"),
    image: (
      <picture>
        <source
          type="image/webp"
          srcSet="/hero4-400w.webp 400w, /hero4-800w.webp 800w, /hero4-1200w.webp 1200w, /hero4-1920w.webp 1920w"
          sizes="(min-width: 1280px) 1200px, 100vw"
        />
        <img
          src="/hero4-1920w.webp"
          aria-hidden="true"
          width={2094}
          height={686}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </picture>
    ),
    gradient: "bg-gradient-to-r from-black/80 via-black/20 to-transparent",
    textAlign: "items-start text-start",
    badge: null,
    titleKey: "home:sections.garageHeroTitle" as const,
    subtitleKey: "home:sections.garageHeroSubtitle" as const,
  },
] as const;

function HeroBannerCarousel() {
  const { t } = useTranslation(["home", "common"]);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true }, [Fade()]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const scrollTo   = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  // Track selected slide
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  // Animate the progress bar and advance slide
  useEffect(() => {
    if (!emblaApi) return;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / SLIDE_DURATION, 1);

      if (progressRef.current) {
        progressRef.current.style.width = `${progress * 100}%`;
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else if (!isHovered) {
        emblaApi.scrollNext();
      }
    };

    const resetProgress = () => {
      cancelAnimationFrame(animFrameRef.current);
      startTimeRef.current = 0;
      if (progressRef.current) progressRef.current.style.width = "0%";
      if (!isHovered) animFrameRef.current = requestAnimationFrame(animate);
    };

    resetProgress();
    emblaApi.on("select", resetProgress);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      emblaApi.off("select", resetProgress);
    };
  }, [emblaApi, isHovered]);

  // Pause on hover — resume on leave
  useEffect(() => {
    if (!emblaApi) return;
    if (isHovered) {
      cancelAnimationFrame(animFrameRef.current);
      if (progressRef.current) {
        // freeze bar width in place
        const currentWidth = progressRef.current.style.width;
        progressRef.current.style.width = currentWidth;
      }
    } else {
      // restart timer from current progress
      startTimeRef.current = 0;
      if (progressRef.current) progressRef.current.style.width = "0%";
      animFrameRef.current = requestAnimationFrame((ts) => {
        startTimeRef.current = ts;
        const animate = (timestamp: number) => {
          const elapsed = timestamp - startTimeRef.current;
          const progress = Math.min(elapsed / SLIDE_DURATION, 1);
          if (progressRef.current) progressRef.current.style.width = `${progress * 100}%`;
          if (progress < 1) {
            animFrameRef.current = requestAnimationFrame(animate);
          } else {
            emblaApi.scrollNext();
          }
        };
        animFrameRef.current = requestAnimationFrame(animate);
      });
    }
  }, [isHovered, emblaApi]);

  return (
    <section className="max-w-7xl mx-auto px-2 md:px-6 mb-8">
      <h2 className="text-2xl font-bold italic mb-4">
        {t("home:sections.theHottest")} <span className="sr-only">Moto GT</span>
        <Logo className="w-32 inline pb-1" />
      </h2>

      <div
        className="relative rounded-xl overflow-hidden shadow-md"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Embla viewport */}
        <div
          className="aspect-[16/9] md:aspect-[1184/317]"
          ref={emblaRef}
        >
          <div className="flex h-full">
            {heroBannerSlides.map((slide) => (
              <div key={slide.key} className="flex-[0_0_100%] min-w-0 relative h-full">
                <Link to={slide.to} prefetch="render" draggable={false} className="group block h-full">
                  {/* Background image — zooms on hover */}
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-105">
                      {slide.image}
                    </div>
                  </div>

                  {/* Gradient overlay — deepens on hover */}
                  <div className={`absolute inset-0 ${slide.gradient} transition-opacity duration-500 group-hover:opacity-90`} />

                  {/* Text — top-left, lifts on hover */}
                  <div className={`absolute top-4 left-5 md:top-8 md:left-10 z-10 text-white flex flex-col ${slide.textAlign} gap-1 transition-transform duration-500 ease-out group-hover:-translate-y-1`}>
                    {slide.badge && (
                      <span className="font-koulen bg-primary text-white text-xs md:text-sm px-2.5 py-0.5 rounded w-fit mb-1">
                        {t(slide.badge)}
                      </span>
                    )}
                    <p className="text-sm md:text-lg font-medium leading-tight opacity-90">
                      {t(slide.subtitleKey)}
                    </p>
                    <h3 className="text-2xl md:text-4xl font-black italic uppercase leading-tight">
                      {t(slide.titleKey)}
                    </h3>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Left arrow */}
        <button
          type="button"
          onClick={scrollPrev}
          aria-label="Previous slide"
          className="absolute left-3 top-1/2 -translate-y-1/2 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm border border-white/20 hover:bg-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ChevronLeft className="size-4" />
        </button>

        {/* Right arrow */}
        <button
          type="button"
          onClick={scrollNext}
          aria-label="Next slide"
          className="absolute right-3 top-1/2 -translate-y-1/2 z-30 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm border border-white/20 hover:bg-white/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <ChevronRight className="size-4" />
        </button>

        {/* Bottom center: small pill progress indicators */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5">
          {heroBannerSlides.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              onClick={() => scrollTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="relative h-[3px] w-6 rounded-full bg-white/35 overflow-hidden focus-visible:outline-none"
            >
              {i === selectedIndex && (
                <div
                  ref={i === selectedIndex ? progressRef : undefined}
                  className="absolute inset-y-0 left-0 bg-white rounded-full"
                  style={{ width: "0%" }}
                />
              )}
              {i < selectedIndex && (
                <div className="absolute inset-0 bg-white rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeFeaturedBanner({ isAuthenticated }: { isAuthenticated: boolean }) {
  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });

  const guestCars = useGuestGarageCars(!isAuthenticated);

  const cars = isAuthenticated
    ? (garageCarsQuery.data?.userCars ?? [])
    : (guestCars as any[]);

  return <GarageFeaturedBanner userCars={cars} />;
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const {
    categoriesResponse,
    exteriorProductsResponse,
    interiorProductsResponse,
    ridingGearProductsResponse,
    justArrivedProductsResponse,
    cleaningProductsResponse,
    motorcycleRidersProductsResponse,
    motorcycleAccessoriesResponse,
    isAuthenticated,
  } = loaderData;

  const { t } = useTranslation(['home', 'common']);
  const renderDeferredSections = useIdleReady(idleReadyHomeDeferredSections);

  return (
    <>
      <title>{t('home:meta.title')}</title>
      {/* Free Delivery Banner */}
      <AnnouncementBar />
      {/* Search Section */}
      <section className="relative w-full min-h-[200px] md:min-h-[300px] flex items-center justify-center mb-8 overflow-x-hidden">
        {/* Background Image */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <picture>
            <source
              type="image/webp"
              srcSet="/hero-banner-640w.webp 640w, /hero-banner-1280w.webp 1280w, /hero-banner-2560w.webp 2560w"
              sizes="100vw"
            />
            <img
              src="/hero-banner-1280w.webp"
              alt=""
              width={2560}
              height={590}
              className="w-full h-full object-cover"
              fetchPriority="high"
              loading="eager"
              aria-hidden="true"
            />
          </picture>
          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-2 md:px-6 py-6 md:py-8">
          <div className="mb-4 flex flex-col gap-2 md:mb-6 md:flex-row md:items-end md:justify-between md:gap-6">
            <h1 className="text-2xl font-bold italic text-white md:text-4xl min-w-0">
              {t("home:hero.searchTitle")}
            </h1>
            <Link
              to={href("/available-cars")}
              prefetch="render"
              className="font-koulen text-sm uppercase tracking-wide text-white/90 underline decoration-white/35 underline-offset-[5px] transition-colors hover:text-white hover:decoration-white md:shrink-0 md:pb-1 md:text-base"
            >
              {t("home:hero.viewAllCars")}
            </Link>
          </div>
          <ProductSearch />
        </div>
      </section>

      {/* Hero Banner Carousel */}
      <HeroBannerCarousel />

      {/* Categories Grid */}
      <section className="max-w-7xl mx-auto px-2 md:px-6 mb-8">
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
                          {(() => {
                            const c = category as {
                              name: string;
                              translations?: Array<{
                                languageCode: string;
                                name: string;
                              }>;
                            };
                            return c.translations?.length
                              ? getLocalizedTranslation(c.translations)?.name ??
                                  c.name
                              : c.name;
                          })()}
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

      {renderDeferredSections ? (
        <>
          {/* Car Showcase Section */}
          <HomeCarousel isAuthenticated={isAuthenticated} />
          <HomeFeaturedBanner isAuthenticated={isAuthenticated} />

          <ProductsHorizontalScroll
            sectionTitle={t('home:sections.cleaningProducts')}
            productsResponse={cleaningProductsResponse}
            wrapperClassName="pt-6 mb-24"
          />

          <section className="bg-primary py-6 mb-2">
            <div className="max-w-7xl mx-auto px-2 md:px-6">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl md:text-4xl font-bold italic text-white">
                  {t('home:sections.forMotorcycleRiders')}
                </h2>
                <Link to="/shop/motorcycles" className="text-sm md:text-xl font-bold text-white whitespace-nowrap">
                  {t('home:bestSellers.viewAll')}
                </Link>
              </div>
            </div>

            <div className="-mb-24">
              <ProductsHorizontalScroll
                productsResponse={motorcycleRidersProductsResponse}
              />
            </div>
          </section>

          <ProductsHorizontalScroll
            sectionTitle={t('home:sections.ridingGear')}
            productsResponse={ridingGearProductsResponse}
          />

          <img
            src="/bottom-banner-1280w.webp"
            srcSet="/bottom-banner-768w.webp 768w, /bottom-banner-1280w.webp 1280w"
            sizes="100vw"
            alt={t('home:banner.ownYourLook')}
            width={2560}
            height={606}
            loading="lazy"
            className="w-full h-full"
          />

          <ProductsHorizontalScroll
            sectionTitle={t('home:newArrivals.title')}
            productsResponse={justArrivedProductsResponse}
            preserveProductOrder
          />

          <Faq />
        </>
      ) : (
        <section className="max-w-7xl mx-auto px-2 md:px-6 mb-8" aria-hidden>
          <div className="h-48 animate-pulse rounded-md bg-muted" />
        </section>
      )}
    </>
  );
}
