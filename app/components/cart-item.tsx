import { Button } from "./ui/button";
import { Loader2, Minus, Plus, Trash2 } from "lucide-react";
import type { CartResponse } from "~/lib/client/types.gen";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import { useCurrency } from "~/hooks/use-currency";
import { useEffect, useState } from "react";

type ProductTranslation = {
  name: string;
  slug?: string;
  languageId?: string;
  languageCode: string;
};

type CartItemFromQuery = {
  productId: string;
  productTranslations: ProductTranslation[];
  productImage: string;
  unitPrice: number;
  quantity: number;
  variantId?: string;
};

type CartItemFromLoader = CartResponse["data"]["items"][number];

type CartItem = CartItemFromQuery | CartItemFromLoader;

interface CartItemProps {
  item: CartItem;
  onQuantityDecrease: (productId: string, newQuantity: number) => void;
  onQuantityIncrease: (productId: string, newQuantity: number) => void;
  onRemove: (productId: string) => void;
  isUpdating?: boolean;
  isRemoving?: boolean;
  minQuantity?: number;
}

export function CartItemComponent({
  item,
  onQuantityDecrease,
  onQuantityIncrease,
  onRemove,
  isUpdating = false,
  isRemoving = false,
  minQuantity = 1,
}: CartItemProps) {
  // Handle both cart item structures
  const productId = item.productId;
  const quantity = item.quantity;
  const unitPrice = item.unitPrice;
  
  // Check if item has 'product' property (from loader) or direct properties (from query)
  const hasProductObject = "product" in item;
  
  const productImage = hasProductObject
    ? item.product.mainImage || ""
    : item.productImage || "";
  
  const productName = hasProductObject
    ? getLocalizedTranslation(item.product.translations)?.name || "Product Name"
    : getLocalizedTranslation(item.productTranslations)?.name || "Product Name";

  // Currency conversion
  const { selectedCurrency, convertPrice } = useCurrency();
  const [convertedPrice, setConvertedPrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  
  useEffect(() => {
    const itemCurrency = (item as any).currency || "JOD";
    
    if (selectedCurrency === itemCurrency) {
      setConvertedPrice(unitPrice);
      return;
    }
    
    setIsLoadingPrice(true);
    convertPrice(unitPrice, itemCurrency)
      .then(result => {
        setConvertedPrice(result.convertedAmount);
      })
      .catch(() => {
        setConvertedPrice(unitPrice);
      })
      .finally(() => {
        setIsLoadingPrice(false);
      });
  }, [unitPrice, selectedCurrency, convertPrice]);

  const canDecrease = quantity > minQuantity;
  // Only show loading state, but don't disable all buttons globally
  // This allows smoother interaction

  return (
    <div
      className={`flex flex-row items-center gap-2 ${
        isUpdating || isRemoving ? "opacity-50" : ""
      }`}
    >
      {/* Image - Mobile: 94px x 68px, Desktop: 98px x 72px */}
      <img
        loading="lazy"
        src={productImage}
        alt={productName}
        className="w-[94px] h-[68px] md:w-[98px] md:h-[72px] rounded-[1.574px] object-cover shrink-0"
      />

      {/* Content Section */}
      <div className="flex-1 flex flex-col h-[68px] md:h-[72px] justify-between min-w-0">
        {/* Row 1: Product Name and Price */}
        <div className="flex items-start justify-between w-full">
          <h3 className="font-semibold text-[12px] md:text-sm text-black leading-[1.5] tracking-[-0.132px] md:tracking-normal flex-1 min-w-0 pr-2 capitalize">
            {productName.toLowerCase()}
          </h3>
          <div className="font-semibold text-[12px] md:text-sm text-black leading-[1.5] tracking-[-0.132px] md:tracking-normal whitespace-nowrap shrink-0">
            {isLoadingPrice ? (
              <span className="inline-block w-16 h-3 bg-gray-200 animate-pulse rounded"></span>
            ) : (
              `${selectedCurrency} ${(convertedPrice ?? unitPrice).toFixed(2)}`
            )}
          </div>
        </div>

        {/* Row 2: Quantity Controls and Delete Button */}
        <div className="flex items-center justify-between w-full">
          {/* Quantity Controls */}
          <div className="flex items-center gap-3">
            <Button
              variant="inverted"
              size="icon"
              onClick={() => onQuantityDecrease(productId, quantity - 1)}
              disabled={!canDecrease}
              className="h-6 w-6 md:h-10 md:w-10 bg-white border border-[#e6e6e6] rounded-[2px] p-2 hover:bg-gray-50"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <Minus className="w-4 h-4 text-primary" />
              )}
            </Button>
            <span className="font-semibold text-[14px] md:text-sm text-primary leading-[1.5] tracking-[-0.154px] md:tracking-normal min-w-[20px] text-center">
              {quantity}
            </span>
            <Button
              variant="inverted"
              size="icon"
              onClick={() => onQuantityIncrease(productId, quantity + 1)}
              className="h-6 w-6 md:h-10 md:w-10 bg-white border border-[#e6e6e6] rounded-[2px] p-2 hover:bg-gray-50"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <Plus className="w-4 h-4 text-primary" />
              )}
            </Button>
          </div>

          {/* Delete Button */}
          <Button
            variant="inverted"
            size="icon"
            className="h-6 w-6 md:h-10 md:w-10 bg-white border border-[#e6e6e6] rounded-[4px] p-[6px] hover:bg-gray-50 shrink-0"
            onClick={() => onRemove(productId)}
          >
            {isRemoving ? (
              <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin text-primary" />
            ) : (
              <Trash2 className="w-3 h-3 md:w-4 md:h-4 text-primary" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

