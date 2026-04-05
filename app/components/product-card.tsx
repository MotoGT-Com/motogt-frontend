// Product listing card used on product grids and car-specific listings.
// Handles:
// - Linking to the product details page
// - Fit-check status vs all user's garage cars
// - Wishlist (favorites) toggle
// - Add-to-cart interaction
import { SimpleCard } from "./ui/card";
import { CheckIcon, Loader2, XIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Link, useLocation, useRouteLoaderData } from "react-router";
import { cn } from "~/lib/utils";
import type { GetApiHomeExteriorProductsResponse, ProductItem, UserCarsResponse, } from "~/lib/client";
import { useCartManager } from "~/lib/cart-manager";
import { useFavoritesManager } from "~/lib/favorites-manager";
import {
  useId,
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import type { Route } from "../routes/+types/_main";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { garageCarsQueryOptions } from "~/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { useGuestGarageCars } from "~/hooks/use-guest-garage-cars";
import { FitmentBadge } from "./fitment-badge";
import { FavoritesButton } from "./favorites-button";
import { WhatsAppButton } from "./whatsapp-button";
import { EmptyGarageDialog } from "./empty-garage-dialog";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import { buildProductPath } from "~/lib/product-url";
import { useTranslation } from "react-i18next";
import { useCurrency } from "~/hooks/use-currency";
import { useState as useReactState } from "react";
import { useAuthModal } from "~/context/AuthModalContext";

type UserCar = UserCarsResponse["data"]["userCars"][0];
type FavoriteItem = ProductItem | GetApiHomeExteriorProductsResponse["data"][0];

/** Intrinsic size for layout reservation (4:3). Matches aspect-[4/3] box. */
const PRODUCT_CARD_IMAGE_WIDTH = 800;
const PRODUCT_CARD_IMAGE_HEIGHT = 600;

/**
 * Use the original asset URL. (Query-based CDN resizing is intentionally not applied here —
 * appending w/h broke some CloudFront origins while `width`/`height` on <img> still reserve layout.)
 */
function productImageSrc(url: string): string {
  return url?.trim() ?? "";
}

/**
 * Product image: fixed aspect-ratio box + shimmer until load to minimize CLS.
 */
function BlurUpImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const displaySrc = src ? productImageSrc(src) : "";

  const frameClass = cn(
    "relative w-full aspect-[4/3] overflow-hidden rounded-md bg-muted/30",
    className
  );

  // Cached / already-decoded images often fire `load` before React attaches onLoad — check `complete`.
  useLayoutEffect(() => {
    if (!displaySrc) return;

    setIsLoaded(false);

    const img = imgRef.current;
    if (!img) return;

    const markLoaded = () => {
      setIsLoaded(true);
    };

    if (img.complete) {
      markLoaded();
      return;
    }

    img.addEventListener("load", markLoaded, { once: true });
    img.addEventListener("error", markLoaded, { once: true });
    return () => {
      img.removeEventListener("load", markLoaded);
      img.removeEventListener("error", markLoaded);
    };
  }, [displaySrc]);

  if (!displaySrc) {
    return (
      <div className={frameClass} aria-hidden>
        <div className="absolute inset-0 skeleton-shimmer rounded-md" />
      </div>
    );
  }

  return (
    <div className={frameClass}>
      {!isLoaded && (
        <div
          className="absolute inset-0 z-[1] skeleton-shimmer rounded-md"
          aria-hidden
        />
      )}
      <img
        ref={imgRef}
        src={displaySrc}
        alt={alt}
        width={PRODUCT_CARD_IMAGE_WIDTH}
        height={PRODUCT_CARD_IMAGE_HEIGHT}
        sizes="(max-width: 768px) 45vw, (max-width: 1280px) 32vw, 400px"
        loading="lazy"
        decoding="async"
        className={cn(
          "absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ease-out",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsLoaded(true)}
      />
    </div>
  );
}

/**
 * ProductCard Component
 *
 * A reusable product card component that displays product information, handles
 * fitment checking against user's garage cars, and provides interactions for
 * wishlist and cart functionality.
 *
 * Features:
 * - Responsive design (mobile and desktop layouts)
 * - Fitment badge showing compatibility with user's garage cars
 * - Image hover effect (shows secondary image on hover)
 * - Wishlist toggle functionality
 * - Add to cart functionality
 * - Clickable card that navigates to product details page
 *
 * @param product - Product data (union type to support different API responses)
 * @param className - Optional additional CSS classes
 * @param onFavorite - Optional callback fired when favorite status changes
 *
 * @example
 * ```tsx
 * <ProductCard
 *   product={productData}
 *   className="custom-class"
 * />
 * ```
 */
function ProductCard({
  product,
  className,
  onFavorite,
  carFilter,
}: {
  product: ProductItem | GetApiHomeExteriorProductsResponse["data"][0];
  className?: string;
  onFavorite?: () => void;
  carFilter?: {
    carBrand?: string | null;
    carModel?: string | null;
    carYear?: number | string | null;
    carId?: string | null;
  };
}) {
  // Global layout loader gives us auth info.
  const loaderData =
    useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  // Mutations for cart and favorites are encapsulated in their own hooks.
  const { addToCartMutation } = useCartManager(loaderData?.isAuthenticated);
  const { toggleFavoritesMutation, favoritesQuery } = useFavoritesManager(
    loaderData?.isAuthenticated
  );
  const id = useId();
  const [isHovered, setIsHovered] = useState(false);
  const { t, i18n } = useTranslation("common");
  const location = useLocation();
  const productName = getLocalizedTranslation(product.translations)?.name;
  const productPath = buildProductPath(product);

  // Warm secondary image cache so hover swap is instant.
  useEffect(() => {
    if (typeof window === "undefined" || !product.secondaryImage) return;

    const preloadImage = new Image();
    preloadImage.src = productImageSrc(product.secondaryImage);
  }, [product.secondaryImage]);
  
  // Currency hook for price conversion
  const { selectedCurrency, convertPrice } = useCurrency();
  const [convertedPrice, setConvertedPrice] = useReactState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useReactState(false);
  
  // Convert price when currency changes
  useEffect(() => {
    const productCurrency = (product as any).currency || "JOD";
    
    if (selectedCurrency === productCurrency) {
      setConvertedPrice(product.price);
      return;
    }
    
    setIsLoadingPrice(true);
    convertPrice(product.price, productCurrency)
      .then(result => {
        setConvertedPrice(result.convertedAmount);
      })
      .catch(() => {
        setConvertedPrice(product.price); // Fallback to original
      })
      .finally(() => {
        setIsLoadingPrice(false);
      });
  }, [product.price, selectedCurrency, convertPrice]);
  
  // Fetch all cars from the user's garage
  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: loaderData?.isAuthenticated,
  });

  const guestCars = useGuestGarageCars(!loaderData?.isAuthenticated);

  const userCars: UserCar[] = loaderData?.isAuthenticated
    ? (garageCarsQuery.data?.userCars ?? [])
    : (guestCars as unknown as UserCar[]);

  // Check which cars from the garage are compatible with this product
  const compatibleCars = userCars.filter((userCar: UserCar) => {
    return product.carCompatibility?.some((car) => {
      const matchesCar =
        `${car.carBrand} ${car.carModel}` ===
        `${userCar.carDetails.brand} ${userCar.carDetails.model}`;

      // Check year range compatibility if year is available
      if (matchesCar && userCar.carDetails.yearFrom) {
        const yearFrom = car.carYearFrom ?? 0;
        const yearTo = car.carYearTo;
        const userYear = userCar.carDetails.yearFrom;
        return (
          yearFrom <= userYear &&
          (yearTo === null || yearTo >= userYear)
        );
      }

      return matchesCar; // Fallback if no year specified
    });
  });

  const hasCompatibleCars = compatibleCars.length > 0;
  const totalGarageCars = userCars.length;

  const searchParamsSource = useMemo(() => {
    if (location.search) {
      return new URLSearchParams(location.search);
    }
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  }, [location.search]);
  const filterCarBrand =
    carFilter?.carBrand ??
    searchParamsSource.get("carBrand") ??
    searchParamsSource.get("carMake");
  const filterCarModel =
    carFilter?.carModel ?? searchParamsSource.get("carModel");
  const filterCarYear =
    carFilter?.carYear ?? searchParamsSource.get("carYear");
  const filterCarId = carFilter?.carId ?? searchParamsSource.get("carId");
  const hasCarFilter = Boolean(
    filterCarBrand || filterCarModel || filterCarYear || filterCarId
  );
  // Display label - prefer active filter, otherwise show compatible garage car,
  // otherwise fall back to first compatibility entry if available.
  const compatibleCarLabels = compatibleCars.map(
    (userCar) => `${userCar.carDetails.brand} - ${userCar.carDetails.model}`
  );
  const compatibilityLabel = product?.carCompatibility?.length
    ? `${product.carCompatibility[0].carBrand} - ${product.carCompatibility[0].carModel}`
    : "";
  const displayLabel =
    compatibleCarLabels.length > 0
      ? `${compatibleCarLabels[0]}${
          compatibleCarLabels.length > 1
            ? ` +${compatibleCarLabels.length - 1}`
            : ""
        }`
      : compatibilityLabel;

  const isCarPartProduct = useMemo(() => {
    const code = product?.productType?.code?.toLowerCase();
    const slug = product?.productType?.slug?.toLowerCase();
    if (code || slug) {
      return (
        code === "car_parts" ||
        code === "car-parts" ||
        slug === "car-parts" ||
        slug === "car_parts"
      );
    }
    if (hasCarFilter) {
      return true;
    }
    return Boolean(product?.carCompatibility?.length);
  }, [
    product?.productType?.code,
    product?.productType?.slug,
    product?.carCompatibility,
    hasCarFilter,
  ]);

  const isFilteredCarCompatible = useMemo(() => {
    if (!hasCarFilter || !product?.carCompatibility?.length) return false;
    return product.carCompatibility.some((car) => {
      const brandMatch = filterCarBrand
        ? car.carBrand?.toLowerCase() === filterCarBrand.toLowerCase()
        : true;
      const modelMatch = filterCarModel
        ? car.carModel?.toLowerCase() === filterCarModel.toLowerCase()
        : true;
      const yearFilter = filterCarYear ? Number(filterCarYear) : null;
      const yearMatch = yearFilter
        ? (car.carYearFrom ?? 0) <= yearFilter &&
          (car.carYearTo === null || car.carYearTo >= yearFilter)
        : true;
      return brandMatch && modelMatch && yearMatch;
    });
  }, [
    hasCarFilter,
    product?.carCompatibility,
    filterCarBrand,
    filterCarModel,
    filterCarYear,
  ]);

  // Memoize base favorite check to avoid recalculating on every render
  const baseIsFavorite = useMemo(() => {
    if (loaderData?.isAuthenticated) {
      return (
        favoritesQuery.data?.items.some(
          (item: FavoriteItem) => item.id === product.id
        ) ??
        product.in_favs ??
        false
      );
    }
    return (
      favoritesQuery.data?.items.some(
        (item: FavoriteItem) => item.id === product.id
      ) ?? false
    );
  }, [
    favoritesQuery.data?.items,
    product.id,
    product.in_favs,
    loaderData?.isAuthenticated,
  ]);

  // Local state for optimistic updates
  const [optimisticFavorite, setOptimisticFavorite] = useState<boolean | null>(
    null
  );

  // Use optimistic state if available, otherwise use base state
  const isFavorite =
    optimisticFavorite !== null ? optimisticFavorite : baseIsFavorite;

  // Reset optimistic state when query data updates (after mutation completes)
  useEffect(() => {
    if (
      optimisticFavorite !== null &&
      !toggleFavoritesMutation.isPending &&
      favoritesQuery.data
    ) {
      setOptimisticFavorite(null);
    }
  }, [favoritesQuery.data, toggleFavoritesMutation.isPending]);

  // Click handler - optimized for instant visual feedback
  const handleFavoriteClick = useCallback(() => {
    const newFavoriteState = !isFavorite;

    // Update optimistic state immediately (no flushSync needed - React batches are fast enough)
    setOptimisticFavorite(newFavoriteState);

    // Fire mutation in background
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
          onFavorite?.();
        },
      }
    );
  }, [isFavorite, product, toggleFavoritesMutation, onFavorite]);

  /**
   * Persist enough information so that when the user returns from the
   * product details page we can restore scroll position and the card
   * they last interacted with.
   */
  const handleStorageSession = () => {
    try {
      sessionStorage.setItem("shop:lastCardId", String(product.id));
      sessionStorage.setItem("shop:lastScrollY", String(window.scrollY));
    } catch {}
  };

  /**
   * Fitment Badge Component
   *
   * Renders a badge indicating product fitment status for the user's garage cars.
   * Shows different states:
   * - "Add Your Car" - when user is not authenticated or has no cars in garage
   * - "Fits Your Car" - when product is compatible with at least one garage car
   * - "Doesn't Fit Your Car" - when product is not compatible with any garage car
   *
   * On desktop, clicking the badge opens a hover card showing detailed fitment
   * information for all cars in the user's garage.
   *
   * @returns JSX element or null if product is not a car part
   */
  const fitmentBadge = () => {
    if (!isCarPartProduct && !hasCarFilter) return null;

    if (!loaderData) {
      return (
        <div className="z-20 relative">
          <FitmentBadge variant="add-car" />
        </div>
      );
    }

    return totalGarageCars === 0 ? (
      <HoverCard openDelay={300}>
        <HoverCardTrigger asChild>
          <div className="z-20 relative cursor-pointer">
            <FitmentBadge variant="add-car" />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-[280px] z-[60] p-0" side="top">
          <div
            className="bg-[#F2F2F2] rounded-[2px] border border-[#E6E6E6] overflow-hidden"
            style={{ boxShadow: "0 4px 10px 0 rgba(0, 0, 0, 0.10)" }}
          >
            <div className="px-4 pt-4 pb-3">
              <h4 className="text-sm font-semibold text-black leading-[1.5] mb-2">
                {t("fitmnetLabel.title")}
              </h4>
              <p className="text-xs font-medium text-[rgba(0,0,0,0.7)] leading-[1.5]">
                {t("fitmnetLabel.desceription")}
              </p>
            </div>
            <div className="px-4 pb-4">
              <GarageLink
                to="/my-garage"
                className="text-xs font-medium text-[#908B9B] hover:text-[#000000] transition-colors underline"
              >
                {t("fitmnetLabel.linkText")}
              </GarageLink>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    ) : (
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="z-20 relative cursor-pointer">
            <FitmentBadge
              variant={hasCompatibleCars ? "fit" : "no-fit"}
              clickable={false}
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="w-[320px] z-[60] p-0" side="top">
          <div
            className="bg-[#F2F2F2] rounded-[2px] border border-[#E6E6E6] overflow-hidden"
            style={{ boxShadow: "0 4px 10px 0 rgba(0, 0, 0, 0.10)" }}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-[#E6E6E6]">
              <h4 className="text-sm font-semibold text-black leading-[1.5]">
                Fitment for Your Garage:
              </h4>
            </div>

            {/* Car List */}
            <div className="divide-y divide-[#E6E6E6]">
              {userCars.map((userCar: UserCar, index: number) => {
                const isCompatibleCar = compatibleCars.some(
                  (c: UserCar) => c.id === userCar.id
                );
                return (
                  <div
                    key={userCar.id}
                    className="px-4 py-3 hover:bg-[#E6E6E6] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Car Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-black uppercase tracking-wide leading-[1.4] mb-0.5">
                          {userCar.carDetails.brand} {userCar.carDetails.model}
                        </p>
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
    <SimpleCard
      id={`product-card-${product.id}`}
      data-card-id={product.id}
      className={cn(
        "p-3 rounded-lg flex flex-col relative isolate min-w-0 h-full min-h-0",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Clickable overlay that turns the whole card into a link, while
          allowing inner buttons (wishlist / add-to-cart) to stay interactive. */}
      {productPath ? (
        <Link
          to={productPath}
          state={{ id }}
          prefetch="viewport"
          className="absolute right-0 bottom-0 z-10 h-full w-full"
          onClick={handleStorageSession}
        >
          <span className="sr-only">{productName || "Product"}</span>
        </Link>
      ) : null}

      {/* Header row: compatible car label + fit-check CTA / status */}
      <div className="flex shrink-0 items-center justify-start md:justify-between mb-3 md:mb-4">
        {displayLabel ? (
          <p className="hidden md:block text-sm capitalize font-semibold text-muted-foreground">
            {displayLabel.toLocaleLowerCase()}
          </p>
        ) : null}
        {fitmentBadge()}
      </div>

      {/* Fixed aspect image — reserves space immediately; shimmer until loaded */}
      <div className="shrink-0 w-full mb-2 md:mb-3">
        <BlurUpImage
          key={isHovered && product.secondaryImage ? "secondary" : "primary"}
          src={
            isHovered && product.secondaryImage
              ? product.secondaryImage
              : (product.mainImage ?? "")
          }
          alt={productName || "Product Image"}
        />
      </div>

      {displayLabel ? (
        <div className="mb-2 shrink-0 md:hidden">
          <p className="text-[10px] capitalize font-semibold text-[rgba(0,0,0,0.5)] leading-[20px]">
            {displayLabel.toLocaleLowerCase()}
          </p>
        </div>
      ) : null}

      {/* Title + commerce: flex-1 keeps bottom actions aligned in grid rows */}
      <div className="flex min-h-0 flex-1 flex-col justify-between gap-2">
        <h3
          className="min-h-[2.75rem] font-semibold capitalize text-sm md:text-lg leading-snug line-clamp-2 md:min-h-[3.25rem]"
          aria-hidden="true"
        >
          {(productName || "Product").toLocaleLowerCase()}
        </h3>

        {/* Price + wishlist + add-to-cart actions */}
        <div className="shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">
            {isLoadingPrice ? (
              <span className="inline-block w-16 h-4 bg-gray-200 animate-pulse rounded"></span>
            ) : (
              `${selectedCurrency} ${(convertedPrice ?? product.price).toFixed(2)}`
            )}
          </span>
          <FavoritesButton
            isFavorite={isFavorite ?? false}
            isLoading={toggleFavoritesMutation.isPending}
            onClick={handleFavoriteClick}
            className="z-20 relative"
          />
        </div>
        <div className="flex flex-col items-center gap-2">
          {product.stockQuantity > 0 ? (
            <Button
              className="w-full z-20 relative font-koulen"
              onClick={() =>
                addToCartMutation.mutate({
                  productId: product.id,
                  itemCode: product.itemCode,
                  productTranslations: product.translations.map(t => ({ name: t.name, slug: t.slug, languageCode: t.languageCode })),
                  productImage: product.mainImage || "",
                  unitPrice: product.price,
                  quantity: 1,
                })
              }
              disabled={addToCartMutation.isPending}
            >
              {addToCartMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Adding...
                </>
              ) : (
                t("buttons.addToCart")
              )}
            </Button>
          ) : (
            <Button
              className="w-full z-20 relative font-koulen"
              disabled
              variant="secondary"
            >
              {t("status.outOfStock")}
            </Button>
          )}
          <WhatsAppButton
            className="w-full z-20 relative text-[11px] whitespace-normal leading-tight h-auto py-2 gap-1 md:text-sm md:whitespace-nowrap md:h-9 md:gap-2"
            items={[
              {
                productName: productName || "Product",
                itemCode: product.itemCode || "-",
                price: (convertedPrice ?? product.price).toFixed(2),
                productUrl: productPath,
              },
            ]}
            currency={selectedCurrency}
            lang={i18n.language}
          />
        </div>
      </div>
      </div>
    </SimpleCard>
  );
}

/**
 * Skeleton version of `ProductCard` used while product data is loading.
 * Mirrors the main card layout to avoid layout shift.
 */
function ProductCardSkeleton() {
  return (
    <SimpleCard
      className={cn(
        "flex h-full min-h-0 min-w-0 flex-shrink-0 flex-col rounded-lg p-3"
      )}
    >
      <div className="mb-3 flex h-6 shrink-0 items-center justify-between md:mb-4">
        <span className="skeleton-shimmer h-4 w-24 rounded-md" aria-hidden />
        <span className="skeleton-shimmer h-8 w-16 rounded-md" aria-hidden />
      </div>

      <div className="relative mb-2 aspect-[4/3] w-full shrink-0 overflow-hidden rounded-md md:mb-3">
        <div className="absolute inset-0 skeleton-shimmer rounded-md" aria-hidden />
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-2">
        <div className="min-h-[2.75rem] space-y-2 md:min-h-[3.25rem]">
          <div className="skeleton-shimmer h-4 w-full rounded-md" aria-hidden />
          <div className="skeleton-shimmer h-4 w-[85%] rounded-md" aria-hidden />
        </div>

        <div className="shrink-0 space-y-4">
          <div className="flex items-center justify-between">
            <span className="skeleton-shimmer h-4 w-20 rounded-md" aria-hidden />
            <span className="skeleton-shimmer size-8 rounded-md" aria-hidden />
          </div>
          <div className="skeleton-shimmer h-9 w-full rounded-md" aria-hidden />
          <div className="skeleton-shimmer h-9 w-full rounded-md" aria-hidden />
        </div>
      </div>
    </SimpleCard>
  );
}

/**
 * GarageLink Component
 *
 * Link that checks if user has cars in garage.
 * Shows empty garage modal if no cars, otherwise navigates to garage page.
 */
function GarageLink({
  to = "/my-garage",
  className,
  children,
  ...props
}: React.ComponentProps<typeof Link>) {
  const loaderData =
    useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const isAuthenticated = !!loaderData?.isAuthenticated;
  const { openAuthModal } = useAuthModal();
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false);
  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });
  const hasCars =
    garageCarsQuery.data?.userCars && garageCarsQuery.data.userCars.length > 0;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isAuthenticated && garageCarsQuery.isSuccess && !hasCars) {
      e.preventDefault();
      setEmptyDialogOpen(true);
    }
  };

  return (
    <>
      <Link to={to} className={className} onClick={handleClick} {...props}>
        {children}
      </Link>
      <EmptyGarageDialog
        open={emptyDialogOpen}
        onOpenChange={setEmptyDialogOpen}
      />
    </>
  );
}

export { ProductCard, ProductCardSkeleton };
