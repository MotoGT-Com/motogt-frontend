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
import { useId, useState, useEffect, useMemo, useCallback, useRef, } from "react";
import type { Route } from "../routes/+types/_main";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { garageCarsQueryOptions } from "~/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { getGuestGarage, type GuestCar } from "~/lib/guest-garage-manager";
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

/**
 * BlurUpImage Component
 *
 * An optimized image component that displays a blurred placeholder while the
 * full-quality image loads, then smoothly transitions to the sharp image.
 * This provides a better user experience by showing content immediately while
 * the high-quality image loads in the background.
 *
 * @param src - Image source URL
 * @param alt - Alt text for accessibility
 * @param className - Optional CSS classes for styling
 *
 * @example
 * ```tsx
 * <BlurUpImage
 *   src="/product-image.jpg"
 *   alt="Product name"
 *   className="w-full h-full"
 * />
 * ```
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

  // Reset loaded state when src changes (for hover image switching)
  useEffect(() => {
    setIsLoaded(false);
  }, [src]);

  if (!src) return null;

  return (
    <div className={cn("relative overflow-hidden w-full", className)}>
      {/* Blurred placeholder - visible while loading */}
      <img
      loading="lazy"
        src={src}
        alt=""
        className={cn(
          "absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ease-out ",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
        // style={{
        //   filter: "blur(20px)",
        //   transform: "scale(1.1)",
        // }}
        aria-hidden="true"
      />
      {/* Full-quality image - fades in when loaded */}
      <img
        src={src}
        alt={alt}
        className={cn(
          "relative w-full h-full object-contain transition-opacity duration-700 ease-out  md:max-h-none",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        loading="lazy"
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
    preloadImage.src = product.secondaryImage;
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

  // For guest users, read cars from localStorage
  const [guestCars, setGuestCars] = useState<GuestCar[]>([]);
  useEffect(() => {
    if (!loaderData?.isAuthenticated) {
      setGuestCars(getGuestGarage());
    }
  }, [loaderData?.isAuthenticated]);

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
      if (matchesCar && userCar.carDetails.year) {
        const yearFrom = car.carYearFrom ?? 0;
        const yearTo = car.carYearTo;
        return (
          yearFrom <= userCar.carDetails.year &&
          (yearTo === null || yearTo >= userCar.carDetails.year)
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
        "p-2 md:p-4 rounded-lg flex flex-col relative isolate min-w-0 h-full",
        "min-h-0", // Allow card to shrink if needed
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
          className="absolute inset-0 z-10"
          onClick={handleStorageSession}
        >
          <span className="sr-only">{productName || "Product"}</span>
        </Link>
      ) : null}

      {/* Header row: compatible car label + fit-check CTA / status */}
      <div className="flex items-center justify-start md:justify-between mb-4">
        {/* Desktop: Car label in header */}
        {displayLabel ? (
          <p className="hidden md:block text-sm capitalize font-semibold text-muted-foreground">
            {displayLabel.toLocaleLowerCase()}
          </p>
        ) : null}
        {/* Fit badge: left-aligned on mobile, right-aligned on desktop */}
        {fitmentBadge()}
      </div>

      {/* Image area: takes up remaining vertical space so all cards are equal height */}
      <div className="rounded mb-1 md:mb-4 flex-1 ">
        <BlurUpImage
          key={isHovered && product.secondaryImage ? 'secondary' : 'primary'}
          src={
            isHovered && product.secondaryImage
              ? product.secondaryImage
              : (product.mainImage ?? "")
          }
          alt={productName || "Product Image"}
          className="w-full rounded object-contain"
        />
      </div>

      {/* Mobile: Car label below image */}
      {displayLabel ? (
        <div className="mb-2 md:hidden">
          <p className="text-[10px] capitalize font-semibold text-[rgba(0,0,0,0.5)] leading-[20px]">
            {displayLabel.toLocaleLowerCase()}
          </p>
        </div>
      ) : null}

      {/* Product name: reserved vertical space keeps card heights aligned
          even when some products wrap to two lines. */}
      <div className="mb-2 min-h-[40px] md:min-h-[60px] flex items-start">
        <h3
          className="font-semibold capitalize text-sm md:text-lg leading-snug line-clamp-2"
          aria-hidden="true"
        >
          {(productName || "Product").toLocaleLowerCase()}
        </h3>
      </div>

      {/* Price + wishlist + add-to-cart actions */}
      <div className="space-y-4">
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
        "flex-shrink-0 p-2 md:p-4 rounded-lg aspect-[15/17] flex flex-col relative isolate"
      )}
    >
      <div className="flex items-center justify-between mb-4 h-6">
        <h3 className="font-bold capitalize line-clamp-1" aria-hidden="true">
          <span className="text-background-secondary bg-background-secondary animate-pulse">
            Product Name Skeleton Loading
          </span>
        </h3>
      </div>

      <div className="rounded mb-4 h-[100px] flex-1 bg-background-secondary animate-pulse"></div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">
            <span className="text-background-secondary bg-background-secondary animate-pulse">
              JOD XXX
            </span>
          </span>
          <div className="w-8 h-8 bg-background-secondary animate-pulse"></div>
        </div>

        <div className="w-full h-8 bg-background-secondary animate-pulse"></div>
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
