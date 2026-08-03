import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { useRouteLoaderData } from "react-router";
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus } from "lucide-react";
import { Button } from "~/components/ui/button";
import { ProductDetailImage, ProductDetailThumb } from "~/components/product-detail-image";
import { FavoritesButton } from "~/components/favorites-button";
import { ProductCompatibleGarageBars } from "~/components/product-compatible-garage-bars";
import { ProductFitmentBadge, isCarPartProduct } from "~/components/product-fitment-badge";
import { useCartManager } from "~/lib/cart-manager";
import { useFavoritesManager } from "~/lib/favorites-manager";
import { carTrimsQueryOptions, productByIdQueryOptions } from "~/lib/queries";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import { buildProductPath } from "~/lib/product-url";
import { capitalizeWords, cn, formatYearRange } from "~/lib/utils";
import { resolveProductSpecsByLanguage } from "~/lib/product-specs";
import {
  comingSoonButtonClassName,
  getProductAvailability,
  isPurchasableStock,
} from "~/lib/product-availability";
import { useTranslation } from "react-i18next";
import { useCurrency } from "~/hooks/use-currency";
import type { Route } from "../routes/+types/_main";

export function ProductQuickViewPanel({
  productId,
  onClose,
}: {
  productId: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation(["common", "product"]);
  const isRTL = i18n.language === "ar";
  const loaderData =
    useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const isAuthenticated = !!loaderData?.isAuthenticated;
  const { addToCartMutation } = useCartManager(isAuthenticated);
  const { toggleFavoritesMutation, favoritesQuery } =
    useFavoritesManager(isAuthenticated);

  const { data: product, isPending, isError, error } = useQuery(
    productByIdQueryOptions(productId)
  );

  const compatibleCarBrand = product?.carCompatibility?.[0]?.carBrand;
  const compatibleCarModel = product?.carCompatibility?.[0]?.carModel;
  const { data: productTrims = [] } = useQuery({
    ...carTrimsQueryOptions({
      brand: compatibleCarBrand,
      model: compatibleCarModel,
    }),
    staleTime: 5 * 60_000,
  });

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  useEffect(() => {
    setSelectedImage(0);
    setQuantity(1);
    setSelectedVariant(null);
  }, [productId]);

  useEffect(() => {
    if (!product?.variants?.length) return;
    const active = product.variants.find((v) => v.isActive);
    setSelectedVariant(active?.id ?? null);
  }, [product]);

  const currentVariant = selectedVariant
    ? product?.variants?.find((v) => v.id === selectedVariant)
    : null;
  const currentPrice =
    (product?.price ?? 0) + (currentVariant?.priceAdjustment || 0);
  const currentStock = currentVariant?.stockQuantity ?? product?.stockQuantity ?? 0;
  const availability = getProductAvailability(currentStock);

  const { selectedCurrency, convertPrice } = useCurrency();
  const [convertedPrice, setConvertedPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);

  useEffect(() => {
    if (!product) return;
    let cancelled = false;
    (async () => {
      setIsLoadingPrice(true);
      try {
        const result = await convertPrice(currentPrice, "JOD");
        if (!cancelled) setConvertedPrice(result.convertedAmount);
      } catch {
        if (!cancelled) setConvertedPrice(currentPrice);
      } finally {
        if (!cancelled) setIsLoadingPrice(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPrice, product, convertPrice, selectedCurrency]);

  const imageGallery = useMemo(() => {
    if (!product) return [] as string[];
    if (currentVariant?.images?.length) {
      const imgs = currentVariant.images.filter(
        (u): u is string => typeof u === "string" && !!u.trim()
      );
      if (currentVariant.mainImage?.trim()) {
        return [currentVariant.mainImage, ...imgs];
      }
      return imgs;
    }
    const main = product.mainImage?.trim();
    const secondary = product.secondaryImage?.trim();
    const rest = (product.images ?? []).filter(
      (u): u is string => typeof u === "string" && !!u.trim()
    );
    return [...new Set([...(main ? [main] : []), ...(secondary ? [secondary] : []), ...rest])];
  }, [product, currentVariant]);

  if (isPending) {
    return (
      <div className="flex min-h-[240px] items-center justify-center py-8">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 py-8 text-center">
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Could not load product"}
        </p>
        <Button variant="outline" onClick={onClose}>
          {t("common:buttons.close")}
        </Button>
      </div>
    );
  }

  const localized = getLocalizedTranslation(product.translations);
  const productName = localized?.name ?? t("common:product");
  const productPath = buildProductPath(product);
  const isFavorite =
    favoritesQuery.data?.items.some((item) => item.id === product.id) ??
    product.in_favs ??
    false;

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

  const sizes = Array.from(
    new Set(
      (product.variants ?? [])
        .map((v) => v.size)
        .filter((s): s is string => typeof s === "string" && s.length > 0)
    )
  );
  const colors = Array.from(
    new Set(
      (product.variants ?? [])
        .map((v) => v.color)
        .filter((c): c is string => typeof c === "string" && c.length > 0)
    )
  );

  const updateQuantity = (change: number) => {
    if (availability !== "in_stock") return;
    setQuantity((prev) => Math.max(1, Math.min(prev + change, currentStock)));
  };

  const handleVariantChange = (variantId: string) => {
    setSelectedVariant(variantId);
    setSelectedImage(0);
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="grid w-full min-h-0 grid-cols-1 gap-5 md:grid-cols-[1.3fr_1fr] md:gap-6 lg:gap-8">
          <div className="min-w-0 space-y-4 rounded-lg bg-background-secondary p-4 md:p-6">
            <div className="relative">
              <ProductDetailImage
                src={imageGallery[selectedImage] ?? product.mainImage ?? ""}
                alt={productName}
              />
              {imageGallery.length > 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute start-2 top-1/2 hidden -translate-y-1/2 bg-white md:flex"
                    onClick={() =>
                      setSelectedImage((prev) =>
                        prev === 0 ? imageGallery.length - 1 : prev - 1
                      )
                    }
                  >
                    {isRTL ? (
                      <ChevronRight className="size-5" />
                    ) : (
                      <ChevronLeft className="size-5" />
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="absolute end-2 top-1/2 hidden -translate-y-1/2 bg-white md:flex"
                    onClick={() =>
                      setSelectedImage((prev) =>
                        prev === imageGallery.length - 1 ? 0 : prev + 1
                      )
                    }
                  >
                    {isRTL ? (
                      <ChevronLeft className="size-5" />
                    ) : (
                      <ChevronRight className="size-5" />
                    )}
                  </Button>
                </>
              ) : null}
            </div>
            {imageGallery.length > 1 ? (
              <div className="flex flex-wrap gap-2">
                {imageGallery.map((image, index) => (
                  <ProductDetailThumb
                    key={`${image}-${index}`}
                    src={image}
                    alt={`${productName} — ${index + 1}`}
                    isSelected={selectedImage === index}
                    onSelect={() => setSelectedImage(index)}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex min-w-0 flex-col gap-4 py-1 md:gap-4 md:py-2">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold italic capitalize md:text-2xl">
                {productName}
              </h2>
              <p className="text-xs font-bold text-primary">{product.itemCode}</p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xl font-bold">
                {isLoadingPrice ? (
                  <span className="inline-block h-6 w-24 animate-pulse rounded bg-muted" />
                ) : (
                  `${selectedCurrency} ${(convertedPrice ?? currentPrice).toFixed(2)}`
                )}
              </p>
              <FavoritesButton
                isFavorite={isFavorite}
                isLoading={toggleFavoritesMutation.isPending}
                onClick={() =>
                  toggleFavoritesMutation.mutate({
                    ...product,
                    isFavorite,
                  })
                }
              />
            </div>

            {isCarPartProduct(product) ? (
              <div className="flex w-full flex-col gap-2">
                <ProductFitmentBadge product={product} />
                {product.carCompatibility?.length ? (
                  <ProductCompatibleGarageBars
                    carCompatibility={product.carCompatibility}
                  />
                ) : null}
              </div>
            ) : null}

            <p className="text-sm leading-relaxed text-muted-foreground">
              {localized?.description || t("product:details.noDescription")}
            </p>

            {showSpecificationsSection ? (
              <div className="space-y-2">
                <h3 className="text-sm font-bold">
                  {t("product:details.specifications")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(carSpecSource).map(([key, value]) => (
                    <div key={`car-${key}`} className="flex text-xs">
                      <span className="rounded-s border border-e-0 border-gray-200 bg-gray-50 px-2 py-1 capitalize text-gray-500">
                        {key}
                      </span>
                      <span className="rounded-e border border-gray-200 bg-gray-50 px-2 py-1 font-medium">
                        {capitalizeWords(String(value))}
                      </span>
                    </div>
                  ))}
                  {Object.entries(localizedSpecs).map(([specKey, specData]) => (
                    <div key={`spec-${specKey}`} className="flex text-xs">
                      <span className="rounded-s border border-e-0 border-gray-200 bg-gray-50 px-2 py-1 capitalize text-gray-500">
                        {specKey}
                      </span>
                      <span className="rounded-e border border-gray-200 bg-gray-50 px-2 py-1 font-medium">
                        {capitalizeWords(specData.value)}
                        {specData.unit ? ` ${specData.unit}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {productTrims.length > 0 ? (
              <div className="space-y-2">
                <h3 className="text-sm font-bold">
                  {t("product:details.trims")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {productTrims.map((trim) => (
                    <div key={trim} className="flex text-xs">
                      <span className="rounded-s border border-e-0 border-gray-200 bg-gray-50 px-2 py-1 capitalize text-gray-500">
                        {t("product:details.trim")}
                      </span>
                      <span className="rounded-e border border-gray-200 bg-gray-50 px-2 py-1 font-medium">
                        {capitalizeWords(trim)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {product.variants && product.variants.length > 0 ? (
              <div className="space-y-3">
                {sizes.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-medium">
                      {t("product:details.size", { defaultValue: "Size" })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {sizes.map((size) => {
                        const variant = product.variants!.find(
                          (v) =>
                            v.size === size &&
                            v.isActive &&
                            (!currentVariant?.color ||
                              v.color === currentVariant.color)
                        );
                        const isSelected = currentVariant?.size === size;
                        const isAvailable =
                          variant && isPurchasableStock(variant.stockQuantity);
                        return (
                          <Button
                            key={size}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            disabled={!isAvailable}
                            onClick={() =>
                              variant && handleVariantChange(variant.id)
                            }
                          >
                            {size}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
                {colors.length > 0 ? (
                  <div>
                    <p className="mb-2 text-sm font-medium">
                      {t("product:details.color", { defaultValue: "Color" })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((color) => {
                        const variant = product.variants!.find(
                          (v) =>
                            v.color === color &&
                            v.isActive &&
                            (!currentVariant?.size ||
                              v.size === currentVariant.size)
                        );
                        const isSelected = currentVariant?.color === color;
                        const isAvailable =
                          variant && isPurchasableStock(variant.stockQuantity);
                        return (
                          <Button
                            key={color}
                            type="button"
                            variant={isSelected ? "default" : "outline"}
                            size="sm"
                            disabled={!isAvailable}
                            onClick={() =>
                              variant && handleVariantChange(variant.id)
                            }
                          >
                            {capitalizeWords(String(color))}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {availability === "in_stock" ? (
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => updateQuantity(-1)}
                >
                  <Minus className="size-4" />
                </Button>
                <span className="min-w-[20px] text-center text-sm font-semibold text-primary">
                  {quantity}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => updateQuantity(1)}
                >
                  <Plus className="size-4" />
                </Button>
              </div>
            ) : null}

            <Button
              className={cn(
                "h-11 w-full font-koulen text-base",
                availability === "coming_soon" && comingSoonButtonClassName
              )}
              disabled={
                addToCartMutation.isPending ||
                availability !== "in_stock" ||
                (!!product.variants?.length && !selectedVariant)
              }
              onClick={() =>
                addToCartMutation.mutate({
                  productId: product.id,
                  itemCode: product.itemCode,
                  productTranslations: product.translations.map((tr) => ({
                    name: tr.name,
                    slug: tr.slug,
                    languageCode: tr.languageCode,
                  })),
                  productImage:
                    currentVariant?.mainImage || product.mainImage || "",
                  unitPrice: currentPrice,
                  quantity,
                  variantId: selectedVariant || undefined,
                })
              }
            >
              {addToCartMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Adding...
                </>
              ) : availability === "coming_soon" ? (
                t("common:status.comingSoon")
              ) : availability === "out_of_stock" ? (
                t("common:status.outOfStock")
              ) : (
                t("common:buttons.addToCart")
              )}
            </Button>

            {productPath ? (
              <Link
                to={productPath}
                onClick={onClose}
                className="text-center text-sm font-medium text-primary underline underline-offset-2"
              >
                {t("product:quickView.viewFullDetails", {
                  defaultValue: "View full product details",
                })}
              </Link>
            ) : null}
          </div>
        </div>
    </div>
  );
}
