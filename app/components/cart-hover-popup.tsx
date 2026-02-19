import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { Link, href } from "react-router";
import { Button } from "~/components/ui/button";
import { WhatsAppButton } from "~/components/whatsapp-button";
import { cn } from "~/lib/utils";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { useCurrency } from "~/hooks/use-currency";
import { useEffect, useState } from "react";

type CartItem = {
  productId: string;
  itemCode?: string;
  product?: { itemCode?: string | null };
  productImage: string;
  productTranslations: Array<{ name: string; languageCode?: string }>;
  unitPrice: number;
  quantity: number;
};

type CartHoverPopupProps = {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  currency?: string;
  onRemove?: (productId: string) => void;
  isRemoving?: boolean;
  children: React.ReactNode;
};

const formatAmount = (amount: number, currencyCode: string) => {
  return `${currencyCode} ${amount.toFixed(2)}`;
};

export function CartHoverPopup({
  items,
  totalItems,
  totalAmount,
  currency = "JOD",
  onRemove,
  isRemoving = false,
  children,
}: CartHoverPopupProps) {
  const { i18n } = useTranslation();
  const currentLanguage = i18n.language?.split("-")[0]?.toLowerCase() ?? "en";
  const isRTL = currentLanguage === "ar";
  
  // Currency conversion
  const { selectedCurrency, convertPrice, batchConvert } = useCurrency();
  const [convertedTotal, setConvertedTotal] = useState<number | null>(null);
  const [convertedItemPrices, setConvertedItemPrices] = useState<Record<string, number>>({});
  
  useEffect(() => {
    if (selectedCurrency === currency) {
      setConvertedTotal(totalAmount);
      const itemPrices: Record<string, number> = {};
      items.forEach(item => {
        itemPrices[item.productId] = item.unitPrice * item.quantity;
      });
      setConvertedItemPrices(itemPrices);
      return;
    }
    
    // Convert total
    convertPrice(totalAmount, "JOD")
      .then(result => {
        setConvertedTotal(result.convertedAmount);
      })
      .catch(() => {
        setConvertedTotal(totalAmount);
      });
      
    // Batch convert all item prices
    if (items.length > 0) {
      const amounts = items.map(item => item.unitPrice * item.quantity);
      batchConvert(amounts, "JOD")
        .then(results => {
          const prices: Record<string, number> = {};
          items.forEach((item, index) => {
            prices[item.productId] = results.convertedAmounts[index];
          });
          setConvertedItemPrices(prices);
        })
        .catch(() => {
          const prices: Record<string, number> = {};
          items.forEach(item => {
            prices[item.productId] = item.unitPrice * item.quantity;
          });
          setConvertedItemPrices(prices);
        });
    }
  }, [items, totalAmount, currency, selectedCurrency, convertPrice, batchConvert]);
  
  const strings = {
    title: isRTL ? "سلة التسوق الخاصة بك" : "Your shopping cart",
    items: isRTL ? "عناصر" : "items",
    empty: isRTL ? "سلتك فارغة." : "Your cart is empty.",
    total: isRTL ? "الإجمالي" : "Total",
    cta: isRTL ? "عرض سلتك" : "See your cart",
  };

  const resolveItemName = (item: CartItem) => {
    const match = item.productTranslations.find(
      (translation) =>
        (translation as any)?.languageCode?.toLowerCase() === currentLanguage
    );
    return match?.name || item.productTranslations[0]?.name || "Item";
  };

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent
        className="w-[360px] p-0 bg-[#F2F2F2] border border-[#e6e6e6] rounded-md shadow-lg"
        sideOffset={10}
        align="end"
      >
        <div className="flex flex-col" dir={isRTL ? "rtl" : "ltr"}>
          <div className="px-5 py-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-black">{strings.title}</span>
            <span className="text-sm text-black/50">
              {totalItems} {strings.items}
            </span>
          </div>
          <div className="h-px bg-[#e6e6e6]" />

          {items.length === 0 ? (
            <div className="px-5 py-6 text-sm text-black/60">
              {strings.empty}
            </div>
          ) : (
            <div className="max-h-[320px] overflow-auto">
              {items.map((item) => {
                const itemName = resolveItemName(item);
                return (
                  <div
                    key={item.productId}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <div className="size-10 bg-muted rounded-md overflow-hidden shrink-0">
                      {item.productImage ? (
                        <img
                          src={item.productImage}
                          alt=""
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-black truncate">
                        {itemName}
                      </div>
                      <div className="text-xs text-black/50">
                        x{item.quantity}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-black">
                      {formatAmount(convertedItemPrices[item.productId] ?? (item.unitPrice * item.quantity), selectedCurrency)}
                    </div>
                    {onRemove ? (
                      <button
                        type="button"
                        className="text-primary hover:text-primary/80 transition-colors"
                        onClick={() => onRemove(item.productId)}
                        disabled={isRemoving}
                        aria-label="Remove from cart"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          <div className="h-px bg-[#e6e6e6]" />
          <div className="px-5 py-4 flex items-center justify-between">
            <span className="text-sm font-semibold text-black">{strings.total}</span>
            <span className="text-base font-semibold text-black">
              {formatAmount(convertedTotal ?? totalAmount, selectedCurrency)}
            </span>
          </div>
          <div className="px-5 pb-5">
            <div className="flex flex-col gap-2">
              <Button className={cn("w-full h-10 font-semibold font-sans normal-case")} asChild>
                <Link to={href("/cart")} prefetch="render">
                  {strings.cta}
                </Link>
              </Button>
              <WhatsAppButton
                className="h-10 font-semibold font-sans normal-case"
                items={items.map((item) => ({
                  productName: resolveItemName(item),
                  itemCode: item.itemCode ?? item.product?.itemCode ?? item.productId,
                  quantity: item.quantity,
                }))}
                currency={selectedCurrency}
                totalAmount={(convertedTotal ?? totalAmount).toFixed(2)}
                lang={currentLanguage}
                disabled={items.length === 0}
              />
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
