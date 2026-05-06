import { AccordionDropdownButton } from "~/components/accordion-dropdown-button";
import { ShopFilterChipButton } from "~/components/shop-filter-chip-button";
import {
  InlineAccordion,
  InlineAccordionContent,
  InlineAccordionItem,
  InlineAccordionTrigger,
} from "~/components/ui/inline-accordion";
import { useTranslation } from "react-i18next";
import { useQueryStates } from "nuqs";
import { shopSearchParamsSchema } from "~/lib/shop-search-params";
import { useSearchParams } from "react-router";

type SortCombo = {
  sortBy:
    | "name"
    | "price"
    | "createdAt"
    | "stockQuantity"
    | "carCompatibility";
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
              <div className="flex gap-2">
                <ShopFilterChipButton
                  selected={isAnySelected}
                  onClick={() => handleSortChange("none")}
                >
                  {t("sort.any")}
                </ShopFilterChipButton>
                <ShopFilterChipButton
                  selected={currentSort === "price-desc"}
                  onClick={() => handleSortChange("price-desc")}
                  className="px-3"
                >
                  {t("sort.priceHighToLow")}
                </ShopFilterChipButton>
              </div>
              <div className="flex gap-2">
                <ShopFilterChipButton
                  selected={currentSort === "price-asc"}
                  onClick={() => handleSortChange("price-asc")}
                >
                  {t("sort.priceLowToHigh")}
                </ShopFilterChipButton>
              </div>
              <div className="flex gap-2">
                <ShopFilterChipButton
                  selected={currentSort === "name-asc"}
                  onClick={() => handleSortChange("name-asc")}
                >
                  {t("sort.nameAsc")}
                </ShopFilterChipButton>
                <ShopFilterChipButton
                  selected={currentSort === "name-desc"}
                  onClick={() => handleSortChange("name-desc")}
                >
                  {t("sort.nameDesc")}
                </ShopFilterChipButton>
              </div>
            </div>
          </InlineAccordionContent>
        </InlineAccordionItem>
      </InlineAccordion>
    </div>
  );
}

export default SortingOptions;
