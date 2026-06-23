import { useMemo } from "react";
import { CheckIcon, XIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRouteLoaderData } from "react-router";
import { useTranslation } from "react-i18next";
import { FitmentBadge } from "~/components/fitment-badge";
import { GaragePopupTrigger } from "~/components/garage-popup-trigger";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "~/components/ui/hover-card";
import { useGuestGarageCars } from "~/hooks/use-guest-garage-cars";
import { garageCarsQueryOptions } from "~/lib/queries";
import type { ProductItem, UserCarsResponse } from "~/lib/client";
import type { Route } from "../routes/+types/_main";

type UserCar = UserCarsResponse["data"]["userCars"][number];

type GarageCar = {
  id: string;
  carDetails: {
    brand: string;
    model: string;
    year?: number;
    yearFrom?: number;
    yearTo?: number | null;
  };
};

export function isCarPartProduct(
  product: Pick<ProductItem, "productType" | "carCompatibility">
) {
  if ((product.carCompatibility?.length ?? 0) > 0) {
    return true;
  }

  const code = product.productType?.code?.toLowerCase();
  const slug = product.productType?.slug?.toLowerCase();

  if (!code && !slug) {
    return false;
  }

  return (
    code === "car_parts" ||
    code === "car-parts" ||
    slug === "car-parts" ||
    slug === "car_parts"
  );
}

function normalizeGarageCars(
  authCars: UserCar[],
  guestCars: ReturnType<typeof useGuestGarageCars>,
  isAuthenticated: boolean
): GarageCar[] {
  if (isAuthenticated) {
    return authCars.map((car) => ({
      id: car.id,
      carDetails: car.carDetails,
    }));
  }

  return guestCars.map((car) => ({
    id: car.id,
    carDetails: {
      brand: car.carDetails.brand,
      model: car.carDetails.model,
      year: car.carDetails.year,
      yearFrom: car.carDetails.year,
    },
  }));
}

function isGarageCarCompatible(
  userCar: GarageCar,
  carCompatibility: NonNullable<ProductItem["carCompatibility"]>
) {
  return carCompatibility.some((car) => {
    const matchesCar =
      `${car.carBrand} ${car.carModel}` ===
      `${userCar.carDetails.brand} ${userCar.carDetails.model}`;

    const userYear =
      userCar.carDetails.yearFrom ?? userCar.carDetails.year ?? null;

    if (matchesCar && userYear) {
      const yearFrom = car.carYearFrom ?? 0;
      const yearTo = car.carYearTo;
      return (
        yearFrom <= userYear && (yearTo === null || yearTo >= userYear)
      );
    }

    return matchesCar;
  });
}

export function ProductFitmentBadge({ product }: { product: ProductItem }) {
  const { t } = useTranslation("product");
  const loaderData =
    useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const isAuthenticated = !!loaderData?.isAuthenticated;
  const carCompatibility = product.carCompatibility ?? [];

  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });
  const guestCars = useGuestGarageCars(!isAuthenticated);

  const garageCars = useMemo(
    () =>
      normalizeGarageCars(
        garageCarsQuery.data?.userCars ?? [],
        guestCars,
        isAuthenticated
      ),
    [garageCarsQuery.data?.userCars, guestCars, isAuthenticated]
  );

  const compatibleCars = useMemo(
    () =>
      carCompatibility.length
        ? garageCars.filter((userCar) =>
            isGarageCarCompatible(userCar, carCompatibility)
          )
        : [],
    [carCompatibility, garageCars]
  );

  if (!isCarPartProduct(product)) return null;

  const hasCompatibleCars = compatibleCars.length > 0;

  if (garageCars.length === 0) {
    return (
      <HoverCard openDelay={300}>
        <HoverCardTrigger asChild>
          <div className="w-fit cursor-pointer">
            <FitmentBadge variant="add-car" text="Add Car To Fit Check" />
          </div>
        </HoverCardTrigger>
        <HoverCardContent className="z-[100] w-[280px] p-0" side="top">
          <div
            className="overflow-hidden rounded-[2px] border border-[#E6E6E6] bg-[#F2F2F2]"
            style={{ boxShadow: "0 4px 10px 0 rgba(0, 0, 0, 0.10)" }}
          >
            <div className="px-4 pt-4 pb-3">
              <h4 className="mb-2 text-sm leading-[1.5] font-semibold text-black">
                {t("fitmnetLabel.title", {
                  defaultValue: "Add Your Car to Garage",
                })}
              </h4>
              <p className="text-xs leading-[1.5] font-medium text-[rgba(0,0,0,0.7)]">
                {t("fitmnetLabel.desceription", {
                  defaultValue:
                    "Add your car to see which products fit your vehicle automatically.",
                })}
              </p>
            </div>
            <div className="px-4 pb-4">
              <GaragePopupTrigger className="text-xs font-medium text-[#908B9B] underline transition-colors hover:text-[#000000]">
                {t("fitmnetLabel.linkText", {
                  defaultValue: "Go to My Garage →",
                })}
              </GaragePopupTrigger>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>
    );
  }

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div className="w-fit cursor-pointer">
          <FitmentBadge
            variant={hasCompatibleCars ? "fit" : "no-fit"}
            text={
              hasCompatibleCars ? "Fits Your Car" : "Doesn't Fit Your Cars"
            }
            clickable={false}
          />
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="z-[100] w-[320px] p-0" side="top">
        <div
          className="overflow-hidden rounded-[2px] border border-[#E6E6E6] bg-[#F2F2F2]"
          style={{ boxShadow: "0 4px 10px 0 rgba(0, 0, 0, 0.10)" }}
        >
          <div className="border-b border-[#E6E6E6] px-4 pt-4 pb-3">
            <h4 className="text-sm leading-[1.5] font-semibold text-black">
              Fitment for Your Garage:
            </h4>
          </div>
          <div className="divide-y divide-[#E6E6E6]">
            {garageCars.map((userCar) => {
              const isCompatibleCar = compatibleCars.some(
                (car) => car.id === userCar.id
              );
              return (
                <div
                  key={`userCar-${userCar.id}`}
                  className="px-4 py-3 transition-colors hover:bg-[#E6E6E6]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="mb-0.5 text-sm leading-[1.4] font-medium tracking-wide text-black uppercase">
                        {userCar.carDetails.brand} {userCar.carDetails.model}
                      </p>
                      {userCar.carDetails.yearFrom || userCar.carDetails.year ? (
                        <p className="text-xs leading-[1.4] font-medium text-[rgba(0,0,0,0.5)]">
                          {userCar.carDetails.yearFrom ?? userCar.carDetails.year}
                          {userCar.carDetails.yearTo &&
                          userCar.carDetails.yearTo !==
                            userCar.carDetails.yearFrom
                            ? ` - ${userCar.carDetails.yearTo}`
                            : ""}
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0">
                      {isCompatibleCar ? (
                        <div className="flex items-center gap-1.5">
                          <CheckIcon className="size-4 shrink-0 text-[#1d9200]" />
                          <span className="text-xs font-medium whitespace-nowrap text-[#1d9200]">
                            Fits
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <XIcon className="size-4 shrink-0 text-[#cf172f]" />
                          <span className="text-xs font-medium whitespace-nowrap text-[#cf172f]">
                            Doesn't Fit
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
