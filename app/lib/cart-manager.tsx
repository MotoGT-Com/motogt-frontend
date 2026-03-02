/**
 * Cart Manager - Unified cart logic for authenticated and unauthenticated users
 *
 * Usage Example:
 *
 * // In a React component
 * const cartManager = getCartManager(isAuthenticated);
 *
 * // Add item to cart
 * const result = await cartManager.addToCart("product-123", 2);
 * if (result.success) {
 * } else {
 * }
 *
 * // Get cart items
 * const items = await cartManager.getCartItems();
 *
 * // Update quantity
 * await cartManager.updateQuantity("product-123", 3);
 *
 * // Remove item
 * await cartManager.removeFromCart("product-123");
 *
 * // Clear entire cart
 * await cartManager.clearCart();
 *
 * // Sync client cart to server when user logs in
 * if (userJustLoggedIn) {
 *   cartManager.setAuthenticationStatus(true);
 *   await cartManager.syncClientCartToServer();
 * }
 */

import { postApiStoresByStoreIdCartItems, getApiStoresByStoreIdCart, putApiStoresByStoreIdCartItemsByProductId, deleteApiStoresByStoreIdCartItemsByProductId, deleteApiStoresByStoreIdCart, } from "./client";
import { defaultParams } from "./api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { capitalizeWords } from "./utils";
import getLocalizedTranslation from "./get-locale-translation";
import i18n from "./i18n";

// Zod schemas for cart validation
const ProductTranslationSchema = z.object({
  name: z.string(),
  slug: z.string().optional(),
  languageId: z.string().optional(),
  languageCode: z.string(),
});

const ProductItemSchema = z.object({
  productId: z.string(),
  itemCode: z.string().optional(),
  productTranslations: z.array(ProductTranslationSchema),
  productImage: z.string(),
  unitPrice: z.number(),
  variantId: z.string().optional(),
});

const CartItemSchema = ProductItemSchema.extend({
  quantity: z.number().int(),
});

const CartSchema = z.array(CartItemSchema);

type ProductItem = z.infer<typeof ProductItemSchema>;
type CartItem = z.infer<typeof CartItemSchema>;

export interface CartManager {
  addToCart: (
    product: ProductItem,
    quantity?: number
  ) => Promise<{ success: boolean; error?: string }>;
  removeFromCart: (
    productId: string
  ) => Promise<{ success: boolean; error?: string }>;
  updateQuantity: (
    productId: string,
    quantity: number
  ) => Promise<{ success: boolean; error?: string }>;
  getCartItems: () => Promise<CartItem[]>;
  clearCart: () => Promise<{ success: boolean; error?: string }>;
  getItemQuantity: (productId: string) => number;
  getTotalItems: () => number;
}

class ClientCartManager implements CartManager {
  private readonly CART_KEY = "cart";

  private getClientCart(): CartItem[] {
    // Guard against SSR — localStorage is not available on the server
    if (typeof window === "undefined") return [];

    try {
      const rawCart = localStorage.getItem(this.CART_KEY);
      if (!rawCart) {
        return [];
      }

      const parsedCart = JSON.parse(rawCart);

      // Validate the cart data using Zod schema
      const validationResult = CartSchema.safeParse(parsedCart);

      if (validationResult.success) {
        return validationResult.data;
      } else {
        // Cart data is invalid, clear it and return empty cart
        localStorage.removeItem(this.CART_KEY);
        return [];
      }
    } catch (error) {
      // JSON parsing failed or other error, clear cart
      try {
        localStorage.removeItem(this.CART_KEY);
      } catch {
        // Ignore — may still be in SSR context
      }
      return [];
    }
  }

  private setClientCart(cart: CartItem[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.CART_KEY, JSON.stringify(cart));
  }

  async addToCart(
    product: ProductItem,
    quantity: number = 1
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const cart = this.getClientCart();
      await new Promise((resolve) => setTimeout(resolve, 500));
      // Check for existing item with same productId and variantId
      const existingIndex = cart.findIndex(
        (item) =>
          item.productId === product.productId &&
          item.variantId === product.variantId
      );
      if (existingIndex !== -1) {
        cart[existingIndex].quantity += quantity;
      } else {
        cart.push({ ...product, quantity });
      }
      this.setClientCart(cart);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to add item to cart" };
    }
  }

  async removeFromCart(
    productId: string,
    variantId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const cart = this.getClientCart();
      this.setClientCart(
        cart.filter(
          (item) =>
            !(
              item.productId === productId &&
              (variantId ? item.variantId === variantId : true)
            )
        )
      );
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to remove item from cart" };
    }
  }

  async updateQuantity(
    productId: string,
    quantity: number,
    variantId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const cart = this.getClientCart();
      if (quantity <= 0) {
        this.setClientCart(
          cart.filter(
            (item) =>
              !(
                item.productId === productId &&
                (variantId ? item.variantId === variantId : true)
              )
          )
        );
      } else {
        const item = cart.find(
          (item) =>
            item.productId === productId &&
            (variantId ? item.variantId === variantId : true)
        );
        if (item) {
          item.quantity = quantity;
        }
        this.setClientCart(cart);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to update item quantity" };
    }
  }

  async getCartItems(): Promise<CartItem[]> {
    return this.getClientCart();
  }

  async clearCart(): Promise<{ success: boolean; error?: string }> {
    if (typeof window === "undefined") return { success: true };
    try {
      localStorage.removeItem(this.CART_KEY);
      return { success: true };
    } catch (error) {
      return { success: false, error: "Failed to clear cart" };
    }
  }

  getItemQuantity(productId: string, variantId?: string): number {
    const cart = this.getClientCart();
    return (
      cart.find(
        (item) =>
          item.productId === productId &&
          (variantId ? item.variantId === variantId : true)
      )?.quantity || 0
    );
  }

  getTotalItems(): number {
    const cart = this.getClientCart();
    return cart.reduce((total, item) => total + item.quantity, 0);
  }
}

class ServerCartManager implements CartManager {
  async addToCart(
    product: ProductItem,
    quantity: number = 1
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await postApiStoresByStoreIdCartItems({
        path: { storeId: defaultParams.storeId },
        body: {
          productId: product.productId,
          quantity,
          variantId: product.variantId,
        },
      });

      if (response.error) {
        return {
          success: false,
          error: response.error.error?.message || "Failed to add item to cart",
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to add item to cart",
      };
    }
  }

  async removeFromCart(
    productId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await deleteApiStoresByStoreIdCartItemsByProductId({
        path: {
          storeId: defaultParams.storeId,
          productId: productId,
        },
      });

      if (response.error) {
        return {
          success: false,
          error:
            response.error.error?.message || "Failed to remove item from cart",
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove item from cart",
      };
    }
  }

  async updateQuantity(
    productId: string,
    quantity: number
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (quantity <= 0) {
        return this.removeFromCart(productId);
      }

      const response = await putApiStoresByStoreIdCartItemsByProductId({
        path: {
          storeId: defaultParams.storeId,
          productId: productId,
        },
        body: {
          quantity,
        },
      });

      if (response.error) {
        return {
          success: false,
          error:
            response.error.error?.message || "Failed to update item quantity",
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update item quantity",
      };
    }
  }

  async getCartItems(): Promise<CartItem[]> {
    const response = await getApiStoresByStoreIdCart({
      path: { storeId: defaultParams.storeId },
    });

    if (response.error) {
      throw new Error("Failed to fetch cart items");
    }

    // Transform the API response to match our CartItem interface
    return response.data.data.items.map((item) => ({
      productId: item.productId,
      itemCode: item.product.itemCode,
      productImage: item.product.mainImage || "",
      productTranslations: item.product.translations,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
    }));
  }

  async clearCart(): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await deleteApiStoresByStoreIdCart({
        path: { storeId: defaultParams.storeId },
      });

      if (response.error) {
        return {
          success: false,
          error: response.error.error?.message || "Failed to clear cart",
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to clear cart",
      };
    }
  }

  getItemQuantity(productId: string): number {
    // Note: This is synchronous but server cart is async
    // You might want to maintain a local cache or make this async
    return 0;
  }

  getTotalItems(): number {
    // Note: This is synchronous but server cart is async
    // You might want to maintain a local cache or make this async
    return 0;
  }
}

class HybridCartManager implements CartManager {
  private clientManager = new ClientCartManager();
  private serverManager = new ServerCartManager();
  private isAuthenticated: boolean;

  constructor(isAuthenticated: boolean = false) {
    this.isAuthenticated = isAuthenticated;
  }

  setAuthenticationStatus(isAuthenticated: boolean): void {
    this.isAuthenticated = isAuthenticated;
  }

  private getActiveManager(): CartManager {
    return this.isAuthenticated ? this.serverManager : this.clientManager;
  }

  async addToCart(
    product: ProductItem,
    quantity: number = 1
  ): Promise<{ success: boolean; error?: string }> {
    if (this.isAuthenticated) {
      // Try server first, fallback to client on auth error
      const result = await this.serverManager.addToCart(product, quantity);
      if (!result.success && result.error?.includes("401")) {
        // Authentication failed, fallback to client cart
        this.isAuthenticated = false;
        return this.clientManager.addToCart(product, quantity);
      }
      return result;
    } else {
      return this.clientManager.addToCart(product, quantity);
    }
  }

  async removeFromCart(
    productId: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.getActiveManager().removeFromCart(productId);
  }

  async updateQuantity(
    productId: string,
    quantity: number
  ): Promise<{ success: boolean; error?: string }> {
    return this.getActiveManager().updateQuantity(productId, quantity);
  }

  async getCartItems(): Promise<CartItem[]> {
    return this.getActiveManager().getCartItems();
  }

  async clearCart(): Promise<{ success: boolean; error?: string }> {
    return this.getActiveManager().clearCart();
  }

  getItemQuantity(productId: string): number {
    return this.getActiveManager().getItemQuantity(productId);
  }

  getTotalItems(): number {
    return this.getActiveManager().getTotalItems();
  }

  // Migration method to sync client cart to server when user logs in
  async syncClientCartToServer(): Promise<{
    success: boolean;
    error?: string;
  }> {
    if (!this.isAuthenticated) {
      return { success: false, error: "User not authenticated" };
    }

    try {
      const clientItems = await this.clientManager.getCartItems();

      for (const item of clientItems) {
        const result = await this.serverManager.addToCart(item, item.quantity);
        if (!result.success) {
        }
      }

      // Clear client cart after successful sync
      await this.clientManager.clearCart();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync cart",
      };
    }
  }
}

// Export a singleton instance
let cartManagerInstance: HybridCartManager | null = null;

export function getCartManager(isAuthenticated?: boolean): HybridCartManager {
  if (!cartManagerInstance) {
    cartManagerInstance = new HybridCartManager(isAuthenticated);
  } else if (isAuthenticated !== undefined) {
    cartManagerInstance.setAuthenticationStatus(isAuthenticated);
  }

  return cartManagerInstance;
}

export function useCartManager(isAuthenticated?: boolean) {
  const queryClient = useQueryClient();
  const cartQuery = useQuery({
    queryKey: ["cart", isAuthenticated],
    queryFn: async () => {
      const cartManager = getCartManager(isAuthenticated);
      const cartItems = await cartManager.getCartItems();
      return {
        items: cartItems,
        totalItems: cartItems.reduce((acc, item) => acc + item.quantity, 0),
      };
    },
  });
  const addToCartMutation = useMutation({
    mutationFn: async (product: CartItem) => {
      const cartManager = getCartManager(isAuthenticated);
      const result = await cartManager.addToCart(product, product.quantity);
      return result;
    },
    onSuccess: (_, product) => {
      const productName =
        getLocalizedTranslation(product.productTranslations)?.name ||
        product.productTranslations[0]?.name ||
        "Item";
      toast.success(
        i18n.t("messages.addedToCartWithName", {
          product: capitalizeWords(productName),
        })
      );
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error) => {
      toast.error("Error adding to cart");
    },
  });
  const removeFromCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      const cartManager = getCartManager(isAuthenticated);
      const result = await cartManager.removeFromCart(productId);
      if (!result.success) {
        throw new Error(result.error || "Failed to remove item from cart");
      }
      return result;
    },
    onSuccess: () => {
      toast.success(i18n.t("messages.itemRemovedFromCart"));
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Error removing from cart");
    },
  });
  const updateQuantityMutation = useMutation({
    mutationFn: async ({
      productId,
      quantity,
    }: {
      productId: string;
      quantity: number;
    }) => {
      const cartManager = getCartManager(isAuthenticated);
      const result = await cartManager.updateQuantity(productId, quantity);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
    },
    onError: (error) => {
      toast.error("Error updating quantity");
    },
  });
  return {
    addToCartMutation,
    removeFromCartMutation,
    updateQuantityMutation,
    cartQuery,
  };
}
