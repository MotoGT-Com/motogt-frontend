import useEmblaCarousel, { type UseEmblaCarouselType, } from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "./ui/button";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { UserCarResponse } from "~/lib/client/types.gen";
import { useQuery } from "@tanstack/react-query";
import { garageCarsQueryOptions } from "~/lib/queries";
import { Link } from "react-router";
import { serializeShopURL } from "~/routes/_main.shop._index";
import { useTranslation } from "react-i18next";

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
                    carYear: car.carDetails.year,
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
                        {car.carDetails.brand} {car.carDetails.model} -{" "}
                        {car.carDetails.year}
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
                          src={car.carDetails.image ?? "/bmw.png"}
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

export function HomeCarousel() {
  const { i18n } = useTranslation();
  const isRtl = i18n.dir(i18n.language) === "rtl";
  const garageCarsQuery = useQuery(garageCarsQueryOptions);
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
  if (garageCarsQuery.data?.userCars.length === 0) return null;
  return (
    <div className="mb-16">
      <div className="flex items-center justify-between max-w-7xl mx-auto px-6 mb-4">
        <h2 className="text-xl font-bold italic text-black">My Garage</h2>
        <div className="flex gap-4">
          <Button
            size="icon"
            onClick={scrollPrev}
            disabled={!emblaApi?.canScrollPrev()}
          >
            {isRtl ? <ArrowRight /> : <ArrowLeft />}
          </Button>
          <Button
            size="icon"
            onClick={scrollNext}
            disabled={!emblaApi?.canScrollNext()}
          >
            {isRtl ? <ArrowLeft /> : <ArrowRight />}
          </Button>
        </div>
      </div>
      <GarageCarousel
        ref={emblaRef}
        selectedIndex={selectedIndex}
        userCars={garageCarsQuery.data?.userCars ?? []}
      />
    </div>
  );
}
