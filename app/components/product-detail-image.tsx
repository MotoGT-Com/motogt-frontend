import { cn } from "~/lib/utils";
import {
  buildProductDetailSrcSet,
  productImageWithFormatPreference,
  PRODUCT_DETAIL_IMAGE_SIZES,
} from "~/lib/product-image";

const PDP_MAIN_WIDTH = 1280;
const PDP_MAIN_HEIGHT = 960;
const THUMB_WIDTH = 240;
const THUMB_HEIGHT = 180;

type ProductDetailImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Hero image on PDP */
  priority?: boolean;
};

/**
 * Responsive product image: format preference (env), srcset, sizes, decoding.
 */
export function ProductDetailImage({
  src,
  alt,
  className,
  priority = false,
}: ProductDetailImageProps) {
  const optimized = productImageWithFormatPreference(src);
  if (!optimized) return null;

  return (
    <img
      src={optimized}
      srcSet={buildProductDetailSrcSet(optimized)}
      sizes={PRODUCT_DETAIL_IMAGE_SIZES}
      width={PDP_MAIN_WIDTH}
      height={PDP_MAIN_HEIGHT}
      alt={alt}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      loading={priority ? "eager" : "lazy"}
      className={cn("aspect-[4/3] w-full object-cover rounded-lg", className)}
    />
  );
}

type ProductDetailThumbProps = {
  src: string;
  alt: string;
  className?: string;
  isSelected: boolean;
  onSelect: () => void;
};

export function ProductDetailThumb({
  src,
  alt,
  className,
  isSelected,
  onSelect,
}: ProductDetailThumbProps) {
  const optimized = productImageWithFormatPreference(src);
  if (!optimized) return null;

  return (
    <button
      type="button"
      className={cn(
        "relative w-[90px] md:w-[120px] aspect-[4/3] rounded border-2 overflow-hidden",
        isSelected ? "border-black/10 opacity-100" : "border-transparent opacity-50",
        className
      )}
      onClick={onSelect}
    >
      <img
        src={optimized}
        srcSet={buildProductDetailSrcSet(optimized)}
        sizes="120px"
        width={THUMB_WIDTH}
        height={THUMB_HEIGHT}
        alt={alt}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </button>
  );
}
