import { PlusIcon, MinusIcon, X} from "lucide-react";
import { AccordionDropdownButton } from "~/components/accordion-dropdown-button";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { InlineAccordion, InlineAccordionContent, InlineAccordionItem, InlineAccordionTrigger, } from "~/components/ui/inline-accordion";
import { Label } from "@radix-ui/react-label";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { Badge } from "~/components/ui/badge";
import { shopSearchParamsSchema } from "~/lib/shop-search-params";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { useQueryStates } from "nuqs";
import getLocalizedTranslation from "~/lib/get-locale-translation";
import { cn } from "~/lib/utils";

type Category = {
  id: string;
  storeId: string;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
  imageUrl?: string | null;
  translations: Array<{
    languageId: string;
    languageCode: string;
    name: string;
    description?: string | null;
  }>;
  subcategories?: Array<{
    translations: { languageCode: string, name: string }[] | undefined;
    id: string;
    name: string;
    sortOrder: number;
    productCount: number;
  }>;
  productCount?: number;
  createdAt: string;
  updatedAt: string;
};

function CategoriesFilter({
  categories,
  countsById,
  hasActiveFilters = false,
}: {
  categories: Category[];
  countsById?: Record<string, number>;
  hasActiveFilters?: boolean;
}) {
  const [searchParams, setSearchParams] = useQueryStates(
    shopSearchParamsSchema
  );
  const selectedCategories = searchParams.categories || [];

  const {t} = useTranslation("shop");

  // Categories are already filtered by productTypeId from the backend
  const filteredCategories = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      subcategories: cat.subcategories || [],
    }));
  }, [categories]);

  const handleToggle = (categoryId: string, checked: CheckedState) => {
    const current = selectedCategories;
    if (checked) {
      setSearchParams({ categories: [...current, categoryId] });
    } else {
      setSearchParams({
        categories: current.filter((id) => id !== categoryId),
      });
    }
  };

  const clearAll = () => {
    setSearchParams({ categories: [] });
  };

  if (filteredCategories.length === 0) {
    return (
      <div>
        <h3 className="text-base font-bold text-black leading-[1.5] tracking-[-0.176px] mb-3">
          {t("filters.categories")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("filters.noCategories")}</p>
      </div>
    );
  }

  const resolveCount = (id: string, fallback?: number) => {
    if (hasActiveFilters) {
      if (!countsById) return undefined;
      return countsById[id] ?? 0;
    }
    return fallback;
  };

  return (
    <div>
      <InlineAccordion type="single" collapsible defaultValue="categories">
        <InlineAccordionItem value="categories">
          <InlineAccordionTrigger className="flex items-center justify-between w-full hover:no-underline p-0 mb-3 group">
            <h3 className="text-base font-bold text-black leading-[1.5] tracking-[-0.176px]">
              {t("filters.categories")}
            </h3>
            <AccordionDropdownButton />
          </InlineAccordionTrigger>
          <InlineAccordionContent>
            <div className="pt-0">
              {selectedCategories.length > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-muted-foreground">
                    {selectedCategories.length} {t("filters.selected")}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-auto p-1 text-xs"
                  >
                    {t("filters.clearAll")}
                  </Button>
                </div>
              )}

              {/* Active Filters */}
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {selectedCategories.map((categoryId) => {
                    // Find category name
                    let categoryName = "Category";
                    for (const cat of filteredCategories) {
                      if (cat.id === categoryId) {
                        categoryName =
                          getLocalizedTranslation(cat.translations)?.name || "Category";
                        break;
                      }
                      const sub = cat.subcategories?.find(
                        (s) => s.id === categoryId
                      );
                      if (sub) {
                        categoryName = getLocalizedTranslation(sub.translations)?.name || "Category";
                        break;
                      }
                    }

                    return (
                      <Badge
                        key={categoryId}
                        variant="secondary"
                        className="gap-1 pr-1"
                      >
                        {categoryName}
                        <button
                          onClick={() => handleToggle(categoryId, false)}
                          className="ml-1 hover:bg-muted rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              {/* Category List */}
              <InlineAccordion
                type="multiple"
                defaultValue={filteredCategories.map((cat) => cat.id)}
                className="pb-6"
              >
                {filteredCategories.map((category, categoryIndex) => {
                  const subcategories = category.subcategories || [];
                  const hasSubcategories = subcategories.length > 0;
                  const categoryName =
                    getLocalizedTranslation(category.translations)?.name || "Unknown";
                  const isSelected = selectedCategories.includes(category.id);

                  const isLastCategory =
                    categoryIndex === filteredCategories.length - 1;
                  return (
                    <InlineAccordionItem
                      key={category.id}
                      value={category.id}
                      className={isLastCategory ? "pb-4" : ""}
                    >
                      <div className="flex items-center gap-3 py-2">
                        <Checkbox
                          id={`cat-${category.id}`}
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleToggle(category.id, checked)
                          }
                        />
                        {hasSubcategories ? (
                          <InlineAccordionTrigger className="flex items-center gap-2 hover:no-underline flex-1 group">
                            <Label
                              htmlFor={`cat-${category.id}`}
                              className="text-sm font-medium leading-none cursor-pointer"
                              onClick={(e) => e.preventDefault()}
                            >
                              {categoryName}
                            </Label>
                            <div className="shrink-0 pointer-events-none">
                              <PlusIcon className="h-4 w-4 transition-opacity duration-200 group-data-[state=open]:hidden" />
                              <MinusIcon className="h-4 w-4 transition-opacity duration-200 group-data-[state=closed]:hidden" />
                            </div>
                          </InlineAccordionTrigger>
                        ) : (
                          <Label
                            htmlFor={`cat-${category.id}`}
                            className="text-sm font-medium leading-none cursor-pointer"
                          >
                            {categoryName}
                          </Label>
                        )}
                      </div>

                      {hasSubcategories && (
                        <InlineAccordionContent className="pt-0 pb-4">
                          <div className="ml-6 space-y-2 mt-2 pb-4">
                            {subcategories.map((subcategory, subIndex) => {
                              const isSubSelected = selectedCategories.includes(
                                subcategory.id
                              );
                              const isLastSubcategory =
                                subIndex === subcategories.length - 1;

                              return (
                                <div
                                  key={subcategory.id}
                                  className={cn(
                                    "flex items-center space-x-2",
                                    isLastSubcategory && "mb-2"
                                  )}
                                >
                                  <Checkbox
                                    id={`cat-${subcategory.id}`}
                                    checked={isSubSelected}
                                    onCheckedChange={(checked) =>
                                      handleToggle(subcategory.id, checked)
                                    }
                                  />
                                  <Label
                                    htmlFor={`cat-${subcategory.id}`}
                                    className="text-sm leading-none cursor-pointer"
                                  >
                                    {getLocalizedTranslation(subcategory.translations)?.name || subcategory.name}
                                    {resolveCount(subcategory.id, subcategory.productCount) !== undefined && (
                                      <span className="text-muted-foreground ml-2">
                                        ({resolveCount(subcategory.id, subcategory.productCount)})
                                      </span>
                                    )}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </InlineAccordionContent>
                      )}
                    </InlineAccordionItem>
                  );
                })}
              </InlineAccordion>
            </div>
          </InlineAccordionContent>
        </InlineAccordionItem>
      </InlineAccordion>
    </div>
  );
}

export default CategoriesFilter;
