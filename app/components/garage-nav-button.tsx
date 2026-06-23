import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouteLoaderData } from "react-router";
import { garageCarsQueryOptions } from "~/lib/queries";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { GarageHoverPopupContent } from "~/components/garage-hover-popup";
import { useGaragePopup } from "~/context/GaragePopupContext";
import {
  GUEST_GARAGE_CHANGED_EVENT,
  getGuestGarage,
  type GuestCar,
} from "~/lib/guest-garage-manager";
import type { UserCarsResponse } from "~/lib/client";
import { useTranslation } from "react-i18next";

/**
 * GarageNavButton Component
 *
 * Opens the garage popup on click. On desktop, also shows a hover preview.
 */
export function GarageNavButton({
  variant,
  size,
  className,
  icon: Icon,
  children,
  onBeforeOpen,
  ...props
}: React.ComponentProps<typeof Button> & {
  icon?: React.ComponentType<{ isActive?: boolean; className?: string }>;
  onBeforeOpen?: () => void;
}) {
  const { openGaragePopup } = useGaragePopup();
  const { t } = useTranslation("common");
  const mainLoaderData = useRouteLoaderData("routes/_main") as
    | { isAuthenticated?: boolean }
    | undefined;
  const isAuthenticated = !!mainLoaderData?.isAuthenticated;
  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });

  const [guestCars, setGuestCars] = useState<GuestCar[]>([]);
  useEffect(() => {
    if (!isAuthenticated) setGuestCars(getGuestGarage());
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated || typeof window === "undefined") return;
    const sync = () => setGuestCars(getGuestGarage());
    window.addEventListener(GUEST_GARAGE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(GUEST_GARAGE_CHANGED_EVENT, sync);
  }, [isAuthenticated]);

  const handleHoverOpen = (open: boolean) => {
    if (open && !isAuthenticated) setGuestCars(getGuestGarage());
  };

  const userCars: UserCarsResponse["data"]["userCars"] = isAuthenticated
    ? (garageCarsQuery.data?.userCars ?? [])
    : (guestCars as unknown as UserCarsResponse["data"]["userCars"]);

  const hasCars = userCars.length > 0;
  const garageCount = userCars.length;

  const garageNavLabel =
    isAuthenticated && garageCarsQuery.isPending
      ? t("nav.myGarage")
      : !hasCars
        ? t("nav.addToGarage")
        : t("nav.myGarageWithCount", { count: garageCount });

  const navButton = (
    <Button
      type="button"
      variant={variant || "ghost"}
      size={size}
      className={cn(
        "md:text-primary [&>svg]:text-primary hover:text-primary font-koulen text-base",
        className
      )}
      onClick={() => openGaragePopup({ onBeforeOpen })}
      {...props}
    >
      {Icon && <Icon />}
      {children ?? garageNavLabel}
    </Button>
  );

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={handleHoverOpen}>
      <HoverCardTrigger asChild>{navButton}</HoverCardTrigger>
      <HoverCardContent
        className="hidden md:block w-auto p-4 bg-[#f2f2f2] border border-[#e6e6e6] rounded-[2px] shadow-[0_4px_10px_0_rgba(0,0,0,0.10)]"
        sideOffset={12}
        align="start"
      >
        <GarageHoverPopupContent
          userCars={userCars}
          isLoading={isAuthenticated && garageCarsQuery.isLoading}
        />
      </HoverCardContent>
    </HoverCard>
  );
}
