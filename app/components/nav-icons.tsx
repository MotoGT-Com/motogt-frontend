import * as React from "react";
import { cn } from "~/lib/utils";

// Local icon paths from public/nav-icons/
const homeOutlineIcon = "/nav-icons/home-outline.svg";
const homeSolidIcon = "/nav-icons/home-solid.svg";
const carPartsOutlineIcon = "/nav-icons/parts-outline.svg";
const carPartsSolidIcon = "/nav-icons/parts-solid.svg";
const careOutlineIcon = "/nav-icons/care-outline.svg";
const careSolidIcon = "/nav-icons/care-solid.svg";
const ridingGearOutlineIcon = "/nav-icons/gear-outline.svg";
const ridingGearSolidIcon = "/nav-icons/gear-solid.svg";
const garageOutlineIcon = "/nav-icons/garage-outline.svg";
const garageSolidIcon = "/nav-icons/garage-solid.svg";
const wishlistOutlineIcon = "/nav-icons/wishlist-outline.svg";
const wishlistSolidIcon = "/nav-icons/wishlies-solid.svg";
const cartOutlineIcon = "/nav-icons/cart-outline.svg";
const cartSolidIcon = "/nav-icons/cart-solid.svg";
const profileOutlineIcon = "/nav-icons/profile-outline.svg";
const profileSolidIcon = "/nav-icons/profile-solid.svg";
const ordersOutlineIcon = "/nav-icons/orders-outline.svg";
const ordersSolidIcon = "/nav-icons/orders-solid.svg";
const addressOutlineIcon = "/nav-icons/address-outline.svg";
const addressSolidIcon = "/nav-icons/address-solid.svg";
const supportOutlineIcon = "/nav-icons/lifebuoy.svg";
const supportSolidIcon = "/nav-icons/lifebuoy-1.svg";
const logoutOutlineIcon = "/nav-icons/logout.svg";
const logoutSolidIcon = "/nav-icons/logout-1.svg";
const recommendedOutlineIcon = "/nav-icons/recommended-outline.svg";
const recommendedSolidIcon = "/nav-icons/recommended-solid.svg";

export function HomeNavIcon({ isActive, className }: { isActive?: boolean; className?: string }) {
  return (
    <img
    loading="lazy"
      className={cn("size-5 shrink-0", className)}
      alt="Home"
      src={isActive ? homeSolidIcon : homeOutlineIcon}
    />
  );
}

export function CarPartsNavIcon({ isActive, className }: { isActive?: boolean; className?: string }) {
  return (
    <img
    loading="lazy"
      className={cn("size-[22px] shrink-0", className)}
      alt="Car Parts"
      src={isActive ? carPartsSolidIcon : carPartsOutlineIcon}
    />
  );
}

export function CareNavIcon({ isActive, className }: { isActive?: boolean; className?: string }) {
  return (
    <img
    loading="lazy"
      className={cn("size-5 shrink-0", className)}
      alt="Care & Accessories"
      src={isActive ? careSolidIcon : careOutlineIcon}
    />
  );
}

export function RidingGearNavIcon({ isActive, className }: { isActive?: boolean; className?: string }) {
  return (
    <img
    loading="lazy"
      className={cn("size-5 shrink-0", className)}
      alt="Riding Gear"
      src={isActive ? ridingGearSolidIcon : ridingGearOutlineIcon}
    />
  );
}

export function GarageNavIcon({ isActive, className }: { isActive?: boolean; className?: string }) {
  return (
    <img
    loading="lazy"
      className={cn("size-5 shrink-0", className)}
      alt="Garage"
      src={isActive ? garageSolidIcon : garageOutlineIcon}
    />
  );
}

export function WishlistNavIcon({ isActive, className }: { isActive?: boolean; className?: string }) {
  return (
    <img
    loading="lazy"
      className={cn("size-5 shrink-0", className)}
      alt="Wishlist"
      src={isActive ? wishlistSolidIcon : wishlistOutlineIcon}
    />
  );
}

export function CartNavIcon({ isActive, className }: { isActive?: boolean; className?: string }) {
  return (
    <img
    loading="lazy"
      className={cn(
        "size-5 shrink-0",
        isActive && "brightness-0 invert",
        className
      )}
      alt="Cart"
      src={isActive ? cartSolidIcon : cartOutlineIcon}
    />
  );
}

export function ProfileNavIcon({ isActive, className }: { isActive?: boolean; className?: string }) {
  return (
    <img
    loading="lazy"
      className={cn("size-5 shrink-0", className)}
      alt="Profile"
      src={isActive ? profileSolidIcon : profileOutlineIcon}
    />
  );
}

export function OrdersNavIcon({ isActive, className }: { isActive?: boolean; className?: string }) {
  return (
    <img
    loading="lazy"
      className={cn("size-5 shrink-0", className)}
      alt="Orders"
      src={isActive ? ordersSolidIcon : ordersOutlineIcon}
    />
  );
}

export function AddressNavIcon({ isActive, className }: { isActive?: boolean; className?: string }) {
  return (
    <img
    loading="lazy"
      className={cn("size-5 shrink-0", className)}
      alt="Address"
      src={isActive ? addressSolidIcon : addressOutlineIcon}
    />
  );
}

export function SupportNavIcon({ isActive, className }: { isActive?: boolean; className?: string }) {
  return (
    <img
    loading="lazy"
      className={cn("size-5 shrink-0", className)}
      alt="Support"
      src={isActive ? supportSolidIcon : supportOutlineIcon}
    />
  );
}

export function LogoutNavIcon({ isActive, className }: { isActive?: boolean; className?: string }) {
  return (
    <img
    loading="lazy"
      className={cn("size-5 shrink-0", className)}
      alt="Logout"
      src={isActive ? logoutSolidIcon : logoutOutlineIcon}
    />
  );
}

export function FeaturedNavIcon({ isActive, className }: { isActive?: boolean; className?: string }) {
  return (
    <img
      loading="lazy"
      className={cn("size-5 shrink-0", className)}
      alt="Recommended"
      src={isActive ? recommendedSolidIcon : recommendedOutlineIcon}
    />
  );
}
