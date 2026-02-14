import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { useQuery } from "@tanstack/react-query";
import { homeSubcategoriesQueryOptions, garageCarsQueryOptions } from "~/lib/queries";
import { Link, useRouteLoaderData } from "react-router";
import { cn } from "~/lib/utils";
import { useMemo } from "react";
import { getApiProductsPublic, getApiProductsPublicSlugBySlug } from "~/lib/client/sdk.gen";
import { defaultParams } from "~/lib/api-client";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import type { Route } from "../routes/+types/_main";
import { buildProductPath } from "~/lib/product-url";

// Fallback subcategories to ensure we always have 10 categories
const FALLBACK_SUBCATEGORIES = [
  "Front Splitter",
  "Vents",
  "Front Bumper",
  "Spoiler",
  "Diffuser",
  "Steering Trim",
  "Rims",
  "Control Trim",
  "Floor Mat",
  "Ladder",
];

/**
 * CarPartsHoverPopup Component
 * 
 * Displays a hover popup when hovering over the "Car Parts" navigation item.
 * Shows the top 10 subcategories in two columns and a featured product suggestion.
 */
export function CarPartsHoverPopup({ children }: { children: React.ReactNode }) {
  const { data: subcategories, isLoading: subcategoriesLoading } = useQuery(homeSubcategoriesQueryOptions);
  
  // Check if user is authenticated and get product types
  const loaderData = useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const isAuthenticated = loaderData?.isAuthenticated;
  const productTypes = loaderData?.productTypes ?? [];
  
  // Find car parts product type
  const carPartsProductType = useMemo(() => {
    return productTypes.find(pt => pt.code === "car_parts");
  }, [productTypes]);
  
  // Fetch garage cars if authenticated
  const { data: garageCarsData, isLoading: garageCarsLoading } = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });
  
  const userCars = garageCarsData?.userCars ?? [];
  const hasGarageCars = userCars.length > 0;
  
  // Pick a random car from garage if available
  const randomCar = useMemo(() => {
    if (!hasGarageCars) return null;
    const randomIndex = Math.floor(Math.random() * userCars.length);
    return userCars[randomIndex];
  }, [hasGarageCars, userCars]);
  
  // Query for products that fit the random car
  const garageProductsQuery = useQuery({
    queryKey: ["products", "garage-featured", randomCar?.carId, randomCar?.carDetails?.yearFrom, carPartsProductType?.id],
    queryFn: async () => {
      if (!randomCar || !carPartsProductType) return null;
      const response = await getApiProductsPublic({
        query: {
          storeId: defaultParams.storeId,
          languageId: defaultParams.languageId,
          productTypeId: carPartsProductType.id,
          carBrand: randomCar.carDetails.brand,
          carModel: randomCar.carDetails.model,
          carYear: randomCar.carDetails.yearFrom || undefined,
          limit: 20,
          page: 1,
        } as any,
      });
      if (response.error) {
        throw response.error;
      }
      return response.data?.data || [];
    },
    enabled: hasGarageCars && !!randomCar && !!carPartsProductType,
  });
  
  // Fetch default product (Jetour T2 Matt Black Body Kit) when user has no garage cars
  const defaultProductQuery = useQuery({
    queryKey: ["products", "default-featured", "jetour-t2-matt-black-body-kit"],
    queryFn: async () => {
      const response = await getApiProductsPublicSlugBySlug({
        path: {
          slug: "jetour-t2-matt-black-body-kit",
        },
        query: {
          storeId: defaultParams.storeId,
          languageId: defaultParams.languageId,
        },
      });
      if (response.error) {
        throw response.error;
      }
      return response.data?.data;
    },
    enabled: !hasGarageCars,
  });
  
  // Get subcategories from API or use fallbacks
  const apiSubcategories = subcategories?.slice(0, 10) || [];
  const top10Subcategories = Array.from({ length: 10 }, (_, index) => {
    if (apiSubcategories[index]) {
      return {
        id: apiSubcategories[index].id,
        translations: [{ name: apiSubcategories[index].name || "Category Name" }],
      };
    }
    // Use fallback if API doesn't have enough
    return {
      id: `fallback-${index}`,
      translations: [{ name: FALLBACK_SUBCATEGORIES[index] || "Category Name" }],
    };
  });

  // Determine featured product: use garage product if available, otherwise use default product
  const featuredProduct = useMemo(() => {
    if (hasGarageCars && garageProductsQuery.data && garageProductsQuery.data.length > 0) {
      // Pick a random product from garage-compatible products
      const randomIndex = Math.floor(Math.random() * garageProductsQuery.data.length);
      return garageProductsQuery.data[randomIndex];
    }
    return defaultProductQuery.data;
  }, [hasGarageCars, garageProductsQuery.data, defaultProductQuery.data]);
  
  const productsLoading = hasGarageCars 
    ? (garageCarsLoading || garageProductsQuery.isLoading)
    : defaultProductQuery.isLoading;

  // Split into two columns (5 each)
  const leftColumn = top10Subcategories.slice(0, 5);
  const rightColumn = top10Subcategories.slice(5, 10);

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        className="w-auto p-6 bg-[#f2f2f2] border border-[#e6e6e6] rounded-[2px] shadow-[0_4px_10px_0_rgba(0,0,0,0.10)]"
        sideOffset={12}
        align="start"
      >
        <div className="flex flex-col gap-4">
          {/* Title */}
          <div className="flex items-center">
            <h3 className="text-base font-extrabold text-black leading-[1.2] tracking-[-0.176px]">
              Hottest Parts!
            </h3>
          </div>

          {/* Content: Categories and Featured Product */}
          <div className="flex items-start gap-6">
            {/* Two columns of categories */}
            <div className="flex gap-8 flex-1">
              {/* Left Column */}
              <div className="flex flex-col gap-6">
                {subcategoriesLoading ? (
                  <div className="text-sm text-muted-foreground py-2">Loading...</div>
                ) : (
                  leftColumn.map((subcategory) => (
                    <Link
                      key={subcategory.id}
                      to={`/shop/car-parts?categories=${encodeURIComponent(subcategory.id)}`}
                      className="text-sm font-medium text-[rgba(0,0,0,0.8)] leading-[1.2] hover:text-[#cf172f] transition-colors duration-200"
                    >
                      {subcategory.translations?.[0]?.name || "Category Name"}
                    </Link>
                  ))
                )}
              </div>

              {/* Right Column */}
              <div className="flex flex-col gap-6">
                {subcategoriesLoading ? (
                  <div className="text-sm text-muted-foreground py-2">Loading...</div>
                ) : (
                  rightColumn.map((subcategory) => (
                    <Link
                      key={subcategory.id}
                      to={`/shop/car-parts?categories=${encodeURIComponent(subcategory.id)}`}
                      className="text-sm font-medium text-[rgba(0,0,0,0.8)] leading-[1.2] hover:text-[#cf172f] transition-colors duration-200"
                    >
                      {subcategory.translations?.[0]?.name || "Category Name"}
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Vertical Divider */}
            <div className="h-[181px] w-px bg-[#e6e6e6] shrink-0" />

            {/* Featured Product Card */}
            <div className="shrink-0">
              {productsLoading ? (
                <div className="w-[152px] h-[181px] bg-gray-50 border border-[#e6e6e6] rounded-[6px] flex items-center justify-center">
                  <div className="text-xs text-muted-foreground">Loading...</div>
                </div>
              ) : featuredProduct ? (
                (() => {
                  const productPath = buildProductPath(featuredProduct);
                  const productName =
                    getLocalizedTranslation(featuredProduct.translations)?.name || "Product";

                  const content = (
                    <>
                      {/* Product Image */}
                      <div className="h-[119px] w-full bg-gray-50 overflow-hidden">
                        <img
                          loading="lazy"
                          src={featuredProduct.secondaryImage || featuredProduct.mainImage || ""}
                          alt={productName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      {/* Product Info */}
                      <div className="flex flex-col gap-2 px-[14px] py-2 flex-1 justify-center">
                        <h4 className="text-[12px] font-semibold text-[rgba(0,0,0,0.8)] leading-[1.2] line-clamp-2 group-hover:text-[#cf172f] transition-colors">
                          {productName}
                        </h4>
                        <p className="text-[12px] font-medium text-[rgba(0,0,0,0.8)] leading-[1.2]">
                          JOD {featuredProduct.price}
                        </p>
                      </div>
                    </>
                  );

                  return productPath ? (
                    <Link
                      to={productPath}
                      className="bg-white border border-[#e6e6e6] rounded-[6px] w-[152px] h-[181px] flex flex-col overflow-hidden hover:shadow-md hover:border-[#cf172f]/20 transition-all duration-200 group"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div
                      className="bg-white border border-[#e6e6e6] rounded-[6px] w-[152px] h-[181px] flex flex-col overflow-hidden opacity-60 cursor-not-allowed"
                      aria-disabled="true"
                    >
                      {content}
                    </div>
                  );
                })()
              ) : (
                <div className="w-[152px] h-[181px] bg-gray-50 border border-[#e6e6e6] rounded-[6px] flex items-center justify-center">
                  <div className="text-xs text-muted-foreground">No product available</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
