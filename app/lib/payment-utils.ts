/**
 * Payment Utilities - MEPS/PayTabs Payment Integration
 * 
 * Handles:
 * - Payment context persistence across MEPS redirects
 * - Cart backup/restore for payment failure recovery
 * - Payment status polling with exponential backoff
 * - LocalStorage management with TTL validation
 */

import type { GetApiPaymentsStatusByOrderIdResponse } from "./client/types.gen";

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * LocalStorage key for payment context (orderId, paymentId, etc.)
 * TTL: 30 minutes
 */
export const PAYMENT_CONTEXT_KEY = "motogt_payment_context";

/**
 * LocalStorage key for cart backup before payment
 * TTL: 24 hours
 */
export const CART_BACKUP_KEY = "motogt_cart_backup";

/**
 * LocalStorage key for pending payment flag
 * Used to show banner on checkout page and orders page
 */
export const PENDING_PAYMENT_KEY = "motogt_pending_payment";

/**
 * SessionStorage key for dismissed pending payment banners
 * Only hides banner for current session, not permanently
 */
export const DISMISSED_PENDING_PAYMENT_KEY = "motogt_dismissed_pending_payment";

/**
 * LocalStorage key for guest payment info (email etc.)
 * Tells the payment callback to redirect to the guest confirmation page.
 */
export const GUEST_PAYMENT_INFO_KEY = "motogt_guest_payment_info";

/**
 * Payment context expiry duration: 30 minutes (in milliseconds)
 */
export const PAYMENT_CONTEXT_TTL = 30 * 60 * 1000;

/**
 * Cart backup expiry duration: 24 hours (in milliseconds)
 */
export const CART_BACKUP_TTL = 24 * 60 * 60 * 1000;

/**
 * Payment status polling interval: 2 seconds (in milliseconds)
 */
export const POLLING_INTERVAL = 2000;

/**
 * Maximum polling attempts before timeout
 */
export const MAX_POLLING_ATTEMPTS = 10;

/**
 * Network retry configuration
 */
export const NETWORK_RETRY_CONFIG = {
  maxAttempts: 3,
  delays: [1000, 2000, 4000], // Exponential backoff: 1s, 2s, 4s
};

// ============================================================================
// TYPESCRIPT INTERFACES
// ============================================================================

/**
 * Payment context stored in localStorage before MEPS redirect
 */
export interface PaymentContext {
  orderId: string;
  paymentId: string;
  orderNumber: string;
  transactionRef: string;
  /**
   * Timestamp when context was saved (for TTL validation)
   */
  timestamp: number;
  /** True when the payment was initiated by a guest (no auth token) */
  isGuest?: boolean;
  /** Guest email – used to redirect to guest order confirmation */
  guestEmail?: string;
}

/**
 * Cart backup stored before checkout (for payment failure recovery)
 */
export interface CartBackup {
  /**
   * Serialized cart items (from cart API response)
   */
  items: unknown[];
  /**
   * Timestamp when backup was created (for TTL validation)
   */
  timestamp: number;
  /**
   * Order ID associated with this backup (for reference)
   */
  orderId?: string;
}

/**
 * Result from payment status polling
 */
export interface PaymentStatusResult {
  success: boolean;
  status: "captured" | "failed" | "timeout" | "processing";
  /**
   * Full payment status response (if available)
   */
  data?: GetApiPaymentsStatusByOrderIdResponse["data"];
  /**
   * Error message (for failures)
   */
  error?: string;
}

/**
 * Pending payment info stored in localStorage
 */
export interface PendingPaymentInfo {
  orderId: string;
  orderNumber: string;
  timestamp: number;
}

// ============================================================================
// LOCALSTORAGE HELPERS
// ============================================================================

/**
 * Save payment context to localStorage with timestamp
 * Non-blocking: Returns success/failure boolean but doesn't throw
 * Payment flow should continue even if localStorage fails
 */
export function savePaymentContext(context: Omit<PaymentContext, "timestamp">): boolean {
  try {
    const contextWithTimestamp: PaymentContext = {
      ...context,
      timestamp: Date.now(),
    };
    localStorage.setItem(PAYMENT_CONTEXT_KEY, JSON.stringify(contextWithTimestamp));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Load payment context from localStorage with expiry validation
 * Returns null if expired or corrupted
 */
export function loadPaymentContext(): PaymentContext | null {
  try {
    const raw = localStorage.getItem(PAYMENT_CONTEXT_KEY);
    if (!raw) {
      return null;
    }

    const context = JSON.parse(raw) as PaymentContext;

    // Validate required fields
    if (!context.orderId || !context.paymentId || !context.orderNumber || !context.transactionRef || !context.timestamp) {
      clearPaymentContext();
      return null;
    }

    // Check expiry (30 minutes)
    const age = Date.now() - context.timestamp;
    if (age > PAYMENT_CONTEXT_TTL) {
      clearPaymentContext();
      return null;
    }

    return context;
  } catch (error) {
    clearPaymentContext();
    return null;
  }
}

/**
 * Clear payment context from localStorage
 */
export function clearPaymentContext(): void {
  try {
    localStorage.removeItem(PAYMENT_CONTEXT_KEY);
  } catch (error) {
  }
}

/**
 * Save guest payment info so the callback can redirect to guest confirmation.
 */
export function saveGuestPaymentInfo(email: string, orderNumber: string): void {
  try {
    localStorage.setItem(
      GUEST_PAYMENT_INFO_KEY,
      JSON.stringify({ email, orderNumber })
    );
  } catch {
    // non-blocking
  }
}

/**
 * Load guest payment info from localStorage.
 */
export function loadGuestPaymentInfo(): { email: string; orderNumber: string } | null {
  try {
    const raw = localStorage.getItem(GUEST_PAYMENT_INFO_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.email && parsed?.orderNumber) return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Clear guest payment info from localStorage.
 */
export function clearGuestPaymentInfo(): void {
  try {
    localStorage.removeItem(GUEST_PAYMENT_INFO_KEY);
  } catch {
    // non-blocking
  }
}

/**
 * Save cart backup to localStorage with timestamp
 * Non-blocking: Returns success/failure boolean but doesn't throw
 * Backup is for convenience; cart recovery can happen via API if needed
 */
export function saveCartBackup(items: unknown[], orderId?: string): boolean {
  try {
    const backup: CartBackup = {
      items,
      timestamp: Date.now(),
      orderId,
    };
    localStorage.setItem(CART_BACKUP_KEY, JSON.stringify(backup));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Load cart backup from localStorage with expiry validation
 * Returns null if expired or corrupted
 */
export function loadCartBackup(): CartBackup | null {
  try {
    const raw = localStorage.getItem(CART_BACKUP_KEY);
    if (!raw) {
      return null;
    }

    const backup = JSON.parse(raw) as CartBackup;

    // Validate required fields
    if (!Array.isArray(backup.items) || !backup.timestamp) {
      clearCartBackup();
      return null;
    }

    // Check expiry (24 hours)
    const age = Date.now() - backup.timestamp;
    if (age > CART_BACKUP_TTL) {
      clearCartBackup();
      return null;
    }

    return backup;
  } catch (error) {
    clearCartBackup();
    return null;
  }
}

/**
 * Clear cart backup from localStorage
 */
export function clearCartBackup(): void {
  try {
    localStorage.removeItem(CART_BACKUP_KEY);
  } catch (error) {
  }
}

/**
 * Save pending payment info to localStorage
 * Non-blocking: Used only for UI banner, not critical for payment flow
 */
export function savePendingPayment(orderId: string, orderNumber: string): boolean {
  try {
    const info: PendingPaymentInfo = {
      orderId,
      orderNumber,
      timestamp: Date.now(),
    };
    localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(info));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Load pending payment info from localStorage
 */
export function loadPendingPayment(): PendingPaymentInfo | null {
  try {
    const raw = localStorage.getItem(PENDING_PAYMENT_KEY);
    if (!raw) {
      return null;
    }

    const info = JSON.parse(raw) as PendingPaymentInfo;

    // Validate required fields
    if (!info.orderId || !info.orderNumber || !info.timestamp) {
      clearPendingPayment();
      return null;
    }

    return info;
  } catch (error) {
    clearPendingPayment();
    return null;
  }
}

/**
 * Clear pending payment info from localStorage
 */
export function clearPendingPayment(): void {
  try {
    localStorage.removeItem(PENDING_PAYMENT_KEY);
    sessionStorage.removeItem(DISMISSED_PENDING_PAYMENT_KEY);
  } catch (error) {
  }
}

/**
 * Dismiss pending payment banner for current session only
 * Banner will reappear on next page load/session
 */
export function dismissPendingPaymentBanner(orderId: string): void {
  try {
    sessionStorage.setItem(DISMISSED_PENDING_PAYMENT_KEY, orderId);
  } catch (error) {
  }
}

/**
 * Check if pending payment banner was dismissed in current session
 */
export function isPendingPaymentBannerDismissed(orderId: string): boolean {
  try {
    const dismissedId = sessionStorage.getItem(DISMISSED_PENDING_PAYMENT_KEY);
    return dismissedId === orderId;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// CART BACKUP/RESTORE FUNCTIONS
// ============================================================================

/**
 * Backup current cart before checkout
 * Call this BEFORE creating the order to prevent data loss
 * Non-blocking: Logs warning if backup fails but doesn't prevent checkout
 * 
 * @param cartItems - Current cart items from cart API
 * @param orderId - Optional order ID for reference
 */
export function backupCart(cartItems: unknown[], orderId?: string): boolean {
  if (!cartItems || cartItems.length === 0) {
    return false;
  }

  const success = saveCartBackup(cartItems, orderId);
  if (success) {
  }
  return success;
}

/**
 * Restore cart from backup
 * Returns backup data or null if no valid backup exists
 * Does NOT automatically add items to cart - caller must handle restoration
 * 
 * @returns CartBackup or null
 */
export function restoreCartFromBackup(): CartBackup | null {
  const backup = loadCartBackup();
  
  if (!backup) {
    return null;
  }

  return backup;
}

// ============================================================================
// PAYMENT STATUS POLLING
// ============================================================================

/**
 * Poll payment status with exponential backoff retry on network errors
 * 
 * @param orderId - Order ID to check status for
 * @param statusFetcher - Function to fetch payment status (from API client)
 * @param onProgress - Optional callback for progress updates
 * @returns PaymentStatusResult
 */
export async function pollPaymentStatus(
  orderId: string,
  statusFetcher: (orderId: string) => Promise<GetApiPaymentsStatusByOrderIdResponse>,
  onProgress?: (attempt: number, maxAttempts: number) => void
): Promise<PaymentStatusResult> {
  let attempt = 0;

  while (attempt < MAX_POLLING_ATTEMPTS) {
    attempt++;
    
    if (onProgress) {
      onProgress(attempt, MAX_POLLING_ATTEMPTS);
    }

    try {
      // Attempt to fetch status with retry on network errors
      const response = await retryWithBackoff(
        () => statusFetcher(orderId),
        NETWORK_RETRY_CONFIG.maxAttempts,
        NETWORK_RETRY_CONFIG.delays
      );

      if (!response.success || !response.data) {
        
        // If this was the last attempt, return timeout
        if (attempt >= MAX_POLLING_ATTEMPTS) {
          return {
            success: false,
            status: "timeout",
            error: "Payment status check timed out",
          };
        }
        
        // Otherwise continue polling
        await sleep(POLLING_INTERVAL);
        continue;
      }

      const { status } = response.data;

      // Terminal states - stop polling
      if (status === "captured") {
        return {
          success: true,
          status: "captured",
          data: response.data,
        };
      }

      if (status === "failed" || status === "refunded") {
        return {
          success: false,
          status: "failed",
          data: response.data,
          error: `Payment ${status}`,
        };
      }

      // Non-terminal states (initiated, processing) - continue polling
      if (attempt >= MAX_POLLING_ATTEMPTS) {
        return {
          success: false,
          status: "timeout",
          data: response.data,
          error: "Payment verification timed out. Please check your orders page.",
        };
      }

      // Wait before next poll
      await sleep(POLLING_INTERVAL);

    } catch (error) {
      
      // Check if error is retryable (e.g., network error, 5xx)
      // Non-retryable errors (4xx client errors) should fail immediately
      if (!isRetryableError(error)) {
        return {
          success: false,
          status: "failed",
          error: error instanceof Error ? error.message : "Payment status check failed",
        };
      }
      
      // If this was the last attempt, return timeout
      if (attempt >= MAX_POLLING_ATTEMPTS) {
        return {
          success: false,
          status: "timeout",
          error: error instanceof Error ? error.message : "Payment status check failed",
        };
      }

      // Otherwise continue polling for transient errors
      await sleep(POLLING_INTERVAL);
    }
  }

  // Should never reach here, but just in case
  return {
    success: false,
    status: "timeout",
    error: "Payment verification timed out",
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if an error is retryable (transient) or permanent
 * Permanent errors (4xx client errors) should fail immediately
 * Transient errors (network, 5xx) can be retried
 */
function isRetryableError(error: unknown): boolean {
  if (!error) return false;
  
  // Check for HTTP status codes in error object
  if (typeof error === 'object' && error !== null) {
    const errorObj = error as any;
    
    // Check for status code property (common in fetch/axios errors)
    const status = errorObj.status || errorObj.statusCode || errorObj.response?.status;
    
    if (typeof status === 'number') {
      // 4xx client errors are not retryable (except 408 Request Timeout, 429 Too Many Requests)
      if (status >= 400 && status < 500) {
        return status === 408 || status === 429;
      }
      
      // 5xx server errors are retryable
      if (status >= 500) {
        return true;
      }
    }
  }
  
  // Network errors, timeouts, and unknown errors are retryable
  return true;
}

/**
 * Sleep helper for polling delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * Only retries on transient errors (network, 5xx)
 * Fails immediately on permanent errors (4xx client errors)
 * 
 * @param fn - Function to retry
 * @param maxAttempts - Maximum number of attempts
 * @param delays - Array of delay durations (in milliseconds)
 * @returns Promise with function result
 * @throws Error if all retries fail or on non-retryable error
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  delays: number[]
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Check if this is a retryable error
      if (!isRetryableError(error)) {
        throw lastError;
      }
      

      // Don't delay after the last attempt
      if (attempt < maxAttempts - 1 && delays[attempt]) {
        await sleep(delays[attempt]);
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
}
