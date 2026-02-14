import { AccordionDropdownButton } from "~/components/accordion-dropdown-button";
import { Button } from "~/components/ui/button";
import { InlineAccordion, InlineAccordionContent, InlineAccordionItem, InlineAccordionTrigger, } from "~/components/ui/inline-accordion";
import { useTranslation } from "react-i18next";
import { cn } from "~/lib/utils";
import { useSearchParams } from "react-router";

function SortingOptions() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { t } = useTranslation("shop");

  const sortParam = searchParams.get("sort");
  const sortBy = searchParams.get("sortBy");
  const sortOrder = searchParams.get("sortOrder");
  const currentSort =
    sortParam
      ? sortParam.replace("_", "-")
      : sortBy && sortOrder
        ? `${sortBy}-${sortOrder}`
        : "none";
  const isAnySelected = currentSort === "none";

  const handleSortChange = (value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    if (value === "none") {
      nextParams.delete("sort");
      nextParams.delete("sortBy");
      nextParams.delete("sortOrder");
    } else {
      const [nextSortBy, nextSortOrder] = value.split("-");
      nextParams.set("sort", `${nextSortBy}_${nextSortOrder}`);
      nextParams.set("sortBy", nextSortBy);
      nextParams.set("sortOrder", nextSortOrder);
    }
    setSearchParams(nextParams);
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
