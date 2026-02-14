/**
 * Main Layout Component
 *
 * This is the root layout component that wraps all pages in the application.
 * It provides:
 * - Navigation bar (desktop and mobile)
 * - User authentication state
 * - Cart management
 * - Header toast notifications
 * - Footer (conditionally rendered)
 *
 * Navigation Routes:
 * - Home: "/"
 * - Car Parts: "/shop/:productType" with productType="car-parts"
 * - Riding Gear: "/shop/:productType" with productType="riding-gear"
 * - Cleaning & Accessories: "/shop/:productType" with productType="cleaning-and-accessories"
 * - Garage: "/my-garage"
 * - Wishlist: "/wishlist"
 * - Cart: "/cart"
 * - Profile: "/profile"
 *
 * Note: Shop routes use dynamic routing with the :productType parameter.
 * Use href("/shop/:productType", { productType: "value" }) for type-safe navigation.
 */

import { href, Link, NavLink, Outlet, useLocation } from "react-router";
import { Logo } from "~/components/logo";
import { Button } from "~/components/ui/button";
import { MenuIcon, XIcon } from "lucide-react";
import type { Route } from "./+types/_main";
import { cn } from "~/lib/utils";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTrigger, } from "~/components/ui/sheet";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { useEffect, useState, useMemo } from "react";
import { useCartManager } from "~/lib/cart-manager";
import { authContext } from "~/context";
import { garageCarsQueryOptions } from "~/lib/queries";
import { getApiProductTypes } from "~/lib/client";
import { useQuery } from "@tanstack/react-query";
import { HeaderToast } from "~/components/header-toast";
import { HomeNavIcon, CarPartsNavIcon, CareNavIcon, RidingGearNavIcon, GarageNavIcon, WishlistNavIcon, CartNavIcon, ProfileNavIcon, OrdersNavIcon, AddressNavIcon, SupportNavIcon, FeaturedNavIcon, } from "~/components/nav-icons";
import { LogoutButton } from "~/components/logout-button";
import { ProfileHoverPopup } from "~/components/profile-hover-popup";
import { GarageNavButton } from "~/components/garage-nav-button";
import { LanguageSwitcher } from "~/components/language-switcher";
import { CurrencySelector } from "~/components/currency-selector";
import { CurrencyProvider, useCurrency } from "~/hooks/use-currency";
import { CartHoverPopup } from "~/components/cart-hover-popup";
import { useTranslation } from "react-i18next";
import { SiteFooter } from "~/components/site-footer";

/**
 * Server-side loader that fetches authentication state, user data, and product types
 */
export async function loader({ context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  
  // Fetch product types for dynamic navigation
  const productTypesResponse = await getApiProductTypes();
  
  const productTypesData = productTypesResponse.data?.data || [];
  
  return {
    isAuthenticated: auth.isAuthenticated,
    user: auth.user,
    productTypes: productTypesData,
  };
}

/**
 * Main Layout Component
 *
 * Renders the application shell with navigation, header, and footer.
 * Handles responsive design with separate desktop and mobile navigation.
 */
export default function Main(props: Route.ComponentProps) {
  return (
    <CurrencyProvider>
      <MainContent {...props} />
    </CurrencyProvider>
  );
}

function MainContent({ matches, loaderData }: Route.ComponentProps) {
  const { t } = useTranslation('common');
  const { isAuthenticated, user } = loaderData;

  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });

  const { cartQuery, removeFromCartMutation } = useCartManager(isAuthenticated);
  const cartItems = cartQuery.data?.items ?? [];
  const cartTotalItems = cartQuery.data?.totalItems ?? 0;
  const cartTotalAmount = cartItems.reduce(
    (sum, item) => sum + (item.unitPrice || 0) * item.quantity,
    0
  );
  
  // Currency conversion for cart total
  const { selectedCurrency, convertPrice } = useCurrency();
  const [convertedCartTotal, setConvertedCartTotal] = useState<number | null>(null);
  
  useEffect(() => {
    if (cartTotalAmount === 0) {
      setConvertedCartTotal(0);
      return;
    }
    
    convertPrice(cartTotalAmount, "JOD")
      .then(result => {
        setConvertedCartTotal(result.convertedAmount);
      })
      .catch(() => {
        setConvertedCartTotal(cartTotalAmount);
      });
  }, [cartTotalAmount, selectedCurrency, convertPrice]);
  
  const displayCartTotal = convertedCartTotal ?? cartTotalAmount;
  const formatCartAmount = (amount: number) => `${selectedCurrency} ${amount.toFixed(2)}`;
  
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  // Hide footer on garage pages
  const hideFooter = useMemo(
    () =>
      matches.some(
        (match) => match?.pathname.includes("my-garage")
      ),
    [matches]
  );

  return (
    <>
      {/* Main Header - Sticky navigation bar */}
      <header className="bg-background border-b sticky top-0 z-50 font-koulen">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between w-full">
          {/* Desktop: Left Garage Button */}
          <div className="hidden md:flex items-center">
            <GarageNavButton
              to={href("/my-garage")}
              variant="outline"
              icon={GarageNavIcon}
            >
              {garageCarsQuery.data?.summary.primaryCar
                ? `${garageCarsQuery.data.summary.primaryCar.carDetails.brand} ${garageCarsQuery.data.summary.primaryCar.carDetails.model}`
                : t("nav.myGarage")}
            </GarageNavButton>
          </div>

          {/* Logo */}
          <div className="flex items-center md:flex-1 md:justify-center">
            <Link to={href("/")} prefetch="render" target="_self">
              <span className="sr-only">Home</span>
              <Logo variant="primary" className="w-44" />
            </Link>
          </div>

          {/* Desktop: Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <CurrencySelector />
            <CartHoverPopup
              items={cartItems}
              totalItems={cartTotalItems}
              totalAmount={cartTotalAmount}
              onRemove={(productId) => removeFromCartMutation.mutate(productId)}
              isRemoving={removeFromCartMutation.isPending}
            >
              <NavLink to={href("/cart")} prefetch="render">
                {({ isActive }) => (
                  <Button
                    variant="outline"
                    className={cn(
                      "relative h-10 px-3 gap-2 font-koulen",
                      isActive &&
                        "bg-primary text-white border-primary hover:bg-primary/95 hover:text-white"
                    )}
                  >
                    <CartNavIcon isActive={isActive} />
                    <span className="text-sm font-semibold">
                      {formatCartAmount(displayCartTotal)}
                    </span>
                    <span className="sr-only">{t("nav.cart")}</span>
                    {!!cartQuery.data && (
                      <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center font-sans font-normal text-[0.65rem] border">
                        {cartQuery.data.totalItems}
                      </div>
                    )}
                  </Button>
                )}
              </NavLink>
            </CartHoverPopup>
            <ProfileHoverPopup>
              <NavLinkButton
                to={href("/profile")}
                size="icon"
                variant="outline"
                icon={ProfileNavIcon}
              >
                <span className="sr-only">{t("nav.profile")}</span>
              </NavLinkButton>
            </ProfileHoverPopup>
          </div>
          {/* Mobile Header Actions - Cart and Menu Toggle */}
          <div className="flex items-center gap-4 md:hidden">
            <CurrencySelector />
            <NavLinkButton
              to={href("/cart")}
              size="icon"
              variant="outline"
              className="relative"
              icon={CartNavIcon}
            >
              <span className="sr-only">{t('nav.cart')}</span>
              {!!cartQuery.data && (
                <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center font-sans font-normal text-[0.65rem] border">
                  {cartQuery.data.totalItems}
                </div>
              )}
            </NavLinkButton>
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <MenuIcon />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-full"
                withCloseButton={false}
              >
                <SheetHeader className="pb-0 flex flex-row items-center gap-4 mb-6">
                  <Link to={href("/")} prefetch="render" target="_self">
                    <span className="sr-only">Home</span>
                    <Logo variant="primary" className="w-44" />
                  </Link>
                  <LanguageSwitcher />
                  <NavLinkButton
                    to={href("/cart")}
                    size="icon"
                    variant="outline"
                    className="ms-auto relative"
                    icon={CartNavIcon}
                  >
                    <span className="sr-only">{t('nav.cart')}</span>
                    {!!cartQuery.data && (
                      <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center font-sans font-normal text-[0.65rem] border">
                        {cartQuery.data.totalItems}
                      </div>
                    )}
                  </NavLinkButton>
                  <SheetClose asChild>
                    <Button variant="outline" size="icon">
                      <XIcon />
                    </Button>
                  </SheetClose>
                </SheetHeader>
                <div className="px-4 pb-4 flex-1 overflow-scroll">
                  {user && (
                    <>
                      <div className="flex items-center gap-2 mb-4">
                        <Avatar>
                          <AvatarFallback>
                            {user.firstName.charAt(0) + user.lastName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col gap-1 overflow-hidden">
                          <div className="text-sm font-medium text-black leading-[1.2] whitespace-nowrap">
                            {user
                              ? `${user.firstName} ${user.lastName}`
                              : "Guest User"}
                          </div>
                          <div className="text-xs text-black/30 leading-[1.2] whitespace-nowrap">
                            {user?.email || "Not logged in"}
                          </div>
                        </div>
                      </div>
                      <div className="h-px bg-border mb-4"></div>
                    </>
                  )}
                  <nav
                    className={cn(
                      "flex flex-col gap-4 [&>*]:justify-start [&>*]:md:justify-center",
                      !user && "h-full"
                    )}
                  >
                    <GarageNavButton
                      to={href("/my-garage")}
                      className="justify-center"
                      icon={GarageNavIcon}
                    >
                      {t('nav.garage')}
                    </GarageNavButton>
                    <div className="h-px bg-border"></div>
                    <NavLinkButton
                      to={href("/")}
                      className=""
                      size="lg"
                      icon={HomeNavIcon}
                    >
                      {t('nav.home')}
                    </NavLinkButton>
                    <div className="h-px bg-border"></div>
                    <div className="text-xs font-bold text-muted-foreground px-2 py-1.5">
                      {t('nav.shop')}
                    </div>
                    <NavLinkButton
                      to={href("/shop/:productType", { productType: "car-parts" })}
                      size="lg"
                      icon={CarPartsNavIcon}
                    >
                      {t("nav.carParts")}
                    </NavLinkButton>
                    <NavLinkButton
                      to={href("/shop/:productType", { productType: "motorcycles" })}
                      size="lg"
                      icon={RidingGearNavIcon}
                    >
                      {t("nav.motorcycles")}
                    </NavLinkButton>
                    <NavLinkButton
                      to={href("/shop/:productType", { productType: "car-care-accessiores" })}
                      size="lg"
                      icon={CareNavIcon}
                    >
                      {t("nav.carCareAccessories")}
                    </NavLinkButton>
                    <NavLinkButton
                      to={href("/recommended")}
                      size="lg"
                      icon={FeaturedNavIcon}
                    >
                      {t("nav.recommendedForYou")}
                    </NavLinkButton>
                    <div className="h-px bg-border"></div>
                    <NavLinkButton
                      to={href("/wishlist")}
                      size="lg"
                      icon={WishlistNavIcon}
                    >
                      {t('nav.wishlist')}
                    </NavLinkButton>
                    {!user && (
                      <>
                        <div className="h-px bg-border mt-auto"></div>
                        <Button
                          className="font-koulen justify-center!"
                          size="lg"
                        >
                          <Link to={href("/login")} prefetch="render">
                            {t('nav.login')}
                          </Link>
                        </Button>
                        <Button
                          variant={"outline"}
                          className="font-koulen justify-center!"
                          size="lg"
                        >
                          <Link to={href("/register")} prefetch="render">
                            {t('nav.createAccount')}
                          </Link>
                        </Button>
                      </>
                    )}
                    {user && (
                      <>
                        <NavLinkButton
                          to={href("/profile/orders")}
                          size="lg"
                          icon={OrdersNavIcon}
                        >
                          {t('nav.myOrders')}
                        </NavLinkButton>
                        <div className="h-px bg-border"></div>
                        <NavLinkButton
                          to={href("/profile/account")}
                          size="lg"
                          icon={ProfileNavIcon}
                        >
                          {t('nav.accountInfo')}
                        </NavLinkButton>
                        <NavLinkButton
                          to={href("/profile/address")}
                          size="lg"
                          icon={AddressNavIcon}
                        >
                          {t('nav.addressInfo')}
                        </NavLinkButton>
                        {/* <NavLinkButton to={href("/profile/payment")} size="lg">
                          <CreditCard />
                          Payment Information
                        </NavLinkButton> */}
                        <div className="h-px bg-border"></div>
                        <NavLinkButton
                          to={href("/profile/support")}
                          size="lg"
                          icon={SupportNavIcon}
                        >
                          {t('nav.support')}
                        </NavLinkButton>
                        <div className="h-px bg-border"></div>
                        <LogoutButton
                          className="w-full justify-start text-lg font-koulen"
                          size="lg"
                        />
                      </>
                    )}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
        {/* Desktop Secondary Navigation */}
        <div className="hidden md:flex items-center justify-center border-t bg-background">
          <nav className="flex items-center gap-6 py-3">
            <NavLinkButton
              to={href("/shop/:productType", { productType: "car-parts" })}
              icon={CarPartsNavIcon}
            >
              {t("nav.carParts")}
            </NavLinkButton>
            <NavLinkButton
              to={href("/shop/:productType", { productType: "motorcycles" })}
              icon={RidingGearNavIcon}
            >
              {t("nav.motorcycles")}
            </NavLinkButton>
            <NavLinkButton
              to={href("/shop/:productType", { productType: "car-care-accessiores" })}
              icon={CareNavIcon}
            >
              {t("nav.carCareAccessories")}
            </NavLinkButton>
            <NavLinkButton to={href("/recommended")} icon={FeaturedNavIcon}>
              {t("nav.recommendedForYou")}
            </NavLinkButton>
            <NavLinkButton to={href("/wishlist")} icon={WishlistNavIcon}>
              {t("nav.wishlist")}
            </NavLinkButton>
          </nav>
        </div>
      </header>
      <HeaderToast />
      <div className="min-h-[calc(100dvh-80px)] flex flex-col [&>*]:w-full">
        <Outlet />
      </div>
      {/* Footer */}
      {!hideFooter && <SiteFooter />}
    </>
  );
}

/**
 * NavLinkButton Component
 *
 * Optimized navigation button with memoized icon rendering for instant state changes.
 *
 * Features:
 * - Active state: Red background with white text when route matches
 * - Inactive state: Transparent background with red text
 * - Prefetch support for better performance
 * - Memoized icon rendering to prevent unnecessary re-renders
 * - Smooth transitions with CSS
 */
/**
 * NavLinkButton Component
 *
 * Simple navigation button with active state styling.
 */
function NavLinkButton({
  to,
  className,
  children,
  icon: Icon,
  prefetch = "render",
  ...props
}: React.ComponentProps<typeof Button> &
  Pick<React.ComponentProps<typeof NavLink>, "prefetch" | "to"> & {
    icon?: React.ComponentType<{ isActive?: boolean; className?: string }>;
  }) {
  return (
    <Button
      variant="ghost"
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
}
