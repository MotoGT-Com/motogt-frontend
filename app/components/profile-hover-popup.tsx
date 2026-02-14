import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card";
import { Link, href, useRouteLoaderData } from "react-router";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { OrdersNavIcon, ProfileNavIcon, AddressNavIcon, SupportNavIcon } from "./nav-icons";
import { LogoutButton } from "./logout-button";
import type { Route } from "../routes/+types/_main";
import { useTranslation } from "react-i18next";

/**
 * ProfileHoverPopup Component
 * 
 * Displays a hover popup when hovering over the profile icon in the navigation bar.
 * Shows user information and navigation menu items.
 */
export function ProfileHoverPopup({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation('common');
  const loaderData = useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const user = loaderData?.user;
  const isAuthenticated = loaderData?.isAuthenticated;

  // Don't show popup if user is not authenticated
  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>
        {children}
      </HoverCardTrigger>
      <HoverCardContent
        className="w-[280px] p-0 bg-white border border-[#e6e6e6] rounded-md shadow-lg"
        sideOffset={8}
        align="end"
      >
        <div className="flex flex-col">
          {/* User Profile Section */}
          <div className="p-4 pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="shrink-0 size-10">
                <AvatarFallback>
                  {user.firstName.charAt(0) + user.lastName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <div className="text-sm font-medium text-black leading-[1.2] truncate">
                  {user.firstName} {user.lastName}
                </div>
                <div className="text-xs text-[rgba(0,0,0,0.5)] leading-[1.2] truncate">
                  {user.email}
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[#e6e6e6]"></div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              to={href("/profile/orders")}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <OrdersNavIcon isActive={false} className="size-5" />
              <span className="text-sm font-medium text-black">{t('nav.myOrders')}</span>
            </Link>

            {/* Divider */}
            <div className="h-px bg-[#e6e6e6]"></div>

            <Link
              to={href("/profile/account")}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <ProfileNavIcon isActive={false} className="size-5" />
              <span className="text-sm font-medium text-black">{t('nav.accountInfo')}</span>
            </Link>

            <Link
              to={href("/profile/address")}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <AddressNavIcon isActive={false} className="size-5" />
              <span className="text-sm font-medium text-black">{t('nav.addressInfo')}</span>
            </Link>

            {/* Payment Information - commented out in original but shown in design */}
            {/* <Link
              to={href("/profile/payment")}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <CreditCard className="size-5 text-[#cf172f]" />
              <span className="text-sm font-medium text-black">Payment Information</span>
            </Link> */}

            {/* Divider */}
            <div className="h-px bg-[#e6e6e6]"></div>

            <Link
              to={href("/profile/support")}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              <SupportNavIcon isActive={false} className="size-5" />
              <span className="text-sm font-medium text-black">{t('nav.support')}</span>
            </Link>

            {/* Divider */}
            <div className="h-px bg-[#e6e6e6]"></div>

            {/* Logout */}
            <LogoutButton
              className="w-full justify-start px-4 py-2.5 h-auto hover:bg-gray-50"
            >
              <span className="text-sm font-medium text-black ml-3">{t('nav.logout')}</span>
            </LogoutButton>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

