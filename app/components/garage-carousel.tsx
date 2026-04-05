import useEmblaCarousel, { type UseEmblaCarouselType, } from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "~/components/ui/hover-card";
import type { UserCarResponse } from "~/lib/client/types.gen";
import { useQuery } from "@tanstack/react-query";
import { garageCarsQueryOptions } from "~/lib/queries";
import { Link } from "react-router";
import { serializeShopURL } from "~/lib/shop-search-params";
import { useTranslation } from "react-i18next";
import { useGuestGarageCars } from "~/hooks/use-guest-garage-cars";
import { AddNewCarDialog } from "~/components/add-new-car-dialog";
import { formatYearRange } from "~/lib/utils";

export function GarageCarousel({
  ref,
  selectedIndex,
  userCars,
}: {
  ref: UseEmblaCarouselType[0];
  selectedIndex: number;
  userCars: UserCarResponse["data"][];
}) {
  return (
    <div className="w-full">
      <div className="embla__viewport overflow-hidden" ref={ref}>
        <div className="embla__container flex">
          {userCars.map((car, index) => {
            const isActive = index === selectedIndex;
            const scale = isActive ? 1 : 0.6;
            const opacity = isActive ? 1 : 0.6;

            return (
              <div
                key={car.id}
                className="embla__slide min-w-0 transition-all duration-500 ease-out flex-[0_0_100%] md:flex-[0_0_50%]"
              >
                <Link
                  to={serializeShopURL({
                    carId: car.carId,
                    carYear: car.carDetails.yearFrom ?? undefined,
                  })}
                  key={car.id}
                  className="block"
                >
                  <div
                    className="flex flex-col items-center transition-all duration-500 ease-out select-none isolate group px-4 md:px-0"
                    style={{
                      transform: `scale(${scale})`,
                      opacity,
                    }}
                  >
                    <div className="text-center mb-3 md:mb-4 transition-all duration-300 group-hover:translate-y-[-4px] px-2">
                      <h2 className="font-black text-sm md:text-lg transition-colors duration-300 group-hover:text-[#CF172F] break-words">
                        {car.carDetails.brand} {car.carDetails.model} —{" "}
                        {formatYearRange(
                          car.carDetails.yearFrom,
                          car.carDetails.yearTo
                        )}
                      </h2>
                    </div>

                    {/* Brand Text */}
                    <div
                      className={`h-[20px] sm:h-[30px] md:h-[45px] relative -z-10 text-[60px] sm:text-[100px] md:text-[140px] lg:text-[200px] transition-all duration-300 group-hover:opacity-100`}
                    >
                      <div
                        className="leading-none absolute top-0 left-[50%] translate-x-[-50%] font-black text-center bg-clip-text text-transparent transition-all duration-500 ease-out"
                        style={{
                          backgroundImage:
                            "linear-gradient(to bottom, #000000 30%, #ffffff 90%)",
                          opacity: isActive ? 1 : 0.2,
                        }}
                      >
                        {car.carDetails.brand}
                      </div>
                    </div>

                    {/* Car Image */}
                    <div
                      className={`w-full max-w-[90vw] sm:max-w-[600px] md:max-w-[800px] aspect-[800/325] flex items-center justify-center transition-all duration-300 group-hover:scale-[1.05] group-hover:translate-y-[-8px]`}
                    >
                      <div className="relative w-full h-full transition-all duration-300 group-hover:drop-shadow-[0_10px_30px_rgba(0,0,0,0.15)]">
                        <img
                        loading="lazy"
                          src={car.carDetails.image ?? "/car-placeholder.png"}
                          alt={`${car.carDetails.brand} ${car.carDetails.model}`}
                          className="w-full h-full object-contain transition-all duration-300 group-hover:brightness-110"
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function HomeCarousel({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { t, i18n } = useTranslation("garage");
  const isRtl = i18n.dir(i18n.language) === "rtl";

  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });

  const guestCars = useGuestGarageCars(!isAuthenticated);

  const userCars = isAuthenticated
    ? (garageCarsQuery.data?.userCars ?? [])
    : (guestCars as any[]);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    containScroll: false,
    direction: isRtl ? "rtl" : "ltr",
  });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const onSelect = useCallback((emblaApi: any) => {
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  const [addCarOpen, setAddCarOpen] = useState(false);

  if (userCars.length === 0) {
    return (
      <div className="mb-16">
        <div className="max-w-7xl mx-auto px-6 mb-4">
          <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold italic text-black">{t("title")}</h2>
          <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
              <button type="button" className="inline-flex rounded-sm" aria-label={t("help.ariaLabel")}>
                <HelpCircle className="size-4 text-muted-foreground cursor-pointer" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-[280px] z-[60] p-0" side={isRtl ? "left" : "right"}>
              <div
                className="bg-[#F2F2F2] rounded-[2px] border border-[#E6E6E6] overflow-hidden"
                style={{ boxShadow: "0 4px 10px 0 rgba(0, 0, 0, 0.10)" }}
              >
                <div className="px-4 pt-4 pb-4">
                  <h4 className="text-sm font-semibold text-black leading-[1.5] mb-2">{t("help.title")}</h4>
                  <p className="text-xs font-medium text-[rgba(0,0,0,0.7)] leading-[1.5]">
                    {t("help.description")}
                  </p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
        </div>
        <div className="flex flex-col items-center justify-center py-8">
          <img
            src="/car-placeholder.png"
            alt={t("empty.imageAlt")}
            className="w-auto h-[100px] mb-8 mx-4 opacity-30 blur-[1px]"
          />
          <div className="text-center space-y-2 mb-6 mx-2">
            <p className="font-bold text-[#3d3d3d]">
              {t("empty.noCarsTitle")}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("empty.noCarsDescription")}
            </p>
          </div>
          <Button
            className="font-koulen uppercase tracking-widest px-10"
            onClick={() => setAddCarOpen(true)}
          >
            {t("addCarDialog.addNewCar")}
          </Button>
        </div>
        <AddNewCarDialog open={addCarOpen} onOpenChange={setAddCarOpen} />
      </div>
    );
  }

  return (
    <div className="mb-16">
      <div className="flex items-center justify-between max-w-7xl mx-auto px-6 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold italic text-black">{t("title")}</h2>
          <HoverCard openDelay={200}>
            <HoverCardTrigger asChild>
              <button type="button" className="inline-flex rounded-sm" aria-label={t("help.ariaLabel")}>
                <HelpCircle className="size-4 text-muted-foreground cursor-pointer" />
              </button>
            </HoverCardTrigger>
            <HoverCardContent className="w-[280px] z-[60] p-0" side={isRtl ? "left" : "right"}>
              <div
                className="bg-[#F2F2F2] rounded-[2px] border border-[#E6E6E6] overflow-hidden"
                style={{ boxShadow: "0 4px 10px 0 rgba(0, 0, 0, 0.10)" }}
              >
                <div className="px-4 pt-4 pb-4">
                  <h4 className="text-sm font-semibold text-black leading-[1.5] mb-2">{t("help.title")}</h4>
                  <p className="text-xs font-medium text-[rgba(0,0,0,0.7)] leading-[1.5]">
                    {t("help.description")}
                  </p>
                </div>
              </div>
            </HoverCardContent>
          </HoverCard>
        </div>
        <div className="flex gap-4 text-[8px]">
          <Button
            size="icon"
            onClick={scrollPrev}
            disabled={!emblaApi?.canScrollPrev()}
            aria-label={t("featuredBanner.previousSlide")}
          >
            {isRtl ? <ArrowRight /> : <ArrowLeft />}
          </Button>
          <Button
            size="icon"
            onClick={scrollNext}
            disabled={!emblaApi?.canScrollNext()}
            aria-label={t("featuredBanner.nextSlide")}
          >
            {isRtl ? <ArrowLeft /> : <ArrowRight />}
          </Button>
        </div>
      </div>
      <GarageCarousel
        ref={emblaRef}
        selectedIndex={selectedIndex}
        userCars={userCars}
      />
      <div className="flex justify-center mt-6">
        <Link to="/my-garage" className="text-sm font-semibold text-primary hover:underline">
          {t("homeCarousel.viewGarage")}
        </Link>
      </div>
    </div>
  );
}
