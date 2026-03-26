import { Loader2 } from "lucide-react";
import { cn } from "~/lib/utils";

const wishlistOutlineIcon = "/nav-icons/wishlist-outline.svg";
const wishlistSolidIcon = "/nav-icons/wishlies-solid.svg";

interface FavoritesButtonProps extends React.ComponentProps<"button"> {
  isFavorite: boolean;
  isLoading?: boolean;
}

export function FavoritesButton({
  isFavorite,
  isLoading = false,
  className,
  ...props
}: FavoritesButtonProps) {
  const isInFavorites = !isLoading && isFavorite;
  const ariaLabel = isFavorite ? "Remove from favorites" : "Add to favorites";

  return (
    <button
      className={cn(
        "flex items-center justify-center h-[32px] p-[8px] rounded-[2px] shrink-0 cursor-pointer",
        isInFavorites
          ? "bg-[#cf172f] border-0"
          : "bg-[#f2f2f2] border border-[#e6e6e6]",
        className
      )}
      disabled={isLoading}
      aria-label={ariaLabel}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="size-4 animate-spin text-[#cf172f] opacity-70" />
      ) : (
        <img
          loading="lazy"
          src={isFavorite ? wishlistSolidIcon : wishlistOutlineIcon}
          alt={ariaLabel}
          className="size-4 shrink-0"
        />
      )}
    </button>
  );
}
