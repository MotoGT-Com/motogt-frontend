/**
 * usePayment Hook - Payment Initiation Logic
 * 
 * Handles:
 * - Payment initiation via MEPS/PayTabs API
 * - Payment context persistence before redirect
 * - Pending payment flag management
 * - Error handling and loading states
 * - Double-click prevention
 */

import { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getApiPaymentsStatusByOrderId,
  postApiOrdersByOrderIdCancel,
  postApiPaymentsInitiate,
} from "./client";
import {
  clearPendingPayment,
  savePaymentContext,
  savePendingPayment,
} from "./payment-utils";
import { extractErrorMessage } from "./utils";

export interface UsePaymentOptions {
  /**
   * Callback when payment initiation succeeds (before redirect)
   */
  onSuccess?: (paymentId: string, redirectUrl: string) => void;
  /**
   * Callback when payment initiation fails
   */
  onError?: (error: Error) => void;
  /**
   * Callback when an order gets cancelled from payment-related actions
   */
  onOrderCancelled?: (orderId: string) => void;
}

export interface UsePaymentReturn {
  /**
   * Initiate payment and redirect to MEPS
   * @param orderId - The order ID to initiate payment for
   * @param orderNumber - The order number for display purposes
   */
  initiatePayment: (orderId: string, orderNumber: string) => Promise<void>;
  /**
   * Whether payment is currently being initiated
   */
  isInitiating: boolean;
  /**
   * Error from last initiation attempt (if any)
   */
  error: Error | null;
}

/**
 * Custom hook for payment initiation
 * 
 * Usage:
 * ```tsx
 * const { initiatePayment, isInitiating } = usePayment();
 * 
 * // After order creation
 * await initiatePayment(orderId, orderNumber);
 * // User will be redirected to MEPS payment page
 * ```
 */
export function usePayment(options?: UsePaymentOptions): UsePaymentReturn {
  const { t } = useTranslation("profile");
  const [isInitiating, setIsInitiating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Prevent double-click during payment initiation
  const isInitiatingRef = useRef(false);
  const isNonFatalInitiationIssue = (message: string) =>
    /(already|pending|processing|initiated|in progress|exists|duplicate)/i.test(
      message
    );

  const initiatePayment = useCallback(
    async (orderId: string, orderNumber: string) => {
      // Double-click prevention
      if (isInitiatingRef.current) {
        return;
      }

      try {
        isInitiatingRef.current = true;
        setIsInitiating(true);
        setError(null);

        // Call payment initiation API
        const response = await postApiPaymentsInitiate({
          body: { orderId },
        });

        const responseData = response.data;
        const paymentData = responseData?.data;
        const paymentId = paymentData?.paymentId;
        const redirectUrl = paymentData?.redirectUrl;
        const transactionRef = paymentData?.transactionRef;

        if (!paymentId || !redirectUrl || !transactionRef) {
          // If backend surfaced an error, reconcile before deciding this is fatal.
          if (response.error) {
            const message = extractErrorMessage(
              response.error,
              "Unable to start payment right now."
            );

            let paymentStatus: string | undefined;
            try {
              const statusResponse = await getApiPaymentsStatusByOrderId({
                path: { orderId },
              });
              paymentStatus = statusResponse.data?.data?.status;
            } catch {
              // Status endpoint might temporarily fail; continue with graceful fallback below.
            }

            if (paymentStatus === "captured") {
              clearPendingPayment();
              toast.success(t("orders.paymentAlreadyCompletedTitle"), {
                description: t("orders.paymentAlreadyCompletedDescription", {
                  orderNumber,
                }),
              });
              return;
            }

            if (
              paymentStatus === "initiated" ||
              paymentStatus === "processing" ||
              isNonFatalInitiationIssue(message)
            ) {
              savePendingPayment(orderId, orderNumber);
              toast.info(t("orders.paymentAlreadyInProgressTitle"), {
                description: t("orders.paymentAlreadyInProgressDescription"),
                action: {
                  label: t("orders.cancelOrderAction"),
                  onClick: async () => {
                    try {
                      const cancelResponse = await postApiOrdersByOrderIdCancel({
                        path: { orderId },
                        body: {
                          reason: t("orders.cancelReasons.takingTooLong"),
                        },
                      });

                      if (cancelResponse.error && !cancelResponse.data) {
                        throw new Error(
                          extractErrorMessage(
                            cancelResponse.error,
                            "Unable to cancel the order right now."
                          )
                        );
                      }

                      clearPendingPayment();
                      options?.onOrderCancelled?.(orderId);
                      toast.success(t("orders.orderCancelledTitle"), {
                        description: t("orders.orderCancelledDescription", {
                          orderNumber,
                        }),
                      });
                    } catch (cancelError) {
                      toast.error(t("orders.cancellationFailedTitle"), {
                        description:
                          cancelError instanceof Error
                            ? cancelError.message
                            : t("orders.orderCancelError"),
                      });
                    }
                  },
                },
              });
              return;
            }

            throw new Error(message);
          }

          throw new Error(
            "Payment gateway is temporarily unavailable. Please try again."
          );
        }

        // Save payment context to localStorage (before redirect)
        savePaymentContext({
          orderId,
          paymentId,
          orderNumber,
          transactionRef,
        });

        // Save pending payment flag
        savePendingPayment(orderId, orderNumber);

        // Call success callback if provided
        if (options?.onSuccess) {
          options.onSuccess(paymentId, redirectUrl);
        }

        // Show loading toast
        toast.loading(t("orders.redirectingToGateway"), {
          id: "payment-redirect",
        });

        // Redirect to MEPS payment page
        // Use setTimeout to ensure localStorage writes complete
        setTimeout(() => {
          window.location.href = redirectUrl;
        }, 100);

      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        
        setError(error);

        // Show error toast
        toast.error(t("orders.paymentInitiationFailedTitle"), {
          description:
            error.message ||
            t("orders.paymentInitiationFailedDescription"),
        });

        // Call error callback if provided
        if (options?.onError) {
          options.onError(error);
        }

        // Re-throw for caller to handle
        throw error;
      } finally {
        // Reset refs in finally block to handle both success and error cases
        isInitiatingRef.current = false;
        setIsInitiating(false);
      }
    },
    [options, t]
  );

  return {
    initiatePayment,
    isInitiating,
    error,
  };
}
