/**
 * Favorites Manager - Unified favorites logic for authenticated and unauthenticated users
 *
 * Usage Example:
 *
 * // In a React component
 * const favoritesManager = getFavoritesManager(isAuthenticated);
 *
 * // Add item to favorites
 * const result = await favoritesManager.addToFavorites(productItem);
 * if (result.success) {
 * } else {
 * }
 *
 * // Get favorites items
 * const items = await favoritesManager.getFavorites();
 *
 * // Remove item
 * await favoritesManager.removeFromFavorites("product-123");
 *
 * // Check if item is in favorites
 * const isFavorite = favoritesManager.isFavorite("product-123");
 *
 * // Clear entire favorites
 * await favoritesManager.clearFavorites();
 *
 * // Sync client favorites to server when user logs in (placeholder - disabled until backend ready)
 * if (userJustLoggedIn) {
 *   favoritesManager.setAuthenticationStatus(true);
 *   await favoritesManager.syncClientFavoritesToServer(); // Currently disabled
 * }
 */

import { postApiUsersMeFavourites, deleteApiUsersMeFavourites, getApiUsersMeFavourites, type ProductItem, type GetApiHomeExteriorProductsResponse, } from "./client";
import { defaultParams } from "./api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { capitalizeWords } from "./utils";
import getLocalizedTranslation from "./get-locale-translation";
import i18n from "./i18n";

type FavoriteItem = ProductItem | GetApiHomeExteriorProductsResponse["data"][0];

export interface FavoritesManager {
  addToFavorites: (
    product: FavoriteItem
  ) => Promise<{ success: boolean; error?: string }>;
  removeFromFavorites: (
    product: FavoriteItem
  ) => Promise<{ success: boolean; error?: string }>;
  getFavorites: () => Promise<FavoriteItem[]>;
}

class ClientFavoritesManager implements FavoritesManager {
  private readonly FAVORITES_KEY = "favorites";

  private getClientFavorites(): FavoriteItem[] {
    // Guard against SSR — localStorage is not available on the server
    if (typeof window === "undefined") return [];

    try {
      const rawFavorites = localStorage.getItem(this.FAVORITES_KEY);
      if (!rawFavorites) {
        return [];
      }

      return JSON.parse(rawFavorites);
    } catch (error) {
      // JSON parsing failed or other error, clear favorites
      try {
        localStorage.removeItem(this.FAVORITES_KEY);
      } catch {
        // Ignore — may still be in SSR context
      }
      return [];
    }
  }

  private setClientFavorites(favorites: FavoriteItem[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.FAVORITES_KEY, JSON.stringify(favorites));
  }

  async addToFavorites(
    product: FavoriteItem
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const favorites = this.getClientFavorites();

      // Check if already in favorites
      if (favorites.some((item) => item.id === product.id)) {
        return { success: false, error: "Product already in favorites" };
      }

      favorites.push(product);
      this.setClientFavorites(favorites);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to add item to favorites" };
    }
  }

  async removeFromFavorites(
    product: FavoriteItem
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const favorites = this.getClientFavorites();
      this.setClientFavorites(
        favorites.filter((item) => item.id !== product.id)
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to remove item from favorites" };
    }
  }

  async getFavorites(): Promise<FavoriteItem[]> {
    return this.getClientFavorites();
  }
}

class ServerFavoritesManager implements FavoritesManager {
  async addToFavorites(
    product: FavoriteItem
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await postApiUsersMeFavourites({
        body: {
          productId: product.id,
        },
      });

      if (response.error) {
        return {
          success: false,
          error:
            response.error.error?.message || "Failed to add item to favorites",
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to add item to favorites",
      };
    }
  }

  async removeFromFavorites(
    product: FavoriteItem
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await deleteApiUsersMeFavourites({
        body: {
          productId: product.id,
        },
      });

      if (response.error) {
        return {
          success: false,
          error:
            response.error.error?.message ||
            "Failed to remove item from favorites",
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove item from favorites",
      };
    }
  }

  async getFavorites(): Promise<FavoriteItem[]> {
    const response = await getApiUsersMeFavourites({
      query: {
        storeId: defaultParams.storeId,
        languageId: defaultParams.languageId,
        page: 1,
        limit: 10, // Get all favorites
      },
    });

    if (response.error) {
      throw new Error("Failed to fetch favorites");
    }

    // Transform the API response to match our FavoriteItem interface
    return response.data.data.favourites.map((item) => ({
      ...item.product,
    }));
  }
}

// Export a singleton instance
let favoritesManagerInstance: FavoritesManager | null = null;
let lastAuthStatus: boolean | undefined = undefined;

export function getFavoritesManager(
  isAuthenticated?: boolean
): FavoritesManager {
  // Check if authentication status has changed
  if (lastAuthStatus !== isAuthenticated) {
    favoritesManagerInstance = null;
    lastAuthStatus = isAuthenticated;
  }

  // Create new instance if needed
  if (!favoritesManagerInstance) {
    favoritesManagerInstance = isAuthenticated
      ? new ServerFavoritesManager()
      : new ClientFavoritesManager();
  }

  return favoritesManagerInstance;
}

export function useFavoritesManager(isAuthenticated?: boolean) {
  const queryClient = useQueryClient();

  const favoritesQuery = useQuery({
    queryKey: ["favorites", isAuthenticated],
    queryFn: async () => {
      const favoritesManager = getFavoritesManager(isAuthenticated);
      const favorites = await favoritesManager.getFavorites();
      return {
        items: favorites,
        totalFavorites: favorites.length,
      };
    },
  });

  const addToFavoritesMutation = useMutation({
    mutationFn: async (product: FavoriteItem) => {
      const favoritesManager = getFavoritesManager(isAuthenticated);
      const result = await favoritesManager.addToFavorites(product);
      return result;
    },
    onSuccess: (_, product) => {
      const productName =
        getLocalizedTranslation(product.translations)?.name ||
        product.translations[0]?.name ||
        "";
      toast.success(
        i18n.t("messages.addedToWishlistWithName", {
          product: capitalizeWords(productName),
        })
      );
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast.error("Error adding to favorites");
    },
  });

  const removeFromFavoritesMutation = useMutation({
    mutationFn: async (product: FavoriteItem) => {
      const favoritesManager = getFavoritesManager(isAuthenticated);
      const result = await favoritesManager.removeFromFavorites(product);
      return result;
    },
    onSuccess: (_, product) => {
      const productName =
        getLocalizedTranslation(product.translations)?.name ||
        product.translations[0]?.name ||
        "";
      toast.success(
        i18n.t("messages.removedFromWishlistWithName", {
          product: capitalizeWords(productName),
        })
      );
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast.error("Error removing from favorites");
    },
  });

  const toggleFavoritesMutation = useMutation({
    mutationFn: async (product: FavoriteItem & { isFavorite: boolean }) => {
      const favoritesManager = getFavoritesManager(isAuthenticated);
      if (product.isFavorite) {
        return await favoritesManager.removeFromFavorites(product);
      } else {
        return await favoritesManager.addToFavorites(product);
      }
    },
    onSuccess: (_, product) => {
      const productName =
        getLocalizedTranslation(product.translations)?.name ||
        product.translations[0]?.name ||
        "";
      if (!product.isFavorite) {
        toast.success(
          i18n.t("messages.addedToWishlistWithName", {
            product: capitalizeWords(productName),
          })
        );
      } else {
        toast.success(
          i18n.t("messages.removedFromWishlistWithName", {
            product: capitalizeWords(productName),
          })
        );
      }
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (error) => {
      toast.error("Error updating favorites");
    },
  });

  return {
    addToFavoritesMutation,
    removeFromFavoritesMutation,
    toggleFavoritesMutation,
    favoritesQuery,
  };
}
