import { useState, useEffect } from "react";
import { href, Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { SimpleCard } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { MapPin, CreditCard, Banknote, Loader2, ArrowLeft, Check, X, Plus, ChevronDown, } from "lucide-react";
import { InlineAccordion, InlineAccordionContent, InlineAccordionItem, InlineAccordionTrigger, } from "~/components/ui/inline-accordion";
import { cn } from "~/lib/utils";
import { AccordionDropdownButton } from "~/components/accordion-dropdown-button";
import type { Route } from "./+types/_main.checkout";
import { getApiStoresByStoreIdCart, getApiUsersMeAddresses, postApiPromoCodesValidate, postApiUsersMeAddresses, } from "~/lib/client";
import { defaultParams } from "~/lib/api-client";
import type { AddressResponse } from "~/lib/client/types.gen";
import { accessTokenCookie } from "~/lib/auth-middleware";
import { useMutation } from "@tanstack/react-query";
import { checkoutMutationOptions } from "~/lib/queries";
import { toast } from "sonner";
import { useCartManager } from "~/lib/cart-manager";
import { usePayment } from "~/lib/use-payment";
import { backupCart, loadPendingPayment, clearPendingPayment, } from "~/lib/payment-utils";
import { useCurrency } from "~/hooks/use-currency";
import { type Currency } from "~/lib/constants";
import { getExchangeRate } from "~/lib/currency-utils";
import { authContext } from "~/context";
import { useAuthModal } from "~/context/AuthModalContext";
import { CountrySelect, PhoneInput } from "~/components/phone-number-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";

// Loader function to fetch cart and address data
export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  if (!auth.isAuthenticated) {
    return {
      cart: null,
      addresses: [],
      isAuthenticated: false,
    };
  }

  const accessToken = await accessTokenCookie.parse(
    request.headers.get("Cookie")
  );
  try {
    // Fetch cart contents and addresses in parallel
    const [cartResponse, addressesResponse] = await Promise.all([
      getApiStoresByStoreIdCart({
        path: { storeId: defaultParams.storeId },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
      getApiUsersMeAddresses({
        query: {
          page: 1,
          limit: 20,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }).catch(() => ({ data: { data: { addresses: [] } } })),
    ]);

    return {
      cart: cartResponse.data?.success ? cartResponse.data.data : null,
      addresses: addressesResponse.data?.data?.addresses || [],
      isAuthenticated: true,
    };
  } catch (error) {
    return {
      cart: null,
      addresses: [],
      isAuthenticated: true,
    };
  }
}

const PROMO_CODE_STORAGE_KEY = "motogt_applied_promo_code";

interface ValidatedPromoCode {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  discountAmount: number;
}

const ADDRESS_ALLOWED_COUNTRIES: RPNInput.Country[] = ["JO", "AE", "SA", "QA"];

const ADDRESS_CITIES = {
  AE: [
    "Dubai",
    "Abu Dhabi",
    "Sharjah",
    "Ajman",
    "Ras Al Khaimah",
    "Fujairah",
    "Umm Al Quwain",
    "Al Ain",
    "Dibba Al Fujairah",
    "Dibba Al Hisn",
    "Kalba",
    "Khor Fakkan",
    "Madinat Zayed",
    "Ruwais",
    "Ghayathi",
    "Liwa",
    "Hatta",
    "Dhaid",
  ],
  SA: ["Riyadh", "Jeddah", "Dammam", "Khobar"],
  JO: [
    "Amman",
    "Zarqa",
    "Irbid",
    "Salt",
    "Madaba",
    "Jerash",
    "Ajloun",
    "Ruseifa",
    "Fuheis",
    "Mahis",
  ],
  QA: [
    "Doha",
    "Al Wakrah",
    "Al Khor",
    "Al Rayyan",
    "Umm Salal",
    "Al Daayen",
    "Al Shamal",
    "Al Shahaniya",
    "Mesaieed",
    "Lusail",
    "Dukhan",
    "Ras Laffan",
    "Al Gharrafa",
    "Al Thumama",
    "Al Wukair",
    "Abu Hamour",
    "Al Mamoura",
    "Madinat Khalifa",
    "Al Hilal",
    "Ain Khaled",
  ],
};

/**
 * Calculate expected delivery date range (2-7 days from today)
 * @returns Object with formatted date range string and individual dates
 */
function getExpectedDeliveryDates() {
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + 2); // 2 days from today

  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 7); // 7 days from today

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = monthNames[date.getMonth()];
    return `${day} ${month}`;
  };

  return {
    minDate,
    maxDate,
    formattedRange: `${formatDate(minDate)}-${formatDate(maxDate)}`,
    daysRange: "2-7 Days",
  };
}

export default function Checkout({ loaderData }: Route.ComponentProps) {
  const { t, i18n } = useTranslation('checkout');
  const { cart, addresses, isAuthenticated } = loaderData;
  const navigate = useNavigate();
  const { openAuthModal } = useAuthModal();
  const checkoutMutation = useMutation(checkoutMutationOptions);
  const { initiatePayment, isInitiating } = usePayment();
  const { cartQuery, updateQuantityMutation, removeFromCartMutation } =
    useCartManager(isAuthenticated);
  const [selectedAddress, setSelectedAddress] = useState<string>("");
  const [selectedPayment, setSelectedPayment] = useState<string>("");
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromoCode, setAppliedPromoCode] =
    useState<ValidatedPromoCode | null>(() => {
      // Load from localStorage on mount
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(PROMO_CODE_STORAGE_KEY);
        if (stored) {
          try {
            return JSON.parse(stored);
          } catch {
            return null;
          }
        }
      }
      return null;
    });
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Currency conversion and validation
  const { selectedCurrency, convertPrice, batchConvert } = useCurrency();
  const [convertedTotal, setConvertedTotal] = useState<number | null>(null);
  const [convertedSubtotal, setConvertedSubtotal] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [showPriceChangeDialog, setShowPriceChangeDialog] = useState(false);
  const [priceChangeInfo, setPriceChangeInfo] = useState<{
    estimated: number;
    actual: number;
    percentChange: number;
  } | null>(null);
  const [isRedirectingToGateway, setIsRedirectingToGateway] = useState(false);
  const [checkoutAddresses, setCheckoutAddresses] = useState(addresses);
  const [isAddAddressDialogOpen, setIsAddAddressDialogOpen] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestFirstName, setGuestFirstName] = useState("");
  const [guestLastName, setGuestLastName] = useState("");
  const [guestCountry, setGuestCountry] = useState("");
  const [guestCity, setGuestCity] = useState("");
  const [guestAddressLine1, setGuestAddressLine1] = useState("");
  const [guestAddressLine2, setGuestAddressLine2] = useState("");
  const [guestPostalCode, setGuestPostalCode] = useState("");
  const [isGuestPhoneVerified, setIsGuestPhoneVerified] = useState(false);
  const isGuestCheckout = !isAuthenticated;
  const guestSelectedCountry = guestCountry as keyof typeof ADDRESS_CITIES;
  const guestAvailableCities = guestSelectedCountry
    ? ADDRESS_CITIES[guestSelectedCountry] || []
    : [];
  const guestRegionNames = new Intl.DisplayNames(
    [i18n.language?.startsWith("ar") ? "ar" : "en"],
    { type: "region" }
  );

  useEffect(() => {
    setCheckoutAddresses(addresses);
  }, [addresses]);

  useEffect(() => {
    if (isGuestCheckout) {
      setIsGuestPhoneVerified(false);
    }
  }, [guestPhone, isGuestCheckout]);

  // Auto-select default address when addresses are loaded
  useEffect(() => {
    if (checkoutAddresses.length > 0 && !selectedAddress) {
      const defaultAddress = checkoutAddresses.find((addr) => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddress(defaultAddress.id);
      } else if (checkoutAddresses.length > 0) {
        // If no default address, select the first one
        setSelectedAddress(checkoutAddresses[0].id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkoutAddresses]);

  // Save to localStorage when promo code changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (appliedPromoCode) {
        localStorage.setItem(
          PROMO_CODE_STORAGE_KEY,
          JSON.stringify(appliedPromoCode)
        );
      } else {
        localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
      }
    }
  }, [appliedPromoCode]);

  // Handle promo code application with backend validation
  const handleApplyPromoCode = async () => {
    const trimmedCode = promoCode.trim();

    if (!trimmedCode) {
      setPromoError(t('promoCode.enterCode'));
      return;
    }

    if (appliedPromoCode) {
      setPromoError(t('promoCode.alreadyApplied'));
      return;
    }

    // Calculate subtotal
    let subtotal = 0;
    if (cartQuery.data?.items && cartQuery.data.items.length > 0) {
      subtotal = cartQuery.data.items.reduce(
        (sum, item) => sum + (item.unitPrice || 0) * item.quantity,
        0
      );
    } else if (cart?.summary) {
      subtotal = cart.summary.subtotal || 0;
    } else {
      subtotal = cartItems.reduce(
        (sum, item) => sum + (item.unitPrice || 0) * item.quantity,
        0
      );
    }

    setIsValidatingPromo(true);
    setPromoError(null);

    try {
      const response = await postApiPromoCodesValidate({
        body: {
          code: trimmedCode,
          subtotal: subtotal,
          currency: "JOD",
        },
      });

      if (response.data?.success && response.data.data.valid) {
        const promoData = response.data.data;

        // Validate that all required fields are present
        if (
          promoData.promoCode?.code &&
          promoData.promoCode?.discountType &&
          typeof promoData.promoCode?.discountValue === "number" &&
          typeof promoData.discount?.amount === "number"
        ) {
          const validatedPromo: ValidatedPromoCode = {
            code: promoData.promoCode.code,
            discountType: promoData.promoCode.discountType,
            discountValue: promoData.promoCode.discountValue,
            discountAmount: promoData.discount.amount,
          };

          setAppliedPromoCode(validatedPromo);
          setPromoCode("");
          setPromoError(null);
          toast.success(t('promoCode.applied'));
        } else {
          setPromoError(t('promoCode.invalid'));
        }
      } else {
        // Invalid promo code
        const errors = response.data?.data?.errors || [t('promoCode.invalid')];
        setPromoError(errors[0]);
      }
    } catch (error) {
      setPromoError(t('promoCode.validationFailed'));
    } finally {
      setIsValidatingPromo(false);
    }
  };

  // Handle promo code removal
  const handleRemovePromoCode = () => {
    setAppliedPromoCode(null);
    setPromoError(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
    }
    toast.success(t('promoCode.removed'));
  };
  
  // Handle price change confirmation
  const handleConfirmPriceChange = async () => {
    if (!priceChangeInfo) return;
    
    setShowPriceChangeDialog(false);
    setLoading(true);
    
    // Continue with checkout flow
    const orderData = checkoutMutation.data?.data as any;
    
    if (selectedPayment === "card" && orderData?.orderId && orderData?.orderNumber) {
      try {
        setIsRedirectingToGateway(true);
        await initiatePayment(orderData.orderId, orderData.orderNumber);
      } catch (error) {
        setIsRedirectingToGateway(false);
        toast.error(t('messages.paymentInitiationFailed'));
        navigate(href(isGuestCheckout ? "/" : "/profile/orders"));
      } finally {
        setLoading(false);
      }
    } else {
      toast.success(t('messages.orderPlaced'));
      navigate(href(isGuestCheckout ? "/" : "/profile/orders"));
      setLoading(false);
    }
  };

  // Handle Enter key in promo code input
  const handlePromoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleApplyPromoCode();
    }
  };

  // Extract cart items from API response
  // Use cartQuery for Shopping Cart section (updates in real-time when mutations happen)
  // Fallback to loader data only if cartQuery hasn't loaded yet
  const cartItemsFromQuery = cartQuery.data?.items || [];
  const cartItemsFromLoader = cart?.items || [];
  // Prefer cartQuery data since it updates reactively (even if empty), use loader data as fallback only if query hasn't loaded
  const cartItems = cartQuery.data ? cartItemsFromQuery : cartItemsFromLoader;

  // Set default selected address

  // Calculate cart totals
  const calculateTotals = () => {
    let subtotal = 0;

    // Use cartQuery summary if available (updates reactively), otherwise calculate from items
    if (cartQuery.data?.items && cartQuery.data.items.length > 0) {
      subtotal = cartQuery.data.items.reduce(
        (sum, item) => sum + (item.unitPrice || 0) * item.quantity,
        0
      );
    } else if (cart?.summary) {
      subtotal = cart.summary.subtotal || 0;
    } else {
      subtotal = cartItems.reduce(
        (sum, item) => sum + (item.unitPrice || 0) * item.quantity,
        0
      );
    }

    // Use discount amount from backend validation
    let discountAmount = 0;
    if (appliedPromoCode) {
      discountAmount = appliedPromoCode.discountAmount;
    }

    const shippingCost = 0;
    const total = subtotal + shippingCost - discountAmount;

    return {
      subtotal,
      shippingCost,
      discountAmount,
      total,
    };
  };

  const totals = calculateTotals();
  
  // Convert cart total and subtotal when currency changes
  useEffect(() => {
    if (totals.total === 0) {
      setConvertedTotal(0);
      setConvertedSubtotal(0);
      return;
    }
    
    // Cart items are always in JOD
    const cartCurrency = "JOD" as Currency;
    
    if (selectedCurrency === cartCurrency) {
      setConvertedTotal(totals.total);
      setConvertedSubtotal(totals.subtotal);
      return;
    }
    
    setIsLoadingPrice(true);
    // Batch convert subtotal and total
    batchConvert([totals.subtotal, totals.total], cartCurrency)
      .then(results => {
        setConvertedSubtotal(results.convertedAmounts[0]);
        setConvertedTotal(results.convertedAmounts[1]);
      })
      .catch(() => {
        setConvertedSubtotal(totals.subtotal);
        setConvertedTotal(totals.total);
      })
      .finally(() => {
        setIsLoadingPrice(false);
      });
  }, [totals.subtotal, totals.total, selectedCurrency, batchConvert]);

  // Map frontend payment method IDs to API payment method values
  const getPaymentMethodValue = (paymentId: string): string => {
    switch (paymentId) {
      case "cod":
        return "cash_on_delivery";
      case "card_on_delivery":
        return "card_on_delivery";
      case "cliq":
        return "digital_wallet"; // API enum requires digital_wallet, we'll identify it via notes
      case "card":
        return "credit_card";
      default:
        return "cash_on_delivery";
    }
  };

  const handlePlaceOrder = async (skipGuestVerification = false) => {
    if ((!isGuestCheckout && !selectedAddress) || !selectedPayment) {
      return;
    }

    if (
      isGuestCheckout &&
      (
        !guestFirstName.trim() ||
        !guestLastName.trim() ||
        !guestPhone.trim() ||
        !guestCountry.trim() ||
        !guestCity.trim() ||
        !guestAddressLine1.trim()
      )
    ) {
      toast.error(t("messages.guestRequiredFields"));
      return;
    }

    if (isGuestCheckout && !skipGuestVerification && !isGuestPhoneVerified) {
      openAuthModal("verifyOTP", {
        otpContext: {
          source: "guestCheckout",
          phone: guestPhone.trim(),
          onVerified: async () => {
            setIsGuestPhoneVerified(true);
            await handlePlaceOrder(true);
          },
        },
      });
      return;
    }

    setLoading(true);
    try {
      // Fetch fresh exchange rate before checkout
      const cartCurrency = (cart?.summary?.currency || "JOD") as Currency;
      let estimatedTotal = cart?.summary?.estimatedTotal || 0;
      
      if (selectedCurrency !== cartCurrency) {
        const { rate } = await getExchangeRate(cartCurrency, selectedCurrency, false);
        estimatedTotal = parseFloat((estimatedTotal * rate).toFixed(2));
      }
      
      // Backup cart before checkout (for payment failure recovery)
      if (selectedPayment === "card" && cartItems.length > 0) {
        backupCart(cartItems);
      }

      const apiPaymentMethod = getPaymentMethodValue(selectedPayment);
      const checkoutData: any = {
        storeId: defaultParams.storeId,
        paymentMethod: apiPaymentMethod,
        paymentCurrency: selectedCurrency, // Add payment currency
      };

      if (!isGuestCheckout) {
        checkoutData.shippingAddressId = selectedAddress;
      } else {
        checkoutData.guestContact = {
          firstName: guestFirstName.trim() || undefined,
          lastName: guestLastName.trim() || undefined,
          email: guestEmail.trim() || undefined,
          phone: guestPhone.trim() || undefined,
        };
      }

      // Add notes to identify the actual payment method selected
      // This helps us display the correct payment method on the orders page
      if (selectedPayment === "cliq") {
        checkoutData.notes = "Payment method: Pay with CliQ";
      } else if (selectedPayment === "card_on_delivery") {
        checkoutData.notes = "Payment method: Card on Delivery";
      } else if (selectedPayment === "card") {
        checkoutData.notes = "Payment method: Credit Card";
      }

      if (isGuestCheckout) {
        const guestAddressSummary = [
          guestAddressLine1.trim(),
          guestAddressLine2.trim(),
          guestCity.trim(),
          guestCountry.trim(),
          guestPostalCode.trim(),
        ]
          .filter(Boolean)
          .join(", ");
        checkoutData.notes = `${checkoutData.notes ? `${checkoutData.notes}\n` : ""}Guest shipping address: ${guestAddressSummary}`;
      }

      // Include promo codes if applied
      if (appliedPromoCode) {
        checkoutData.promoCodes = [appliedPromoCode.code];
      }

      checkoutMutation.mutate(checkoutData, {
        onSuccess: async (response) => {
          
          // Validate price changes
          const orderData = response?.data as any;
          const actualTotal = orderData?.total || 0;
          
          if (estimatedTotal > 0 && actualTotal > 0) {
            const percentChange = Math.abs((actualTotal - estimatedTotal) / estimatedTotal * 100);
            
            // Price changed >5% - Block checkout
            if (percentChange > 5) {
              setLoading(false);
              toast.error("Price Update Required", {
                description: "Exchange rates have changed significantly. Please refresh and try again.",
              });
              setTimeout(() => window.location.reload(), 2000);
              return;
            }
            
            // Price changed 1-5% - Show confirmation modal
            if (percentChange >= 1 && percentChange <= 5) {
              setPriceChangeInfo({
                estimated: estimatedTotal,
                actual: actualTotal,
                percentChange,
              });
              setShowPriceChangeDialog(true);
              setLoading(false);
              return; // Wait for user confirmation
            }
            
            // Price changed <1% - Show inline note (handled below)
          }

          // Clear promo code from localStorage after successful checkout
          if (typeof window !== "undefined") {
            localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
          }

          // Extract order data from response
          // Response structure: { success: boolean, data: { orderId, orderNumber, ... } }

          // If payment method is card, initiate payment flow
          if (
            selectedPayment === "card" &&
            orderData?.orderId &&
            orderData?.orderNumber
          ) {
            try {
              setIsRedirectingToGateway(true);
              await initiatePayment(orderData.orderId, orderData.orderNumber);
              // User will be redirected to MEPS, so we don't navigate here
            } catch (error) {
              setIsRedirectingToGateway(false);
              // Navigate to orders on payment initiation failure
              toast.error(
                t('messages.paymentInitiationFailed')
              );
              navigate(href(isGuestCheckout ? "/" : "/profile/orders"));
            } finally {
              // Reset loading state after payment flow completes
              setLoading(false);
            }
          } else {
            // For non-card payments, navigate to orders
            toast.success(t('messages.orderPlaced'));
            navigate(href(isGuestCheckout ? "/" : "/profile/orders"));
            setLoading(false);
          }
        },
        onError: (error) => {
          // Reset loading state on error
          setLoading(false);
        },
      });
    } catch (error) {
      alert("Failed to place order. Please try again.");
      setLoading(false);
    }
  };

  if (isRedirectingToGateway || (selectedPayment === "card" && isInitiating)) {
    return (
      <>
        <title>{t('pageTitle')}</title>
        <PaymentRedirectScreen />
      </>
    );
  }

  if (cartItems.length === 0) {
    return (
      <>
        <title>{t('pageTitle')}</title>
        <div className="bg-background-secondary py-8">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold text-gray-600 mb-4">
                {t('emptyCart.title')}
              </h3>
              <p className="text-gray-500 mb-8">
                {t('emptyCart.description')}
              </p>
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              >
                {t('emptyCart.continueShopping')}
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <title>{t('pageTitle')}</title>
      <div className="bg-background-secondary py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-6 flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              asChild
              className="bg-background hover:bg-background/60"
            >
              <Link to="/cart">
                <ArrowLeft />
              </Link>
            </Button>
            <h1 className="text-2xl font-black italic text-black">{t('title')}</h1>
          </div>

          <div className="grid lg:grid-cols-[4fr_2fr] gap-8">
            {/* Main Checkout Content */}
            <div className="space-y-6">
              {isGuestCheckout ? (
                <SimpleCard className="md:p-4 bg-background-secondary md:bg-background border-0 md:border">
                  <h2 className="mb-2 text-lg font-black italic text-black">
                    {t("guestSection.title")}
                  </h2>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {t("guestSection.description")}
                  </p>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="guest-first-name">
                        {t("guestSection.fields.firstNameLabel")} <span className="text-[#CF172F]">*</span>
                      </Label>
                      <Input
                        id="guest-first-name"
                        type="text"
                        value={guestFirstName}
                        onChange={(event) => setGuestFirstName(event.target.value)}
                        placeholder={t("guestSection.fields.firstNamePlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guest-last-name">
                        {t("guestSection.fields.lastNameLabel")} <span className="text-[#CF172F]">*</span>
                      </Label>
                      <Input
                        id="guest-last-name"
                        type="text"
                        value={guestLastName}
                        onChange={(event) => setGuestLastName(event.target.value)}
                        placeholder={t("guestSection.fields.lastNamePlaceholder")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guest-phone">
                        {t("guestSection.fields.phoneLabel")} <span className="text-[#CF172F]">*</span>
                      </Label>
                      <div dir="ltr">
                        <RPNInput.default
                          id="guest-phone"
                          className="flex"
                          countrySelectComponent={CountrySelect}
                          inputComponent={PhoneInput}
                          placeholder={t("guestSection.fields.phonePlaceholder")}
                          defaultCountry="JO"
                          countries={ADDRESS_ALLOWED_COUNTRIES}
                          countryCallingCodeEditable={false}
                          value={guestPhone || undefined}
                          onChange={(value) => setGuestPhone(value ?? "")}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guest-email">{t("guestSection.fields.emailLabel")}</Label>
                      <Input
                        id="guest-email"
                        type="email"
                        value={guestEmail}
                        onChange={(event) => setGuestEmail(event.target.value)}
                        placeholder={t("guestSection.fields.emailPlaceholder")}
                      />
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>
                        {t("guestSection.fields.countryLabel")} <span className="text-[#CF172F]">*</span>
                      </Label>
                      <Select
                        value={guestCountry}
                        onValueChange={(country) => {
                          setGuestCountry(country);
                          setGuestCity("");
                        }}
                      >
                        <SelectTrigger className="h-12 w-full">
                          <SelectValue placeholder={t("guestSection.fields.countryPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[250px] max-w-[250px]">
                          {Object.entries(flags)
                            .filter(([countryCode]) =>
                              ADDRESS_ALLOWED_COUNTRIES.includes(countryCode as RPNInput.Country)
                            )
                            .map(([countryCode, Flag]) => (
                              <SelectItem key={countryCode} value={countryCode}>
                                {Flag ? <Flag title={countryCode} /> : null}{" "}
                                <span>{guestRegionNames.of(countryCode)}</span>
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>
                        {t("guestSection.fields.cityLabel")} <span className="text-[#CF172F]">*</span>
                      </Label>
                      <Select
                        value={guestCity}
                        onValueChange={(city) => setGuestCity(city)}
                        disabled={!guestCountry}
                      >
                        <SelectTrigger className="h-12 w-full">
                          <SelectValue placeholder={t("guestSection.fields.cityPlaceholder")} />
                        </SelectTrigger>
                        <SelectContent>
                          {guestAvailableCities.map((city) => (
                            <SelectItem key={city} value={city}>
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="guest-address-line-1">
                        {t("guestSection.fields.addressLine1Label")} <span className="text-[#CF172F]">*</span>
                      </Label>
                      <Input
                        id="guest-address-line-1"
                        type="text"
                        value={guestAddressLine1}
                        onChange={(event) => setGuestAddressLine1(event.target.value)}
                        placeholder={t("guestSection.fields.addressLine1Placeholder")}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="guest-address-line-2">{t("guestSection.fields.addressLine2Label")}</Label>
                      <Input
                        id="guest-address-line-2"
                        type="text"
                        value={guestAddressLine2}
                        onChange={(event) => setGuestAddressLine2(event.target.value)}
                        placeholder={t("guestSection.fields.addressLine2Placeholder")}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="guest-postal-code">{t("guestSection.fields.postalCodeLabel")}</Label>
                      <Input
                        id="guest-postal-code"
                        type="text"
                        value={guestPostalCode}
                        onChange={(event) => setGuestPostalCode(event.target.value)}
                        placeholder={t("guestSection.fields.postalCodePlaceholder")}
                      />
                    </div>
                  </div>
                  <p className="mt-4 text-center text-sm leading-relaxed text-black/65">
                    <span>{t("guestSection.saveInfoPrefix")} </span>
                    <button
                      type="button"
                      className="cursor-pointer bg-transparent p-0 text-sm font-bold text-[#CF172F] hover:opacity-90"
                      onClick={() =>
                        openAuthModal("register", {
                          intent: {
                            type: "checkout",
                            returnTo: href("/checkout"),
                          },
                        })
                      }
                    >
                      {t("guestSection.saveInfoCreateAccount")}
                    </button>
                    <span> {t("guestSection.saveInfoOr")} </span>
                    <button
                      type="button"
                      className="cursor-pointer bg-transparent p-0 text-sm font-bold text-[#CF172F] hover:opacity-90"
                      onClick={() =>
                        openAuthModal("login", {
                          intent: {
                            type: "checkout",
                            returnTo: href("/checkout"),
                          },
                        })
                      }
                    >
                      {t("guestSection.saveInfoLogin")}
                    </button>
                  </p>
                </SimpleCard>
              ) : (
                <SimpleCard className="md:p-4 bg-background-secondary md:bg-background border-0 md:border">
                  <h2 className="text-lg font-black italic text-black mb-4">
                    {t('addressSection.title')}
                  </h2>
                  <RadioGroup
                    value={selectedAddress}
                    onValueChange={setSelectedAddress}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4"
                  >
                    {checkoutAddresses.map((address) => (
                      <AddressSelectionCard
                        key={address.id}
                        address={address}
                        isSelected={selectedAddress === address.id}
                        onSelect={setSelectedAddress}
                      />
                    ))}
                    <AddNewAddressCard onClick={() => setIsAddAddressDialogOpen(true)} />
                  </RadioGroup>
                </SimpleCard>
              )}

              {/* Payment Method */}
              <SimpleCard className="md:p-4 bg-background-secondary md:bg-background border-0 md:border">
                <h2 className="text-lg font-black italic text-black mb-4">
                  {t('paymentSection.title')}
                </h2>
                <RadioGroup
                  value={selectedPayment}
                  onValueChange={setSelectedPayment}
                >
                  <PaymentMethodCard
                    id="cod"
                    title={t('paymentSection.cashOnDelivery')}
                    icon={
                      <img
                      loading="lazy"
                        src="/pay-cash.svg"
                        alt="Cash on Delivery"
                        className="size-6"
                      />
                    }
                    isSelected={selectedPayment === "cod"}
                    onSelect={setSelectedPayment}
                  />
                  <PaymentMethodCard
                    id="card_on_delivery"
                    title={t('paymentSection.cardOnDelivery')}
                    icon={
                      <img
                      loading="lazy"
                        src="/pay-card-pos.svg"
                        alt="Card on Delivery"
                        className="size-6"
                      />
                    }
                    isSelected={selectedPayment === "card_on_delivery"}
                    onSelect={setSelectedPayment}
                  />
                  <PaymentMethodCard
                    id="cliq"
                    title={t('paymentSection.payWithCliq')}
                    icon={
                      <img src="/pay-cliq.svg" alt="Cliq" className="size-6" />
                    }
                    isSelected={selectedPayment === "cliq"}
                    onSelect={setSelectedPayment}
                  />
                  <PaymentMethodCard
                    id="card"
                    title={t('paymentSection.creditDebitCard')}
                    description={t('paymentSection.paySecurely')}
                    icon={<CreditCard className="size-6 text-primary" />}
                    isSelected={selectedPayment === "card"}
                    onSelect={setSelectedPayment}
                    disabled={false}
                  />
                </RadioGroup>
              </SimpleCard>
            </div>

            {/* Order Summary Sidebar */}
            <div className="space-y-2">
              <SimpleCard className="p-6">
                <div className="space-y-6">
                  {/* Header with Collapsible Button */}
                  <InlineAccordion type="single" collapsible className="w-full">
                    <InlineAccordionItem value="products" className="border-0">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-1">
                          <h2 className="text-[16px] md:text-base font-black italic text-black leading-[1.5] tracking-[-0.176px] md:tracking-normal">
                            {t('orderSummary.title')}
                          </h2>
                          {cartItems.length > 0 && (
                            <span className="text-[14px] md:text-sm font-normal not-italic text-[rgba(0,0,0,0.5)] leading-[1.5] tracking-[-0.154px] md:tracking-normal">
                              ({cartItems.length}{" "}
                              {cartItems.length === 1 ? t('orderSummary.item') : t('orderSummary.items')})
                            </span>
                          )}
                        </div>
                        {/* Collapsible Button - All Screen Sizes */}
                        <InlineAccordionTrigger
                          className="!p-0 !h-auto !bg-transparent !border-0 !shadow-none !ring-0 !flex !items-end
                         group !justify-end"
                        >
                          <AccordionDropdownButton />
                        </InlineAccordionTrigger>
                      </div>

                      {/* Product List - Collapsible on All Screens */}
                      <InlineAccordionContent className="pb-4">
                        <div className="flex flex-col gap-3 mb-4">
                          {cartItems.map((item) => {
                            // Handle both cart item structures (from loader with product object, or from query with direct properties)
                            const hasProductObject = "product" in item;

                            let productImage = "";
                            let productName = "Product Name";

                            if (hasProductObject) {
                              // Item from loader/API with product object
                              productImage = item.product.mainImage || "";
                              productName =
                                item.product.translations[0]?.name ||
                                "Product Name";
                            } else {
                              // Item from query with direct properties (CartItemFromQuery type)
                              const queryItem = item as {
                                productImage?: string;
                                productName?: string;
                              };
                              productImage = queryItem.productImage || "";
                              productName =
                                queryItem.productName || "Product Name";
                            }

                            const unitPrice = item.unitPrice;
                            const quantity = item.quantity;

                            return (
                              <div
                                key={item.productId}
                                className="flex gap-2 items-center"
                              >
                                {/* Product Image with Quantity Badge */}
                                <div className="relative shrink-0">
                                  {productImage ? (
                                    <img
                                    loading="lazy"
                                      src={productImage}
                                      alt={productName}
                                      className="w-[58.572px] h-[42.754px] rounded-[1.341px] object-cover"
                                    />
                                  ) : (
                                    <div className="w-[58.572px] h-[42.754px] rounded-[1.341px] bg-gray-200 flex items-center justify-center">
                                      <span className="text-[8px] text-gray-400">
                                        {t('orderSummary.noImage')}
                                      </span>
                                    </div>
                                  )}
                                  <div className="absolute -top-1 -right-1 bg-primary rounded-full size-[18px] flex items-center justify-center">
                                    <span className="text-[10.615px] font-semibold text-white leading-[1.5] tracking-[-0.1168px]">
                                      {quantity}
                                    </span>
                                  </div>
                                </div>
                                {/* Product Name and Price */}
                                <div className="flex-1 flex items-start justify-between min-w-0">
                                  <p className="text-[12px] font-medium text-black leading-[1.5] tracking-[-0.132px] flex-1 min-w-0 pr-2 capitalize">
                                    {productName.toLowerCase()}
                                  </p>
                                  <p className="text-[12px] font-semibold text-black leading-[1.5] tracking-[-0.132px] shrink-0">
                                    {isLoadingPrice ? (
                                      <span className="inline-block w-12 h-3 bg-gray-200 animate-pulse rounded"></span>
                                    ) : (
                                      `${selectedCurrency} ${unitPrice.toFixed(2)}`
                                    )}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <hr className="border-gray-300 mb-4" />
                      </InlineAccordionContent>
                    </InlineAccordionItem>
                  </InlineAccordion>

                  {/* Summary Details */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-[14px] md:text-sm leading-[1.5] tracking-[-0.154px] md:tracking-normal">
                      <span className="font-semibold">{t('orderSummary.subtotal')}</span>
                      <span className="font-extrabold text-right">
                        {isLoadingPrice ? (
                          <span className="inline-block w-16 h-4 bg-gray-200 animate-pulse rounded"></span>
                        ) : (
                          `${selectedCurrency} ${(convertedSubtotal ?? totals.subtotal).toFixed(2)}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-[14px] md:text-sm leading-[1.5] tracking-[-0.154px] md:tracking-normal">
                      <span className="font-semibold">{t('orderSummary.shippingCost')}</span>
                      <span className="font-extrabold text-primary font-koulen text-right">
                        {t('orderSummary.free')}
                      </span>
                    </div>
                    {totals.discountAmount > 0 && (
                      <div className="flex justify-between text-[14px] md:text-sm leading-[1.5] tracking-[-0.154px] md:tracking-normal">
                        <span className="font-semibold">
                          {t('orderSummary.discount')}
                          {appliedPromoCode && (
                            <span>
                              (
                              {appliedPromoCode.discountType === "PERCENTAGE"
                                ? `${appliedPromoCode.discountValue}%`
                                : `${selectedCurrency} ${appliedPromoCode.discountValue.toFixed(2)}`}
                              )
                            </span>
                          )}
                        </span>
                        <span className="font-extrabold text-green-600 text-right">
                          -{selectedCurrency} {totals.discountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    <hr className="border-gray-300" />

                    <div className="flex justify-between text-[16px] md:text-base font-bold leading-[1.5] tracking-[-0.176px] md:tracking-normal">
                      <span>{t('orderSummary.totalAmount')}</span>
                      <span className="text-right">
                        {isLoadingPrice ? (
                          <span className="inline-block w-20 h-4 bg-gray-200 animate-pulse rounded"></span>
                        ) : (
                          `${selectedCurrency} ${(convertedTotal ?? totals.total).toFixed(2)}`
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Promo Code Section */}
                    {appliedPromoCode ? (
                      <div className="bg-green-50 border border-green-200 rounded-sm p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-xs font-medium text-green-800">
                              {appliedPromoCode.code} -{" "}
                              {appliedPromoCode.discountType === "PERCENTAGE"
                                ? `${appliedPromoCode.discountValue}% ${t('promoCode.off')}`
                                : `${selectedCurrency} ${appliedPromoCode.discountValue.toFixed(2)} ${t('promoCode.off')}`}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs font-bold text-green-600 hover:text-green-700 hover:bg-green-100"
                            onClick={() => {
                              setAppliedPromoCode(null);
                              if (typeof window !== "undefined") {
                                localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
                              }
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="bg-background-secondary border rounded-sm p-3">
                          <div className="flex items-center justify-between gap-2">
                            <Input
                              placeholder={t('promoCode.placeholder')}
                              value={promoCode}
                              onChange={(e) => {
                                setPromoCode(e.target.value);
                                setPromoError(null);
                              }}
                              onKeyDown={handlePromoKeyDown}
                              className="border-0 bg-transparent p-0 text-xs h-auto focus-visible:ring-0 flex-1"
                              disabled={!!appliedPromoCode}
                            />
                            <Button
                              size="sm"
                              variant="inverted"
                              className="h-6 px-6 text-xs font-bold shrink-0"
                              onClick={handleApplyPromoCode}
                              disabled={
                                !!appliedPromoCode ||
                                !promoCode.trim() ||
                                isValidatingPromo
                              }
                            >
                              {isValidatingPromo ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                t('promoCode.apply')
                              )}
                            </Button>
                          </div>
                        </div>
                        {promoError && (
                          <p className="text-xs text-red-600 font-medium">
                            {promoError}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Expected Delivery */}
                    {(() => {
                      const deliveryDates = getExpectedDeliveryDates();
                      return (
                        <div className="bg-background-secondary border rounded-sm p-3 flex items-center gap-3">
                          <img
                          loading="lazy"
                            src="/expected-delivery.svg"
                            alt="Expected Delivery"
                            className="size-6 shrink-0"
                          />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-black">
                              {t('delivery.expectedIn')}{" "}
                              {t('delivery.daysRange')} (
                              {deliveryDates.formattedRange})
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    <Button
                      className="w-full h-10 bg-primary text-white font-black text-[14px] tracking-[-0.014px] rounded-[2px] hover:bg-primary/90"
                      onClick={() => {
                        void handlePlaceOrder();
                      }}
                      disabled={
                        loading ||
                        isInitiating ||
                        (!isGuestCheckout && !selectedAddress) ||
                        !selectedPayment ||
                        isValidatingPromo ||
                        (promoCode.trim().length > 0 && !appliedPromoCode)
                      }
                    >
                      {loading || isInitiating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          {isInitiating
                            ? t('actions.processingPayment')
                            : t('actions.placingOrder')}
                        </>
                      ) : (
                        t(isGuestCheckout ? "actions.placeGuestOrder" : "actions.confirmPayment")
                      )}
                    </Button>
                  </div>
                </div>
              </SimpleCard>

              <p className="text-[12px] md:text-sm font-medium text-[rgba(0,0,0,0.5)] leading-[1.5] tracking-[-0.132px] md:tracking-normal">
                {t('disclaimer')}
              </p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Price Change Confirmation Dialog */}
      <PriceChangeDialog
        open={showPriceChangeDialog}
        onOpenChange={setShowPriceChangeDialog}
        priceInfo={priceChangeInfo}
        onConfirm={handleConfirmPriceChange}
        currencySymbol={selectedCurrency}
      />
      {!isGuestCheckout && (
        <AddAddressDialog
          open={isAddAddressDialogOpen}
          onOpenChange={setIsAddAddressDialogOpen}
          onAddressCreated={async (createdAddressId, createdAddress) => {
            try {
              const refreshed = await getApiUsersMeAddresses({
                query: { page: 1, limit: 20 },
              });
              const refreshedAddresses = refreshed.data?.data?.addresses || [];
              if (refreshedAddresses.length > 0) {
                setCheckoutAddresses(refreshedAddresses);
                const created = refreshedAddresses.find((item) => item.id === createdAddressId);
                if (created) {
                  setSelectedAddress(created.id);
                  return;
                }
                const defaultAddress = refreshedAddresses.find((item) => item.isDefault);
                if (defaultAddress) {
                  setSelectedAddress(defaultAddress.id);
                  return;
                }
                setSelectedAddress(refreshedAddresses[0].id);
                return;
              }
            } catch (error) {
            }

            setCheckoutAddresses((current) => [createdAddress, ...current]);
            setSelectedAddress(createdAddress.id);
          }}
        />
      )}
    </>
  );
}

function PaymentRedirectScreen() {
  const { t } = useTranslation("checkout");
  return (
    <div className="bg-background-secondary min-h-[70vh] flex items-center justify-center px-6 py-12">
      <SimpleCard className="w-full max-w-xl p-8 text-center">
        <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Loader2 className="size-7 animate-spin text-primary" />
        </div>
        <h2 className="text-2xl font-black italic text-black mb-2">
          {t("paymentRedirect.title")}
        </h2>
        <p className="text-sm text-gray-600 mb-5">{t("paymentRedirect.description")}</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div className="h-full w-1/3 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
        </div>
        <p className="mt-4 text-xs text-gray-500">{t("paymentRedirect.note")}</p>
      </SimpleCard>
    </div>
  );
}

function AddressSelectionCard({
  address,
  isSelected,
  onSelect,
}: {
  address: AddressResponse["data"];
  isSelected: boolean;
  onSelect: (id: string) => void;
}) {
  const { t } = useTranslation('checkout');
  return (
    <SimpleCard
      className={`p-4 cursor-pointer transition-all ${
        isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-gray-50"
      }`}
      onClick={() => onSelect(address.id)}
    >
      <div>
        <RadioGroupItem
          value={address.id}
          id={address.id}
          className="sr-only"
        />
        <img
        loading="lazy"
          src="/nav-icons/address-outline.svg"
          alt="Address"
          className="size-6 mb-2"
        />
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-sm">{address.title}</h3>
          {address.isDefault && (
            <Badge variant="secondary" className="text-xs">
              {t('addressSection.default')}
            </Badge>
          )}
        </div>
        <p className="text-gray-600 text-xs">{address.addressLine1}</p>
      </div>
    </SimpleCard>
  );
}

function AddNewAddressCard({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation('checkout');
  return (
    <button
      type="button"
      onClick={onClick}
      className="p-4 flex flex-col justify-center items-center gap-2 bg-gray-100 border-gray-300  hover:bg-gray-200 transition-colors"
    >
      <div className="w-8 h-8 bg-[#7a95a8] rounded-sm flex items-center justify-center">
        <Plus className="w-4 h-4 text-white" />
      </div>
      <p className="text-sm font-medium text-[#7a95a8]">{t('addressSection.addNewAddress')}</p>
    </button>
  );
}

function AddAddressDialog({
  open,
  onOpenChange,
  onAddressCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddressCreated: (
    createdAddressId: string,
    createdAddress: AddressResponse["data"]
  ) => Promise<void>;
}) {
  const { t } = useTranslation("checkout");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    title?: string;
    country?: string;
    city?: string;
    addressLine1?: string;
  }>({});
  const [formData, setFormData] = useState({
    title: "",
    country: "",
    city: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
  });

  const resetModalState = () => {
    setIsSubmitting(false);
    setErrorMessage(null);
    setValidationErrors({});
    setFormData({
      title: "",
      country: "",
      city: "",
      addressLine1: "",
      addressLine2: "",
      postalCode: "",
    });
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetModalState();
    }
    onOpenChange(nextOpen);
  };

  const selectedCountry = formData.country as keyof typeof ADDRESS_CITIES;
  const availableCities = selectedCountry ? ADDRESS_CITIES[selectedCountry] || [] : [];
  const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

  const handleSubmit = async () => {
    const nextValidationErrors: {
      title?: string;
      country?: string;
      city?: string;
      addressLine1?: string;
    } = {};

    if (!formData.title.trim()) {
      nextValidationErrors.title = t("addressSection.addModal.errors.titleRequired");
    }
    if (!formData.country) {
      nextValidationErrors.country = t("addressSection.addModal.errors.countryRequired");
    }
    if (!formData.city) {
      nextValidationErrors.city = t("addressSection.addModal.errors.cityRequired");
    }
    if (!formData.addressLine1.trim()) {
      nextValidationErrors.addressLine1 = t("addressSection.addModal.errors.addressLine1Required");
    }

    setValidationErrors(nextValidationErrors);
    setErrorMessage(null);

    if (Object.keys(nextValidationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const createResponse = await postApiUsersMeAddresses({
        body: {
          title: formData.title.trim(),
          country: formData.country,
          city: formData.city,
          addressLine1: formData.addressLine1.trim(),
          addressLine2: formData.addressLine2.trim() || undefined,
          postalCode: formData.postalCode.trim() || undefined,
        },
      });

      if (createResponse.error || !createResponse.data?.data?.id) {
        throw new Error(createResponse.error?.error?.message || "Failed to create address");
      }

      await onAddressCreated(createResponse.data.data.id, createResponse.data.data);
      toast.success(t("messages.addressAdded"));
      handleOpenChange(false);
    } catch (error) {
      setErrorMessage(t("messages.addressAddFailed"));
      toast.error(t("messages.addressAddFailed"));
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-black italic text-black">
            {t("addressSection.addModal.title")}
          </DialogTitle>
          <DialogDescription>
            {t("addressSection.addModal.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="checkout-address-title">{t("addressSection.addModal.fields.title")}</Label>
            <Input
              id="checkout-address-title"
              placeholder={t("addressSection.addModal.placeholders.title")}
              value={formData.title}
              onChange={(event) =>
                setFormData((current) => ({ ...current, title: event.target.value }))
              }
              className="h-12 text-sm"
            />
            {validationErrors.title && (
              <p className="text-sm text-red-600">{validationErrors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t("addressSection.addModal.fields.country")}</Label>
              <Select
                value={formData.country}
                onValueChange={(country) =>
                  setFormData((current) => ({ ...current, country, city: "" }))
                }
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={t("addressSection.addModal.placeholders.country")} />
                </SelectTrigger>
                <SelectContent className="max-h-[250px] max-w-[250px]">
                  {Object.entries(flags)
                    .filter(([countryCode]) =>
                      ADDRESS_ALLOWED_COUNTRIES.includes(countryCode as RPNInput.Country)
                    )
                    .map(([countryCode, Flag]) => (
                      <SelectItem key={countryCode} value={countryCode}>
                        {Flag ? <Flag title={countryCode} /> : null}{" "}
                        <span>{regionNames.of(countryCode)}</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {validationErrors.country && (
                <p className="text-sm text-red-600">{validationErrors.country}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>{t("addressSection.addModal.fields.city")}</Label>
              <Select
                value={formData.city}
                onValueChange={(city) =>
                  setFormData((current) => ({ ...current, city }))
                }
                disabled={!formData.country}
              >
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={t("addressSection.addModal.placeholders.city")} />
                </SelectTrigger>
                <SelectContent>
                  {availableCities.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {validationErrors.city && (
                <p className="text-sm text-red-600">{validationErrors.city}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkout-address-line-1">{t("addressSection.addModal.fields.addressLine1")}</Label>
            <Input
              id="checkout-address-line-1"
              placeholder={t("addressSection.addModal.placeholders.addressLine1")}
              value={formData.addressLine1}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  addressLine1: event.target.value,
                }))
              }
              className="h-12 text-sm"
            />
            {validationErrors.addressLine1 && (
              <p className="text-sm text-red-600">{validationErrors.addressLine1}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkout-address-line-2">{t("addressSection.addModal.fields.addressLine2")}</Label>
            <Input
              id="checkout-address-line-2"
              placeholder={t("addressSection.addModal.placeholders.addressLine2")}
              value={formData.addressLine2}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  addressLine2: event.target.value,
                }))
              }
              className="h-12 text-sm"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkout-postal-code">{t("addressSection.addModal.fields.postalCode")}</Label>
            <Input
              id="checkout-postal-code"
              placeholder={t("addressSection.addModal.placeholders.postalCode")}
              value={formData.postalCode}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  postalCode: event.target.value,
                }))
              }
              className="h-12 text-sm"
            />
          </div>

          {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              {t("actions.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {t("actions.savingAddress")}
                </>
              ) : (
                t("actions.saveAddress")
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentMethodCard({
  id,
  title,
  description,
  icon,
  isSelected,
  onSelect,
  disabled = false,
}: {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <SimpleCard
      className={`py-6 px-4 cursor-pointer transition-all ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : isSelected
            ? "ring-2 ring-primary bg-primary/5"
            : "hover:bg-gray-50"
      }`}
      onClick={() => !disabled && onSelect(id)}
    >
      <div className="flex items-start gap-3">
        <RadioGroupItem
          value={id}
          id={id}
          className="sr-only"
          disabled={disabled}
        />
        <div className="flex items-center gap-3 flex-1">
          {icon}
          <div>
            <h3 className="font-bold text-sm">{title}</h3>
            {description && (
              <p className="text-gray-600 text-xs">{description}</p>
            )}
          </div>
        </div>
      </div>
    </SimpleCard>
  );
}

// Price Change Confirmation Dialog Component
function PriceChangeDialog({
  open,
  onOpenChange,
  priceInfo,
  onConfirm,
  currencySymbol,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  priceInfo: { estimated: number; actual: number; percentChange: number } | null;
  onConfirm: () => void;
  currencySymbol: string;
}) {
  if (!priceInfo) return null;
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Price Updated</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>The exchange rate has been updated. Please review the new total:</p>
            <div className="bg-gray-100 p-3 rounded space-y-1">
              <div className="flex justify-between text-sm">
                <span>Estimated:</span>
                <span className="line-through">{currencySymbol} {priceInfo.estimated.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>Updated Total:</span>
                <span>{currencySymbol} {priceInfo.actual.toFixed(2)}</span>
              </div>
              <div className="text-xs text-gray-500">
                Change: {priceInfo.percentChange.toFixed(1)}%
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel Order</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm & Continue</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
