import { ChevronUp } from "lucide-react";
import { cn } from "~/lib/utils";

interface AccordionDropdownButtonProps {
  className?: string;
  iconClassName?: string;
}

/**
 * Reusable dropdown button component used in accordions
 * Matches the design from filters (gray background, red chevron)
 * 
 * Usage: Place this inside an InlineAccordionTrigger with className="group"
 * The icon will rotate when the accordion is closed
 */
export function AccordionDropdownButton({
  className,
  iconClassName,
}: AccordionDropdownButtonProps) {
  return (
    <div
      className={cn(
        "bg-[#f2f2f2] border-[0.5px] border-[#e6e6e6] rounded-[4px] size-6 flex items-center justify-center shrink-0 pointer-events-none",
        className
      )}
    >
      <ChevronUp
        className={cn(
          "h-3 w-3 text-[#cf172f] transition-transform duration-200 group-data-[state=closed]:rotate-180",
          iconClassName
        )}
      />
    </div>
  );
}

