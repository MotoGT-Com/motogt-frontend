import { Suspense, useMemo } from "react";
import { Await, useSearchParams } from "react-router";
import { SimpleCard } from "~/components/ui/card";
import CategoriesFilter from "~/components/filter";
import SortingOptions from "~/components/sorting-options";
import { cn } from "~/lib/utils";

type FilterSidebarProps = {
  categoriesResponse: any;
  productsResponse?: any;
  variant?: "sidebar" | "drawer";
  className?: string;
};

const FILTER_PARAM_KEYS = [
  "search",
  "carId",
  "carBrand",
  "carModel",
  "carYear",
  "categories",
  "productIds",
];

function buildCountsById(products: any[] = []) {
  const counts: Record<string, number> = {};
  products.forEach((product) => {
    if (product?.categoryId) {
      counts[product.categoryId] = (counts[product.categoryId] || 0) + 1;
    }
    if (product?.subCategoryId) {
      counts[product.subCategoryId] =
        (counts[product.subCategoryId] || 0) + 1;
    }
  });
  return counts;
}

function FilterSidebar({
  categoriesResponse,
  productsResponse,
  variant = "sidebar",
  className,
}: FilterSidebarProps) {
  const [searchParams] = useSearchParams();

  const hasActiveFilters = useMemo(() => {
    return FILTER_PARAM_KEYS.some((key) => {
      const values = searchParams.getAll(key);
      return values.some((value) => value.trim() !== "");
    });
  }, [searchParams]);

  const content = (
    <div className="max-h-[calc(100vh-9rem)] overflow-y-auto pr-1">
      <SortingOptions />
      <div className="border-t my-6" />
      <Suspense fallback={<div>Loading categories...</div>}>
        <Await resolve={Promise.all([categoriesResponse, productsResponse])}>
          {([categories, products]) => {
            const productList = products?.data?.data || [];
            return (
              <CategoriesFilter
                categories={categories?.data?.data || []}
                countsById={buildCountsById(productList)}
                hasActiveFilters={hasActiveFilters}
              />
            );
          }}
        </Await>
      </Suspense>
    </div>
  );

  if (variant === "drawer") {
    return <div className={cn("w-full", className)}>{content}</div>;
  }

  return (
    <SimpleCard
      className={cn("p-4 sticky top-4 w-[280px] shrink-0", className)}
    >
      {content}
    </SimpleCard>
  );
}

export default FilterSidebar;
