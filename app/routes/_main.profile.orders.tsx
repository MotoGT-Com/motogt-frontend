import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { getApiCheckoutOrders, getApiPaymentsStatusByOrderId, type GetApiCheckoutOrdersResponse, } from "~/lib/client";
import { defaultParams } from "~/lib/api-client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SimpleCard } from "~/components/ui/card";
import { AlertCircleIcon, CircleSmall, DownloadIcon, MoreVerticalIcon, TruckIcon, CreditCard, XIcon, Ban, RotateCw, Loader2, } from "lucide-react";
import { cn } from "~/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuGroup, DropdownMenuShortcut, DropdownMenuTrigger, } from "~/components/ui/dropdown-menu";
import { Skeleton } from "~/components/ui/skeleton";
import { downloadInvoice } from "~/lib/print-invoice";
import { cancelOrderMutationOptions } from "~/lib/queries";
import { usePayment } from "~/lib/use-payment";
import { loadPendingPayment, dismissPendingPaymentBanner, isPendingPaymentBannerDismissed, clearPendingPayment, } from "~/lib/payment-utils";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from "~/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "~/components/ui/select";
import { CANCEL_REASONS } from "~/lib/constants";
import ReportMissingItemModal from "~/components/orders/ReportMissingItemModal";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useRevalidator, useRouteLoaderData } from "react-router";
import { toast } from "sonner";
import { getApiProductsPublicByProductId, type ProductItem } from "~/lib/client";
import { getCartManager } from "~/lib/cart-manager";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import { useInView } from "react-intersection-observer";
import type { Route } from "./+types/_main.profile.orders";
import { accessTokenCookie } from "~/lib/auth-middleware";

type OrderItem = GetApiCheckoutOrdersResponse["data"]["orders"][number];

type CartProduct = {
  productId: string;
  productTranslations: Array<{
    name: string;
    slug?: string;
    languageId?: string;
    languageCode: string;
  }>;
  productImage: string;
  unitPrice: number;
  variantId?: string;
};

const toCartProduct = (product: ProductItem): CartProduct => ({
  productId: product.id,
  productTranslations: product.translations.map((translation) => ({
    name: translation.name,
    slug: translation.slug,
    languageId: translation.languageId,
    languageCode: translation.languageCode,
  })),
  productImage: product.mainImage || "",
  unitPrice: product.price,
});

export async function loader({ request }: Route.LoaderArgs) {
  const accessToken = await accessTokenCookie.parse(
    request.headers.get("Cookie")
  );
  const headers = accessToken
    ? { Authorization: `Bearer ${accessToken}` }
    : undefined;

  try {
    const ordersResponse = await getApiCheckoutOrders({
      query: {
        page: 1,
        limit: 20,
        storeId: defaultParams.storeId,
      },
      headers,
    });

    if (ordersResponse.error || !ordersResponse.data?.data?.orders) {
      return { orders: [], loadError: true };
    }

    return {
      orders: ordersResponse.data.data.orders,
      loadError: false,
    };
  } catch (error) {
    return { orders: [], loadError: true };
  }
}

function useReorder(isAuthenticated?: boolean) {
  const { t } = useTranslation('profile');
  const navigate = useNavigate();
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  const reorder = useCallback(
    async (order: OrderItem) => {
      if (!order?.items?.length || activeOrderId) return;
      setActiveOrderId(order.id);

      try {
        const cartManager = getCartManager(isAuthenticated);
        const currentCart = await cartManager.getCartItems();
        const cartQuantities = new Map(
          currentCart.map((item) => [item.productId, item.quantity])
        );

        let addedCount = 0;
        let unavailableCount = 0;

        const results = await Promise.allSettled(
          order.items.map(async (item) => {
            const response = await getApiProductsPublicByProductId({
              path: { productId: item.productId },
              query: { languageId: defaultParams.languageId },
            });

            if (response.error || !response.data?.data) {
              return { status: "skipped" as const };
            }

            const product = response.data.data as ProductItem;
            if (!product.isActive || product.stockQuantity <= 0) {
              return { status: "unavailable" as const };
            }

            const existingQty = cartQuantities.get(product.id) ?? 0;
            const remainingStock = product.stockQuantity - existingQty;
            const desiredQty = Math.min(item.quantity, remainingStock);
            if (desiredQty <= 0) {
              return { status: "unavailable" as const };
            }

            const cartProduct = toCartProduct(product);
            const addResult = await cartManager.addToCart(
              cartProduct,
              desiredQty
            );
            if (!addResult.success) {
              return { status: "skipped" as const };
            }

            cartQuantities.set(product.id, existingQty + desiredQty);
            return { status: "added" as const };
          })
        );

        results.forEach((result) => {
          if (result.status === "fulfilled") {
            if (result.value.status === "added") {
              addedCount += 1;
            } else {
              unavailableCount += 1;
            }
          } else {
            unavailableCount += 1;
          }
        });

        if (addedCount === 0) {
          toast.error(t('orders.reorderNoneAvailable'));
          return;
        }

        if (unavailableCount === 0) {
          toast.success(t('orders.reorderAllAdded'));
        } else {
          toast.warning(
            t('orders.reorderPartialAdded', { count: unavailableCount })
          );
        }

        navigate("/cart");
      } finally {
        setActiveOrderId(null);
      }
    },
    [activeOrderId, isAuthenticated, navigate]
  );

  const isReordering = useCallback(
    (orderId?: string) => Boolean(orderId && activeOrderId === orderId),
    [activeOrderId]
  );

  return { reorder, isReordering };
}

export default function ProfileOrders({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation('profile');
  const revalidator = useRevalidator();
  const [orders, setOrders] = useState<OrderItem[]>(loaderData.orders || []);
  const [pendingPayment, setPendingPayment] =
    useState<ReturnType<typeof loadPendingPayment>>(null);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const ordersFallbackQuery = useQuery({
    queryKey: ["orders", "client-fallback"],
    enabled: loaderData.loadError,
    queryFn: async () => {
      const response = await getApiCheckoutOrders({
        query: {
          page: 1,
          limit: 20,
          storeId: defaultParams.storeId,
        },
      });

      if (response.error || !response.data?.data?.orders) {
        throw new Error("Failed to load orders");
      }

      return response.data.data.orders as OrderItem[];
    },
    staleTime: 30_000,
    gcTime: 300_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
  const isOrdersLoading = loaderData.loadError && ordersFallbackQuery.isPending;

  useEffect(() => {
    setOrders(loaderData.orders || []);
  }, [loaderData.orders]);

  useEffect(() => {
    if (!ordersFallbackQuery.data) return;
    setOrders(ordersFallbackQuery.data);
  }, [ordersFallbackQuery.data]);

  useEffect(() => {
    // Check for pending payment on mount
    const pending = loadPendingPayment();
    if (pending) {
      // Check if banner was dismissed in this session
      const dismissed = isPendingPaymentBannerDismissed(pending.orderId);
      setIsBannerDismissed(dismissed);
    }
    setPendingPayment(pending);
  }, []);

  useEffect(() => {
    if (!pendingPayment || !orders.length) return;

    const pendingOrder = orders.find(
      (order) => order.id === pendingPayment.orderId
    );

    if (pendingOrder?.status === "cancelled") {
      clearPendingPayment();
      setPendingPayment(null);
      setIsBannerDismissed(true);
    }
  }, [orders, pendingPayment]);

  const handleDismissPendingPayment = () => {
    if (pendingPayment) {
      // Only dismiss for this session, don't clear from localStorage
      // This allows the banner to reappear if user refreshes or returns later
      dismissPendingPaymentBanner(pendingPayment.orderId);
      setIsBannerDismissed(true);
    }
  };

  if (
    loaderData.loadError &&
    ordersFallbackQuery.error &&
    orders.length === 0 &&
    !isOrdersLoading
  ) {
    return <div>{t('orders.errorLoading')}</div>;
  }

  const handleOrderCancelled = (orderId: string) => {
    setOrders((current) =>
      current.map((order) =>
        order.id === orderId ? { ...order, status: "cancelled" } : order
      )
    );

    if (pendingPayment?.orderId === orderId) {
      clearPendingPayment();
      setPendingPayment(null);
      setIsBannerDismissed(true);
    }

    // Refresh canonical backend state in background
    revalidator.revalidate();
  };

  return (
    <>
      <title>{t('orders.pageTitle')}</title>
      <div className="flex flex-col gap-6 w-full">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <h1 className="font-black italic text-lg text-black tracking-[-0.198px]">
            {t('orders.title')}
          </h1>
        </div>

        {/* Pending Payment Banner */}
        {pendingPayment && !isBannerDismissed && (
          <Alert className="border-yellow-200 bg-yellow-50">
            <AlertCircleIcon className="h-4 w-4 text-yellow-600" />
            <AlertTitle className="text-yellow-800">
              {t('orders.pendingPaymentTitle')}
            </AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span className="text-yellow-700">
                {t('orders.pendingPaymentMessage', { orderNumber: pendingPayment.orderNumber })}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismissPendingPayment}
                className="ml-2 text-yellow-700 hover:text-yellow-900"
                title="Hide for this session"
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Orders List */}
        {isOrdersLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <OrderCardSkeleton key={index} />
            ))}
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order, orderIndex) => (
              <LazyOrderCard
                key={order.id}
                order={order}
                orderIndex={orderIndex}
                onOrderCancelled={handleOrderCancelled}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-xl font-semibold text-gray-600 mb-4">
              {t('orders.noOrders')}
            </h3>
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              {t('orders.startShopping')}
            </a>
          </div>
        )}
      </div>
    </>
  );
}

function OrderCardSkeleton() {
  return (
    <SimpleCard className="flex flex-col gap-3 p-4 md:p-8 md:bg-background-secondary">
      <div className="flex items-center gap-2 order-1 flex-wrap">
        <Skeleton className="h-9 w-full max-w-[620px] rounded-sm md:w-[55%]" />
        <div className="ms-auto hidden items-center gap-2 md:flex">
          <Skeleton className="h-11 w-[180px] rounded-sm" />
          <Skeleton className="h-11 w-11 rounded-sm" />
        </div>
      </div>

      <div className="h-px bg-gray-200 hidden md:block order-2"></div>

      <div className="space-y-4 order-5 md:order-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-8 w-28 md:w-28" />
          <Skeleton className="h-8 w-40 rounded-sm md:w-40" />
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-44" />
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-52" />
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>

      <div className="h-px bg-gray-200 order-3 md:order-4"></div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 order-2 md:order-5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "flex gap-3 p-0 md:p-2 border-0 md:border rounded-md",
              index > 1 && "hidden md:flex"
            )}
          >
            <Skeleton className="h-20 w-20 rounded-md shrink-0" />
            <div className="flex flex-col justify-between flex-1 py-1">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-4/5" />
              <Skeleton className="h-5 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </SimpleCard>
  );
}

function LazyOrderCard({
  order,
  orderIndex,
  onOrderCancelled,
}: {
  order: GetApiCheckoutOrdersResponse["data"]["orders"][number];
  orderIndex: number;
  onOrderCancelled: (orderId: string) => void;
}) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: "480px 0px",
  });

  return (
    <div ref={ref}>
      {inView ? (
        <MemoOrderCard
          order={order}
          orderIndex={orderIndex}
          onOrderCancelled={onOrderCancelled}
        />
      ) : (
        <OrderCardSkeleton />
      )}
    </div>
  );
}

function CancelOrderDialog({
  orderId,
  orderNumber,
  onCancelled,
  trigger,
}: {
  orderId: string;
  orderNumber: string;
  onCancelled?: (orderId: string) => void;
  trigger: React.ReactNode;
}) {
  const { t } = useTranslation('profile');
  const [open, setOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>("");

  const cancelMutation = useMutation(cancelOrderMutationOptions);

  const handleCancel = () => {
    if (!selectedReason) return;
    const localizedReason = t(`orders.cancelReasons.${selectedReason}`, {
      defaultValue: selectedReason,
    });

    cancelMutation.mutate(
      { orderId, reason: localizedReason },
      {
        onSuccess: () => {
          setOpen(false);
          setSelectedReason("");
          onCancelled?.(orderId);
        },
        onError: () => {
          // Keep dialog open on error so user can retry or see the error message
          // Error toast is already shown by the mutation's onError handler
        },
      }
    );
  };

  const canSubmit = !!selectedReason;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('orders.cancelDialogTitle', { orderNumber })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('orders.cancelDialogDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t('orders.cancellationReason')}</label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger>
                <SelectValue placeholder={t('orders.selectReason')} />
              </SelectTrigger>
              <SelectContent>
                {CANCEL_REASONS.map((reason) => (
                  <SelectItem key={reason} value={reason}>
                    {t(`orders.cancelReasons.${reason}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancelMutation.isPending}>
            {t('orders.keepOrder')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleCancel}
            disabled={!canSubmit || cancelMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {cancelMutation.isPending ? t('orders.cancelling') : t('orders.yesCancelOrder')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CancelOrderDialogMenuItem({
  orderId,
  orderNumber,
  onCancelled,
}: {
  orderId: string;
  orderNumber: string;
  onCancelled?: (orderId: string) => void;
}) {
  const { t } = useTranslation('profile');
  return (
    <CancelOrderDialog
      orderId={orderId}
      orderNumber={orderNumber}
      onCancelled={onCancelled}
      trigger={
        <DropdownMenuItem
          variant="destructive"
          onSelect={(e) => {
            e.preventDefault();
          }}
        >
          <Ban />
          {t('orders.cancelOrder')}
        </DropdownMenuItem>
      }
    />
  );
}

function ReportProblemDialog({
  orderNumber,
  trigger,
}: {
  orderNumber: string;
  trigger: React.ReactNode;
}) {
  const { t } = useTranslation('profile');
  const [open, setOpen] = useState(false);
  const [selectedProblem, setSelectedProblem] = useState("");

  const problemOptions = [
    { value: "missingItem", label: t('orders.problemTypes.missingItem') },
    { value: "damagedItem", label: t('orders.problemTypes.damagedItem') },
    { value: "wrongItem", label: t('orders.problemTypes.wrongItem') },
    { value: "deliveryDelay", label: t('orders.problemTypes.deliveryDelay') },
    { value: "paymentIssue", label: t('orders.problemTypes.paymentIssue') },
    { value: "other", label: t('orders.problemTypes.other') },
  ];

  const handleReport = () => {
    if (!selectedProblem) return;
    const selectedLabel =
      problemOptions.find((option) => option.value === selectedProblem)?.label ||
      selectedProblem;
    const message = t('orders.reportProblemMessage', {
      orderNumber,
      problemType: selectedLabel,
    });
    const whatsappUrl = `https://wa.me/962793003737?text=${encodeURIComponent(
      message
    )}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
    setSelectedProblem("");
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('orders.reportProblemDialogTitle', { orderNumber })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('orders.reportProblemDialogDescription')}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('orders.problemTypeLabel')}
            </label>
            <Select value={selectedProblem} onValueChange={setSelectedProblem}>
              <SelectTrigger>
                <SelectValue placeholder={t('orders.selectProblemType')} />
              </SelectTrigger>
              <SelectContent>
                {problemOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>{t('orders.reportProblemCancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={handleReport} disabled={!selectedProblem}>
            {t('orders.reportProblemAction')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReportProblemDialogMenuItem({
  orderNumber,
}: {
  orderNumber: string;
}) {
  const { t } = useTranslation('profile');
  return (
    <ReportProblemDialog
      orderNumber={orderNumber}
      trigger={
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(e) => {
            e.preventDefault();
          }}
        >
          <AlertCircleIcon className="text-destructive" />
          {t('orders.reportProblem')}
        </DropdownMenuItem>
      }
    />
  );
}

function OrderCard({
  order,
  orderIndex,
  onOrderCancelled,
}: {
  order: GetApiCheckoutOrdersResponse["data"]["orders"][number];
  orderIndex: number;
  onOrderCancelled: (orderId: string) => void;
}) {
  const { t } = useTranslation('profile');
  const loaderData = useRouteLoaderData("routes/_main");
  const isAuthenticated = loaderData?.isAuthenticated;
  const { reorder, isReordering } = useReorder(isAuthenticated);
  const { initiatePayment, isInitiating } = usePayment({
    onOrderCancelled: (cancelledOrderId) => {
      onOrderCancelled(cancelledOrderId);
    },
  });
  const formattedDate = useMemo(
    () =>
      new Date(order.createdAt).toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    [order.createdAt]
  );

  // Fetch payment status for pending credit card orders
  const paymentStatusQuery = useQuery({
    queryKey: ["paymentStatus", order.id],
    queryFn: async () => {
      const response = await getApiPaymentsStatusByOrderId({
        path: { orderId: order.id },
      });
      if (response.data?.success && response.data?.data) {
        return response.data.data;
      }
      return null;
    },
    enabled:
      order.paymentMethod === "credit_card" &&
      order.status === "pending",
    // Poll every 30 seconds for pending payments
    refetchInterval:
      order.paymentMethod === "credit_card" &&
      order.status === "pending"
        ? 30000
        : false,
    // Keep data fresh for 10 seconds to prevent duplicate requests
    staleTime: 10000,
    // Disable refetch on mount and window focus to rely on polling instead
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const handlePayWithCard = async () => {
    try {
      await initiatePayment(order.id, order.orderNumber);
    } catch (error) {
    }
  };

  const handleReorder = () => {
    reorder(order);
  };

  const paymentMethodLower = (order.paymentMethod || "").toLowerCase();
  const notesLower = (order.notes || "").toLowerCase();
  const isOnlineCardPayment =
    paymentMethodLower === "credit_card" ||
    notesLower.includes("credit card") ||
    notesLower.includes("pay with card") ||
    notesLower.includes("apple pay");

  // Show retry action only for pending online-card orders
  const showPayButton = order.status === "pending" && isOnlineCardPayment;

  const showCancelButton =
    order.status === "pending" || order.status === "confirmed";

  const cardInfo = paymentStatusQuery.data?.cardInfo;

  return (
    <SimpleCard className="flex flex-col gap-3 p-4 md:p-8 md:bg-background-secondary">
      <div className="flex items-center gap-2 order-1 flex-wrap">
        <div className="font-bold italic text-lg">
          {order.orderNumber}
        </div>
        <div className="ms-auto flex items-center gap-2">
          {showPayButton && (
            <Button
              variant="inverted"
              className="font-koulen inline-flex h-10 px-2 md:px-3 text-xs md:text-sm"
              onClick={handlePayWithCard}
              disabled={isInitiating}
            >
              {isInitiating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CreditCard />
              )}
              {isInitiating ? t('orders.processing') : t('orders.payWithCard')}
            </Button>
          )}
          <Button
            variant="inverted"
            className="font-koulen hidden md:inline-flex h-10 px-3 text-sm"
            onClick={() => downloadInvoice(order)}
          >
            <DownloadIcon />
            {t('orders.downloadInvoice')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="inverted" className="h-10 w-10 p-0">
                <MoreVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  className="md:hidden"
                  onClick={() => downloadInvoice(order)}
                >
                  <DownloadIcon />
                  {t('orders.downloadInvoice')}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleReorder}
                  disabled={isReordering(order.id)}
                >
                  {isReordering(order.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCw className="h-4 w-4" />
                  )}
                  {t('orders.reorderItems')}
                </DropdownMenuItem>

                <ReportMissingItemModal
                  orderId={order.id}
                  orderNumber={order.orderNumber}
                  orderDate={order.createdAt}
                  orderStatus={order.status}
                  items={order.items}
                  trigger={
                    <DropdownMenuItem
                      onSelect={(e) => {
                        e.preventDefault();
                      }}
                    >
                      <TruckIcon />
                      {t('orders.didntReceiveOrder')}
                    </DropdownMenuItem>
                  }
                />
                {showCancelButton && (
                  <CancelOrderDialogMenuItem
                    orderId={order.id}
                    orderNumber={order.orderNumber}
                    onCancelled={onOrderCancelled}
                  />
                )}
                <ReportProblemDialogMenuItem
                  orderNumber={order.orderNumber}
                />
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div className="h-px bg-gray-200 hidden md:block order-2"></div>
      <div className="space-y-2 text-sm [&>div>div:first-child]:text-muted-foreground [&>div>div:last-child]:font-bold order-5 md:order-3">
        <div className="flex items-center justify-between">
          <div>{t('orders.orderStatus')}</div>
          <OrderStatusBadge status={order.status} />
        </div>
        <div className="flex items-center justify-between">
          <div>{t('orders.dateOrdered')}</div>
          <div>{formattedDate}</div>
        </div>
        <div className="flex items-center justify-between">
          <div>{t('orders.deliveryAddress')}</div>
          <div>{order.shippingAddress?.addressLine1}</div>
        </div>
        {order.paymentMethod && (
          <div className="flex items-center justify-between">
            <div>{t('orders.paymentMethod')}</div>
            <div>
              {formatPaymentMethod(
                order.paymentMethod,
                order.notes,
                t
              )}
              {cardInfo && (
                <span className="ml-2 text-sm text-muted-foreground">
                  ({cardInfo.brand} •••• {cardInfo.last4})
                </span>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <div>{t('orders.totalPrice')}</div>
          <div>{order.currency} {order.totalAmount}</div>
        </div>
        {(order.status === "cancelled" || order.status === "refunded") &&
          order.paymentMethod === "credit_card" && (
            <div className="flex items-center justify-between">
              <div>{t('orders.refundStatus')}</div>
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                {order.status === "refunded"
                  ? t('orders.refundProcessed')
                  : t('orders.refundInitiated')}
              </Badge>
            </div>
          )}
      </div>
      <div className="h-px bg-gray-200 order-3 md:order-4"></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 order-2 md:order-5">
        {order.items.map((item, itemIndex) => (
          <SimpleCard
            key={item.id}
            className="flex gap-3 p-0 md:p-2 border-0 md:border"
          >
            <img
              src={item.product.mainImage || ""}
              alt={getLocalizedTranslation(item.product.translations)?.name}
              className="h-20 aspect-[16/12] object-cover rounded-md"
              loading={orderIndex < 2 && itemIndex === 0 ? "eager" : "lazy"}
              fetchPriority={orderIndex < 2 && itemIndex === 0 ? "high" : "auto"}
            />
            <div className="flex flex-col justify-between">
              <div className="font-bold capitalize line-clamp-1">
                {getLocalizedTranslation(item.product.translations)?.name}
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">{t('orders.price')} </span>
                <span>{(item as any).currency} {item.unitPrice}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">{t('orders.quantity')} </span>
                <span>{item.quantity}</span>
              </div>
            </div>
          </SimpleCard>
        ))}
      </div>
    </SimpleCard>
  );
}

const MemoOrderCard = memo(OrderCard);

function formatPaymentMethod(
  paymentMethod: string,
  notes?: string | null,
  t?: any
): string {
  // Check notes first to identify specific payment methods
  if (notes) {
    const notesLower = notes.toLowerCase();
    if (notesLower.includes("pay with cliq") || notesLower.includes("cliq")) {
      return t ? t('orders.paymentMethods.cliq') : "Pay with CliQ";
    }
    if (notesLower.includes("card on delivery")) {
      return t ? t('orders.paymentMethods.cardOnDelivery') : "Card on Delivery";
    }
    if (
      notesLower.includes("credit card") ||
      notesLower.includes("pay with card") ||
      notesLower.includes("apple pay")
    ) {
      return t ? t('orders.paymentMethods.creditCard') : "Credit/debit card and Apple Pay";
    }
  }

  const method = paymentMethod.toLowerCase();
  
  if (!t) {
    const paymentMethodMap: Record<string, string> = {
      cash_on_delivery: "Cash on Delivery",
      card_on_delivery: "Card on Delivery",
      cliq: "Pay with CliQ",
      digital_wallet: "Pay with CliQ",
      credit_card: "Credit/debit card and Apple Pay",
      bank_transfer: "Bank Transfer",
    };
    return paymentMethodMap[method] || paymentMethod;
  }

  const paymentMethodKeyMap: Record<string, string> = {
    cash_on_delivery: "cashOnDelivery",
    card_on_delivery: "cardOnDelivery",
    cliq: "cliq",
    digital_wallet: "cliq",
    credit_card: "creditCard",
    bank_transfer: "bankTransfer",
  };

  const key = paymentMethodKeyMap[method];
  return key ? t(`orders.paymentMethods.${key}`) : paymentMethod;
}

function OrderStatusBadge({ status }: { status: OrderItem["status"] }) {
  const { t } = useTranslation('profile');
  const statusConfig = {
    pending: {
      label: t('orders.statuses.pending'),
      className: "bg-yellow-50 text-yellow-600",
    },
    confirmed: {
      label: t('orders.statuses.confirmed'),
      className: "bg-indigo-50 text-indigo-600",
    },
    processing: {
      label: t('orders.statuses.processing'),
      className: "bg-violet-50 text-violet-600",
    },
    shipped: {
      label: t('orders.statuses.shipped'),
      className: "bg-blue-50 text-blue-600",
    },
    delivered: {
      label: t('orders.statuses.delivered'),
      className: "bg-green-50 text-green-600",
    },
    cancelled: {
      label: t('orders.statuses.cancelled'),
      className: "bg-red-50 text-red-600",
    },
    refunded: {
      label: t('orders.statuses.refunded'),
      className: "bg-red-50 text-red-600",
    },
  };
  return (
    <Badge
      className={cn(
        statusConfig[status].className,
        "rounded-full px-3 py-1 gap-1 font-bold border-0"
      )}
    >
      <CircleSmall className="fill-current" />
      {statusConfig[status].label}
    </Badge>
  );
}
