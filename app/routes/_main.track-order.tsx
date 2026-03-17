import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { SimpleCard } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Package, Search, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router";
import { guestOrderLookupQueryOptions } from "~/lib/queries";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

export default function TrackOrder() {
  const { t } = useTranslation("track-order");
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Only fetch when user has submitted both fields
  const query = useQuery(
    guestOrderLookupQueryOptions(
      submitted ? orderNumber.trim() : "",
      submitted ? email.trim() : ""
    )
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderNumber.trim() && email.trim()) {
      setSubmitted(true);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setOrderNumber("");
    setEmail("");
  };

  const order = query.data?.data;

  return (
    <>
      <title>{t("pageTitle")}</title>
      <div className="bg-background-secondary py-8">
        <div className="max-w-2xl mx-auto px-6">
          {/* Search Form */}
          {!submitted || query.isError ? (
            <SimpleCard className="p-8">
              <div className="text-center mb-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-black italic text-black mb-2">
                  {t("title")}
                </h1>
                <p className="text-gray-600">{t("subtitle")}</p>
              </div>

              {query.isError && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-red-800">{t("error.title")}</p>
                    <p className="text-sm text-red-600">{t("error.description")}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="orderNumber">{t("form.orderNumber")}</Label>
                  <Input
                    id="orderNumber"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder={t("form.orderNumberPlaceholder")}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">{t("form.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("form.emailPlaceholder")}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={query.isLoading}>
                  {query.isLoading ? t("form.searching") : t("form.search")}
                </Button>
              </form>
            </SimpleCard>
          ) : query.isLoading ? (
            <SimpleCard className="p-8 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto" />
                <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
                <div className="h-32 bg-gray-200 rounded" />
              </div>
            </SimpleCard>
          ) : order ? (
            /* Order Details */
            <div className="space-y-4">
              <button
                onClick={handleReset}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-black transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {t("results.searchAgain")}
              </button>

              <SimpleCard className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-black italic">
                      {t("results.orderTitle", { orderNumber: order.orderNumber })}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {t("results.placedOn", { date: new Date(order.createdAt).toLocaleDateString() })}
                    </p>
                  </div>
                  <Badge className={STATUS_COLORS[order.status] || "bg-gray-100 text-gray-800"}>
                    {t(`results.status.${order.status}`)}
                  </Badge>
                </div>

                {/* Items */}
                <div className="border-t pt-4 space-y-3">
                  <h3 className="font-semibold text-sm text-gray-500 uppercase">
                    {t("results.items")}
                  </h3>
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      {item.productImage && (
                        <img
                          src={item.productImage}
                          alt={item.productName || ""}
                          className="w-12 h-12 object-cover rounded border"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.productName || item.productCode}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t("results.qty", { count: item.quantity })} × {item.unitPrice?.toFixed(2)} {item.currency}
                        </p>
                      </div>
                      <span className="text-sm font-semibold whitespace-nowrap">
                        {item.totalPrice?.toFixed(2)} {item.currency}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="border-t pt-4 mt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("results.subtotal")}</span>
                    <span>{order.subtotal.toFixed(2)} {order.currency}</span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{t("results.discount")}</span>
                      <span>-{order.discountAmount.toFixed(2)} {order.currency}</span>
                    </div>
                  )}
                  {order.shippingAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("results.shipping")}</span>
                      <span>{order.shippingAmount.toFixed(2)} {order.currency}</span>
                    </div>
                  )}
                  {order.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t("results.tax")}</span>
                      <span>{order.taxAmount.toFixed(2)} {order.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-base pt-2 border-t">
                    <span>{t("results.total")}</span>
                    <span>{order.totalAmount.toFixed(2)} {order.currency}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="border-t pt-4 mt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t("results.paymentMethod")}</span>
                    <span>{order.paymentMethod}</span>
                  </div>
                </div>

                {/* Shipping Address */}
                {order.shippingAddress && (
                  <div className="border-t pt-4 mt-4">
                    <h3 className="font-semibold text-sm text-gray-500 uppercase mb-2">
                      {t("results.shippingAddress")}
                    </h3>
                    <p className="text-sm">
                      {order.shippingAddress.addressLine1}
                      {order.shippingAddress.addressLine2 && <>, {order.shippingAddress.addressLine2}</>}
                      <br />
                      {order.shippingAddress.city}, {order.shippingAddress.country}
                      {order.shippingAddress.postalCode && <> {order.shippingAddress.postalCode}</>}
                    </p>
                  </div>
                )}
              </SimpleCard>

              <div className="flex gap-3 justify-center">
                <Button variant="outline" asChild>
                  <Link to="/">{t("results.continueShopping")}</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
