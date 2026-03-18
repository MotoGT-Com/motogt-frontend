import { useState, useEffect } from "react";
import { href, Link, useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import { SimpleCard } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  CreditCard,
  Loader2,
  ArrowLeft,
  Check,
  X,
  ChevronDown,
} from "lucide-react";
import {
  InlineAccordion,
  InlineAccordionContent,
  InlineAccordionItem,
  InlineAccordionTrigger,
} from "~/components/ui/inline-accordion";
import { AccordionDropdownButton } from "~/components/accordion-dropdown-button";
import type { Route } from "./+types/_main.guest-checkout";
import {
  getApiStoresByStoreIdCart,
  postApiPromoCodesValidate,
} from "~/lib/client";
import { defaultParams } from "~/lib/api-client";
import type { GuestCheckoutRequest } from "~/lib/client/types.gen";
import { useMutation } from "@tanstack/react-query";
import { guestCheckoutMutationOptions } from "~/lib/queries";
import { toast } from "sonner";
import { useCartManager } from "~/lib/cart-manager";
import { usePayment } from "~/lib/use-payment";
import { backupCart, saveGuestPaymentInfo } from "~/lib/payment-utils";
import { useCurrency } from "~/hooks/use-currency";
import { type Currency } from "~/lib/constants";
import { getExchangeRate } from "~/lib/currency-utils";
import { authContext } from "~/context";
import { useAuthModal } from "~/context/AuthModalContext";
import { PhoneInput } from "~/components/phone-number-input";
import { Checkbox } from "~/components/ui/checkbox";
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

export async function loader({ context }: Route.LoaderArgs) {
  const auth = context.get(authContext);

  // If user is already authenticated, redirect to regular checkout
  if (auth.isAuthenticated) {
    throw new Response(null, {
      status: 302,
      headers: { Location: "/checkout" },
    });
  }

  return { isAuthenticated: false };
}

const PROMO_CODE_STORAGE_KEY = "motogt_applied_promo_code";

interface ValidatedPromoCode {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  discountAmount: number;
}

const ADDRESS_ALLOWED_COUNTRIES: RPNInput.Country[] = ["JO", "AE", "SA", "QA"];

const ADDRESS_CITIES: Record<string, string[]> = {
  AE: [
    "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah",
    "Fujairah", "Umm Al Quwain", "Al Ain",
  ],
  SA: ["Riyadh", "Jeddah", "Dammam", "Khobar"],
  JO: [
    "Amman", "Zarqa", "Irbid", "Salt", "Madaba",
    "Jerash", "Ajloun", "Ruseifa", "Fuheis", "Mahis",
  ],
  QA: [
    "Doha", "Al Wakrah", "Al Khor", "Al Rayyan", "Umm Salal",
    "Al Daayen", "Al Shamal", "Lusail",
  ],
};

function getExpectedDeliveryDates() {
  const today = new Date();
  const minDate = new Date(today);
  minDate.setDate(today.getDate() + 2);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + 7);

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${day} ${monthNames[date.getMonth()]}`;
  };

  return {
    formattedRange: `${formatDate(minDate)}-${formatDate(maxDate)}`,
    daysRange: "2-7 Days",
  };
}

export default function GuestCheckout({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation("guest-checkout");
  const { t: tCheckout } = useTranslation("checkout");
  const navigate = useNavigate();
  const { openAuthModal } = useAuthModal();
  const guestCheckoutMutation = useMutation(guestCheckoutMutationOptions);
  const { initiatePayment, isInitiating } = usePayment();
  const { cartQuery } = useCartManager(false);

  // Contact info
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  // Shipping address
  const [shippingAddress, setShippingAddress] = useState({
    title: "",
    country: "",
    city: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
  });

  // Billing address
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] = useState({
    title: "",
    country: "",
    city: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
  });

  // Payment & order
  const [selectedPayment, setSelectedPayment] = useState("cod");
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState<string | null>(null);
  const [appliedPromoCode, setAppliedPromoCode] = useState<ValidatedPromoCode | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Currency
  const { selectedCurrency, batchConvert } = useCurrency();
  const [convertedTotal, setConvertedTotal] = useState<number | null>(null);
  const [convertedSubtotal, setConvertedSubtotal] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [isRedirectingToGateway, setIsRedirectingToGateway] = useState(false);

  // Price change dialog
  const [showPriceChangeDialog, setShowPriceChangeDialog] = useState(false);
  const [priceChangeInfo, setPriceChangeInfo] = useState<{
    estimated: number;
    actual: number;
    percentChange: number;
  } | null>(null);

  // Load stored promo code
  useEffect(() => {
    const stored = localStorage.getItem(PROMO_CODE_STORAGE_KEY);
    if (stored) {
      try {
        setAppliedPromoCode(JSON.parse(stored));
      } catch { /* ignore */ }
    }
  }, []);

  // Save promo code to localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (appliedPromoCode) {
        localStorage.setItem(PROMO_CODE_STORAGE_KEY, JSON.stringify(appliedPromoCode));
      } else {
        localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
      }
    }
  }, [appliedPromoCode]);

  const cartItems = cartQuery.data?.items || [];

  const calculateTotals = () => {
    const subtotal = cartItems.reduce(
      (sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0
    );
    let discountAmount = appliedPromoCode ? appliedPromoCode.discountAmount : 0;
    const total = subtotal - discountAmount;
    return { subtotal, discountAmount, total };
  };

  const totals = calculateTotals();

  // Currency conversion
  useEffect(() => {
    if (totals.total === 0) {
      setConvertedTotal(0);
      setConvertedSubtotal(0);
      return;
    }
    const cartCurrency = "JOD" as Currency;
    if (selectedCurrency === cartCurrency) {
      setConvertedTotal(totals.total);
      setConvertedSubtotal(totals.subtotal);
      return;
    }
    setIsLoadingPrice(true);
    batchConvert([totals.subtotal, totals.total], cartCurrency)
      .then((results) => {
        setConvertedSubtotal(results.convertedAmounts[0]);
        setConvertedTotal(results.convertedAmounts[1]);
      })
      .catch(() => {
        setConvertedSubtotal(totals.subtotal);
        setConvertedTotal(totals.total);
      })
      .finally(() => setIsLoadingPrice(false));
  }, [totals.subtotal, totals.total, selectedCurrency, batchConvert]);

  const getPaymentMethodValue = (paymentId: string): GuestCheckoutRequest["paymentMethod"] => {
    switch (paymentId) {
      case "cod": return "cash_on_delivery";
      case "card_on_delivery": return "card_on_delivery";
      case "cliq": return "digital_wallet";
      // case "card": return "credit_card";
      default: return "cash_on_delivery";
    }
  };

  const handleApplyPromoCode = async () => {
    const trimmedCode = promoCode.trim();
    if (!trimmedCode) { setPromoError(tCheckout("promoCode.enterCode")); return; }
    if (appliedPromoCode) { setPromoError(tCheckout("promoCode.alreadyApplied")); return; }

    const subtotal = totals.subtotal;
    setIsValidatingPromo(true);
    setPromoError(null);

    try {
      const response = await postApiPromoCodesValidate({
        body: { code: trimmedCode, subtotal, currency: "JOD" },
      });
      if (response.data?.success && response.data.data.valid) {
        const promoData = response.data.data;
        if (
          promoData.promoCode?.code &&
          promoData.promoCode?.discountType &&
          typeof promoData.promoCode?.discountValue === "number" &&
          typeof promoData.discount?.amount === "number"
        ) {
          setAppliedPromoCode({
            code: promoData.promoCode.code,
            discountType: promoData.promoCode.discountType,
            discountValue: promoData.promoCode.discountValue,
            discountAmount: promoData.discount.amount,
          });
          setPromoCode("");
          setPromoError(null);
          toast.success(tCheckout("promoCode.applied"));
        } else {
          setPromoError(tCheckout("promoCode.invalid"));
        }
      } else {
        const errors = response.data?.data?.errors || [tCheckout("promoCode.invalid")];
        setPromoError(errors[0]);
      }
    } catch {
      setPromoError(tCheckout("promoCode.validationFailed"));
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!email.trim()) errors.email = t("validation.emailRequired");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.email = t("validation.emailInvalid");
    if (!phone.trim() || phone.trim().length < 5) errors.phone = t("validation.phoneRequired");
    if (!firstName.trim()) errors.firstName = t("validation.firstNameRequired");
    if (!lastName.trim()) errors.lastName = t("validation.lastNameRequired");

    if (!shippingAddress.title.trim()) errors["shipping.title"] = t("validation.titleRequired");
    if (!shippingAddress.country) errors["shipping.country"] = t("validation.countryRequired");
    if (!shippingAddress.city) errors["shipping.city"] = t("validation.cityRequired");
    if (!shippingAddress.addressLine1.trim()) errors["shipping.addressLine1"] = t("validation.addressRequired");

    if (!billingSameAsShipping) {
      if (!billingAddress.title.trim()) errors["billing.title"] = t("validation.titleRequired");
      if (!billingAddress.country) errors["billing.country"] = t("validation.countryRequired");
      if (!billingAddress.city) errors["billing.city"] = t("validation.cityRequired");
      if (!billingAddress.addressLine1.trim()) errors["billing.addressLine1"] = t("validation.addressRequired");
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (!validateForm()) {
      toast.error(t("validation.fixErrors"));
      return;
    }

    setLoading(true);
    try {
      if (selectedPayment === "card" && cartItems.length > 0) {
        backupCart(cartItems);
      }

      const checkoutData: GuestCheckoutRequest = {
        storeId: defaultParams.storeId,
        email: email.trim(),
        phone: phone.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        shippingAddress: {
          title: shippingAddress.title.trim(),
          country: shippingAddress.country,
          city: shippingAddress.city,
          addressLine1: shippingAddress.addressLine1.trim(),
          addressLine2: shippingAddress.addressLine2.trim() || undefined,
          postalCode: shippingAddress.postalCode.trim() || undefined,
        },
        paymentCurrency: selectedCurrency as GuestCheckoutRequest["paymentCurrency"],
        paymentMethod: getPaymentMethodValue(selectedPayment),
      };

      if (!billingSameAsShipping) {
        checkoutData.billingAddress = {
          title: billingAddress.title.trim(),
          country: billingAddress.country,
          city: billingAddress.city,
          addressLine1: billingAddress.addressLine1.trim(),
          addressLine2: billingAddress.addressLine2.trim() || undefined,
          postalCode: billingAddress.postalCode.trim() || undefined,
        };
      }

      if (selectedPayment === "cliq") {
        checkoutData.notes = "Payment method: Pay with CliQ";
      } else if (selectedPayment === "card_on_delivery") {
        checkoutData.notes = "Payment method: Card on Delivery";
      } 
      // else if (selectedPayment === "card") {
      //   checkoutData.notes = "Payment method: Credit Card";
      // }

      if (appliedPromoCode) {
        checkoutData.promoCodes = [appliedPromoCode.code];
      }

      guestCheckoutMutation.mutate(checkoutData, {
        onSuccess: async (response) => {
          if (typeof window !== "undefined") {
            localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
          }

          const orderData = response?.data as any;

          if (selectedPayment === "card" && orderData?.orderId && orderData?.orderNumber) {
            try {
              setIsRedirectingToGateway(true);
              saveGuestPaymentInfo(email.trim(), orderData.orderNumber);
              await initiatePayment(orderData.orderId, orderData.orderNumber);
            } catch {
              setIsRedirectingToGateway(false);
              toast.error(t("messages.paymentInitiationFailed"));
              // Navigate to confirmation with the order info we have
              navigate(
                `/guest-order-confirmation?orderNumber=${encodeURIComponent(orderData.orderNumber)}&email=${encodeURIComponent(email.trim())}`
              );
            } finally {
              setLoading(false);
            }
          } else {
            toast.success(t("messages.orderPlaced"));
            navigate(
              `/guest-order-confirmation?orderNumber=${encodeURIComponent(orderData.orderNumber)}&email=${encodeURIComponent(email.trim())}`
            );
            setLoading(false);
          }
        },
        onError: () => {
          setLoading(false);
        },
      });
    } catch {
      toast.error(t("messages.orderError"));
      setLoading(false);
    }
  };

  const selectedShippingCountry = shippingAddress.country;
  const availableShippingCities = selectedShippingCountry ? ADDRESS_CITIES[selectedShippingCountry] || [] : [];
  const selectedBillingCountry = billingAddress.country;
  const availableBillingCities = selectedBillingCountry ? ADDRESS_CITIES[selectedBillingCountry] || [] : [];
  const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

  if (isRedirectingToGateway || (selectedPayment === "card" && isInitiating)) {
    return (
      <>
        <title>{t("pageTitle")}</title>
        <div className="bg-background-secondary min-h-[70vh] flex items-center justify-center px-6 py-12">
          <SimpleCard className="w-full max-w-xl p-8 text-center">
            <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="size-7 animate-spin text-primary" />
            </div>
            <h2 className="text-2xl font-black italic text-black mb-2">
              {tCheckout("paymentRedirect.title")}
            </h2>
            <p className="text-sm text-gray-600 mb-5">{tCheckout("paymentRedirect.description")}</p>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div className="h-full w-1/3 animate-[pulse_1.4s_ease-in-out_infinite] rounded-full bg-primary" />
            </div>
            <p className="mt-4 text-xs text-gray-500">{tCheckout("paymentRedirect.note")}</p>
          </SimpleCard>
        </div>
      </>
    );
  }

  if (cartItems.length === 0 && !cartQuery.isLoading) {
    return (
      <>
        <title>{t("pageTitle")}</title>
        <div className="bg-background-secondary py-8">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center py-16">
              <h3 className="text-xl font-semibold text-gray-600 mb-4">
                {tCheckout("emptyCart.title")}
              </h3>
              <p className="text-gray-500 mb-8">{tCheckout("emptyCart.description")}</p>
              <Link
                to="/"
                className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
              >
                {tCheckout("emptyCart.continueShopping")}
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <title>{t("pageTitle")}</title>
      <div className="bg-background-secondary py-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-6 flex items-center gap-2">
            <Button variant="outline" size="icon" asChild className="bg-background hover:bg-background/60">
              <Link to="/cart"><ArrowLeft /></Link>
            </Button>
            <h1 className="text-2xl font-black italic text-black">{t("title")}</h1>
          </div>

          <div className="grid lg:grid-cols-[4fr_2fr] gap-8">
            {/* Main Content */}
            <div className="space-y-6">
              {/* Already have an account? */}
              <SimpleCard className="md:p-4 bg-background-secondary md:bg-background border-0 md:border">
                <p className="text-sm text-gray-600">
                  {t("haveAccount")}{" "}
                  <button
                    type="button"
                    className="text-primary font-bold hover:underline"
                    onClick={() =>
                      openAuthModal("login", {
                        intent: { type: "checkout", returnTo: href("/checkout") },
                      })
                    }
                  >
                    {t("loginLink")}
                  </button>
                </p>
              </SimpleCard>

              {/* Contact Information */}
              <SimpleCard className="md:p-4 bg-background-secondary md:bg-background border-0 md:border">
                <h2 className="text-lg font-black italic text-black mb-4">{t("contact.title")}</h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="guest-first-name">{t("contact.firstName")}</Label>
                      <Input
                        id="guest-first-name"
                        placeholder={t("contact.firstNamePlaceholder")}
                        value={firstName}
                        onChange={(e) => { setFirstName(e.target.value); setValidationErrors((prev) => { const n = {...prev}; delete n.firstName; return n; }); }}
                        className="h-12 text-sm"
                      />
                      {validationErrors.firstName && <p className="text-sm text-red-600">{validationErrors.firstName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="guest-last-name">{t("contact.lastName")}</Label>
                      <Input
                        id="guest-last-name"
                        placeholder={t("contact.lastNamePlaceholder")}
                        value={lastName}
                        onChange={(e) => { setLastName(e.target.value); setValidationErrors((prev) => { const n = {...prev}; delete n.lastName; return n; }); }}
                        className="h-12 text-sm"
                      />
                      {validationErrors.lastName && <p className="text-sm text-red-600">{validationErrors.lastName}</p>}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="guest-email">{t("contact.email")}</Label>
                    <Input
                      id="guest-email"
                      type="email"
                      placeholder={t("contact.emailPlaceholder")}
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setValidationErrors((prev) => { const n = {...prev}; delete n.email; return n; }); }}
                      className="h-12 text-sm"
                    />
                    {validationErrors.email && <p className="text-sm text-red-600">{validationErrors.email}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>{t("contact.phone")}</Label>
                    <RPNInput.default
                      international
                      defaultCountry="JO"
                      value={phone}
                      onChange={(value) => { setPhone(value || ""); setValidationErrors((prev) => { const n = {...prev}; delete n.phone; return n; }); }}
                      className="flex rounded-md border border-input bg-background px-3 h-12 text-sm ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
                      inputComponent={Input}
                      flagComponent={FlagComponent}
                      countrySelectComponent={CountrySelect}
                    />
                    {validationErrors.phone && <p className="text-sm text-red-600">{validationErrors.phone}</p>}
                  </div>
                </div>
              </SimpleCard>

              {/* Shipping Address */}
              <SimpleCard className="md:p-4 bg-background-secondary md:bg-background border-0 md:border">
                <h2 className="text-lg font-black italic text-black mb-4">{t("shipping.title")}</h2>
                <AddressForm
                  address={shippingAddress}
                  onChange={setShippingAddress}
                  errors={validationErrors}
                  prefix="shipping"
                  cities={availableShippingCities}
                  regionNames={regionNames}
                  t={t}
                />

                <div className="mt-4 flex items-center gap-2">
                  <Checkbox
                    id="billing-same"
                    checked={billingSameAsShipping}
                    onCheckedChange={(checked) => setBillingSameAsShipping(checked === true)}
                  />
                  <Label htmlFor="billing-same" className="text-sm font-medium cursor-pointer">
                    {t("shipping.billingSameAsShipping")}
                  </Label>
                </div>
              </SimpleCard>

              {/* Billing Address (conditional) */}
              {!billingSameAsShipping && (
                <SimpleCard className="md:p-4 bg-background-secondary md:bg-background border-0 md:border">
                  <h2 className="text-lg font-black italic text-black mb-4">{t("billing.title")}</h2>
                  <AddressForm
                    address={billingAddress}
                    onChange={setBillingAddress}
                    errors={validationErrors}
                    prefix="billing"
                    cities={availableBillingCities}
                    regionNames={regionNames}
                    t={t}
                  />
                </SimpleCard>
              )}

              {/* Payment Method */}
              <SimpleCard className="md:p-4 bg-background-secondary md:bg-background border-0 md:border">
                <h2 className="text-lg font-black italic text-black mb-4">
                  {tCheckout("paymentSection.title")}
                </h2>
                <RadioGroup value={selectedPayment} onValueChange={setSelectedPayment}>
                  <PaymentMethodCard
                    id="cod"
                    title={tCheckout("paymentSection.cashOnDelivery")}
                    icon={<img loading="lazy" src="/pay-cash.svg" alt="Cash on Delivery" className="size-6" />}
                    isSelected={selectedPayment === "cod"}
                    onSelect={setSelectedPayment}
                  />
                  <PaymentMethodCard
                    id="card_on_delivery"
                    title={tCheckout("paymentSection.cardOnDelivery")}
                    icon={<img loading="lazy" src="/pay-card-pos.svg" alt="Card on Delivery" className="size-6" />}
                    isSelected={selectedPayment === "card_on_delivery"}
                    onSelect={setSelectedPayment}
                  />
                  <PaymentMethodCard
                    id="cliq"
                    title={tCheckout("paymentSection.payWithCliq")}
                    icon={<img src="/pay-cliq.svg" alt="Cliq" className="size-6" />}
                    isSelected={selectedPayment === "cliq"}
                    onSelect={setSelectedPayment}
                  />
                  {/* <PaymentMethodCard
                    id="card"
                    title={tCheckout("paymentSection.creditDebitCard")}
                    description={tCheckout("paymentSection.paySecurely")}
                    icon={<CreditCard className="size-6 text-primary" />}
                    isSelected={selectedPayment === "card"}
                    onSelect={setSelectedPayment}
                  /> */}
                </RadioGroup>
              </SimpleCard>
            </div>

            {/* Order Summary Sidebar */}
            <div className="space-y-2">
              <SimpleCard className="p-6">
                <div className="space-y-6">
                  {/* Cart Items */}
                  <InlineAccordion type="single" collapsible className="w-full">
                    <InlineAccordionItem value="products" className="border-0">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-1">
                          <h2 className="text-[16px] md:text-base font-black italic text-black leading-[1.5] tracking-[-0.176px]">
                            {tCheckout("orderSummary.title")}
                          </h2>
                          {cartItems.length > 0 && (
                            <span className="text-[14px] md:text-sm font-normal not-italic text-[rgba(0,0,0,0.5)] leading-[1.5] tracking-[-0.154px]">
                              ({cartItems.length}{" "}
                              {cartItems.length === 1 ? tCheckout("orderSummary.item") : tCheckout("orderSummary.items")})
                            </span>
                          )}
                        </div>
                        <InlineAccordionTrigger className="!p-0 !h-auto !bg-transparent !border-0 !shadow-none !ring-0 !flex !items-end group !justify-end">
                          <AccordionDropdownButton />
                        </InlineAccordionTrigger>
                      </div>

                      <InlineAccordionContent className="pb-4">
                        <div className="flex flex-col gap-3 mb-4">
                          {cartItems.map((item) => {
                            const productImage = (item as any).productImage || "";
                            const productName = (item as any).productTranslations?.[0]?.name || "Product";
                            return (
                              <div key={item.productId} className="flex gap-2 items-center">
                                <div className="relative shrink-0">
                                  {productImage ? (
                                    <img loading="lazy" src={productImage} alt={productName} className="w-[58.572px] h-[42.754px] rounded-[1.341px] object-cover" />
                                  ) : (
                                    <div className="w-[58.572px] h-[42.754px] rounded-[1.341px] bg-gray-200 flex items-center justify-center">
                                      <span className="text-[8px] text-gray-400">{tCheckout("orderSummary.noImage")}</span>
                                    </div>
                                  )}
                                  <div className="absolute -top-1 -right-1 bg-primary rounded-full size-[18px] flex items-center justify-center">
                                    <span className="text-[10.615px] font-semibold text-white leading-[1.5] tracking-[-0.1168px]">{item.quantity}</span>
                                  </div>
                                </div>
                                <div className="flex-1 flex items-start justify-between min-w-0">
                                  <p className="text-[12px] font-medium text-black leading-[1.5] tracking-[-0.132px] flex-1 min-w-0 pr-2 capitalize">
                                    {productName.toLowerCase()}
                                  </p>
                                  <p className="text-[12px] font-semibold text-black leading-[1.5] tracking-[-0.132px] shrink-0">
                                    {isLoadingPrice ? (
                                      <span className="inline-block w-12 h-3 bg-gray-200 animate-pulse rounded"></span>
                                    ) : (
                                      `${selectedCurrency} ${item.unitPrice.toFixed(2)}`
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

                  {/* Totals */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-[14px] md:text-sm leading-[1.5]">
                      <span className="font-semibold">{tCheckout("orderSummary.subtotal")}</span>
                      <span className="font-extrabold text-right">
                        {isLoadingPrice ? (
                          <span className="inline-block w-16 h-4 bg-gray-200 animate-pulse rounded"></span>
                        ) : (
                          `${selectedCurrency} ${(convertedSubtotal ?? totals.subtotal).toFixed(2)}`
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-[14px] md:text-sm leading-[1.5]">
                      <span className="font-semibold">{tCheckout("orderSummary.shippingCost")}</span>
                      <span className="font-extrabold text-primary font-koulen text-right">{tCheckout("orderSummary.free")}</span>
                    </div>
                    {totals.discountAmount > 0 && (
                      <div className="flex justify-between text-[14px] md:text-sm leading-[1.5]">
                        <span className="font-semibold">
                          {tCheckout("orderSummary.discount")}
                          {appliedPromoCode && (
                            <span>
                              ({appliedPromoCode.discountType === "PERCENTAGE"
                                ? `${appliedPromoCode.discountValue}%`
                                : `${selectedCurrency} ${appliedPromoCode.discountValue.toFixed(2)}`})
                            </span>
                          )}
                        </span>
                        <span className="font-extrabold text-green-600 text-right">
                          -{selectedCurrency} {totals.discountAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    <hr className="border-gray-300" />
                    <div className="flex justify-between text-[16px] md:text-base font-bold leading-[1.5]">
                      <span>{tCheckout("orderSummary.totalAmount")}</span>
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
                    {/* Promo Code */}
                    {appliedPromoCode ? (
                      <div className="bg-green-50 border border-green-200 rounded-sm p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            <span className="text-xs font-medium text-green-800">
                              {appliedPromoCode.code} -{" "}
                              {appliedPromoCode.discountType === "PERCENTAGE"
                                ? `${appliedPromoCode.discountValue}% ${tCheckout("promoCode.off")}`
                                : `${selectedCurrency} ${appliedPromoCode.discountValue.toFixed(2)} ${tCheckout("promoCode.off")}`}
                            </span>
                          </div>
                          <Button
                            size="sm" variant="ghost"
                            className="h-6 px-2 text-xs font-bold text-green-600 hover:text-green-700 hover:bg-green-100"
                            onClick={() => {
                              setAppliedPromoCode(null);
                              if (typeof window !== "undefined") localStorage.removeItem(PROMO_CODE_STORAGE_KEY);
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
                              placeholder={tCheckout("promoCode.placeholder")}
                              value={promoCode}
                              onChange={(e) => { setPromoCode(e.target.value); setPromoError(null); }}
                              onKeyDown={(e) => { if (e.key === "Enter") handleApplyPromoCode(); }}
                              className="border-0 bg-transparent p-0 text-xs h-auto focus-visible:ring-0 flex-1"
                            />
                            <Button
                              size="sm" variant="inverted"
                              className="h-6 px-6 text-xs font-bold shrink-0"
                              onClick={handleApplyPromoCode}
                              disabled={!!appliedPromoCode || !promoCode.trim() || isValidatingPromo}
                            >
                              {isValidatingPromo ? <Loader2 className="h-3 w-3 animate-spin" /> : tCheckout("promoCode.apply")}
                            </Button>
                          </div>
                        </div>
                        {promoError && <p className="text-xs text-red-600 font-medium">{promoError}</p>}
                      </div>
                    )}

                    {/* Expected Delivery */}
                    {(() => {
                      const deliveryDates = getExpectedDeliveryDates();
                      return (
                        <div className="bg-background-secondary border rounded-sm p-3 flex items-center gap-3">
                          <img loading="lazy" src="/expected-delivery.svg" alt="Expected Delivery" className="size-6 shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs font-medium text-black">
                              {tCheckout("delivery.expectedIn")} {tCheckout("delivery.daysRange")} ({deliveryDates.formattedRange})
                            </p>
                          </div>
                        </div>
                      );
                    })()}

                    <Button
                      className="w-full h-10 bg-primary text-white font-black text-[14px] tracking-[-0.014px] rounded-[2px] hover:bg-primary/90"
                      onClick={handlePlaceOrder}
                      disabled={
                        loading || isInitiating || isValidatingPromo ||
                        (promoCode.trim().length > 0 && !appliedPromoCode)
                      }
                    >
                      {loading || isInitiating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          {isInitiating ? tCheckout("actions.processingPayment") : tCheckout("actions.placingOrder")}
                        </>
                      ) : (
                        tCheckout("actions.confirmPayment")
                      )}
                    </Button>
                  </div>
                </div>
              </SimpleCard>

              <p className="text-[12px] md:text-sm font-medium text-[rgba(0,0,0,0.5)] leading-[1.5] tracking-[-0.132px]">
                {tCheckout("disclaimer")}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Price Change Dialog */}
      <AlertDialog open={showPriceChangeDialog} onOpenChange={setShowPriceChangeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("priceChange.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {priceChangeInfo && t("priceChange.description", {
                estimated: `${selectedCurrency} ${priceChangeInfo.estimated.toFixed(2)}`,
                actual: `${selectedCurrency} ${priceChangeInfo.actual.toFixed(2)}`,
                percent: priceChangeInfo.percentChange.toFixed(1),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCheckout("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowPriceChangeDialog(false); handlePlaceOrder(); }}>
              {tCheckout("actions.continue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// --- Sub-components ---

function AddressForm({
  address,
  onChange,
  errors,
  prefix,
  cities,
  regionNames,
  t,
}: {
  address: { title: string; country: string; city: string; addressLine1: string; addressLine2: string; postalCode: string };
  onChange: (addr: typeof address) => void;
  errors: Record<string, string>;
  prefix: string;
  cities: string[];
  regionNames: Intl.DisplayNames;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t("address.title")}</Label>
        <Input
          placeholder={t("address.titlePlaceholder")}
          value={address.title}
          onChange={(e) => onChange({ ...address, title: e.target.value })}
          className="h-12 text-sm"
        />
        {errors[`${prefix}.title`] && <p className="text-sm text-red-600">{errors[`${prefix}.title`]}</p>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t("address.country")}</Label>
          <Select
            value={address.country}
            onValueChange={(country) => onChange({ ...address, country, city: "" })}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder={t("address.countryPlaceholder")} />
            </SelectTrigger>
            <SelectContent className="max-h-[250px] max-w-[250px]">
              {Object.entries(flags)
                .filter(([code]) => ADDRESS_ALLOWED_COUNTRIES.includes(code as RPNInput.Country))
                .map(([code, Flag]) => (
                  <SelectItem key={code} value={code}>
                    {Flag ? <Flag title={code} /> : null} <span>{regionNames.of(code)}</span>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {errors[`${prefix}.country`] && <p className="text-sm text-red-600">{errors[`${prefix}.country`]}</p>}
        </div>

        <div className="space-y-2">
          <Label>{t("address.city")}</Label>
          <Select
            value={address.city}
            onValueChange={(city) => onChange({ ...address, city })}
            disabled={!address.country}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder={t("address.cityPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              {cities.map((city) => (
                <SelectItem key={city} value={city}>{city}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors[`${prefix}.city`] && <p className="text-sm text-red-600">{errors[`${prefix}.city`]}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t("address.addressLine1")}</Label>
        <Input
          placeholder={t("address.addressLine1Placeholder")}
          value={address.addressLine1}
          onChange={(e) => onChange({ ...address, addressLine1: e.target.value })}
          className="h-12 text-sm"
        />
        {errors[`${prefix}.addressLine1`] && <p className="text-sm text-red-600">{errors[`${prefix}.addressLine1`]}</p>}
      </div>

      <div className="space-y-2">
        <Label>{t("address.addressLine2")}</Label>
        <Input
          placeholder={t("address.addressLine2Placeholder")}
          value={address.addressLine2}
          onChange={(e) => onChange({ ...address, addressLine2: e.target.value })}
          className="h-12 text-sm"
        />
      </div>

      <div className="space-y-2">
        <Label>{t("address.postalCode")}</Label>
        <Input
          placeholder={t("address.postalCodePlaceholder")}
          value={address.postalCode}
          onChange={(e) => onChange({ ...address, postalCode: e.target.value })}
          className="h-12 text-sm"
        />
      </div>
    </div>
  );
}

function PaymentMethodCard({
  id, title, description, icon, isSelected, onSelect, disabled = false,
}: {
  id: string; title: string; description?: string; icon: React.ReactNode;
  isSelected: boolean; onSelect: (id: string) => void; disabled?: boolean;
}) {
  return (
    <SimpleCard
      className={`py-6 px-4 cursor-pointer transition-all ${
        disabled ? "opacity-50 cursor-not-allowed"
          : isSelected ? "ring-2 ring-primary bg-primary/5" : "hover:bg-gray-50"
      }`}
      onClick={() => !disabled && onSelect(id)}
    >
      <div className="flex items-start gap-3">
        <RadioGroupItem value={id} id={`guest-${id}`} className="sr-only" disabled={disabled} />
        <div className="flex items-center gap-3 flex-1">
          {icon}
          <div>
            <h3 className="font-bold text-sm">{title}</h3>
            {description && <p className="text-gray-600 text-xs">{description}</p>}
          </div>
        </div>
      </div>
    </SimpleCard>
  );
}

function FlagComponent({ country, countryName }: RPNInput.FlagProps) {
  const Flag = flags[country];
  return <span className="flex h-4 w-6 overflow-hidden rounded-sm">{Flag && <Flag title={countryName} />}</span>;
}

function CountrySelect({
  disabled, value, onChange, options,
}: {
  disabled?: boolean;
  value: RPNInput.Country;
  onChange: (value: RPNInput.Country) => void;
  options: { label: string; value: RPNInput.Country | undefined }[];
}) {
  return (
    <Select disabled={disabled} value={value} onValueChange={(v) => onChange(v as RPNInput.Country)}>
      <SelectTrigger className="border-0 bg-transparent p-0 h-auto w-auto focus:ring-0 shadow-none">
        <SelectValue>
          <FlagComponent country={value} countryName={value} />
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {options
          .filter((opt) => opt.value)
          .map((opt) => (
            <SelectItem key={opt.value} value={opt.value!}>
              <span className="flex items-center gap-2">
                <FlagComponent country={opt.value!} countryName={opt.label} />
                <span>{opt.label}</span>
              </span>
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
