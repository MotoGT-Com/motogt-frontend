import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, href, useRouteLoaderData } from "react-router";
import { garageCarsQueryOptions } from "~/lib/queries";
import { EmptyGarageDialog } from "~/components/empty-garage-dialog";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { GarageHoverPopupContent } from "~/components/garage-hover-popup";
import { useAuthModal } from "~/context/AuthModalContext";
import { getGuestGarage, type GuestCar } from "~/lib/guest-garage-manager";
import type { UserCarsResponse } from "~/lib/client";

/**
 * GarageNavButton Component
 * 
 * Navigation button that checks if user has cars in garage.
 * If user has no cars, shows empty garage modal instead of navigating.
 * If user has cars, navigates normally to garage page.
 */
export function GarageNavButton({
  to,
  variant,
  size,
  className,
  icon: Icon,
  children,
  prefetch = "render",
  ...props
}: React.ComponentProps<typeof Button> &
  Pick<React.ComponentProps<typeof NavLink>, "prefetch" | "to"> & {
    icon?: React.ComponentType<{ isActive?: boolean; className?: string }>;
  }) {
  const [emptyDialogOpen, setEmptyDialogOpen] = useState(false);
  const mainLoaderData = useRouteLoaderData("routes/_main") as
    | { isAuthenticated?: boolean }
    | undefined;
  const isAuthenticated = !!mainLoaderData?.isAuthenticated;
  const { openAuthModal } = useAuthModal();
  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });

  const [guestCars, setGuestCars] = useState<GuestCar[]>([]);
  useEffect(() => {
    if (!isAuthenticated) setGuestCars(getGuestGarage());
  }, [isAuthenticated]);

  const handleHoverOpen = (open: boolean) => {
    if (open && !isAuthenticated) setGuestCars(getGuestGarage());
  };

  const userCars: UserCarsResponse["data"]["userCars"] = isAuthenticated
    ? (garageCarsQuery.data?.userCars ?? [])
    : (guestCars as unknown as UserCarsResponse["data"]["userCars"]);

  const hasCars = userCars.length > 0;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Guests can now access the garage page — no auth gate here
    // Only intercept if the authenticated user has no cars
    if (isAuthenticated && garageCarsQuery.isSuccess && !hasCars) {
      e.preventDefault();
      setEmptyDialogOpen(true);
    }
    // Otherwise, let the default navigation happen
  };

  const navButton = (
    <Button
      variant={variant || "ghost"}
      size={size}
      className={cn(
        "md:text-primary [&>svg]:text-primary hover:text-primary font-koulen text-base",
        className
      )}
      asChild
      {...props}
    >
      <NavLink
        to={to}
        className="[&.active]:bg-primary [&.active]:text-white [&.active>img]:opacity-100"
        prefetch={prefetch}
        onClick={handleClick}
      >
        {({ isActive }) => (
          <>
            {Icon && <Icon isActive={isActive} />}
            {children}
          </>
        )}
      </NavLink>
    </Button>
  );

  return (
    <>
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
      <EmptyGarageDialog open={emptyDialogOpen} onOpenChange={setEmptyDialogOpen} />
    </>
  );
}
