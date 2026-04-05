import { AccordionDropdownButton } from "~/components/accordion-dropdown-button";
import { Button } from "~/components/ui/button";
import { InlineAccordion, InlineAccordionContent, InlineAccordionItem, InlineAccordionTrigger, } from "~/components/ui/inline-accordion";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import { useQueryStates } from "nuqs";
import { shopSearchParamsSchema } from "~/lib/shop-search-params";
import { useSearchParams } from "react-router";

type SortCombo = {
  sortBy: "name" | "price" | "createdAt" | "stockQuantity" | "carCompatibility";
  sortOrder: "asc" | "desc";
};

type SortPresetKey =
  | "none"
  | "price-desc"
  | "price-asc"
  | "name-asc"
  | "name-desc";

const SORT_PRESETS: Record<SortPresetKey, SortCombo | null> = {
  none: null,
  "price-desc": { sortBy: "price", sortOrder: "desc" },
  "price-asc": { sortBy: "price", sortOrder: "asc" },
  "name-asc": { sortBy: "name", sortOrder: "asc" },
  "name-desc": { sortBy: "name", sortOrder: "desc" },
};

function SortingOptions() {
  const [params, setParams] = useQueryStates(shopSearchParamsSchema);
  const [routerSearch, setRouterSearch] = useSearchParams();

  const { t } = useTranslation("shop");

  const currentSort =
    params.sortBy && params.sortOrder
      ? `${params.sortBy}-${params.sortOrder}`
      : "none";
  const isAnySelected = currentSort === "none";

  /** Drop legacy `sort=price_desc`-style param so it cannot override cleared nuqs state. */
  const stripLegacySortParam = () => {
    if (!routerSearch.has("sort")) return;
    const next = new URLSearchParams(routerSearch);
    next.delete("sort");
    setRouterSearch(next, { replace: true });
  };

  const handleSortChange = (key: SortPresetKey) => {
    const combo = SORT_PRESETS[key];
    if (!combo) {
      void setParams({ sortBy: null, sortOrder: null });
      stripLegacySortParam();
      return;
    }
    void setParams({ sortBy: combo.sortBy, sortOrder: combo.sortOrder });
    stripLegacySortParam();
  };

  return (
    <div>
      <InlineAccordion type="single" collapsible defaultValue="sort-by">
        <InlineAccordionItem value="sort-by">
          <InlineAccordionTrigger className="flex items-center justify-between w-full hover:no-underline p-0 mb-3 group">
            <h3 className="text-base font-bold text-black leading-[1.5] tracking-[-0.176px]">
              {t("sort.title")}
            </h3>
            <AccordionDropdownButton />
          </InlineAccordionTrigger>
          <InlineAccordionContent>
            <div className="flex flex-col gap-2 pt-0">
              {/* First row */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => handleSortChange("none")}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "whitespace-nowrap px-2 py-1.5 rounded-sm text-sm leading-[1.5] tracking-[-0.154px]",
                    isAnySelected
                      ? "bg-[#cf172f] text-white font-bold hover:bg-[#cf172f]/90 hover:text-white border-0"
                      : "bg-[#f9f9f9] text-black font-medium border border-[#e6e6e6] hover:bg-[#f9f9f9]"
                  )}
                >
                  {t("sort.any")}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSortChange("price-desc")}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "whitespace-nowrap px-3 py-1.5 rounded-sm text-sm leading-[1.5] tracking-[-0.154px]",
                    currentSort === "price-desc"
                      ? "bg-[#cf172f] text-white font-bold hover:bg-[#cf172f]/90 hover:text-white border-0"
                      : "bg-[#f9f9f9] text-black font-medium border border-[#e6e6e6] hover:bg-[#f9f9f9]"
                  )}
                >
                  {t("sort.priceHighToLow")}
                </Button>
              </div>
              {/* Second row */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => handleSortChange("price-asc")}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "whitespace-nowrap px-2 py-1.5 rounded-sm text-sm leading-[1.5] tracking-[-0.154px]",
                    currentSort === "price-asc"
                      ? "bg-[#cf172f] text-white font-bold hover:bg-[#cf172f]/90 hover:text-white border-0"
                      : "bg-[#f9f9f9] text-black font-medium border border-[#e6e6e6] hover:bg-[#f9f9f9]"
                  )}
                >
                  {t("sort.priceLowToHigh")}
                </Button>
              </div>
              {/* Third row */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => handleSortChange("name-asc")}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "whitespace-nowrap px-2 py-1.5 rounded-sm text-sm leading-[1.5] tracking-[-0.154px]",
                    currentSort === "name-asc"
                      ? "bg-[#cf172f] text-white font-bold hover:bg-[#cf172f]/90 hover:text-white border-0"
                      : "bg-[#f9f9f9] text-black font-medium border border-[#e6e6e6] hover:bg-[#f9f9f9]"
                  )}
                >
                  {t("sort.nameAsc")}
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSortChange("name-desc")}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "whitespace-nowrap px-2 py-1.5 rounded-sm text-sm leading-[1.5] tracking-[-0.154px]",
                    currentSort === "name-desc"
                      ? "bg-[#cf172f] text-white font-bold hover:bg-[#cf172f]/90 hover:text-white border-0"
                      : "bg-[#f9f9f9] text-black font-medium border border-[#e6e6e6] hover:bg-[#f9f9f9]"
                  )}
                >
                  {t("sort.nameDesc")}
                </Button>
              </div>
            </div>
          </InlineAccordionContent>
        </InlineAccordionItem>
      </InlineAccordion>
    </div>
  );
}

export default SortingOptions;
