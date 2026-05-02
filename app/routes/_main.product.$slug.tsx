import { useState, useEffect } from "react";
import { Button } from "~/components/ui/button";
import { ProductCard } from "~/components/product-card";
import { Minus, Plus, ChevronLeft, ChevronRight, Loader2, CheckIcon, XIcon } from "lucide-react";
import { getApiProductsPublic, getApiProductsPublicByProductId, getApiProductsPublicSlugBySlug, getApiProductTypes, } from "~/lib/client";
import { useCartManager } from "~/lib/cart-manager";
import { useFavoritesManager } from "~/lib/favorites-manager";
import { defaultParams } from "~/lib/api-client";
import type { Route } from "./+types/_main.product.$slug";
import { capitalizeWords, formatYearRange, mergeMeta } from "~/lib/utils";
import { data, href, Link, redirect, useLocation, useRevalidator } from "react-router";
import { accessTokenCookie } from "~/lib/auth-middleware";
import { authContext } from "~/context";
import { Faq } from "~/components/faq";
import { serializeShopURL } from "~/lib/shop-search-params";
import type { ProductItem } from "~/lib/client";
import { garageCarsQueryOptions } from "~/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { FitmentBadge } from "~/components/fitment-badge";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { FavoritesButton } from "~/components/favorites-button";
import { useTranslation } from "react-i18next";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import i18n from "~/lib/i18n";
import ProductsHorizontalScroll from "~/components/ProductsHorizontalScroll";
import { WhatsAppButton } from "~/components/whatsapp-button";
import { getLocaleFromRequest } from "~/lib/i18n-cookie";
import { config } from "~/config";
import { buildProductPath, buildProductSlugSegment, extractProductIdFromSlugSegment } from "~/lib/product-url";
import { useCurrency } from "~/hooks/use-currency";
import { AddNewCarDialog } from "~/components/add-new-car-dialog";
import { useGuestGarageCars } from "~/hooks/use-guest-garage-cars";
import { CarFront } from "lucide-react";
import { ProductDetailImage, ProductDetailThumb } from "~/components/product-detail-image";
import { productImageWithFormatPreference } from "~/lib/product-image";
import { resolveProductSpecsByLanguage } from "~/lib/product-specs";

const PDP_CACHE_CONTROL =
  "public, s-maxage=120, stale-while-revalidate=86400";

export async function loader({ params, request, context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  const accessToken = await accessTokenCookie.parse(
    request.headers.get("Cookie")
  );
  const locale = await getLocaleFromRequest(request);
  const languageId =
    locale === "ar" ? config.languageIds.ar : config.languageIds.en;
  const productId = extractProductIdFromSlugSegment(params.slug);
  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  try {
    if (productId) {
      const needEnglishProductCopy =
        languageId !== config.languageIds.en;
      const [productResponse, englishProductResponse, productTypesResponse] =
        await Promise.all([
          getApiProductsPublicByProductId({
            path: { productId },
            query: { languageId },
            headers: authHeaders,
          }),
          needEnglishProductCopy
            ? getApiProductsPublicByProductId({
                path: { productId },
                query: { languageId: config.languageIds.en },
                headers: authHeaders,
              })
            : Promise.resolve(
                null as Awaited<
                  ReturnType<typeof getApiProductsPublicByProductId>
                > | null
              ),
          getApiProductTypes(),
        ]);

      if (productResponse.error) {
        throw new Response("Product not found", { status: 404 });
      }

      const englishProductName = needEnglishProductCopy
        ? englishProductResponse?.data?.data?.translations?.[0]?.name
        : undefined;

      const canonicalSlugSegment = buildProductSlugSegment(
        productResponse.data.data
      );
      if (canonicalSlugSegment && params.slug !== canonicalSlugSegment) {
        const url = new URL(request.url);
        throw redirect(`/product/${canonicalSlugSegment}${url.search}`);
      }

      const product = productResponse.data.data;
      const relatedProductsResponse = getApiProductsPublic({
        query: {
          storeId: defaultParams.storeId,
          languageId,
          page: 1,
          limit: 10,
          sortBy: "createdAt",
          sortOrder: "desc",
          carId: product.carCompatibility?.[0]?.carId,
        },
        headers: authHeaders,
      });

      const productTypes = productTypesResponse.data?.data ?? [];
      const resolvedProductType = product.productType?.id
        ? (productTypes.find((t) => t.id === product.productType!.id) ?? null)
        : null;

      const categoryName =
        product.category?.translations?.find((t) => t.languageCode === locale)
          ?.name ||
        product.category?.translations?.find((t) => t.languageCode === "en")
          ?.name ||
        null;

      const subCategoryName =
        product.subCategory?.translations?.find(
          (t) => t.languageCode === locale
        )?.name ||
        product.subCategory?.translations?.find((t) => t.languageCode === "en")
          ?.name ||
        null;

      const preloadPrimaryImageUrl = productImageWithFormatPreference(
        product.mainImage ?? ""
      );

      return data(
        {
          product,
          englishProductName,
          relatedProductsResponse,
          preloadPrimaryImageUrl,
          isAuthenticated: !!accessToken,
          breadcrumb: {
            productType: resolvedProductType
              ? { name: resolvedProductType.name, slug: resolvedProductType.slug }
              : null,
            categoryName,
            categoryId: product.categoryId,
            subCategoryName,
            subCategoryId: product.subCategoryId,
          },
        },
        { headers: { "Cache-Control": PDP_CACHE_CONTROL } }
      );
    }

    const [productResponse, productTypesResponse] = await Promise.all([
      getApiProductsPublicSlugBySlug({
        path: { slug: params.slug! },
        query: {
          languageId,
          storeId: defaultParams.storeId,
        },
        headers: authHeaders,
      }),
      getApiProductTypes(),
    ]);

    if (productResponse.error) {
      throw new Response("Product not found", { status: 404 });
    }

    const canonicalSlugSegment = buildProductSlugSegment(
      productResponse.data.data
    );
    if (canonicalSlugSegment && params.slug !== canonicalSlugSegment) {
      const url = new URL(request.url);
      throw redirect(`/product/${canonicalSlugSegment}${url.search}`);
    }

    const product = productResponse.data.data;
    const relatedProductsResponse = getApiProductsPublic({
      query: {
        storeId: defaultParams.storeId,
        languageId,
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
        carId: product.carCompatibility?.[0]?.carId,
      },
      headers: authHeaders,
    });

    const productTypes = productTypesResponse.data?.data ?? [];
    const resolvedProductType = product.productType?.id
      ? (productTypes.find((t) => t.id === product.productType!.id) ?? null)
      : null;

    const categoryName =
      product.category?.translations?.find((t) => t.languageCode === locale)
        ?.name ||
      product.category?.translations?.find((t) => t.languageCode === "en")
        ?.name ||
      null;

    const subCategoryName =
      product.subCategory?.translations?.find((t) => t.languageCode === locale)
        ?.name ||
      product.subCategory?.translations?.find((t) => t.languageCode === "en")
        ?.name ||
      null;

    const preloadPrimaryImageUrl = productImageWithFormatPreference(
      product.mainImage ?? ""
    );

    return data(
      {
        product,
        englishProductName: undefined as string | undefined,
        relatedProductsResponse,
        preloadPrimaryImageUrl,
        isAuthenticated: !!accessToken,
        breadcrumb: {
          productType: resolvedProductType
            ? { name: resolvedProductType.name, slug: resolvedProductType.slug }
            : null,
          categoryName,
          categoryId: product.categoryId,
          subCategoryName,
          subCategoryId: product.subCategoryId,
        },
      },
      { headers: { "Cache-Control": PDP_CACHE_CONTROL } }
    );
  } catch (error) {
    if (error instanceof Response) throw error;
    throw new Response("Product not found", { status: 404 });
  }
}

export const meta: Route.MetaFunction = (args) => {
  const product = args.loaderData.product;
  const ogImage = productImageWithFormatPreference(
    product.mainImage ?? ""
  );
  const canonicalSlugSegment = buildProductSlugSegment(product);
  const canonicalProductPath = buildProductPath(product);
  const slugSuffix = `-${String(product.id)}`;
  const englishTitleFromSlug = canonicalSlugSegment.endsWith(slugSuffix)
    ? canonicalSlugSegment.slice(0, -slugSuffix.length).replace(/-/g, " ")
    : canonicalSlugSegment.replace(/-/g, " ");
  const englishTitle =
    englishTitleFromSlug ||
    args.loaderData.englishProductName ||
    product.translations.find((t) => t.languageCode === "en")?.name ||
    product.translations[0].name;

  const preloadHref = args.loaderData.preloadPrimaryImageUrl;

  return mergeMeta(args, [
    {
      title: `${capitalizeWords(englishTitle)} - MotoGT`,
    },
    ...(preloadHref
      ? ([
          {
            tagName: "link" as const,
            rel: "preload",
            as: "image",
            href: preloadHref,
            fetchPriority: "high",
          },
        ] as const)
      : []),
    {
      name: "description",
      content: product.translations[0].description ?? "",
    },
    {
      name: "og:image",
      content: ogImage,
    },
    {
      name: "og:title",
      content: `${capitalizeWords(englishTitle)} - MotoGT`,
    },
    {
      name: "og:description",
      content: product.translations[0].description ?? "",
    },
    {
      name: "og:url",
      content: `https://motogt.com${canonicalProductPath}`,
    },
    {
      name: "og:type",
      content: "product",
    },
    {
      "script:ld+json": {
        "@context": "https://schema.org/",
        "@type": "Product",
        name: `${capitalizeWords(englishTitle)}`,
        description: product.translations[0].description ?? "",
        image: [ogImage],
        offers: {
          "@type": "Offer",
          price: product.price,
          priceCurrency: "JOD",
          availability:
            args.loaderData.product.stockQuantity > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
        },
        url: `https://motogt.com${canonicalProductPath}`,
        brand: {
          "@type": "Brand",
          name: args.loaderData.product.carCompatibility?.[0]?.carBrand ?? "",
        },
        category: "Automotive Accessories",
        productID: product.id,
        sku: product.itemCode,
        additionalProperty: [
          ...Object.entries(
            resolveProductSpecsByLanguage(product.specs, "en")
          ).map(([specKey, specData]) => ({
            "@type": "PropertyValue",
            name: specKey,
            value: specData.value,
          })),
        ],
      },
    },
  ]);
};

export default function ProductPage({ loaderData }: Route.ComponentProps) {
  const { product, relatedProductsResponse, isAuthenticated, breadcrumb } = loaderData;
  const state = useLocation().state;
  const revalidator = useRevalidator();
  const { addToCartMutation } = useCartManager(isAuthenticated);
  const { toggleFavoritesMutation, favoritesQuery } =
    useFavoritesManager(isAuthenticated);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    product.variants && product.variants.length > 0
      ? product.variants.find((v) => v.isActive)?.id || null
      : null
  );

  const { t } = useTranslation(["common", "product"]);

  const isRTL = i18n.language === 'ar';
  const ChevronIcon = isRTL ? ChevronLeft : ChevronRight;
  
  // Get current variant data
  const currentVariant = selectedVariant
    ? product.variants?.find((v) => v.id === selectedVariant)
    : null;

  // Calculate current price (base price + variant adjustment)
  const currentPrice = product.price + (currentVariant?.priceAdjustment || 0);

  // Currency conversion
  const { selectedCurrency, convertPrice } = useCurrency();
  const [convertedPrice, setConvertedPrice] = useState<number | null>(null);
  const [convertedBasePrice, setConvertedBasePrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  useEffect(() => {
    async function convert() {
      setIsLoadingPrice(true);
      try {
        const result = await convertPrice(currentPrice, "JOD");
        setConvertedPrice(result.convertedAmount);
        if (currentVariant && currentVariant.priceAdjustment !== 0) {
          const baseResult = await convertPrice(product.price, "JOD");
          setConvertedBasePrice(baseResult.convertedAmount);
        }
      } catch (error) {
        setConvertedPrice(currentPrice);
        setConvertedBasePrice(product.price);
      } finally {
        setIsLoadingPrice(false);
      }
    }
    convert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPrice, product.price, currentVariant, selectedCurrency]);

  const displayPrice = convertedPrice ?? currentPrice;
  const displayBasePrice = convertedBasePrice ?? product.price;
  const localizedProductName = getLocalizedTranslation(product.translations)?.name ?? "";

  // Get current stock quantity
  const currentStock = currentVariant?.stockQuantity ?? product.stockQuantity;

  // Check if product is in favorites (prefer query data, fallback to in_favs)
  const baseIsFavorite =
    favoritesQuery.data?.items.some((item) => item.id === product.id) ??
    product.in_favs ??
    false;

  // Optimistic state for immediate visual feedback
  const [optimisticFavorite, setOptimisticFavorite] = useState<boolean | null>(null);
  const isFavorite = optimisticFavorite !== null ? optimisticFavorite : baseIsFavorite;

  // Reset optimistic state when query data updates (after mutation completes)
  useEffect(() => {
    if (optimisticFavorite !== null && !toggleFavoritesMutation.isPending && favoritesQuery.data) {
      setOptimisticFavorite(null);
    }
  }, [favoritesQuery.data, toggleFavoritesMutation.isPending]);

  const compatibleCar = product.carCompatibility?.[0];

  const carSpecSource = compatibleCar
    ? {
        make: compatibleCar.carBrand,
        model: compatibleCar.carModel,
        ...(compatibleCar.carYearFrom && {
          year: formatYearRange(
            compatibleCar.carYearFrom,
            compatibleCar.carYearTo
          ),
        }),
      }
    : {};

  const localizedSpecs = resolveProductSpecsByLanguage(
    product.specs,
    i18n.language
  );

  const showSpecificationsSection =
    Object.keys(localizedSpecs).length > 0 ||
    Object.keys(carSpecSource).length > 0;

  // Create image gallery - prioritize variant images if available
  const getImageGallery = (): string[] => {
    if (currentVariant?.images && currentVariant.images.length > 0) {
      const imgs = currentVariant.images.filter(
        (u): u is string => typeof u === "string" && !!u.trim()
      );
      if (currentVariant.mainImage?.trim()) {
        return [currentVariant.mainImage, ...imgs];
      }
      return imgs;
    }
    const secondary = product.secondaryImage?.trim();
    const main = product.mainImage?.trim();
    const rest = (product.images ?? []).filter(
      (u): u is string => typeof u === "string" && !!u.trim()
    );
    if (secondary) {
      return [secondary, ...(main ? [main] : []), ...rest];
    }
    return [...(main ? [main] : []), ...rest];
  };

  const imageGallery = getImageGallery();

  // Reset selected image when variant changes
  const handleVariantChange = (variantId: string) => {
    setSelectedVariant(variantId);
    setSelectedImage(0);
  };

  const updateQuantity = (change: number) => {
    setQuantity((prev) => Math.max(1, Math.min(prev + change, currentStock)));
  };

  // Fetch all cars from the user's garage
  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: loaderData?.isAuthenticated,
  });

  const userCars = garageCarsQuery.data?.userCars ?? [];

  const guestCars = useGuestGarageCars(!isAuthenticated);

  // Unique compatible cars (deduplicated by brand+model) that are NOT in the garage
  const unaddedCompatibleCars = (() => {
    if (!product.carCompatibility || product.carCompatibility.length === 0) return [];
    const allGarageCars = isAuthenticated
      ? userCars.map((c) => `${c.carDetails.brand}|||${c.carDetails.model}`)
      : guestCars.map((c) => `${c.carDetails.brand}|||${c.carDetails.model}`);

    const seen = new Set<string>();
    const result: { brand: string; model: string; carId: string }[] = [];
    for (const compat of product.carCompatibility) {
      const key = `${compat.carBrand}|||${compat.carModel}`;
      if (!seen.has(key) && !allGarageCars.includes(key)) {
        seen.add(key);
        result.push({ brand: compat.carBrand, model: compat.carModel, carId: compat.carId });
      }
    }
    return result;
  })();

  const [addGarageDialogCar, setAddGarageDialogCar] = useState<{ make: string; model: string } | null>(null);

  const fitmentBadge = (product: ProductItem) => {
    if (!loaderData || !product.carCompatibility || product.carCompatibility.length === 0) return null;

    if (userCars.length === 0) {
      return (
        <HoverCard openDelay={300}>
          <HoverCardTrigger asChild>
            <div className="cursor-pointer">
              <FitmentBadge variant="add-car" text="Add Car To Fit Check" />
            </div>
          </HoverCardTrigger>
          <HoverCardContent className="w-[280px] z-[60] p-0" side="top">
            <div className="bg-[#F2F2F2] rounded-[2px] border border-[#E6E6E6] overflow-hidden" style={{ boxShadow: '0 4px 10px 0 rgba(0, 0, 0, 0.10)' }}>
              <div className="px-4 pt-4 pb-3">
                <h4 className="text-sm font-semibold text-black leading-[1.5] mb-2">
                  Add Your Car to Garage
                </h4>
                <p className="text-xs font-medium text-[rgba(0,0,0,0.7)] leading-[1.5]">
                  Add your car to see which products fit your vehicle automatically.
                </p>
              </div>
              <div className="px-4 pb-4">
                <Link
                  to="/my-garage"
                  className="text-xs font-medium text-[#908B9B] hover:text-[#000000] transition-colors underline"
                >
                  Go to My Garage →
                </Link>
              </div>
            </div>
          </HoverCardContent>
        </HoverCard>
      );
    }

    // Check which cars from the garage are compatible with this product
    const compatibleCars = userCars.filter((userCar) => {
      return product.carCompatibility?.some((car) => {
        const matchesCar =
          `${car.carBrand} ${car.carModel}` ===
          `${userCar.carDetails.brand} ${userCar.carDetails.model}`;

        // Check year range compatibility if year is available
        if (matchesCar && userCar.carDetails.yearFrom) {
          const yearFrom = car.carYearFrom ?? 0;
          const yearTo = car.carYearTo;
          return (
            yearFrom <= userCar.carDetails.yearFrom &&
            (yearTo === null || yearTo >= userCar.carDetails.yearFrom)
          );
        }

        return matchesCar; // Fallback if no year specified
      });
    });

    const hasCompatibleCars = compatibleCars.length > 0;

    return (
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="cursor-pointer">
            <FitmentBadge
              variant={hasCompatibleCars ? "fit" : "no-fit"}
              text={hasCompatibleCars ? "Fits Your Car" : "Doesn't Fit Your Cars"}
              clickable={false}
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-[320px] z-[60] p-0" side="top">
          <div className="bg-[#F2F2F2] rounded-[2px] border border-[#E6E6E6] overflow-hidden" style={{ boxShadow: '0 4px 10px 0 rgba(0, 0, 0, 0.10)' }}>
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-[#E6E6E6]">
              <h4 className="text-sm font-semibold text-black leading-[1.5]">
                Fitment for Your Garage:
              </h4>
            </div>
            
            {/* Car List */}
            <div className="divide-y divide-[#E6E6E6]">
              {userCars.map((userCar) => {
                const isCompatibleCar = compatibleCars.some(
                  (c) => c.id === userCar.id
                );
                return (
                  <div
                    key={`userCar-${userCar.id}`}
                    className="px-4 py-3 hover:bg-[#E6E6E6] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Car Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black uppercase tracking-wide leading-[1.4] mb-0.5">
                          {userCar.carDetails.brand} {userCar.carDetails.model}
                        </p>
                        {userCar.carDetails.yearFrom && (
                          <p className="text-xs font-medium text-[rgba(0,0,0,0.5)] leading-[1.4]">
                            {userCar.carDetails.yearFrom}
                            {userCar.carDetails.yearTo &&
                            userCar.carDetails.yearTo !==
                              userCar.carDetails.yearFrom
                              ? ` - ${userCar.carDetails.yearTo}`
                              : ""}
                          </p>
                        )}
                      </div>
                      
                      {/* Fitment Status */}
                      <div className="flex-shrink-0">
                        {isCompatibleCar ? (
                          <div className="flex items-center gap-1.5">
                            <CheckIcon className="size-4 text-[#1d9200] flex-shrink-0" />
                            <span className="text-xs font-medium text-[#1d9200] whitespace-nowrap">
                              Fits
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <XIcon className="size-4 text-[#cf172f] flex-shrink-0" />
                            <span className="text-xs font-medium text-[#cf172f] whitespace-nowrap">
                              Doesn't Fit
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  };

  return (
    <>
      <div className="bg-white pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] mb-16">
          {/* Product Images Section */}
          <div className="space-y-4 ps-[calc(max(0px,(100vw-80rem)/2)+1.5rem)] bg-background-secondary py-10 pe-6 md:pe-10">
            {/* Product Title and Price */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center flex-wrap gap-2 italic text-xs mb-2 [&>a]:hover:text-primary [&>a]:hover:underline">
                  <Link to={href("/")} className="flex items-center gap-2">
                    {t("product:breadcrumbs.home")}
                  </Link>
                  {breadcrumb.categoryName && breadcrumb.categoryId && (
                    <>
                      <ChevronIcon className="size-3 text-primary" />
                      <Link to={serializeShopURL({ categories: [breadcrumb.categoryId] })}>
                        {breadcrumb.categoryName}
                      </Link>
                    </>
                  )}
                  {breadcrumb.subCategoryName && breadcrumb.subCategoryId && (
                    <>
                      <ChevronIcon className="size-3 text-primary" />
                      <Link to={serializeShopURL({ categories: [breadcrumb.subCategoryId] })}>
                        {breadcrumb.subCategoryName}
                      </Link>
                    </>
                  )}
                </div>
                <h1 className="text-2xl font-extrabold italic capitalize">
                  {getLocalizedTranslation(product.translations)?.name}
                </h1>
                <div className="text-primary text-xs font-bold">
                  {product.itemCode}
                </div>
              </div>
            </div>
            {/* Main Image */}
            <div className="relative rounded-lg">
              <ProductDetailImage
                src={imageGallery[selectedImage]}
                alt={
                  getLocalizedTranslation(product.translations)?.name ?? ""
                }
                priority
              />

              {/* Navigation Arrows */}
              <Button
                variant="outline"
                size="icon"
                className="absolute start-5 top-1/2 -translate-y-1/2 bg-white hidden md:flex"
                onClick={() =>
                  setSelectedImage((prev) =>
                    prev === 0 ? imageGallery.length - 1 : prev - 1
                  )
                }
              >
                {isRTL ? <ChevronRight className="h-6 w-6" /> :
                <ChevronLeft className="h-6 w-6" />}
              </Button>

              <Button
                variant="outline"
                size="icon"
                className="absolute end-5 top-1/2 -translate-y-1/2 bg-white hidden md:flex"
                onClick={() =>
                  setSelectedImage((prev) =>
                    prev === imageGallery.length - 1 ? 0 : prev + 1
                  )
                }
              >
                {isRTL ? <ChevronLeft className="h-6 w-6" /> :
                <ChevronRight className="h-6 w-6" />}
              </Button>
            </div>

            {/* Thumbnail Images */}
            <div className="flex flex-wrap gap-2 overflow-scroll">
              {imageGallery.map((image, index) => (
                <ProductDetailThumb
                  key={`image-${image}-${index}`}
                  src={image}
                  alt={`${getLocalizedTranslation(product.translations)?.name ?? "Product"} — ${index + 1}`}
                  isSelected={selectedImage === index}
                  onSelect={() => setSelectedImage(index)}
                />
              ))}
            </div>
          </div>

          {/* Product Details Section */}
          <div className="flex flex-col gap-6 pe-[calc(max(0px,(100vw-80rem)/2)+1.5rem)] ps-6 md:ps-10 pt-10 md:pb-10">
            {/* Description */}
            <div className="space-y-4 order-5 md:order-1">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-bold">{t("product:details.description")}</h2>
                {fitmentBadge(product)}
              </div>
              <p className="text-sm font-medium text-gray-700 leading-relaxed">
                {getLocalizedTranslation(product.translations)?.description ||
                  "No description available."}
              </p>
            </div>

            <hr className="border-gray-300 order-4 md:order-2" />

            {/* Specifications */}
            {showSpecificationsSection && (
              <div className="space-y-2 order-7 md:order-3">
                <h2 className="text-lg font-bold">{t("product:details.specifications")}</h2>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(carSpecSource).map(([key, value]) => (
                    <div key={`car-${key}`} className="flex">
                      <div className="bg-gray-50 border border-gray-200 border-e-0 px-3 py-1.5 text-sm text-gray-500 rounded-s capitalize">
                        {key}
                      </div>
                      <div className="bg-gray-50 border border-gray-200 px-2 py-1.5 text-sm font-medium rounded-e">
                        {capitalizeWords(value?.toString() ?? "")}
                      </div>
                    </div>
                  ))}
                  {Object.entries(localizedSpecs).map(([specKey, specData]) => (
                    <div key={`spec-${specKey}`} className="flex">
                      <div className="bg-gray-50 border border-gray-200 border-e-0 px-3 py-1.5 text-sm text-gray-500 rounded-s capitalize">
                        {specKey}
                      </div>
                      <div className="bg-gray-50 border border-gray-200 px-2 py-1.5 text-sm font-medium rounded-e">
                        {capitalizeWords(specData.value)}
                        {specData.unit && ` ${specData.unit}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <hr className="border-gray-300 order-6 md:order-4" />

            {/* Add Compatible Car to Garage */}
            {unaddedCompatibleCars.length > 0 && (
              <div className="order-6 md:order-4b space-y-2">
                {unaddedCompatibleCars.map((car) => (
                  <div
                    key={`${car.brand}-${car.model}`}
                    className="flex items-center gap-3 rounded-[4px] border border-[#e6e6e6] bg-[#f9f9f9] px-3 py-2.5"
                  >
                    <CarFront className="size-4 text-black/30 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-black/50 leading-snug">
                        Fits <span className="font-medium text-black/70">{car.brand} {car.model}</span> 
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddGarageDialogCar({ make: car.brand, model: car.model })}
                      className="shrink-0 text-xs font-medium text-black/50 hover:text-black transition-colors duration-150 cursor-pointer whitespace-nowrap underline underline-offset-2"
                    >
                      Add to Garage
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Variant Selection */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-4 order-7 md:order-5">
                <h2 className="text-lg font-bold">{t("product:details.options")}</h2>

                {/* Group variants by unique combinations */}
                {(() => {
                  const sizes = Array.from(
                    new Set(
                      product.variants
                        .map((v) => v.size)
                        .filter(
                          (s): s is string =>
                            typeof s === "string" && s.length > 0
                        )
                    )
                  );
                  const colors = Array.from(
                    new Set(
                      product.variants
                        .map((v) => v.color)
                        .filter(
                          (c): c is string =>
                            typeof c === "string" && c.length > 0
                        )
                    )
                  );

                  return (
                    <div className="space-y-3">
                      {/* Size Selector */}
                      {sizes.length > 0 && (
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            {t("product:details.size")}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {sizes.map((size, index) => {
                              const variant = product.variants!.find(
                                (v) =>
                                  v.size === size &&
                                  v.isActive &&
                                  (!currentVariant?.color ||
                                    v.color === currentVariant.color)
                              );
                              const isSelected = currentVariant?.size === size;
                              const isAvailable =
                                variant && variant?.stockQuantity > 0;

                              return (
                                <Button
                                  key={`size-${size}-${index}`}
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  disabled={!isAvailable}
                                  onClick={() =>
                                    variant && handleVariantChange(variant.id)
                                  }
                                  className={
                                    !isAvailable
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                  }
                                >
                                  {size}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Color Selector */}
                      {colors.length > 0 && (
                        <div>
                          <label className="text-sm font-medium mb-2 block">
                            {t("product:details.color")}
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {colors.map((color, index) => {
                              const variant = product.variants!.find(
                                (v) =>
                                  v.color === color &&
                                  v.isActive &&
                                  (!currentVariant?.size ||
                                    v.size === currentVariant.size)
                              );
                              const isSelected =
                                currentVariant?.color === color;
                              const isAvailable =
                                variant && variant.stockQuantity > 0;

                              return (
                                <Button
                                  key={`color-${color}-${index}`}
                                  variant={isSelected ? "default" : "outline"}
                                  size="sm"
                                  disabled={!isAvailable}
                                  onClick={() =>
                                    variant && handleVariantChange(variant.id)
                                  }
                                  className={
                                    !isAvailable
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                  }
                                >
                                  {capitalizeWords(String(color))}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Stock Status */}
                      {currentStock <= 5 && currentStock > 0 && (
                        <p className="text-sm text-orange-600">
                          Only {currentStock} left in stock
                        </p>
                      )}
                      {currentStock === 0 && (
                        <p className="text-sm text-red-600 font-medium">
                          {t("common:status.outOfStock")}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {!product.variants || product.variants.length === 0 ? (
              <>
                {/* Stock Status for non-variant products */}
                {currentStock <= 5 && currentStock > 0 && (
                  <p className="text-sm text-orange-600 order-7 md:order-5">
                    Only {currentStock} left in stock
                  </p>
                )}
                {currentStock === 0 && (
                  <p className="text-sm text-red-600 font-medium order-7 md:order-5">
                    {t("common:status.outOfStock")}
                  </p>
                )}
              </>
            ) : null}

            {/* Quantity and Actions */}
            <div className="flex items-center justify-between order-1 md:order-6">
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateQuantity(-1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="font-semibold text-sm text-primary min-w-[20px] text-center">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => updateQuantity(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <FavoritesButton
                isFavorite={isFavorite ?? false}
                isLoading={toggleFavoritesMutation.isPending}
                onClick={() => {
                  const newFavoriteState = !isFavorite;
                  
                  // Update optimistic state immediately
                  setOptimisticFavorite(newFavoriteState);
                  
                  toggleFavoritesMutation.mutate(
                    {
                      ...product,
                      isFavorite: isFavorite ?? false,
                    },
                    {
                      onError: () => {
                        // Revert on error
                        setOptimisticFavorite(null);
                      },
                      onSuccess: () => {
                        revalidator.revalidate();
                      },
                    }
                  );
                }}
              />
            </div>

            <div className="text-xl font-bold order order-2 md:order-7">
              {isLoadingPrice ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                <>
                  {selectedCurrency} {displayPrice.toFixed(2)}
                  {currentVariant && currentVariant.priceAdjustment !== 0 && (
                    <span className="text-sm text-muted-foreground ml-2">
                      (Base: {selectedCurrency} {displayBasePrice.toFixed(2)})
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="order-3 md:order-8 flex flex-col gap-2">
              {/* Add to Cart Button */}
              <Button
                className="w-full h-12 font-koulen text-lg"
                onClick={() =>
                  addToCartMutation.mutate({
                    productId: product.id,
                    itemCode: product.itemCode,
                    productTranslations: product.translations.map(t => ({ name: t.name, slug: t.slug, languageCode: t.languageCode })),
                    productImage:
                      currentVariant?.mainImage || product.mainImage || "",
                    unitPrice: currentPrice,
                    quantity: quantity,
                    variantId: selectedVariant || undefined,
                  })
                }
                disabled={
                  addToCartMutation.isPending ||
                  currentStock === 0 ||
                  (product.variants &&
                    product.variants.length > 0 &&
                    !selectedVariant)
                }
              >
                {addToCartMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Adding...
                  </>
                ) : currentStock === 0 ? (
                  t("common:status.outOfStock")
                ) : product.variants &&
                  product.variants.length > 0 &&
                  !selectedVariant ? (
                  t("common:status.selectOptions")
                ) : (
                  t("common:buttons.addToCart")
                )}
              </Button>

              <WhatsAppButton
                className="h-12 text-lg"
                items={[
                  {
                    productName: localizedProductName,
                    itemCode: product.itemCode,
                    price: displayPrice.toFixed(2),
                    productUrl: buildProductPath(product),
                  },
                ]}
                currency={selectedCurrency}
                lang={i18n.language}
                gtmTracking={{
                  mode: "pdp",
                  productName: localizedProductName,
                  productSku: product.itemCode,
                  productPrice: Number(displayPrice.toFixed(2)),
                  productMake: compatibleCar?.carBrand ?? "",
                  productModel: compatibleCar?.carModel ?? "",
                }}
              />
            </div>
          </div>
        </div>
        
        <ProductsHorizontalScroll
          sectionTitle={t("product:details.relatedProducts")}
          productsResponse={relatedProductsResponse}
        />

        <img
        loading="lazy"
          src="/bottom-banner.webp"
          alt="Own your look"
          className="w-full h-full"
        />
        <div className="bg-background-secondary -mb-8">
          <Faq />
        </div>
      </div>

      {/* Controlled Add-to-Garage dialog triggered from compatible cars */}
      {addGarageDialogCar && (
        <AddNewCarDialog
          open={!!addGarageDialogCar}
          onOpenChange={(open) => { if (!open) setAddGarageDialogCar(null); }}
          prefilledCar={addGarageDialogCar}
          lockPrefilledFields
          onSuccess={() => {
            setAddGarageDialogCar(null);
          }}
        />
      )}
    </>
  );
}
