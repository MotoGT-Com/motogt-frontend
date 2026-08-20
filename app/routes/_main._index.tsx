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
import { isCarCareProductType, CAR_CARE_PRODUCT_TYPE_SLUG } from "~/lib/constants";
import { serializeShopURL } from "~/lib/shop-search-params";
import { useGaragePopup } from "~/context/GaragePopupContext";
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
  const cleaningType = productTypes.find(isCarCareProductType);
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

const CAROUSEL_BANNER_SIZES =
  "(min-width: 1536px) 1472px, (min-width: 768px) calc(100vw - 4rem), calc(100vw - 2rem)";

const CAROUSEL_BANNER_WIDTHS = [640, 1280, 1920, 2560] as const;

function carouselSrcSet(base: string) {
  return CAROUSEL_BANNER_WIDTHS.map((width) => `/${base}-${width}w.webp ${width}w`).join(", ");
}

function CarouselBannerImage({
  base,
  width,
  height,
  loading = "lazy",
}: {
  base: string;
  width: number;
  height: number;
  loading?: "eager" | "lazy";
}) {
  return (
    <picture>
      <source
        type="image/webp"
        srcSet={carouselSrcSet(base)}
        sizes={CAROUSEL_BANNER_SIZES}
      />
      <img
        src={`/${base}-1920w.webp`}
        aria-hidden="true"
        width={width}
        height={height}
        loading={loading}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </picture>
  );
}

const heroBannerSlides = [
  {
    key: "riding-gear",
    to: "/shop/motorcycles?categories=3523d127-7fe6-4e8e-b575-8ce20b44a77d",
    image: <CarouselBannerImage base="hero1" width={1920} height={536} loading="eager" />,
    gradient: "bg-gradient-to-r from-black/80 via-black/20 to-transparent",
    textAlign: "items-start text-start",
    badge: null,
    titleKey: "home:sections.ridingGear" as const,
    subtitleKey: "home:sections.exploreOur" as const,
  },
  {
    key: "jetour-t2",
    to: serializeShopURL({ productIds: ["59ef9ee4-4c81-4f3a-9f20-8cb2d50d118c", "c9ec9918-cc19-4552-afc1-f3b1f7ecdfaf"] }),
    image: <CarouselBannerImage base="hero2" width={1920} height={629} loading="eager" />,
    gradient: "bg-gradient-to-r from-black/80 via-black/20 to-transparent",
    textAlign: "items-start text-start",
    badge: "home:sections.limitedQuantity" as const,
    titleKey: "home:sections.blackCarbonKit" as const,
    subtitleKey: "home:sections.jetourT2" as const,
  },
  {
    key: "exterior-parts",
    to: "/shop",
    image: <CarouselBannerImage base="hero5" width={1047} height={343} />,
    gradient: "bg-gradient-to-r from-black/80 via-black/20 to-transparent",
    textAlign: "items-start text-start",
    badge: null,
    titleKey: "home:sections.exteriorParts" as const,
    subtitleKey: "home:sections.exploreOur" as const,
  },
  {
    key: "car-care",
    to: `/shop/${CAR_CARE_PRODUCT_TYPE_SLUG}`,
    image: <CarouselBannerImage base="hero3" width={1920} height={477} />,
    gradient: "bg-gradient-to-r from-black/80 via-black/20 to-transparent",
    textAlign: "items-start text-start",
    badge: null,
    titleKey: "home:sections.cleaningProducts" as const,
    subtitleKey: "home:sections.exploreOur" as const,
  },
  {
    key: "garage",
    opensGaragePopup: true,
    image: <CarouselBannerImage base="hero4" width={1920} height={629} />,
    gradient: "bg-gradient-to-r from-black/80 via-black/20 to-transparent",
    textAlign: "items-start text-start",
    badge: null,
    titleKey: "home:sections.garageHeroTitle" as const,
    subtitleKey: "home:sections.garageHeroSubtitle" as const,
  },
] as const;

function HeroBannerCarousel() {
  const { t } = useTranslation(["home", "common"]);
  const { openGaragePopup } = useGaragePopup();

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
    <section className="max-w-[96rem] mx-auto px-4 md:px-8 mb-8">
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
          className="aspect-[1184/317]"
          ref={emblaRef}
        >
          <div className="flex h-full">
            {heroBannerSlides.map((slide) => {
              const slideContent = (
                <>
                  <div className="absolute inset-0 overflow-hidden">
                    <div className="w-full h-full transition-transform duration-700 ease-out group-hover:scale-105">
                      {slide.image}
                    </div>
                  </div>

                  <div className={`absolute inset-0 ${slide.gradient} transition-opacity duration-500 group-hover:opacity-90`} />

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
                </>
              );

              return (
              <div key={slide.key} className="flex-[0_0_100%] min-w-0 relative h-full">
                {"opensGaragePopup" in slide && slide.opensGaragePopup ? (
                  <button
                    type="button"
                    onClick={() => openGaragePopup()}
                    draggable={false}
                    className="group block h-full w-full cursor-pointer text-left"
                  >
                    {slideContent}
                  </button>
                ) : "to" in slide ? (
                <Link to={slide.to} prefetch="render" draggable={false} className="group block h-full">
                  {slideContent}
                </Link>
                ) : null}
              </div>
            );
            })}
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
      <section className="relative w-full min-h-[200px] md:min-h-[320px] flex items-center justify-center mb-8 overflow-x-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/45 to-black/70" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-[96rem] mx-auto px-4 md:px-8 py-7 md:py-10">
          <div className="mb-5 flex flex-col items-start gap-2.5 md:mb-7 md:flex-row md:items-end md:justify-between md:gap-6">
            <h1 className="text-[1.65rem] leading-tight font-bold italic text-white md:text-4xl lg:text-[2.75rem] min-w-0 max-w-xl">
              {t("home:hero.searchTitle")}
            </h1>
            <Link
              to={href("/available-cars")}
              prefetch="render"
              className="font-koulen text-xs uppercase tracking-wide text-white underline decoration-white/50 underline-offset-[5px] transition-colors hover:decoration-white md:shrink-0 md:pb-1.5 md:text-sm"
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
      <section className="max-w-[96rem] mx-auto px-4 md:px-8 mb-8">
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
              {(categoriesResponse) => {
                const categories = categoriesResponse.data?.data ?? [];
                if (!categories.length) return null;

                const MOTORCYCLE_ACCESSORIES_CATEGORY_ID =
                  "1157bae5-379a-485e-a4c4-4abeb1b8ef9b";

                type HomeCategoryCard = {
                  key: string;
                  hrefTo: string;
                  imageSrc: string;
                  label: string;
                  imageClassName: string;
                  kind: "apparel" | "accessories" | "default";
                };

                const categoryLabel = (category: (typeof categories)[number]) => {
                  const c = category as {
                    name: string;
                    translations?: Array<{
                      languageCode: string;
                      name: string;
                    }>;
                  };
                  return c.translations?.length
                    ? getLocalizedTranslation(c.translations)?.name ?? c.name
                    : c.name;
                };

                const cards: HomeCategoryCard[] = categories.map(
                  (category, index) => {
                    const slug = (category.slug ?? "").toLowerCase();
                    const name = (category.name ?? "").toLowerCase();
                    const imageUrl = (category.image_url ?? "").toLowerCase();

                    // Slot 2 (former Vents) → Motorcycle Apparel
                    const isApparelSlot =
                      category.sortOrder === 1 ||
                      index === 1 ||
                      slug === "vents" ||
                      slug.includes("vents") ||
                      slug.includes("تهوية") ||
                      name === "vents" ||
                      name.includes("vent") ||
                      name.includes("تهوية") ||
                      imageUrl.includes("vents");

                    // Slot 6 (Steering Trim) → Motorcycle Accessories
                    const isAccessoriesSlot =
                      !isApparelSlot &&
                      (category.sortOrder === 5 ||
                        index === 5 ||
                        imageUrl.includes("steerim") ||
                        imageUrl.includes("steering") ||
                        name.includes("interior trim") ||
                        name.includes("تزيين داخلية") ||
                        slug.includes("تزيين-داخلية"));

                    if (isApparelSlot) {
                      return {
                        key: `apparel-${category.id}`,
                        hrefTo: href("/shop/:productType", {
                          productType: "motorcycles",
                        }),
                        imageSrc: "/categories/motorcycles/jackets.webp",
                        label: t("home:sections.motorcycleApparel", {
                          defaultValue: "Motorcycle Apparel",
                        }),
                        imageClassName:
                          "absolute -top-2 -end-6 w-[110%] h-[110%] object-contain object-[right_12%] group-hover:scale-110 hover:-rotate-3 transition-all duration-500",
                        kind: "apparel" as const,
                      };
                    }

                    if (isAccessoriesSlot) {
                      return {
                        key: `accessories-${category.id}`,
                        hrefTo: `${href("/shop/:productType", {
                          productType: "motorcycles",
                        })}?categories=${MOTORCYCLE_ACCESSORIES_CATEGORY_ID}`,
                        imageSrc: "/categories/motorcycles/accessories.webp",
                        label: t("home:sections.motorcycleAccessories", {
                          defaultValue: "Motorcycle Accessories",
                        }),
                        imageClassName:
                          "absolute -top-10 -end-10 w-full h-full object-contain group-hover:scale-110 hover:-rotate-3 transition-all duration-500",
                        kind: "accessories" as const,
                      };
                    }

                    return {
                      key: category.id,
                      hrefTo: serializeShopURL({
                        categories: [category.id],
                      }),
                      imageSrc: category.image_url ?? "",
                      label: categoryLabel(category),
                      imageClassName:
                        "absolute -top-10 -end-10 w-full h-full object-contain group-hover:scale-110 hover:-rotate-3 transition-all duration-500",
                      kind: "default" as const,
                    };
                  }
                );

                // Keep Motorcycle Apparel + Accessories adjacent (first row on mobile + desktop)
                const apparel = cards.find((c) => c.kind === "apparel");
                const accessories = cards.find((c) => c.kind === "accessories");
                const others = cards.filter(
                  (c) => c.kind === "default"
                );
                const orderedCards = [
                  ...(apparel ? [apparel] : []),
                  ...(accessories ? [accessories] : []),
                  ...others,
                ];

                return orderedCards.map((card) => (
                  <Link key={card.key} to={card.hrefTo} prefetch="render">
                    <SimpleCard className="aspect-[5/4] font-koulen group bg-primary text-white uppercase p-6 flex flex-col justify-end relative overflow-hidden">
                      <img
                        src={card.imageSrc}
                        alt={card.label}
                        loading="lazy"
                        className={card.imageClassName}
                      />
                      <h3 className="text-2xl max-w-20 z-10">{card.label}</h3>
                    </SimpleCard>
                  </Link>
                ));
              }}
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
            <div className="max-w-[96rem] mx-auto px-4 md:px-8">
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
        <section className="max-w-[96rem] mx-auto px-4 md:px-8 mb-8" aria-hidden>
          <div className="h-48 animate-pulse rounded-md bg-muted" />
        </section>
      )}
    </>
  );
}
