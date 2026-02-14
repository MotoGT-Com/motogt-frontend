import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircleIcon, TruckIcon } from "lucide-react";
import type { GetApiCheckoutOrdersResponse } from "~/lib/client";
import { openWhatsAppMessage } from "~/lib/whatsapp";
import { addDays, formatDayMonth, isOnOrAfter } from "~/lib/date-utils";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, } from "~/components/ui/dialog";
import { cn } from "~/lib/utils";

type OrderItem =
  GetApiCheckoutOrdersResponse["data"]["orders"][number]["items"][number];

type ReportMissingItemModalProps = {
  orderId: string;
  orderNumber: string;
  orderDate: string | Date;
  orderStatus?: string;
  items: OrderItem[];
  trigger: ReactNode;
};

export default function ReportMissingItemModal({
  orderId,
  orderNumber,
  orderDate,
  orderStatus,
  items,
  trigger,
}: ReportMissingItemModalProps) {
  const { t } = useTranslation("profile");
  const [open, setOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const expectedDeliveryDate = useMemo(
    () => addDays(orderDate, 7),
    [orderDate]
  );
  const isDelivered = orderStatus === "delivered";
  const canReport =
    isDelivered || isOnOrAfter(new Date(), expectedDeliveryDate);

  useEffect(() => {
    if (!open) {
      setSelectedItemIds([]);
    }
  }, [open]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedItemIds.includes(item.id)),
    [items, selectedItemIds]
  );

  const toggleItem = (itemId: string) => {
    setSelectedItemIds((current) =>
      current.includes(itemId)
        ? current.filter((id) => id !== itemId)
        : [...current, itemId]
    );
  };

  const handleSendReport = () => {
    if (selectedItems.length === 0) return;
    const lines = [
      `Hello, I have an issue with Order #${orderId}.`,
      "I did not receive:",
      ...selectedItems.map(
        (item) => `- ${item.product.translations[0]?.name || t("orders.item")}`
      ),
    ];
    openWhatsAppMessage(lines.join("\n"));
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TruckIcon className="h-5 w-5 text-black" />
            {t("orders.missingItemDialogTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("orders.missingItemDialogDescription")}
          </DialogDescription>
        </DialogHeader>

        {!canReport ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-yellow-700">
              <AlertCircleIcon className="h-4 w-4" />
              {t("orders.missingItemTooEarly")}
            </div>
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-muted-foreground">
              {t("orders.missingItemExpectedBy", {
                date: formatDayMonth(expectedDeliveryDate),
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-medium">
              {t("orders.missingItemStep1Question", { orderNumber })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {items.map((item) => (
                <label
                  key={item.id}
                  className={cn(
                    "flex items-center gap-3 border border-gray-200 rounded-md p-3 cursor-pointer hover:bg-gray-50",
                    selectedItemIds.includes(item.id) &&
                      "border-primary/60 bg-primary/5"
                  )}
                >
                  <Checkbox
                    checked={selectedItemIds.includes(item.id)}
                    onCheckedChange={() => toggleItem(item.id)}
                  />
                  <img
                    loading="lazy"
                    src={item.product.mainImage || ""}
                    alt={item.product.translations[0]?.name || "Item"}
                    className="w-12 h-12 rounded border border-gray-200 object-cover"
                  />
                  <div className="text-sm">
                    <div className="font-medium">
                      {item.product.translations[0]?.name || t("orders.item")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("orders.itemQuantity", { count: item.quantity })}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          {!canReport ? (
            <Button onClick={() => setOpen(false)}>
              {t("orders.missingItemContinue")}
            </Button>
          ) : (
            <Button
              onClick={handleSendReport}
              disabled={selectedItems.length === 0}
            >
              {t("orders.missingItemSend")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
