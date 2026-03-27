import { useState, useEffect } from "react";
import { Link, href, useRouteLoaderData } from "react-router";
import { Loader2, Heart } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import { useFavoritesManager } from "~/lib/favorites-manager";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import { useCurrency } from "~/hooks/use-currency";
import { useTranslation } from "react-i18next";
import { buildProductPath } from "~/lib/product-url";
import type { Route } from "../routes/+types/_main";

const MAX_VISIBLE = 5;

export function WishlistHoverPopup({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const isRTL = (i18n.language || "").startsWith("ar");
  const loaderData = useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const isAuthenticated = !!loaderData?.isAuthenticated;

  const { favoritesQuery } = useFavoritesManager(isAuthenticated);
  const { selectedCurrency, convertPrice } = useCurrency();

  const [open, setOpen] = useState(false);
  const [convertedPrices, setConvertedPrices] = useState<Record<string, number>>({});

  const items = favoritesQuery.data?.items ?? [];
  const total = favoritesQuery.data?.totalFavorites ?? 0;
  const visible = items.slice(0, MAX_VISIBLE);

  useEffect(() => {
    if (!open || visible.length === 0) return;
    const conversions: Record<string, number> = {};
    Promise.all(
      visible.map(async (item) => {
        conversions[item.id] = await convertPrice(item.price);
      })
    ).then(() => setConvertedPrices({ ...conversions }));
  }, [open, visible.length, selectedCurrency]);

  const strings = {
    title: isRTL ? "قائمة الأمنيات" : "My Wishlist",
    viewWishlist: isRTL ? "عرض قائمة الأمنيات" : "View Wishlist",
    empty: isRTL ? "قائمة أمنياتك فارغة" : "Your wishlist is empty",
    emptyDesc: isRTL
      ? "احفظ المنتجات التي تحبها بالنقر على القلب في أي منتج."
      : "Save products you love by tapping the heart on any product.",
    itemCount: (n: number) => (isRTL ? `${n} منتج` : `${n} item${n === 1 ? "" : "s"}`),
    more: (n: number) => (isRTL ? `+${n} منتجات أخرى` : `+${n} more`),
  };

  return (
    <HoverCard openDelay={200} closeDelay={100} onOpenChange={setOpen}>
      <HoverCardTrigger asChild>
        <span style={{ display: 'inline-flex' }}>{children}</span>
      </HoverCardTrigger>
      <HoverCardContent
        className="hidden md:block w-[400px] p-4 bg-[#f2f2f2] border border-[#e6e6e6] rounded-[2px] shadow-[0_4px_10px_0_rgba(0,0,0,0.10)]"
        sideOffset={12}
        align="end"
      >
        <div className="w-full" dir={isRTL ? "rtl" : "ltr"}>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-black">
                {strings.title}
              </h3>
              <p className="text-sm text-black/50">
                {total > 0 ? strings.itemCount(total) : ""}
              </p>
            </div>
            <Link
              to="/wishlist"
              className="text-sm text-black/50 hover:text-black underline shrink-0"
            >
              {strings.viewWishlist}
            </Link>
          </div>

          {/* Body */}
          {favoritesQuery.isPending ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin mr-2" />
            </div>
          ) : visible.length === 0 ? (
            <div className="rounded-[6px] border border-[#e6e6e6] bg-white p-4">
              <div className="flex items-center gap-3">
                <Heart className="size-8 text-[#cf172f] shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-sm font-semibold text-black">{strings.empty}</p>
                  <p className="text-sm text-[rgba(0,0,0,0.6)]">{strings.emptyDesc}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {visible.map((item) => {
                const translation = getLocalizedTranslation(item.translations);
                const name = translation?.name ?? item.translations[0]?.name ?? "";
                const price = convertedPrices[item.id] ?? item.price;
                const productPath = buildProductPath(item);

                return (
                  <Link
                    key={item.id}
                    to={productPath}
                    className="group flex items-center gap-3 rounded-[6px] border border-[#e6e6e6] bg-white px-3 py-2 hover:border-[#cf172f] hover:bg-[#fff5f6] transition-colors"
                  >
                    <img
                      src={item.mainImage ?? "/car-placeholder.png"}
                      alt={name}
                      className="h-12 w-12 object-contain shrink-0"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-black truncate group-hover:text-[#cf172f] transition-colors">
                        {name}
                      </p>
                      <p className="text-sm font-semibold text-black/50">
                        {selectedCurrency} {price.toFixed(2)}
                      </p>
                    </div>
                  </Link>
                );
              })}
              {total > MAX_VISIBLE && (
                <Link
                  to="/wishlist"
                  className="block text-center text-sm font-medium text-[rgba(0,0,0,0.5)] hover:text-black py-1 transition-colors"
                >
                  {strings.more(total - MAX_VISIBLE)}
                </Link>
              )}
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
