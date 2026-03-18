/**
 * Payment Callback Route
 *
 * User lands here after completing payment on MEPS/PayTabs page
 *
 * Flow:
 * 1. Load payment context from localStorage (loader)
 * 2. Poll payment status API until terminal state
 * 3. Display success/failure/timeout UI
 * 4. Handle cart restoration on failure
 * 5. Invalidate cache on success
 */

import { useEffect, useState } from "react";
import { Link, useNavigate, redirect, } from "react-router";
import type { Route } from "./+types/_main.payment.callback";
import { loadPaymentContext, clearPaymentContext, clearPendingPayment, pollPaymentStatus, restoreCartFromBackup, clearCartBackup, type PaymentStatusResult, loadGuestPaymentInfo, clearGuestPaymentInfo, } from "~/lib/payment-utils";
import { getApiPaymentsStatusByOrderId } from "~/lib/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, } from "~/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { CheckCircle2, XCircle, Clock, CreditCard, Package, AlertCircle, } from "lucide-react";
import { usePayment } from "~/lib/use-payment";
import { useTranslation } from "react-i18next";

// No auth middleware required — guests also land here after card payment.

/**
 * Action - handle POST requests from MEPS payment gateway
 * MEPS sends payment status via POST with form data
 */
export async function action({ request }: Route.ActionArgs) {
  // Parse form data from MEPS
  const formData = await request.formData();
  const respCode = formData.get("respCode");
  const respMessage = formData.get("respMessage");
  const respStatus = formData.get("respStatus");


  // Redirect to GET route so user sees the UI
  // The component will handle polling payment status
  return redirect("/payment/callback");
}

/**
 * Loader - validate payment context exists
 */
export async function loader({ context }: Route.LoaderArgs) {
  // Authentication is handled by route middleware
  // Payment context is loaded client-side (localStorage)
  return null;
}

/**
 * Payment Callback Component
 */
export default function PaymentCallback() {
  const { t } = useTranslation('payment');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { initiatePayment } = usePayment();

  const [status, setStatus] = useState<
    "loading" | "success" | "failed" | "timeout" | "cancelled"
  >("loading");
  const [paymentData, setPaymentData] = useState<
    PaymentStatusResult["data"] | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pollingProgress, setPollingProgress] = useState({
    current: 0,
    max: 10,
  });
  const [guestInfo, setGuestInfo] = useState<{ email: string; orderNumber: string } | null>(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Check if this is a guest payment
        const guest = loadGuestPaymentInfo();
        if (guest) {
          setGuestInfo(guest);
        }

        // Load payment context from localStorage
        const context = loadPaymentContext();

        if (!context) {
          // No payment context - user likely cancelled at payment gateway
          setStatus("cancelled");
          setErrorMessage(t('callback.cancelled.description'));
          return;
        }

        // Poll payment status
        const result = await pollPaymentStatus(
          context.orderId,
          async (orderId) => {
            try {
              const response = await getApiPaymentsStatusByOrderId({
                path: { orderId },
              });

              // The payment status API returns: { data: { success, message, data: {...} } }
              if (response.data?.success && response.data?.data) {
                return { success: true, data: response.data.data };
              }

              // Check if there's an error in the response
              if (response.error) {
                const errorMsg =
                  typeof response.error === "object" && response.error !== null
                    ? JSON.stringify(response.error)
                    : String((response as any).error);
                throw new Error(`Payment status API error: ${errorMsg}`);
              }

              throw new Error("Failed to fetch payment status");
            } catch (error) {
              throw error;
            }
          },
          (current, max) => {
            setPollingProgress({ current, max });
          }
        );

        // Update state based on result
        setPaymentData(result.data || null);

        if (result.status === "captured") {
          setStatus("success");

          // Clear all payment-related storage
          clearPaymentContext();
          clearPendingPayment();
          clearCartBackup();
          clearGuestPaymentInfo();

          // Invalidate cache to refresh orders and cart
          await queryClient.invalidateQueries({ queryKey: ["orders"] });
          await queryClient.invalidateQueries({ queryKey: ["cart"] });
        } else if (result.status === "failed") {
          setStatus("failed");
          setErrorMessage(result.error || t('callback.failed.description'));

          // Clear payment context and pending flag
          clearPaymentContext();
          clearPendingPayment();
        } else if (result.status === "timeout") {
          setStatus("timeout");
          setErrorMessage(result.error || t('callback.timeout.description'));

          // Keep payment context and pending flag for later verification
        }
      } catch (error) {
        setStatus("failed");
        setErrorMessage(
          error instanceof Error ? error.message : t('callback.failed.description')
        );

        // Clear payment context to prevent retry loops
        clearPaymentContext();
      }
    };

    verifyPayment();
  }, [navigate, queryClient, t]);

  // Loading state
  if (status === "loading") {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Clock className="h-6 w-6 animate-spin text-blue-600" />
            </div>
            <CardTitle>{t('callback.loading.title')}</CardTitle>
            <CardDescription>
              {t('callback.loading.description')}
              <br />
              <span className="text-xs text-muted-foreground">
                {t('callback.loading.checking', { current: pollingProgress.current, max: pollingProgress.max })}
              </span>
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Success state
  if (status === "success" && paymentData) {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle>{t('callback.success.title')}</CardTitle>
            <CardDescription>
              {t('callback.success.description')}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert>
              <Package className="h-4 w-4" />
              <AlertTitle>{t('callback.success.orderConfirmed')}</AlertTitle>
              <AlertDescription>
                {t('callback.success.orderPlaced', { orderId: paymentData.orderId })}
              </AlertDescription>
            </Alert>

            <div className="space-y-2 rounded-lg bg-muted p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('callback.success.amountPaid')}</span>
                <span className="font-medium">
                  {paymentData.amount} {paymentData.currency}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t('callback.success.transactionRef')}</span>
                <span className="font-mono text-xs">
                  {paymentData.transactionRef}
                </span>
              </div>

              {paymentData.cardInfo && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('callback.success.card')}</span>
                  <span className="font-medium">
                    {paymentData.cardInfo.brand} ••••{" "}
                    {paymentData.cardInfo.last4}
                  </span>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button asChild className="flex-1">
              <Link to={guestInfo
                ? `/guest-order-confirmation?orderNumber=${encodeURIComponent(guestInfo.orderNumber)}&email=${encodeURIComponent(guestInfo.email)}`
                : "/profile/orders"
              }>{guestInfo ? t('callback.buttons.viewOrder') : t('callback.buttons.viewOrders')}</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/">{t('callback.buttons.continueShopping')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Failed state
  if (status === "failed") {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>{t('callback.failed.title')}</CardTitle>
            <CardDescription>
              {errorMessage || t('callback.failed.description')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Alert variant="destructive">
              <CreditCard className="h-4 w-4" />
              <AlertTitle>{t('callback.failed.whatHappened')}</AlertTitle>
              <AlertDescription>
                {t('callback.failed.retryMessage')}
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link to={guestInfo ? "/track-order" : "/profile/orders"}>{t('callback.buttons.retryPayment')}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">{t('callback.buttons.continueShopping')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Cancelled state - user cancelled at payment gateway
  if (status === "cancelled") {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100">
              <AlertCircle className="h-6 w-6 text-orange-600" />
            </div>
            <CardTitle>{t('callback.cancelled.title')}</CardTitle>
            <CardDescription>
              {errorMessage || t('callback.cancelled.description')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('callback.cancelled.whatHappened')}</AlertTitle>
              <AlertDescription>
                {t('callback.cancelled.retryMessage')}
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            <Button asChild className="w-full">
              <Link to={guestInfo ? "/track-order" : "/profile/orders"}>{t('callback.buttons.retryPayment')}</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link to="/">{t('callback.buttons.continueShopping')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Timeout state
  if (status === "timeout") {
    return (
      <div className="container max-w-2xl py-12">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <CardTitle>{t('callback.timeout.title')}</CardTitle>
            <CardDescription>
              {t('callback.timeout.description')}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <Alert>
              <AlertTitle>{t('callback.timeout.whatToDo')}</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>
                  {t('callback.timeout.processing')}
                </p>
                <p>
                  {t('callback.timeout.checkLater')}
                </p>
              </AlertDescription>
            </Alert>
          </CardContent>

          <CardFooter className="flex gap-2">
            <Button asChild className="flex-1">
              <Link to={guestInfo ? "/track-order" : "/profile/orders"}>{t('callback.buttons.viewOrders')}</Link>
            </Button>
            <Button asChild variant="outline" className="flex-1">
              <Link to="/">{t('callback.buttons.goHome')}</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return null;
}
