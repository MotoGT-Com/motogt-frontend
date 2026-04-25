import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { SimpleCard } from "~/components/ui/card";
import { Search, Loader2 } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "~/components/ui/select";
import { Button } from "~/components/ui/button";
import { useNavigate, Link, useLocation } from "react-router";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormControl, FormField, FormItem, FormLabel, Form, } from "~/components/ui/form";
import { useQuery } from "@tanstack/react-query";
import { carBrandsQueryOptions, carModelsQueryOptions, productsQueryOptions, } from "~/lib/queries";
import { createSerializer, useQueryStates } from "nuqs";
import {
  serializeShopURL,
  shopSearchParamsSchema,
} from "~/lib/shop-search-params";
import { useDebounce } from "use-debounce";
import { useTranslation } from "react-i18next";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import { buildProductPath } from "~/lib/product-url";
import { cn } from "~/lib/utils";

const anyValue = "any";

/** Normalize car filter fields: Radix Select can emit "" on mobile; treat like unset. */
function normalizeCarField(val: string | undefined) {
  const v = val?.trim();
  if (!v || v === anyValue) return undefined;
  return v;
}

function carYearQueryFromSelectValue(value: string): number | null {
  const raw = normalizeCarField(value);
  if (!raw) return null;
  const y = parseInt(raw, 10);
  return Number.isFinite(y) ? y : null;
}

const searchSchema = z
  .object({
    search: z
      .string()
      .optional()
      .transform((val) => (val === "" ? undefined : val?.trim())),
    carBrand: z
      .string()
      .optional()
      .transform(normalizeCarField),
    carModel: z
      .string()
      .optional()
      .transform(normalizeCarField),
    carYear: z
      .string()
      .optional()
      .transform(normalizeCarField),
  })
  .refine((data) => {
    return (
      !!data.search || !!data.carBrand || !!data.carModel || !!data.carYear
    );
  });

type ProductSearchFormValues = {
  search?: string;
  carBrand?: string;
  carModel?: string;
  carYear?: string;
};

/** Merge URL state (sort, categories, …) with live form values so carModel cannot be lost to stale nuqs or "". */
function shopParamsFromFormState<S extends Record<string, unknown>>(
  searchParams: S,
  formValues: ProductSearchFormValues
) {
  const search = (formValues.search ?? "").trim() || undefined;
  const carBrand = normalizeCarField(formValues.carBrand);
  const carModel = normalizeCarField(formValues.carModel);
  const carYearRaw = normalizeCarField(formValues.carYear);
  const carYearParsed = carYearRaw ? parseInt(carYearRaw, 10) : undefined;
  const carYear = Number.isFinite(carYearParsed) ? carYearParsed : undefined;
  return {
    ...searchParams,
    search,
    carBrand,
    carModel,
    carYear,
  };
}

/** Build a shop URL for the current route (preserves `/shop` vs `/shop/car-parts`, etc.). */
function shopUrlForCurrentLocation(
  pathname: string,
  currentSearch: string,
  formValues: ProductSearchFormValues,
  nuqsState: Record<string, unknown>
) {
  const serializer = createSerializer(shopSearchParamsSchema);
  const base = `${pathname}${currentSearch || ""}`;
  return serializer(
    base,
    shopParamsFromFormState(nuqsState, formValues) as Record<string, string | number | null | undefined>
  );
}

function ProductSearch({
  className,
  searchPlaceholder,
  autoFocusSearch = false,
  onSubmitSuccess,
  cardClassName,
  searchSectionClassName,
  size = "default",
}: {
  className?: string;
  searchPlaceholder?: string;
  autoFocusSearch?: boolean;
  onSubmitSuccess?: () => void;
  cardClassName?: string;
  searchSectionClassName?: string;
  size?: "default" | "compact";
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("shop");
  const isRTL = i18n.language === "ar";

  const [searchParams, setSearchParams] = useQueryStates(shopSearchParamsSchema);
  /** Product detail: `/product/:slug` (legacy `/shop/product/` redirects here). */
  const isShopProductPdp =
    location.pathname.startsWith("/product/") ||
    location.pathname.startsWith("/shop/product/") ||
    location.pathname.startsWith("/products/");
  /** Shop listing only: `/shop`, `/shop/car-parts`, … — safe to sync filters via nuqs on current URL. */
  const isShopListingRoute =
    location.pathname.startsWith("/shop") && !isShopProductPdp;
  const isCompact = size === "compact";
  const isUrlDrivenFormState = isShopListingRoute || isShopProductPdp;

  const applyShopFiltersFromForm = useCallback(
    (formValues: ProductSearchFormValues) => {
      const merged = shopParamsFromFormState(searchParams, formValues);
      setSearchParams({
        search: merged.search ?? null,
        carBrand: merged.carBrand ?? null,
        carModel: merged.carModel ?? null,
        carYear: merged.carYear ?? null,
      });
    },
    [searchParams, setSearchParams]
  );

  /** Leave PDP (and any non-listing page) and open the main shop grid with the same filters. */
  const navigateToShopListing = useCallback(
    (formValues: ProductSearchFormValues) => {
      const merged = shopParamsFromFormState(searchParams, formValues);
      navigate(
        serializeShopURL({
          ...searchParams,
          search: merged.search,
          carBrand: merged.carBrand,
          carModel: merged.carModel,
          carYear: merged.carYear,
        })
      );
    },
    [navigate, searchParams]
  );
  const compactSelectWidth = "w-full sm:w-[8rem] lg:w-[8.5rem] xl:w-36";

  /** Stable object + primitive deps so RHF only resets when URL-derived filters actually change. */
  const formValuesFromUrl = useMemo(
    () => ({
      search: searchParams.search ?? "",
      carBrand: searchParams.carBrand || anyValue,
      carModel: searchParams.carModel || anyValue,
      carYear: searchParams.carYear?.toString() || anyValue,
    }),
    [
      searchParams.search,
      searchParams.carBrand,
      searchParams.carModel,
      searchParams.carYear,
    ]
  );

  const form = useForm({
    resolver: zodResolver(searchSchema),
    ...(isUrlDrivenFormState
      ? {
          values: formValuesFromUrl,
          /**
           * Without this, every URL sync calls _reset() and overwrites fields. If `carModel` is missing
           * from the query string for a frame (or lags nuqs), the model Select is wiped before submit.
           */
          resetOptions: { keepDirtyValues: true },
        }
      : {
          defaultValues: {
            search: "",
            carBrand: anyValue,
            carModel: anyValue,
            carYear: anyValue,
          },
        }),
  });

  // Keep the latest select values outside RHF to avoid submit-time lag/race.
  const latestCarFiltersRef = useRef<{
    carBrand: string;
    carModel: string;
    carYear: string;
  }>({
    carBrand: form.getValues("carBrand") ?? anyValue,
    carModel: form.getValues("carModel") ?? anyValue,
    carYear: form.getValues("carYear") ?? anyValue,
  });

  const carBrands = useQuery(carBrandsQueryOptions);
  const carBrand = form.watch("carBrand");
  useEffect(() => {
    latestCarFiltersRef.current.carBrand = carBrand ?? anyValue;
  }, [carBrand]);
  const carModelWatch = form.watch("carModel");
  useEffect(() => {
    latestCarFiltersRef.current.carModel = carModelWatch ?? anyValue;
  }, [carModelWatch]);
  const carYearWatch = form.watch("carYear");
  useEffect(() => {
    latestCarFiltersRef.current.carYear = carYearWatch ?? anyValue;
  }, [carYearWatch]);
  const carModels = useQuery(
    carModelsQueryOptions(carBrand === anyValue ? undefined : carBrand)
  );
  
  // Optimized search with faster debounce and minimum character requirement
  const searchValue = form.watch("search") || "";
  const [debouncedSearch, setDebouncedSearch] = useDebounce(searchValue.trim(), 300);
  
  // Only search if we have at least 2 characters
  const shouldSearch = debouncedSearch.length >= 2;
  
  // Memoize query options to prevent unnecessary re-renders
  const searchQueryOptions = useMemo(
    () => productsQueryOptions({ 
      search: debouncedSearch, 
      limit: 5 
    }),
    [debouncedSearch]
  );
  
  const searchProductsQuery = useQuery({
    ...searchQueryOptions,
    enabled: shouldSearch,
    staleTime: 30000, // Cache results for 30 seconds
    gcTime: 60000, // Keep in cache for 1 minute
  });

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLDivElement>(null);
  const searchTextInputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  // Calculate dropdown position based on input field
  const updateDropdownPosition = useCallback(() => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // For fixed positioning, use getBoundingClientRect which gives viewport coordinates
      let left = rect.left;
      let width = rect.width;
      
      // Ensure dropdown doesn't go off-screen horizontally
      if (left + width > viewportWidth - 8) {
        width = viewportWidth - left - 16; // 16px padding from edge
      }
      if (left < 8) {
        left = 8; // 8px padding from edge
        width = Math.min(width, viewportWidth - 16);
      }
      
      // Calculate available space below and above the input
      // Use more conservative calculation to avoid overlapping with content below
      const spaceBelow = viewportHeight - rect.bottom - 16; // 16px margin to avoid overlap
      const spaceAbove = rect.top - 16; // 16px margin
      
      // Calculate max height based on available space, but be more conservative
      // Limit to 300px max to ensure it doesn't take up too much space
      const maxHeightBelow = Math.min(300, Math.max(150, spaceBelow));
      const maxHeightAbove = Math.min(300, Math.max(150, spaceAbove));
      
      // Determine if dropdown should appear above or below
      // Show above if there's less than 250px below but more space above
      const showAbove = spaceBelow < 250 && spaceAbove > spaceBelow && spaceAbove > 200;
      const maxHeight = showAbove ? maxHeightAbove : maxHeightBelow;
      
      // For fixed positioning, use viewport coordinates directly
      let dropdownTop: number;
      if (showAbove) {
        // Position above: top of dropdown = top of input - maxHeight - gap
        dropdownTop = rect.top - maxHeight - 4;
        // Ensure it doesn't go above viewport
        if (dropdownTop < 8) {
          dropdownTop = 8;
          // Recalculate maxHeight if we had to adjust top
          const adjustedMaxHeight = rect.top - dropdownTop - 4;
          setDropdownPosition({
            top: dropdownTop,
            left: Math.max(8, left),
            width: Math.max(200, width),
            maxHeight: Math.max(150, adjustedMaxHeight),
          });
          return;
        }
      } else {
        // Position below: top of dropdown = bottom of input + gap
        dropdownTop = rect.bottom + 4;
        // Ensure dropdown doesn't extend beyond viewport
        const maxBottom = viewportHeight - 8;
        const calculatedBottom = dropdownTop + maxHeight;
        if (calculatedBottom > maxBottom) {
          // Adjust maxHeight to fit within viewport
          const adjustedMaxHeight = maxBottom - dropdownTop;
          setDropdownPosition({
            top: dropdownTop,
            left: Math.max(8, left),
            width: Math.max(200, width),
            maxHeight: Math.max(150, adjustedMaxHeight),
          });
          return;
        }
      }
      
      setDropdownPosition({
        top: dropdownTop,
        left: Math.max(8, left),
        width: Math.max(200, width), // Minimum width of 200px
        maxHeight: Math.max(150, maxHeight), // Minimum height of 150px
      });
    }
  }, []);

  // Update position when dropdown is shown
  useEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();
      // Update on scroll/resize
      window.addEventListener("scroll", updateDropdownPosition, true);
      window.addEventListener("resize", updateDropdownPosition);
      return () => {
        window.removeEventListener("scroll", updateDropdownPosition, true);
        window.removeEventListener("resize", updateDropdownPosition);
      };
    }
  }, [showDropdown, updateDropdownPosition]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  useEffect(() => {
    if (autoFocusSearch) {
      searchTextInputRef.current?.focus();
    }
  }, [autoFocusSearch]);

  const availableYears = new Array(new Date().getFullYear() - 2015 + 2)
    .fill(0)
    .map((_, index) => new Date().getFullYear() - index);

  const onSubmit = (_data: z.infer<typeof searchSchema>) => {
    setShowDropdown(false);
    // Use live field values: resolver output can match a URL-reset state while the Select still shows
    // the user's choice, or dirty fields must win over a stale query string.
    const v = form.getValues();
    const formPayload: ProductSearchFormValues = {
      search: (v.search ?? "").trim(),
      carBrand:
        latestCarFiltersRef.current.carBrand || v.carBrand || anyValue,
      carModel:
        latestCarFiltersRef.current.carModel || v.carModel || anyValue,
      carYear:
        latestCarFiltersRef.current.carYear != null &&
        String(latestCarFiltersRef.current.carYear).trim() !== ""
          ? String(latestCarFiltersRef.current.carYear)
          : v.carYear != null && String(v.carYear).trim() !== ""
          ? String(v.carYear)
          : anyValue,
    };
    if (isShopListingRoute) {
      applyShopFiltersFromForm(formPayload);
    } else {
      navigateToShopListing(formPayload);
    }
    onSubmitSuccess?.();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "flex gap-4 flex-col relative",
          isCompact
            ? "md:flex-row rtl:md:flex-row-reverse md:h-14"
            : "md:flex-row rtl:md:flex-row-reverse md:h-20",
          className
        )}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <SimpleCard
          className={cn(
            "flex flex-col md:flex-row flex-1 p-4 md:p-0 space-y-3 md:space-y-0 md:divide-x rtl:md:divide-x-reverse divide-border bg-white shadow-lg",
            isCompact && "p-2 md:p-0",
            cardClassName
          )}
        >
          <div 
            ref={searchInputRef}
            className={cn(
              "relative flex-1 focus-within:ring-ring/50 focus-within:ring-[3px] border md:border-0",
              isCompact ? "py-2 md:py-0" : "py-4 md:py-0",
              searchSectionClassName
            )}
          >
            <Search className="w-5 h-5 text-gray-400 absolute start-4 top-1/2 -translate-y-1/2 z-10" />
            {searchProductsQuery.isFetching && (
              <Loader2 className="w-4 h-4 text-gray-400 absolute end-4 top-1/2 -translate-y-1/2 z-10 animate-spin" />
            )}
            <FormField
              control={form.control}
              name="search"
              render={({ field }) => (
                <FormItem className="w-full h-full">
                  <FormLabel className="sr-only">{t("carSearch.searchButton")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={searchPlaceholder ?? t("search.selectCarPart")}
                      className={cn(
                        "border-0 focus-visible:ring-0 h-auto w-full px-0 py-0 ps-12 text-start",
                        isCompact ? "text-base" : "text-sm"
                      )}
                      {...field}
                      ref={(node) => {
                        field.ref(node);
                        searchTextInputRef.current = node;
                      }}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value);
                        setDebouncedSearch(value);
                        // Show dropdown when user starts typing (even before debounce)
                        if (value.trim().length >= 2) {
                          setShowDropdown(true);
                        }
                      }}
                      onFocus={() => {
                        // Only show dropdown if we have search results or are searching
                        if (shouldSearch || searchProductsQuery.data) {
                          setShowDropdown(true);
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Search Results Dropdown - Rendered via Portal to avoid stacking context issues */}
            {typeof document !== "undefined" &&
              showDropdown &&
              shouldSearch &&
              searchProductsQuery.data &&
              searchProductsQuery.data.length > 0 &&
              dropdownPosition &&
              createPortal(
                <div
                  ref={dropdownRef}
                  className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[9999] overflow-y-auto"
                  dir={isRTL ? "rtl" : "ltr"}
                  style={{
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`,
                    maxHeight: `${dropdownPosition.maxHeight}px`,
                  }}
                >
                  <div className="p-2">
                    <div className="text-xs text-gray-500 mb-2 px-2">
                      {t("search.results")} ({searchProductsQuery.data.length})
                    </div>
                    {searchProductsQuery.data.map((product) => {
                      const productPath = buildProductPath(product);
                      const productName =
                        getLocalizedTranslation(product.translations)?.name ||
                        t("search.unnamedProduct");

                      const content = (
                        <>
                          <div className="w-12 h-12 bg-gray-100 rounded-md flex-shrink-0 overflow-hidden">
                            {product.mainImage && (
                              <img
                              loading="lazy"
                                src={product.mainImage}
                                alt={productName}
                                className="w-full h-full object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {productName}
                            </div>
                            <div className="text-sm text-gray-500">
                              JOD {product.price.toFixed(2)}
                            </div>
                          </div>
                        </>
                      );

                      return productPath ? (
                        <Link
                          key={product.id}
                          to={productPath}
                          className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md transition-colors"
                          onClick={() => setShowDropdown(false)}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div
                          key={product.id}
                          className="flex items-center gap-3 p-2 rounded-md opacity-60 cursor-not-allowed"
                          aria-disabled="true"
                        >
                          {content}
                        </div>
                      );
                    })}
                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <Link
                        to={
                          isShopListingRoute
                            ? shopUrlForCurrentLocation(
                                location.pathname,
                                location.search,
                                form.getValues(),
                                searchParams
                              )
                            : serializeShopURL(
                                shopParamsFromFormState(searchParams, form.getValues())
                              )
                        }
                        className="w-full text-start px-2 py-2 text-sm text-primary hover:bg-gray-50 rounded-md transition-colors block"
                      >
                        {t("search.viewAllResults")} "{form.watch("search")}"
                      </Link>
                    </div>
                  </div>
                </div>,
                document.body
              )}
          </div>
          <div
            className={cn(
              "flex flex-col md:flex-row space-y-3 md:space-y-0 md:divide-x rtl:md:divide-x-reverse divide-border",
              isCompact && "sm:flex-row sm:space-y-0 sm:divide-x rtl:sm:divide-x-reverse"
            )}
          >
            <div className="flex items-center focus-within:ring-ring/50 focus-within:ring-[3px] px-2 py-1 border md:border-0">
              <FormField
                control={form.control}
                name="carBrand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">{t("carSearch.carMake")}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          latestCarFiltersRef.current.carBrand = value;
                          latestCarFiltersRef.current.carModel = anyValue;
                          form.setValue("carModel", anyValue, {
                            shouldDirty: false,
                          });
                          if (isShopListingRoute) {
                            // Partial URL update: avoid spreading stale getValues() (loses carModel after year change).
                            setSearchParams({
                              carBrand: normalizeCarField(value) ?? null,
                              carModel: null,
                            });
                          } else if (isShopProductPdp) {
                            queueMicrotask(() => {
                              navigateToShopListing({
                                search: form.getValues("search") ?? "",
                                carBrand: value,
                                carModel: anyValue,
                                carYear: form.getValues("carYear") ?? anyValue,
                              });
                            });
                          }
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            "border-0 focus-visible:ring-0",
                            isCompact ? compactSelectWidth : "w-36"
                          )}
                        >
                          <div
                            className={cn(
                              "text-start",
                              isCompact ? "space-y-1" : "space-y-2"
                            )}
                          >
                            <div
                              className={cn(
                                "text-gray-500",
                                isCompact ? "text-xs" : "text-sm"
                              )}
                              aria-hidden="true"
                            >
                              {t("carSearch.carMake")}
                            </div>
                            <SelectValue
                              className="uppercase"
                              placeholder={t("carSearch.any")}
                            />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          <SelectItem value={anyValue}>{t("carSearch.any")}</SelectItem>
                          {carBrands.data?.map((make) => (
                            <SelectItem key={make} value={make}>
                              {make.toUpperCase()}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-center focus-within:ring-ring/50 focus-within:ring-[3px] px-2 py-1 border md:border-0">
              <FormField
                control={form.control}
                name="carModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">{t("carSearch.carModel")}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          latestCarFiltersRef.current.carModel = value;
                          if (isShopListingRoute) {
                            setSearchParams({
                              carModel: normalizeCarField(value) ?? null,
                            });
                          } else if (isShopProductPdp) {
                            queueMicrotask(() => {
                              navigateToShopListing({
                                search: form.getValues("search") ?? "",
                                carBrand: form.getValues("carBrand") ?? anyValue,
                                carModel: value,
                                carYear: form.getValues("carYear") ?? anyValue,
                              });
                            });
                          }
                        }}
                        disabled={form.watch("carBrand") === anyValue}
                      >
                        <SelectTrigger
                          className={cn(
                            "border-0 focus-visible:ring-0",
                            isCompact ? compactSelectWidth : "w-36"
                          )}
                        >
                          <div
                            className={cn(
                              "text-start",
                              isCompact ? "space-y-1" : "space-y-2"
                            )}
                          >
                            <div
                              className={cn(
                                "text-gray-500",
                                isCompact ? "text-xs" : "text-sm"
                              )}
                              aria-hidden="true"
                            >
                              {t("carSearch.carModel")}
                            </div>
                            <SelectValue placeholder={t("carSearch.any")} />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          <SelectItem value={anyValue}>{t("carSearch.any")}</SelectItem>
                          {carModels.data?.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            <div className="flex items-center focus-within:ring-ring/50 focus-within:ring-[3px] px-2 py-1 border md:border-0">
              <FormField
                control={form.control}
                name="carYear"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">{t("carSearch.productionYear")}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          latestCarFiltersRef.current.carYear = value;
                          if (isShopListingRoute) {
                            setSearchParams({
                              carYear: carYearQueryFromSelectValue(value),
                            });
                          } else if (isShopProductPdp) {
                            queueMicrotask(() => {
                              navigateToShopListing({
                                search: form.getValues("search") ?? "",
                                carBrand: form.getValues("carBrand") ?? anyValue,
                                carModel: form.getValues("carModel") ?? anyValue,
                                carYear: value,
                              });
                            });
                          }
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            "border-0 focus-visible:ring-0",
                            isCompact ? compactSelectWidth : "w-36"
                          )}
                        >
                          <div
                            className={cn(
                              "text-start",
                              isCompact ? "space-y-1" : "space-y-2"
                            )}
                          >
                            <div
                              className={cn(
                                "text-gray-500",
                                isCompact ? "text-xs" : "text-sm"
                              )}
                              aria-hidden="true"
                            >
                              {t("carSearch.productionYear")}
                            </div>
                            <SelectValue placeholder={t("carSearch.any")} />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          <SelectItem value={anyValue}>{t("carSearch.any")}</SelectItem>
                          {availableYears.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        </SimpleCard>
        <Button
          type="submit"
          disabled={!form.formState.isValid}
          className={cn(
            "w-full md:w-auto min-w-[12rem] font-koulen font-normal bg-[#CF172F] hover:bg-[#CF172F]/90 text-white",
            isCompact
              ? "h-14 md:h-full text-lg md:min-w-[12rem]"
              : "h-auto text-xl"
          )}
        >
          {t("carSearch.searchButton")}
        </Button>
      </form>
    </Form>
  );
}

export { ProductSearch };
