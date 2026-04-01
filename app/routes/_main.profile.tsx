import { NavLink, Outlet } from "react-router";
import { Button } from "~/components/ui/button";
import { SimpleCard } from "~/components/ui/card";
import type { Route } from "./+types/_main.profile";
import { requireAuthMiddleware } from "~/lib/auth-middleware";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { authContext } from "~/context";
import { OrdersNavIcon, ProfileNavIcon, AddressNavIcon, SupportNavIcon } from "~/components/nav-icons";
import { LogoutButton } from "~/components/logout-button";
import { useTranslation } from "react-i18next";

// Middleware to require authentication for all profile routes
export const middleware = [requireAuthMiddleware];

// Loader function to get user from context
export async function loader({ context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  return { user: auth.user! };
}

export default function Profile({ loaderData }: Route.ComponentProps) {
  const { t } = useTranslation('profile');
  const { user } = loaderData;

  return (
    <div className="flex-1 flex flex-col">
      <div className="max-w-7xl mx-auto px-6 py-8 flex gap-8 flex-1 w-full">
        {/* Sidebar */}
        <SimpleCard className="hidden md:block w-[308px] pt-8 pb-4 px-4 h-fit">
          <h2 className="text-2xl font-black italic text-black mb-6">
            {t('settings')}
          </h2>

          {/* User Profile */}
          <div className="flex items-center gap-2 mb-4">
            <Avatar className="shrink-0 size-10">
              <AvatarFallback>
                {user.firstName.charAt(0) + user.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-medium">
                {user ? `${user.firstName} ${user.lastName}` : t('guestUser')}
              </div>
              <div className="text-xs text-muted-foreground">
                {user?.email || t('notLoggedIn')}
              </div>
            </div>
          </div>

          <div className="h-px bg-[#e6e6e6] my-4"></div>

          {/* Navigation Items */}
          <nav className="space-y-4">
            <NavItem to="/profile/orders" icon={OrdersNavIcon}>
              {t('menu.myOrders')}
            </NavItem>

            <div className="h-px bg-[#e6e6e6]"></div>

            <NavItem to="/profile/account" icon={ProfileNavIcon}>
              {t('menu.accountInformation')}
            </NavItem>

            <NavItem to="/profile/address" icon={AddressNavIcon}>
              {t('menu.addressInformation')}
            </NavItem>

            {/* <NavItem to="/profile/payment" icon={PaymentNavIcon}>
              {t('menu.paymentInformation')}
            </NavItem> */}

            <div className="h-px bg-[#e6e6e6]"></div>

            <NavItem to="/support" icon={SupportNavIcon}>
              {t('menu.support')}
            </NavItem>

            <div className="h-px bg-[#e6e6e6]"></div>

            <LogoutButton className="w-full text-sm justify-start" />
          </nav>
        </SimpleCard>

        {/* Main Content */}
        <SimpleCard className="bg-transparent rounded-none p-0 border-none md:bg-card md:text-card-foreground md:rounded-md md:border flex-1 flex flex-col md:p-8">
          <Outlet />
        </SimpleCard>
      </div>
    </div>
  );
}

function NavItem({ 
  to, 
  icon: Icon, 
  children 
}: { 
  to: string; 
  icon?: React.ComponentType<{ isActive?: boolean; className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <Button asChild variant="ghost" className="w-full justify-start text-sm">
      <NavLink
        to={to}
        className="w-full flex items-center gap-3 [&.active]:bg-primary [&.active]:text-white"
      >
        {({ isActive }) => (
          <>
            {Icon && <Icon isActive={isActive} className="size-5 shrink-0" />}
            <span>{children}</span>
          </>
        )}
      </NavLink>
    </Button>
  );
}
