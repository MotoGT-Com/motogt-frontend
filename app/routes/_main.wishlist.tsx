import { ProductCard, ProductCardSkeleton } from "~/components/product-card";
import { favoritesQueryOptions } from "~/lib/queries";
import { useFavoritesManager } from "~/lib/favorites-manager";
import { Loader2 } from "lucide-react";
import { useInfiniteQueryWithScrollPagination } from "~/hooks/use-infinite-query-with-scroll-pagination";
import { useRouteLoaderData } from "react-router";
import { useTranslation } from "react-i18next";

export default function Wishlist() {
  const { t } = useTranslation('common');
  const loaderData = useRouteLoaderData("routes/_main");
  const isAuthenticated = loaderData?.isAuthenticated;

  // Use server-side infinite query for authenticated users
  const serverFavoritesQuery = useInfiniteQueryWithScrollPagination(
    favoritesQueryOptions
  );

  // Use client-side query for unauthenticated users
  const { favoritesQuery: clientFavoritesQuery } =
    useFavoritesManager(isAuthenticated);

  // Determine which query to use based on authentication status
  const favoritesQuery = isAuthenticated
    ? serverFavoritesQuery
    : clientFavoritesQuery;
  const totalFavorites = isAuthenticated
    ? (serverFavoritesQuery.data?.pages[0]?.data.summary.totalFavourites ?? 0)
    : (clientFavoritesQuery.data?.totalFavorites ?? 0);

  if (favoritesQuery.error) {
    return <div>{t('wishlist.errorLoading')}</div>;
  }

  return (
    <>
      <title>{t('wishlist.pageTitle')}</title>
      <div className="max-w-7xl mx-auto px-6 mb-6 mt-8">
        <h1 className="text-[18px] font-black italic leading-[150%] tracking-[-0.198px] text-[#000]">
          {t('wishlist.title')}{" "}
          {totalFavorites > 0 && (
            <span className="text-[14px] font-normal not-italic leading-[150%] tracking-[-0.154px] text-[rgba(0,0,0,0.50)]">
              ({totalFavorites} {totalFavorites === 1 ? t('wishlist.part') : t('wishlist.parts')})
            </span>
          )}
        </h1>
      </div>
      <main className="max-w-7xl mx-auto px-6 pb-8">
        {favoritesQuery.isPending ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 9 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </div>
        ) : totalFavorites === 0 ? (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold text-gray-600 mb-4">
              {t('wishlist.emptyTitle')}
            </h2>
            <p className="text-gray-500 mb-8">
              {t('wishlist.emptyDescription')}
            </p>
            <a
              href="/"
              className="inline-flex items-center px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              {t('wishlist.continueShopping')}
            </a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
              {isAuthenticated
                ? serverFavoritesQuery.data?.pages
                    .flatMap((page) => page.data.favourites)
                    .map((favoriteItem) => {
                      return (
                        <ProductCard
                          key={favoriteItem.id}
                          product={favoriteItem.product}
                        />
                      );
                    })
                : clientFavoritesQuery.data?.items.map((favoriteItem) => {
                    return (
                      <ProductCard
                        key={favoriteItem.id}
                        product={favoriteItem}
                      />
                    );
                  })}
            </div>
            {isAuthenticated && (
              <>
                <div ref={serverFavoritesQuery.paginatorRef} />
                {serverFavoritesQuery.isFetchingNextPage && (
                  <div className="flex justify-center py-10">
                    <Loader2 className="size-10 text-primary animate-spin" />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
