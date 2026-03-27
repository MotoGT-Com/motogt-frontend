import * as React from "react";
import { useState } from "react";
import { CheckIcon, PlusIcon, XIcon } from "lucide-react";
import { Link, href, useRouteLoaderData } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { cn } from "~/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import { garageCarsQueryOptions } from "~/lib/queries";
import { EmptyGarageDialog } from "~/components/empty-garage-dialog";
import type { Route } from "../routes/+types/_main";
import { useAuthModal } from "~/context/AuthModalContext";

const fitmentBadgeVariants = cva(
  "inline-flex items-center gap-1 md:gap-2 pl-1 md:pl-1 pr-2 md:pr-2 py-1 md:py-1 font-semibold md:font-koulen text-[10px] md:text-sm border-[0.5px] md:border-[0.5px] rounded-[2px] md:rounded-[2px] whitespace-nowrap shrink-0 transition-colors",
  {
    variants: {
      variant: {
        fit: "bg-[#f2f2f2] border-[#e6e6e6] text-[#1d9200]",
        "no-fit": "bg-[#f2f2f2] border-[#e6e6e6] text-[#cf172f]",
        "add-car": "bg-[#f2f2f2] border-[#e6e6e6] text-[#908B9B]",
      },
    },
    defaultVariants: {
      variant: "add-car",
    },
  }
);

const iconVariants = cva(
  "size-3 md:size-3 rounded-full flex items-center justify-center shrink-0",
  {
    variants: {
      variant: {
        fit: "bg-[#1d9200]",
        "no-fit": "bg-[#cf172f]",
        "add-car": "bg-[#908B9B]",
      },
    },
    defaultVariants: {
      variant: "add-car",
    },
  }
);

export type FitmentBadgeVariant = "fit" | "no-fit" | "add-car";

export interface FitmentBadgeProps
  extends Omit<React.ComponentProps<"div">, "children">,
    VariantProps<typeof fitmentBadgeVariants> {
  /**
   * The variant of the fitment badge
   * - "fit": Shows green checkmark with "Fits Your Car" text
   * - "no-fit": Shows red X with "Doesn't Fit Your Car" text
   * - "add-car": Shows grey plus with "Add Your Car" text (clickable link to /my-garage)
   */
  variant: FitmentBadgeVariant;
  /**
   * Optional custom text to display instead of the default
   */
  text?: string;
  /**
   * Whether the badge should be clickable (only applies to "add-car" variant)
   * @default true for "add-car" variant
   */
  clickable?: boolean;
  /**
   * Optional className to apply to the badge
   */
  className?: string;
}

/**
 * FitmentBadge Component
 *
 * A reusable badge component that displays product fitment status.
 * Matches the Figma design specifications for all three variants.
 *
 * @example
 * ```tsx
 * // Fits your car
 * <FitmentBadge variant="fit" />
 *
 * // Doesn't fit your car
 * <FitmentBadge variant="no-fit" />
 *
 * // Add your car (clickable)
 * <FitmentBadge variant="add-car" />
 * ```
 */
export function FitmentBadge({
  variant,
  text,
  clickable,
  className,
  ...props
}: FitmentBadgeProps) {
  const defaultTexts: Record<FitmentBadgeVariant, string> = {
    fit: "Fits Your Car",
    "no-fit": "Doesn't Fit Your Car",
    "add-car": "Add Your Car",
  };

  const displayText = text || defaultTexts[variant];

  const iconContent = {
    fit: <CheckIcon className="size-2 text-white" />,
    "no-fit": <XIcon className="size-2 text-white" />,
    "add-car": <PlusIcon className="size-2 text-white" />,
  };

  const badgeContent = (
    <>
      <div className={cn(iconVariants({ variant }))}>
        {iconContent[variant]}
      </div>
      <span className="uppercase tracking-wide">{displayText}</span>
    </>
  );

  // "add-car" variant is clickable by default, linking to /my-garage or showing modal
  if (variant === "add-car" && clickable !== false) {
    return <GarageLinkBadge className={className} {...props}>{badgeContent}</GarageLinkBadge>;
  }

  return (
    <div
      className={cn(fitmentBadgeVariants({ variant }), className)}
      {...props}
    >
      {badgeContent}
    </div>
  );
}

/**
 * GarageLinkBadge Component
 * 
 * Wrapper for the "add-car" badge that checks if user has cars.
 * Shows empty garage modal if no cars, otherwise navigates to garage page.
 */
function GarageLinkBadge({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const loaderData =
    useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const isAuthenticated = !!loaderData?.isAuthenticated;
  const { openAuthModal } = useAuthModal();
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false);
  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });
  const hasCars = garageCarsQuery.data?.userCars && garageCarsQuery.data.userCars.length > 0;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isAuthenticated && garageCarsQuery.isSuccess && !hasCars) {
      e.preventDefault();
      setEmptyDialogOpen(true);
    }
  };

  return (
    <>
      <Link
        to="/my-garage"
        className={cn(fitmentBadgeVariants({ variant: "add-car" }), className)}
        onClick={handleClick}
      >
        {children}
      </Link>
      <EmptyGarageDialog open={emptyDialogOpen} onOpenChange={setEmptyDialogOpen} />
    </>
  );
}
