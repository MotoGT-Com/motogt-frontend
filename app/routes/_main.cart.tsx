import { SimpleCard } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import type { Route } from "./+types/_main.cart";
import { getApiProductsPublic } from "~/lib/client";
import { defaultParams } from "~/lib/api-client";
import { useCartManager } from "~/lib/cart-manager";
import { href, Link } from "react-router";
import { authContext } from "~/context";
import { toast } from "sonner";
import { CartItemComponent } from "~/components/cart-item";
import { useTranslation } from "react-i18next";
import ProductsHorizontalScroll from "~/components/ProductsHorizontalScroll";
import { useCurrency } from "~/hooks/use-currency";
import { useEffect, useState, type MouseEvent } from "react";
import { WhatsAppButton } from "~/components/whatsapp-button";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import { useAuthModal } from "~/context/AuthModalContext";

// Loader function to fetch cart data
export async function loader({ context }: Route.LoaderArgs) {
  try {
    const auth = context.get(authContext);

    // Fetch recommended products
    const recommendedProductsResponse = await getApiProductsPublic({
      query: {
        storeId: defaultParams.storeId,
        page: 1,
        limit: 10,
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    });

    if (recommendedProductsResponse.error) {
      throw new Error("Failed to load recommended products");
    }

    return {
      recommendedProductsResponse,
      isAuthenticated: auth.isAuthenticated,
    };
  } catch (error) {
    // Return empty cart for error cases
    return {
      recommendedProductsResponse: null,
      isAuthenticated: false,
    };
  }
}

export default function Cart({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation('cart');
  const { recommendedProductsResponse, isAuthenticated } = loaderData;
  const { openAuthModal } = useAuthModal();
  const { cartQuery, updateQuantityMutation, removeFromCartMutation } =
    useCartManager(isAuthenticated);
  
  // Currency conversion
  const { selectedCurrency, batchConvert } = useCurrency();
  const [convertedSubtotal, setConvertedSubtotal] = useState<number | null>(null);
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);

  // Calculate cart totals from API data or calculate from items
  const calculateTotals = () => {
    const subtotal = cartQuery.data!.items.reduce(
      (sum, item) => sum + (item.unitPrice || 0) * item.quantity,
      0
    );

    return {
      subtotal,
      total: subtotal,
    };
  };
  
  // Convert cart total when currency changes
  useEffect(() => {
    if (!cartQuery.data || cartQuery.data.items.length === 0) {
      setConvertedSubtotal(0);
      return;
    }
    
    const cartCurrency = (cartQuery.data as any).currency || "JOD";
    const subtotal = calculateTotals().subtotal;
    
    if (selectedCurrency === cartCurrency) {
      setConvertedSubtotal(subtotal);
      return;
    }
    
    setIsLoadingPrices(true);
    batchConvert([subtotal], cartCurrency)
      .then(result => {
        setConvertedSubtotal(result.convertedAmounts[0]);
      })
      .catch(() => {
        setConvertedSubtotal(subtotal);
      })
      .finally(() => {
        setIsLoadingPrices(false);
      });
  }, [cartQuery.data, selectedCurrency, batchConvert]);

  const totals = cartQuery.data
    ? calculateTotals()
    : {
        subtotal: 0,
        discountAmount: 0,
        total: 0,
      };

  if (cartQuery.error) {
    return <div>Error loading cart</div>;
  }

  const handleCheckoutClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isAuthenticated) {
      return;
    }

    event.preventDefault();
    openAuthModal("register", {
      intent: {
        type: "checkout",
        returnTo: href("/checkout"),
      },
    });
  };

  return (
    <>
      <title>{t('pageTitle')}</title>
      <div className="bg-background-secondary py-8">
        <div className="max-w-7xl mx-auto px-6 mb-8">
          <div className="grid lg:grid-cols-[1fr_400px] gap-6">
            {/* Cart Items Section */}
            <div className="space-y-4">
              <SimpleCard className="md:p-4 bg-background-secondary md:bg-background border-0 md:border">
                <div className="space-y-4">
                  <h1 className="text-[18px] font-black italic leading-[150%] tracking-[-0.198px] text-[#000]">
                    {t('title')}{" "}
                    {cartQuery.data && cartQuery.data.items.length > 0 && (
                      <span className="text-[14px] font-normal not-italic leading-[150%] tracking-[-0.154px] text-[rgba(0,0,0,0.50)]">
                        ({t('itemCount', { count: cartQuery.data.items.length })})
                      </span>
                    )}
                  </h1>
                  {cartQuery.data && cartQuery.data.items.length === 0 ? (
                    <div className="text-center py-16">
                      <h3 className="text-xl font-semibold text-gray-600 mb-4">
                        {t('empty.title')}
                      </h3>
                      <p className="text-gray-500 mb-8">
                        {t('empty.message')}
                      </p>
                      <a
                        href="/"
                        className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        {t('empty.startShopping')}
                      </a>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cartQuery.data?.items.map((item) => (
                        <CartItemComponent
                          key={item.productId}
                          item={item}
                          onQuantityDecrease={(productId, newQuantity) =>
                            updateQuantityMutation.mutate({
                              productId,
                              quantity: newQuantity,
                            })
                          }
                          onQuantityIncrease={(productId, newQuantity) =>
                            updateQuantityMutation.mutate({
                              productId,
                              quantity: newQuantity,
                            })
                          }
                          onRemove={(productId) => {
                            removeFromCartMutation.mutate(productId, {
                              onSuccess: () => {
                                toast.success(t("messages.itemRemovedFromCart", { ns: "common" }));
                              },
                              onError: () => {
                                toast.error("Failed to remove item from cart");
                              },
                            });
                          }}
                          isUpdating={updateQuantityMutation.isPending}
                          isRemoving={removeFromCartMutation.isPending}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </SimpleCard>
            </div>

            {/* Order Summary Sidebar */}
            <div className="space-y-4">
              {cartQuery.data && (
                <SimpleCard className="p-6">
                  <div className="space-y-6">
                    <h2 className="text-base font-black italic">{t('summary.title')}</h2>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold">{t('summary.subtotal')}</span>
                        <span className="font-extrabold">
                          {isLoadingPrices ? (
                            <span className="inline-block w-20 h-4 bg-gray-200 animate-pulse rounded"></span>
                          ) : (
                            `${selectedCurrency} ${(convertedSubtotal ?? totals.subtotal).toFixed(2)}`
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="font-semibold">{t('summary.shippingCost')}</span>
                        <span className="font-extrabold text-primary font-koulen">
                          {t('summary.free')}
                        </span>
                      </div>

                      <hr className="border-gray-300" />

                      <div className="flex justify-between text-base font-bold">
                        <span>{t('summary.totalAmount')}</span>
                        <span>
                          {isLoadingPrices ? (
                            <span className="inline-block w-20 h-4 bg-gray-200 animate-pulse rounded"></span>
                          ) : (
                            `${selectedCurrency} ${(convertedSubtotal ?? totals.total).toFixed(2)}`
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        to="/checkout"
                        className="block w-full"
                        onClick={handleCheckoutClick}
                      >
                        <Button
                          className="w-full h-10 font-bold"
                          disabled={
                            cartQuery.data && cartQuery.data.items.length === 0
                          }
                        >
                          {t('summary.proceedToCheckout')}
                        </Button>
                      </Link>
                      {!isAuthenticated && (
                        <Link to="/guest-checkout" className="block w-full">
                          <Button
                            variant="outline"
                            className="w-full h-10 font-bold"
                            disabled={
                              cartQuery.data && cartQuery.data.items.length === 0
                            }
                          >
                            {t('summary.checkoutAsGuest')}
                          </Button>
                        </Link>
                      )}
                      <WhatsAppButton
                        className="h-10 text-base font-bold font-sans normal-case"
                        items={cartQuery.data.items.map((item: any) => ({
                          productName:
                            getLocalizedTranslation(
                              item.product?.translations ??
                                item.productTranslations
                            )?.name || "Product",
                          itemCode:
                            item.itemCode ??
                            item.product?.itemCode ??
                            item.productId,
                          quantity: item.quantity,
                        }))}
                        currency={selectedCurrency}
                        totalAmount={(convertedSubtotal ?? totals.total).toFixed(2)}
                        lang={i18n.language}
                        disabled={cartQuery.data.items.length === 0}
                      />
                    </div>
                  </div>
                </SimpleCard>
              )}

              {cartQuery.data && cartQuery.data.items.length > 0 && (
                <p className="text-sm text-black/50 font-medium">
                  {t('disclaimer')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recommended Products Carousel */}
        <ProductsHorizontalScroll
          sectionTitle={t("recommendations")}
          productsResponse={recommendedProductsResponse ?? { data: { data: [] } }}
        />

      </div>
    </>
  );
}
