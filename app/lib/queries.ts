import { infiniteQueryOptions, mutationOptions, queryOptions } from "@tanstack/react-query";
import {
  deleteApiUsersMeFavourites,
  deleteApiUsersMeGarageCarsByUserCarId,
  getApiHomeExteriorProducts,
  getApiHomeInteriorProducts, getApiUsersMeFavourites,
  getApiUsersMeGarageCars,
  postApiUsersMeFavourites,
  postApiUsersMeGarageCarsByUserCarIdSetPrimary,
  getApiUsersMeAddresses,
  deleteApiUsersMeAddressesByAddressId,
  postApiUsersMeAddressesByAddressIdSetDefault,
  postApiCheckout,
  postApiUsersMeAddresses,
  getApiUsersMeAddressesByAddressId,
  putApiUsersMeAddressesByAddressId,
  getApiCarsBrands,
  getApiCarsModels,
  postApiAuthConfirmPasswordReset,
  postApiAuthForgotPassword,
  putApiAuthMe,
  getApiCheckoutOrders,
  getApiCheckoutOrdersByOrderId,
  postApiUsersMeGarageCars,
  patchApiUsersMeGarageCarsByUserCarId,
  getApiProductsPublic,
  getApiHomeSubcategories,
  postApiPaymentsInitiate,
  getApiPaymentsStatusByOrderId,
  postApiOrdersByOrderIdCancel,
  getApiProductTypes,
  getApiExchangeRatesCurrencies,
  getApiExchangeRates,
  postApiExchangeRatesConvert,
  postApiCheckoutGuest,
  getApiCheckoutGuestLookup,
} from "./client/sdk.gen";
import type {
  ProductResponse,
  CheckoutRequest,
  ProductListResponse,
  GuestCheckoutRequest,
  GetApiProductsPublicData,
} from "./client/types.gen";
import { toast } from "sonner";
import { defaultParams } from "./api-client";
import { extractErrorMessage } from "./utils";
import { config } from "../config";
import i18n from "./i18n";
import { resolveProductSlug } from "./get-locale-translation";
import { getCurrentLanguageId, type Currency } from "./constants";
import { saveCachedRates, loadCachedRates, getCacheKey } from "./currency-utils";

export const productTypesQueryOptions = queryOptions({
  queryKey: ["productTypes"],
  queryFn: async () => {
    const response = await getApiProductTypes();
    if (response.error) {
      throw response.error;
    }
    return response.data.data;
  },
});

export type ProductsByTypeSearchParams = {
  search?: string | null;
  carBrand?: string | null;
  carModel?: string | null;
  carYear?: number | null;
  categories?: string[] | null;
  sortBy?: string | null;
  sortOrder?: string | null;
};

const buildProductsByTypeQueryKey = (
  productTypeId: string,
  params: ProductsByTypeSearchParams
) => [
  "products",
  productTypeId,
  params.search ?? "",
  params.carBrand ?? "",
  params.carModel ?? "",
  params.carYear ?? null,
  params.sortBy ?? null,
  params.sortOrder ?? null,
  params.categories?.slice().sort().join(",") ?? "",
];

export type SubcategoryCountFilters = {
  storeId: string;
  languageId: string;
  productTypeId?: string;
  carBrand?: string;
  carModel?: string;
  carYear?: number;
  carId?: string;
  search?: string;
  productIds?: string;
};

const buildSubcategoryCountsQueryKey = (
  filters: SubcategoryCountFilters,
  subcategoryIds: string[]
) => [
  "subcategoryCounts",
  filters.productTypeId ?? "",
  filters.languageId,
  filters.carBrand ?? "",
  filters.carModel ?? "",
  filters.carYear ?? null,
  filters.carId ?? "",
  filters.search ?? "",
  filters.productIds ?? "",
  [...subcategoryIds].sort().join(","),
];

/**
 * Per-subcategory count query: returns `{ [subcategoryId]: total }` reflecting
 * the active car/search filters. Uses one `meta.total` query per id and the
 * server-side semantics where `categoryId` matches both `category_id` and
 * `sub_category_id`.
 */
export const subcategoryCountsQueryOptions = ({
  filters,
  subcategoryIds,
  enabled = true,
}: {
  filters: SubcategoryCountFilters;
  subcategoryIds: string[];
  enabled?: boolean;
}) =>
  queryOptions<Record<string, number>>({
    queryKey: buildSubcategoryCountsQueryKey(filters, subcategoryIds),
    queryFn: async () => {
      const counts: Record<string, number> = {};
      if (subcategoryIds.length === 0) return counts;
      await Promise.all(
        subcategoryIds.map(async (id) => {
          try {
            const response = await getApiProductsPublic({
              query: {
                storeId: filters.storeId,
                languageId: filters.languageId,
                productTypeId: filters.productTypeId,
                carBrand: filters.carBrand,
                carModel: filters.carModel,
                carYear: filters.carYear,
                carId: filters.carId,
                search: filters.search,
                productIds: filters.productIds,
                categoryId: id,
                page: 1,
                limit: 1,
              } as any,
            });
            counts[id] = response.error
              ? 0
              : response.data?.meta?.total ?? 0;
          } catch {
            counts[id] = 0;
          }
        })
      );
      return counts;
    },
    enabled,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

export const productsByTypeInfiniteQueryOptions = ({
  productTypeId,
  params,
  limit = 30,
  staleTime = 1000 * 60 * 5,
}: {
  productTypeId: string;
  params: ProductsByTypeSearchParams;
  limit?: number;
  staleTime?: number;
}) =>
  infiniteQueryOptions<ProductListResponse>({
    queryKey: [
      ...buildProductsByTypeQueryKey(productTypeId, params),
      (i18n.language || "").split("-")[0],
    ],
    queryFn: async ({ pageParam }) => {
      try {
        const currentLang = (i18n.language || "").split("-")[0];
        const primaryLanguageId =
          currentLang === "ar" ? config.languageIds.ar : config.languageIds.en;

        const response = await getApiProductsPublic({
          query: {
            storeId: defaultParams.storeId,
            languageId: primaryLanguageId,
            productTypeId,
            page: pageParam,
            limit,
            search: params.search ?? undefined,
            carBrand: params.carBrand ?? undefined,
            carModel: params.carModel ?? undefined,
            carYear: params.carYear ?? undefined,
            categoryId:
              params.categories && params.categories.length > 0
                ? params.categories.join(",")
                : undefined,
            sortBy: params.sortBy ?? undefined,
            sortOrder: params.sortOrder ?? undefined,
          } as any,
        });

        if (response.error) {
          throw new Error(
            response.error.error?.message || "Failed to fetch products"
          );
        }

        if (!response.data) {
          throw new Error("Invalid API response: missing data");
        }

        if (currentLang === "ar" && response.data?.data?.length) {
          const productIds = response.data.data.map((product: any) => product.id);
          const englishResponse = await getApiProductsPublic({
            query: {
              storeId: defaultParams.storeId,
              languageId: config.languageIds.en,
              productIds: productIds.join(","),
            },
          });

          const slugPairs = (englishResponse.data?.data ?? [])
            .map((product) => {
              const slug = resolveProductSlug(product, {
                preferEnglish: true,
                language: "en",
              });
              return slug ? ([product.id, slug] as const) : null;
            })
            .filter((e): e is readonly [string, string] => e !== null);
          const englishSlugById = new Map<string, string>(slugPairs);

          return {
            ...response.data,
            data: response.data.data.map((product: any) => ({
              ...product,
              slug_en: englishSlugById.get(product.id),
            })),
          };
        }

        return response.data;
      } catch (error: any) {
        if (error instanceof TypeError && error.message.includes("fetch")) {
          throw new Error(
            "Network error: Unable to connect to the API. Please check your connection and try again."
          );
        }
        if (error?.response?.status === 404) {
          throw new Error(
            "API endpoint not found. Please check the server configuration."
          );
        }
        throw error;
      }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.meta?.hasNext ? allPages.length + 1 : undefined;
    },
    staleTime,
  });

export const garageFeaturedProductsQueryOptions = (
  carBrand: string,
  carModel: string
) =>
  queryOptions<ProductListResponse>({
    queryKey: [
      "garageFeaturedProducts",
      carBrand,
      carModel,
      (i18n.language || "").split("-")[0],
    ],
    queryFn: async () => {
      const currentLang = (i18n.language || "").split("-")[0];
      const languageId =
        currentLang === "ar" ? config.languageIds.ar : config.languageIds.en;
      const response = await getApiProductsPublic({
        query: {
          storeId: defaultParams.storeId,
          languageId,
          carBrand,
          carModel,
          limit: 5,
          page: 1,
        } as any,
      });
      if (response.error) {
        throw new Error(response.error.error?.message || "Failed to fetch featured products");
      }
      if (currentLang === "ar" && response.data?.data?.length) {
        const productIds = response.data.data.map((product: any) => product.id);
        const englishResponse = await getApiProductsPublic({
          query: {
            storeId: defaultParams.storeId,
            languageId: config.languageIds.en,
            productIds: productIds.join(","),
          },
        });
        const englishSlugById = new Map<string, string>();
        for (const product of englishResponse.data?.data ?? []) {
          const slug = resolveProductSlug(product, { preferEnglish: true, language: "en" });
          if (slug) englishSlugById.set(product.id, slug);
        }
        return {
          ...response.data,
          data: response.data.data.map((product: any) => ({
            ...product,
            slug_en: englishSlugById.get(product.id),
          })),
        };
      }
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!carBrand && !!carModel,
  });

export const exteriorProductsQueryOptions = queryOptions({
  queryKey: ["products", "homeExteriorProducts"],
  queryFn: async () => {
    const currentLang = (i18n.language || "").split("-")[0];
    const primaryLanguageId =
      currentLang === "ar" ? config.languageIds.ar : config.languageIds.en;
    const response = await getApiHomeExteriorProducts({
      query: {
        storeId: defaultParams.storeId,
        languageId: primaryLanguageId,
        page: 1,
        limit: 10,
      },
    });
    if (response.error) {
      throw response.error;
    }
    if (currentLang !== "ar" || !response.data?.data?.length) {
      return response.data.data;
    }

    const productIds = response.data.data.map((product: any) => product.id);
    const englishResponse = await getApiProductsPublic({
      query: {
        storeId: defaultParams.storeId,
        languageId: config.languageIds.en,
        productIds: productIds.join(","),
      },
    });

    const englishSlugById = new Map<string, string>();
    for (const product of englishResponse.data?.data ?? []) {
      const slug = resolveProductSlug(product, {
        preferEnglish: true,
        language: "en",
      });
      if (slug) {
        englishSlugById.set(product.id, slug);
      }
    }

    return response.data.data.map((product: any) => ({
      ...product,
      slug_en: englishSlugById.get(product.id),
    }));
  },
});

export const interiorProductsQueryOptions = queryOptions({
  queryKey: ["products", "homeInteriorProducts"],
  queryFn: async () => {
    const currentLang = (i18n.language || "").split("-")[0];
    const primaryLanguageId =
      currentLang === "ar" ? config.languageIds.ar : config.languageIds.en;
    const response = await getApiHomeInteriorProducts({
      query: {
        storeId: defaultParams.storeId,
        languageId: primaryLanguageId,
        page: 1,
        limit: 10,
      },
    });
    if (response.error) {
      throw response.error;
    }
    if (currentLang !== "ar" || !response.data?.data?.length) {
      return response.data.data;
    }

    const productIds = response.data.data.map((product: any) => product.id);
    const englishResponse = await getApiProductsPublic({
      query: {
        storeId: defaultParams.storeId,
        languageId: config.languageIds.en,
        productIds: productIds.join(","),
      },
    });

    const englishSlugById = new Map<string, string>();
    for (const product of englishResponse.data?.data ?? []) {
      const slug = resolveProductSlug(product, {
        preferEnglish: true,
        language: "en",
      });
      if (slug) {
        englishSlugById.set(product.id, slug);
      }
    }

    return response.data.data.map((product: any) => ({
      ...product,
      slug_en: englishSlugById.get(product.id),
    }));
  },
});

export const favoritesQueryOptions = infiniteQueryOptions({
  queryKey: ["favorites"],
  queryFn: async ({ pageParam }) => {
    const response = await getApiUsersMeFavourites({
      query: {
        storeId: defaultParams.storeId,
        languageId: defaultParams.languageId,
        page: pageParam,
        limit: 8,
      }
    });
    if (response.error) {
      throw response.error;
    }
    return response.data;
  },
  getNextPageParam: (lastPage, pages) => {
    return lastPage.data.pagination.totalPages > pages.length ? pages.length + 1 : undefined;
  },
  initialPageParam: 1,
  retry: (failureCount, error) => {
    // Don't retry on authentication errors (401)
    if (error?.message?.includes("401") || error?.message?.includes("Unauthorized")) {
      return false;
    }
    // Retry up to 2 times for other errors
    return failureCount < 2;
  },
  staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
});

export const toggleWishlistMutationOptions = mutationOptions({
  mutationFn: async (product: ProductResponse["data"]) => {
    if (product.in_favs) {
      await deleteApiUsersMeFavourites({
        body: { productId: product.id },
      });
    } else {
      await postApiUsersMeFavourites({
        body: { productId: product.id },
      });
    }
  },
  onSuccess: (_, __, ___, context) => {
    context.client.invalidateQueries({ queryKey: ["favorites"] });
    context.client.invalidateQueries({ queryKey: ["products"] });
  },
});

export const garageCarsQueryOptions = queryOptions({
  queryKey: ["garageCars"],
  queryFn: async () => {
    const response = await getApiUsersMeGarageCars({
      query: {
        storeId: defaultParams.storeId,
        page: 1,
        limit: 50,
      },
    });

    if (response.error) {
      throw new Error(response.error.error.message);
    }

    return response.data.data;
  },
  retry: (failureCount, error) => {
    // Don't retry on authentication errors (401)
    if (error?.message?.includes("401") || error?.message?.includes("Unauthorized")) {
      return false;
    }
    // Retry up to 2 times for other errors
    return failureCount < 2;
  },
  staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
});

export const makePrimaryCarMutationOptions = mutationOptions({
  mutationFn: async (carId: string) => {
    const response = await postApiUsersMeGarageCarsByUserCarIdSetPrimary({
      path: { userCarId: carId },
      body: { storeId: defaultParams.storeId },
    });

    if (response.error) {
      throw new Error(response.error.error.message);
    }

    return response.data.data;
  },
  onSuccess: (_, __, ___, context) => {
    context.client.invalidateQueries({ queryKey: ["garageCars"] });
  },
  onError: () => {
    toast.error("Failed to set car as primary");
  },
});

export const removeFromGarageMutationOptions = mutationOptions({
  mutationFn: async (carId: string) => {
    const response = await deleteApiUsersMeGarageCarsByUserCarId({
      path: { userCarId: carId },
    });
    if (response.error) {
      throw new Error(response.error.error.message);
    }

    return response.data;
  },
  onSuccess: (_, __, ___, context) => {
    context.client.invalidateQueries({ queryKey: ["garageCars"] });
  },
  onError: () => {
    toast.error("Failed to remove car from garage");
  },
});

// Address-related query options
export const addressesQueryOptions = queryOptions({
  queryKey: ["addresses"],
  queryFn: async () => {
    const addressesResponse = await getApiUsersMeAddresses({
      query: {
        page: 1,
        limit: 20,
      },
    });

    if (addressesResponse.error) {
      throw new Error("Failed to load addresses");
    }

    return addressesResponse.data.data.addresses;
  },
});

export const addressByIdQueryOptions = (addressId: string) => queryOptions({
  queryKey: ["addresses", addressId],
  queryFn: async () => {
    const response = await getApiUsersMeAddressesByAddressId({
      path: { addressId },
    });
    if (response.error) {
      throw new Error(response.error.error.message);
    }
    return response.data.data;
  },
});

// Address mutation options
export const deleteAddressMutationOptions = mutationOptions({
  mutationFn: async (addressId: string) => {
    await deleteApiUsersMeAddressesByAddressId({
      path: { addressId },
    });
  },
  onSuccess: (_, __, ___, context) => {
    context.client.invalidateQueries({ queryKey: ["addresses"] });
  },
  onError: (error) => {
    toast.error("Failed to delete address. Please try again.");
  },
});

export const setDefaultAddressMutationOptions = mutationOptions({
  mutationFn: async (addressId: string) => {
    await postApiUsersMeAddressesByAddressIdSetDefault({
      path: { addressId },
    });
  },
  onSuccess: (_, __, ___, context) => {
    context.client.invalidateQueries({ queryKey: ["addresses"] });
    toast.success("Address set as default successfully");
  },
  onError: (error) => {
    toast.error("Failed to set default address. Please try again.");
  },
});

export const addAddressMutationOptions = mutationOptions({
  mutationFn: async (data: any) => {
    await postApiUsersMeAddresses({
      body: data,
    });
  },
  onSuccess: (_, __, ___, context) => {
    context.client.invalidateQueries({ queryKey: ["addresses"] });
    toast.success("Address added successfully");
  },
  onError: (error) => {
    toast.error("Failed to create address. Please try again.");
  },
});

export const updateAddressMutationOptions = (addressId: string) => mutationOptions({
  mutationFn: async (data: any) => {
    await putApiUsersMeAddressesByAddressId({
      path: { addressId },
      body: data,
    });
  },
  onSuccess: (_, __, ___, context) => {
    context.client.invalidateQueries({ queryKey: ["addresses"] });
    toast.success("Address updated successfully");
  },
  onError: (error) => {
    toast.error("Failed to update address. Please try again.");
  },
});

// Checkout mutation options
export const checkoutMutationOptions = mutationOptions({
  mutationFn: async (data: CheckoutRequest) => {
    const response = await postApiCheckout({
      body: data,
    });
    
    // Check for errors (400, 409, etc.)
    if (response.error) {
      throw new Error(extractErrorMessage(response.error, 'Failed to place order'));
    }
    
    return response.data;
  },
  onSuccess: (_, __, ___, context) => {
    toast.success("Order created successfully");
    context.client.invalidateQueries({ queryKey: ["orders"] });
    context.client.invalidateQueries({ queryKey: ["cart"] });
  },
  onError: (error) => {
    toast.error("Failed to place order", {
      description: error instanceof Error ? error.message : "Please try again.",
    });
  },
});

// Guest Checkout mutation options
export const guestCheckoutMutationOptions = mutationOptions({
  mutationFn: async (data: GuestCheckoutRequest) => {
    const response = await postApiCheckoutGuest({
      body: data,
    });
    
    if (response.error) {
      throw new Error(extractErrorMessage(response.error, 'Failed to place order'));
    }
    
    return response.data;
  },
  onSuccess: (_, __, ___, context) => {
    context.client.invalidateQueries({ queryKey: ["cart"] });
  },
  onError: (error) => {
    toast.error("Failed to place order", {
      description: error instanceof Error ? error.message : "Please try again.",
    });
  },
});

// Guest Order Lookup query options
export const guestOrderLookupQueryOptions = (orderNumber: string, email: string) => queryOptions({
  queryKey: ["guestOrderLookup", orderNumber, email],
  queryFn: async () => {
    const response = await getApiCheckoutGuestLookup({
      query: { orderNumber, email },
    });
    if (response.error) {
      throw new Error(extractErrorMessage(response.error, 'Order not found'));
    }
    return response.data;
  },
  enabled: !!orderNumber && !!email,
});
export const carBrandsQueryOptions = queryOptions({
  queryKey: ["carBrands"],
  queryFn: async () => {
    const response = await getApiCarsBrands({
      query: {
        store_id: defaultParams.storeId,
      },
    });
    if (response.error) {
      throw response.error;
    }
    return response.data.data.brands;
  },
});

export const carModelsQueryOptions = (brand?: string) => queryOptions({
  queryKey: ["carModels", brand],
  queryFn: async () => {
    const response = await getApiCarsModels({
      query: {
        store_id: defaultParams.storeId,
        brand: brand ?? undefined,
      },
    });
    if (response.error) {
      throw response.error;
    }
    return response.data.data.models;
  },
  enabled: !!brand,
});

// Auth mutation options
export const resetPasswordMutationOptions = (token: string) => mutationOptions({
  mutationFn: async (values: any) => {
    const response = await postApiAuthConfirmPasswordReset({
      body: {
        token,
        newPassword: values.newPassword,
        confirmPassword: values.confirmPassword,
      },
    });
    if (response.error) {
      throw new Error(response.error.error.message);
    }
    return response.data;
  },
  onSuccess: () => {
    toast.success("Password reset successfully");
  },
  onError: () => {
    toast.error("Failed to reset password. Please try again.");
  },
});

export const forgotPasswordMutationOptions = mutationOptions({
  mutationFn: async (values: any) => {
    const response = await postApiAuthForgotPassword({
      body: {
        email: values.email,
      },
    });
    if (response.error) {
      throw new Error(response.error.error.message);
    }
    return response.data;
  },
  onSuccess: () => {
    toast.success("Password reset email sent");
  },
  onError: () => {
    toast.error("Failed to send reset email. Please try again.");
  },
});

export const updateUserMutationOptions = mutationOptions({
  mutationFn: (values: any) => {
    return putApiAuthMe({
      body: {
        firstName: values.firstName,
        lastName: values.lastName,
        gender: values.gender,
        phone: values.phoneNumber,
        dateOfBirth: values.dateOfBirth,
      },
    });
  },
  onSuccess: () => {
    toast.success("Account updated successfully");
  },
  onError: () => {
    toast.error("Failed to update account. Please try again.");
  },
});

// Orders query options
export const ordersQueryOptions = queryOptions({
  queryKey: ["orders"],
  queryFn: async () => {
    const ordersResponse = await getApiCheckoutOrders({
      query: {
        page: 1,
        limit: 20,
        storeId: defaultParams.storeId,
      },
    });
    if (ordersResponse.error) {
      throw new Error("Failed to load orders");
    }
    return ordersResponse.data.data.orders;
  },
});

// Car-related mutation options
export const addCarMutationOptions = mutationOptions({
  mutationFn: async (data: any) => {
    const response = await postApiUsersMeGarageCars({
      body: {
        storeId: defaultParams.storeId,
        carId: data.carId,
        year: data.year,
        isPrimary: false,
      },
    });
    if (response.error) {
      throw new Error("Failed to add car to garage");
    }
    return response.data;
  },
  onSuccess: (_, variables, ___, context) => {
    const carName = `${variables.make} ${variables.model}`;
    toast.success(`${carName} added to garage successfully`);
    context.client.invalidateQueries({ queryKey: ["garageCars"] });
  },
  onError: (error) => {
    toast.error("Failed to add car to garage. Please try again.");
  },
});

export const editCarMutationOptions = (userCarId: string) => mutationOptions({
  mutationFn: async (data: any) => {
    const response = await patchApiUsersMeGarageCarsByUserCarId({
      path: { userCarId },
      body: data,
    });
    if (response.error) {
      throw new Error("Failed to update car");
    }
    return response.data;
  },
  onSuccess: (_, __, ___, context) => {
    toast.success("Car updated successfully");
    context.client.invalidateQueries({ queryKey: ["garageCars"] });
  },
  onError: () => {
    toast.error("Failed to update car. Please try again.");
  },
});

export const productsQueryOptions = (filters: Omit<GetApiProductsPublicData["query"], "storeId" | "languageId">) => {
  // Create a stable, sorted query key for better caching
  // This ensures identical filters produce the same cache key
  const filterKey = Object.entries(filters)
    .filter(([_, value]) => value !== undefined && value !== null && value !== "")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}:${String(value)}`)
    .join("|");
  
  const currentLang = (i18n.language || "").split("-")[0];

  return queryOptions({
    queryKey: ["products", "public", currentLang, filterKey || "all"],
    queryFn: async () => {
      const primaryLanguageId =
        currentLang === "ar" ? config.languageIds.ar : config.languageIds.en;

      const response = await getApiProductsPublic({
        query: {
          ...filters,
          storeId: defaultParams.storeId,
          languageId: primaryLanguageId,
        },
      });
      if (response.error) {
        throw response.error;
      }

      if (currentLang !== "ar" || !response.data?.data?.length) {
        return response.data.data;
      }

      const productIds = response.data.data.map((product: any) => product.id);
      const englishResponse = await getApiProductsPublic({
        query: {
          storeId: defaultParams.storeId,
          languageId: config.languageIds.en,
          productIds: productIds.join(","),
        },
      });

      const slugPairs = (englishResponse.data?.data ?? [])
        .map((product) => {
          const slug = resolveProductSlug(product, {
            preferEnglish: true,
            language: "en",
          });
          return slug ? ([product.id, slug] as const) : null;
        })
        .filter((e): e is readonly [string, string] => e !== null);
      const englishSlugById = new Map<string, string>(slugPairs);

      return response.data.data.map((product: any) => ({
        ...product,
        slug_en: englishSlugById.get(product.id),
      }));
    },
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 300000, // Keep in cache for 5 minutes
  });
};

export function homeSubcategoriesQueryOptions() {
  const languageId = getCurrentLanguageId();
  return queryOptions({
    queryKey: ["subcategories", "home", languageId],
    queryFn: async () => {
      const response = await getApiHomeSubcategories({
        query: {
          storeId: defaultParams.storeId,
          languageId,
        },
      });
      if (response.error) {
        throw response.error;
      }
      return response.data.data;
    },
    staleTime: 300000,
    gcTime: 300000,
  });
}

// Payment initiation mutation options
export const initiatePaymentMutationOptions = mutationOptions({
  mutationFn: async (orderId: string) => {
    const response = await postApiPaymentsInitiate({
      body: { orderId },
    });
    if (!response.data) {
      throw new Error("Failed to initiate payment");
    }
    return response.data;
  },
  onError: (error) => {
    toast.error("Failed to initiate payment", {
      description: error instanceof Error ? error.message : "Please try again",
    });
  },
});
// Payment status query options
export const paymentStatusQueryOptions = (orderId: string) => queryOptions({
  queryKey: ["paymentStatus", orderId],
  queryFn: async () => {
    const response = await getApiPaymentsStatusByOrderId({
      path: { orderId },
    });
    if (!response.data?.success || !response.data?.data) {
      throw new Error("Failed to fetch payment status");
    }
    return response.data.data;
  },
  // Don't automatically fetch - trigger manually
  enabled: false,
  // Don't cache aggressively - status can change
  staleTime: 0,
  gcTime: 60000, // Keep in cache for 1 minute
});

// Cancel order mutation options
export const cancelOrderMutationOptions = mutationOptions({
  mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
    const verifyOrderCancelled = async () => {
      // Backend may process cancellation asynchronously; verify for a short window before failing.
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const orderCheck = await getApiCheckoutOrdersByOrderId({
          path: { orderId },
        });

        if (orderCheck.data?.data?.status === "cancelled") {
          return true;
        }

        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
      return false;
    };

    const response = await postApiOrdersByOrderIdCancel({
      path: { orderId },
      body: { reason },
    });

    // Treat any response with data as success.
    // Some backend/client combinations may still include an "error" object alongside successful payloads.
    if (response.data) {
      return response.data;
    }

    // Fallback verification:
    // In some race/consistency cases the cancel endpoint can return an error while cancellation still succeeds.
    const isCancelled = await verifyOrderCancelled();
    if (isCancelled) {
      return {
        message: "Order already cancelled",
        data: {
          orderId,
          status: "cancelled",
        },
      };
    }

    throw new Error(extractErrorMessage(response.error, "Failed to cancel order"));
  },
  onMutate: async (variables, context) => {
    await context.client.cancelQueries({ queryKey: ["orders"] });
    await context.client.cancelQueries({ queryKey: ["order", variables.orderId] });

    const previousOrders = context.client.getQueryData<any[]>(["orders"]);
    const previousOrder = context.client.getQueryData<any>(["order", variables.orderId]);

    context.client.setQueryData(["orders"], (current: any) => {
      if (!Array.isArray(current)) return current;
      return current.map((order) =>
        order?.id === variables.orderId ? { ...order, status: "cancelled" } : order
      );
    });

    context.client.setQueryData(["order", variables.orderId], (current: any) => {
      if (!current) return current;
      return { ...current, status: "cancelled" };
    });

    return { previousOrders, previousOrder };
  },
  onSuccess: (data, variables, _onMutateResult, context) => {
    context.client.invalidateQueries({ queryKey: ["orders"] });
    context.client.invalidateQueries({ queryKey: ["order", variables.orderId] });

    const refundInfo = data?.data?.refundInitiated && data?.data?.refundAmount
      ? ` A refund of JOD ${data.data.refundAmount} will be processed.`
      : "";

    toast.success("Order Cancelled Successfully", {
      description: `Your order has been cancelled.${refundInfo}`,
    });
  },
  onError: (error, variables, onMutateResult, context) => {
    const rollback = onMutateResult as
      | { previousOrders?: any[]; previousOrder?: any }
      | undefined;

    if (rollback?.previousOrders) {
      context.client.setQueryData(["orders"], rollback.previousOrders);
    }
    if (rollback?.previousOrder) {
      context.client.setQueryData(
        ["order", variables.orderId],
        rollback.previousOrder
      );
    }
    toast.error("Cancellation Failed", {
      description: error instanceof Error ? error.message : "Failed to cancel order. Please try again.",
    });
  },
});

// ============================================================================
// Exchange Rate Queries
// ============================================================================

/**
 * Query all supported currencies
 * Rarely changes, so staleTime is set to Infinity
 */
export const currenciesQueryOptions = queryOptions({
  queryKey: ["currencies"],
  queryFn: async () => {
    const response = await getApiExchangeRatesCurrencies();
    if (response.error) {
      throw new Error(extractErrorMessage(response.error, "Failed to fetch currencies"));
    }
    return response.data.data;
  },
  staleTime: Infinity, // Currencies list doesn't change
});

/**
 * Query exchange rate between two currencies
 * @param from - Source currency
 * @param to - Target currency
 */
export const exchangeRateQueryOptions = (from: Currency, to: Currency) =>
  queryOptions({
    queryKey: ["exchange-rates", from, to],
    queryFn: async () => {
      const response = await getApiExchangeRates({
        query: { from, to },
      });
      if (response.error || !response.data?.data?.rate) {
        throw new Error(extractErrorMessage(response.error, `Failed to fetch ${from}-${to} rate`));
      }
      
      const rate = response.data.data.rate;
      
      // Save to localStorage cache on success
      const cached = loadCachedRates();
      const cacheKey = getCacheKey(from, to);
      cached[cacheKey] = {
        rate,
        timestamp: Date.now(),
      };
      saveCachedRates(cached);
      
      return response.data.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: from !== to, // Don't fetch if currencies are the same
  });

/**
 * Query to convert an amount between currencies
 * @param amount - Amount to convert
 * @param from - Source currency
 * @param to - Target currency
 */
export const convertPriceQueryOptions = (amount: number, from: Currency, to: Currency) =>
  queryOptions({
    queryKey: ["convert-price", amount, from, to],
    queryFn: async () => {
      const response = await postApiExchangeRatesConvert({
        body: { amount, from, to },
      });
      if (response.error || !response.data?.data?.rate) {
        throw new Error(extractErrorMessage(response.error, "Failed to convert amount"));
      }
      
      const rate = response.data.data.rate;
      
      // Cache the exchange rate
      const cached = loadCachedRates();
      const cacheKey = getCacheKey(from, to);
      cached[cacheKey] = {
        rate,
        timestamp: Date.now(),
      };
      saveCachedRates(cached);
      
      return response.data.data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    enabled: amount > 0 && from !== to,
  });
