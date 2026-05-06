import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

const chipBase =
  "whitespace-nowrap px-2 py-1.5 rounded-sm text-sm leading-[1.5] tracking-[-0.154px]";
const chipSelected =
  "bg-[#cf172f] text-white font-bold hover:bg-[#cf172f]/90 hover:text-white border-0";
const chipUnselected =
  "bg-[#f9f9f9] text-black font-medium border border-[#e6e6e6] hover:bg-[#f9f9f9]";

type ShopFilterChipButtonProps = {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
};

/** Same chip styling as Sort by in the shop filter sidebar */
export function ShopFilterChipButton({
  selected,
  onClick,
  children,
  className,
}: ShopFilterChipButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="ghost"
      size="sm"
      className={cn(
        chipBase,
        selected ? chipSelected : chipUnselected,
        className
      )}
    >
      {children}
    </Button>
  );
}
