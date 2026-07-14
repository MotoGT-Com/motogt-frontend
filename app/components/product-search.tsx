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
import { carBrandsQueryOptions, carModelsQueryOptions, carTrimsQueryOptions, productsQueryOptions, } from "~/lib/queries";
import { createSerializer, useQueryStates } from "nuqs";
import {
  serializeShopURL,
  shopSearchParamsSchema,
} from "~/lib/shop-search-params";
import { useDebounce } from "use-debounce";
import { useTranslation } from "react-i18next";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import { buildProductPath } from "~/lib/product-url";
import { useProductQuickView } from "~/context/ProductQuickViewContext";
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
    carTrim: z
      .string()
      .optional()
      .transform(normalizeCarField),
  })
  .refine((data) => {
    return (
      !!data.search ||
      !!data.carBrand ||
      !!data.carModel ||
      !!data.carYear ||
      !!data.carTrim
    );
  });

type ProductSearchFormValues = {
  search?: string;
  carBrand?: string;
  carModel?: string;
  carYear?: string;
  carTrim?: string;
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
  const carTrim = normalizeCarField(formValues.carTrim);
  return {
    ...searchParams,
    search,
    carBrand,
    carModel,
    carYear,
    carTrim,
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
  const { openProductQuickView } = useProductQuickView();
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
        carTrim: merged.carTrim ?? null,
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
          carTrim: merged.carTrim,
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
      carTrim: searchParams.carTrim || anyValue,
    }),
    [
      searchParams.search,
      searchParams.carBrand,
      searchParams.carModel,
      searchParams.carYear,
      searchParams.carTrim,
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
            carTrim: anyValue,
          },
        }),
  });

  // Keep the latest select values outside RHF to avoid submit-time lag/race.
  const latestCarFiltersRef = useRef<{
    carBrand: string;
    carModel: string;
    carYear: string;
    carTrim: string;
  }>({
    carBrand: form.getValues("carBrand") ?? anyValue,
    carModel: form.getValues("carModel") ?? anyValue,
    carYear: form.getValues("carYear") ?? anyValue,
    carTrim: form.getValues("carTrim") ?? anyValue,
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
  const carTrimWatch = form.watch("carTrim");
  useEffect(() => {
    latestCarFiltersRef.current.carTrim = carTrimWatch ?? anyValue;
  }, [carTrimWatch]);
  const carModels = useQuery(
    carModelsQueryOptions(carBrand === anyValue ? undefined : carBrand)
  );
  const trimBrand =
    carBrand !== anyValue ? normalizeCarField(carBrand) : undefined;
  const trimModel =
    carModelWatch !== anyValue ? normalizeCarField(carModelWatch) : undefined;
  const trimYear = carYearQueryFromSelectValue(carYearWatch ?? anyValue) ?? undefined;
  const carTrims = useQuery(
    carTrimsQueryOptions({
      brand: trimBrand,
      model: trimModel,
      year: trimYear ?? undefined,
    })
  );
  const canSelectTrim = Boolean(trimBrand && trimModel);
  
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
      carTrim:
        latestCarFiltersRef.current.carTrim || v.carTrim || anyValue,
    };
    if (isShopListingRoute) {
      applyShopFiltersFromForm(formPayload);
    } else {
      navigateToShopListing(formPayload);
    }
    onSubmitSuccess?.();
  };

  const filterCellClass = cn(
    "min-w-0 flex items-center focus-within:ring-ring/50 focus-within:ring-[3px]",
    isCompact
      ? "px-2 py-1 border md:border-0"
      : [
          "px-3.5 py-3.5 transition-colors hover:bg-gray-50/80",
          // Mobile 2x2 grid lines (matches design)
          "[&:nth-child(-n+2)]:border-b [&:nth-child(odd)]:border-e border-border/60",
          // Desktop single row
          "md:border-b-0 md:border-e md:last:border-e-0 md:flex-1 md:py-3.5 md:px-4",
        ].join(" ")
  );

  const filterLabelClass = cn(
    "text-gray-400 uppercase tracking-wide font-medium",
    isCompact ? "text-xs" : "text-[10px] md:text-[11px]"
  );

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "flex gap-3 relative",
          isCompact
            ? "flex-col md:flex-row rtl:md:flex-row-reverse md:h-14 md:gap-4"
            : "flex-col md:flex-row rtl:md:flex-row-reverse md:items-stretch md:gap-3 lg:gap-4",
          className
        )}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <SimpleCard
          className={cn(
            "flex flex-1 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden border-0",
            isCompact
              ? "flex-col md:flex-row rounded-md p-2 md:p-0 space-y-3 md:space-y-0 md:divide-x rtl:md:divide-x-reverse divide-border"
              : "flex-col rounded-2xl md:rounded-xl",
            cardClassName
          )}
        >
          <div
            ref={searchInputRef}
            className={cn(
              "relative flex-1",
              isCompact
                ? "py-2 md:py-0 border md:border-0"
                : "px-1 py-3.5 md:py-4 border-b border-border/70",
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
                        "border-0 shadow-none rounded-none bg-transparent h-auto w-full px-0 py-0 ps-12 text-start",
                        "focus-visible:border-0 focus-visible:shadow-none focus-visible:bg-transparent focus-visible:ring-0",
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
                  data-product-search-dropdown
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

                      return (
                        <button
                          key={product.id}
                          type="button"
                          className="flex w-full items-center gap-3 rounded-md p-2 text-start transition-colors hover:bg-gray-50"
                          onClick={() => {
                            setShowDropdown(false);
                            openProductQuickView(String(product.id));
                          }}
                        >
                          {content}
                        </button>
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
              isCompact
                ? "flex flex-col md:flex-row space-y-3 md:space-y-0 md:divide-x rtl:md:divide-x-reverse divide-border sm:flex-row sm:space-y-0 sm:divide-x rtl:sm:divide-x-reverse"
                : "flex flex-col"
            )}
          >
            {!isCompact && (
              <p className="px-4 pt-3.5 pb-1.5 text-[10px] md:text-[11px] uppercase tracking-[0.08em] text-gray-400 font-medium">
                {t("carSearch.filterByVehicle")}
              </p>
            )}
            <div
              className={cn(
                isCompact
                  ? "flex flex-col space-y-3 divide-border md:flex-row md:space-y-0 md:divide-x rtl:md:divide-x-reverse"
                  : "grid grid-cols-2 md:flex md:flex-row md:divide-x rtl:md:divide-x-reverse divide-border border-t border-border/60"
              )}
            >
            <div className={filterCellClass}>
              <FormField
                control={form.control}
                name="carBrand"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="sr-only">{t("carSearch.carBrand")}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          latestCarFiltersRef.current.carBrand = value;
                          latestCarFiltersRef.current.carModel = anyValue;
                          latestCarFiltersRef.current.carTrim = anyValue;
                          form.setValue("carModel", anyValue, {
                            shouldDirty: false,
                          });
                          form.setValue("carTrim", anyValue, {
                            shouldDirty: false,
                          });
                          if (isShopListingRoute) {
                            // Partial URL update: avoid spreading stale getValues() (loses carModel after year change).
                            setSearchParams({
                              carBrand: normalizeCarField(value) ?? null,
                              carModel: null,
                              carTrim: null,
                            });
                          } else if (isShopProductPdp) {
                            queueMicrotask(() => {
                              navigateToShopListing({
                                search: form.getValues("search") ?? "",
                                carBrand: value,
                                carModel: anyValue,
                                carYear: form.getValues("carYear") ?? anyValue,
                                carTrim: anyValue,
                              });
                            });
                          }
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            "border-0 focus-visible:ring-0 shadow-none h-auto py-0 w-full",
                            isCompact ? compactSelectWidth : "min-w-0"
                          )}
                        >
                          <div
                            className={cn(
                              "text-start w-full",
                              isCompact ? "space-y-1" : "space-y-1.5"
                            )}
                          >
                            <div className={filterLabelClass} aria-hidden="true">
                              {t("carSearch.carBrand")}
                            </div>
                            <SelectValue
                              className="uppercase font-semibold text-sm text-foreground"
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
            <div className={filterCellClass}>
              <FormField
                control={form.control}
                name="carModel"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="sr-only">{t("carSearch.carModel")}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          latestCarFiltersRef.current.carModel = value;
                          latestCarFiltersRef.current.carTrim = anyValue;
                          form.setValue("carTrim", anyValue, {
                            shouldDirty: false,
                          });
                          if (isShopListingRoute) {
                            setSearchParams({
                              carModel: normalizeCarField(value) ?? null,
                              carTrim: null,
                            });
                          } else if (isShopProductPdp) {
                            queueMicrotask(() => {
                              navigateToShopListing({
                                search: form.getValues("search") ?? "",
                                carBrand: form.getValues("carBrand") ?? anyValue,
                                carModel: value,
                                carYear: form.getValues("carYear") ?? anyValue,
                                carTrim: anyValue,
                              });
                            });
                          }
                        }}
                        disabled={form.watch("carBrand") === anyValue}
                      >
                        <SelectTrigger
                          className={cn(
                            "border-0 focus-visible:ring-0 shadow-none h-auto py-0 w-full",
                            isCompact ? compactSelectWidth : "min-w-0"
                          )}
                        >
                          <div
                            className={cn(
                              "text-start w-full",
                              isCompact ? "space-y-1" : "space-y-1.5"
                            )}
                          >
                            <div className={filterLabelClass} aria-hidden="true">
                              {t("carSearch.carModel")}
                            </div>
                            <SelectValue
                              className="font-semibold text-sm text-foreground"
                              placeholder={t("carSearch.any")}
                            />
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
            <div className={filterCellClass}>
              <FormField
                control={form.control}
                name="carYear"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="sr-only">{t("carSearch.productionYear")}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          latestCarFiltersRef.current.carYear = value;
                          latestCarFiltersRef.current.carTrim = anyValue;
                          form.setValue("carTrim", anyValue, {
                            shouldDirty: false,
                          });
                          if (isShopListingRoute) {
                            setSearchParams({
                              carYear: carYearQueryFromSelectValue(value),
                              carTrim: null,
                            });
                          } else if (isShopProductPdp) {
                            queueMicrotask(() => {
                              navigateToShopListing({
                                search: form.getValues("search") ?? "",
                                carBrand: form.getValues("carBrand") ?? anyValue,
                                carModel: form.getValues("carModel") ?? anyValue,
                                carYear: value,
                                carTrim: anyValue,
                              });
                            });
                          }
                        }}
                      >
                        <SelectTrigger
                          className={cn(
                            "border-0 focus-visible:ring-0 shadow-none h-auto py-0 w-full",
                            isCompact ? compactSelectWidth : "min-w-0"
                          )}
                        >
                          <div
                            className={cn(
                              "text-start w-full",
                              isCompact ? "space-y-1" : "space-y-1.5"
                            )}
                          >
                            <div className={filterLabelClass} aria-hidden="true">
                              {t("carSearch.productionYear")}
                            </div>
                            <SelectValue
                              className="font-semibold text-sm text-foreground"
                              placeholder={t("carSearch.any")}
                            />
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

            <div className={filterCellClass}>
              <FormField
                control={form.control}
                name="carTrim"
                render={({ field }) => (
                  <FormItem className="w-full">
                    <FormLabel className="sr-only">{t("carSearch.trim")}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          latestCarFiltersRef.current.carTrim = value;
                          if (isShopListingRoute) {
                            setSearchParams({
                              carTrim: normalizeCarField(value) ?? null,
                            });
                          } else if (isShopProductPdp) {
                            queueMicrotask(() => {
                              navigateToShopListing({
                                search: form.getValues("search") ?? "",
                                carBrand: form.getValues("carBrand") ?? anyValue,
                                carModel: form.getValues("carModel") ?? anyValue,
                                carYear: form.getValues("carYear") ?? anyValue,
                                carTrim: value,
                              });
                            });
                          }
                        }}
                        disabled={!canSelectTrim}
                      >
                        <SelectTrigger
                          className={cn(
                            "border-0 focus-visible:ring-0 shadow-none h-auto py-0 w-full",
                            isCompact ? compactSelectWidth : "min-w-0"
                          )}
                        >
                          <div
                            className={cn(
                              "text-start w-full",
                              isCompact ? "space-y-1" : "space-y-1.5"
                            )}
                          >
                            <div
                              className={cn(
                                filterLabelClass,
                                "flex items-center gap-1.5 flex-wrap"
                              )}
                              aria-hidden="true"
                            >
                              <span>{t("carSearch.trim")}</span>
                              <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] md:text-[9px] font-semibold tracking-wide uppercase bg-gray-200/90 text-gray-500 leading-none">
                                {t("carSearch.optional")}
                              </span>
                            </div>
                            <SelectValue
                              className="font-semibold text-sm text-foreground"
                              placeholder={t("carSearch.any")}
                            />
                          </div>
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          <SelectItem value={anyValue}>{t("carSearch.any")}</SelectItem>
                          {carTrims.data?.map((trim) => (
                            <SelectItem key={trim} value={trim}>
                              {trim}
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
          </div>
        </SimpleCard>
        <Button
          type="submit"
          disabled={!form.formState.isValid}
          className={cn(
            "w-full font-koulen font-normal bg-[#CF172F] hover:bg-[#b91428] active:bg-[#a61224] text-white shrink-0 shadow-md transition-colors",
            isCompact
              ? "h-14 md:h-full text-lg rounded-xl md:w-auto md:min-w-[12rem] md:rounded-md"
              : "h-[3.5rem] text-xl tracking-wide rounded-2xl md:h-auto md:w-auto md:min-w-[11.5rem] lg:min-w-[12.5rem] md:self-stretch md:px-10 md:rounded-xl"
          )}
        >
          {t("carSearch.searchButton")}
        </Button>
      </form>
    </Form>
  );
}

export { ProductSearch };
