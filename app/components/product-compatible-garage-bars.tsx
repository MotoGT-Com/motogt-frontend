import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CarFront } from "lucide-react";
import { useRouteLoaderData } from "react-router";
import { AddNewCarDialog } from "~/components/add-new-car-dialog";
import { useGuestGarageCars } from "~/hooks/use-guest-garage-cars";
import { garageCarsQueryOptions } from "~/lib/queries";
import type { ProductItem } from "~/lib/client";
import type { Route } from "../routes/+types/_main";

type CarCompatibility = NonNullable<ProductItem["carCompatibility"]>;

function getUnaddedCompatibleCars(
  carCompatibility: CarCompatibility,
  garageCarKeys: string[]
) {
  const garageSet = new Set(garageCarKeys);
  const seen = new Set<string>();
  const result: { brand: string; model: string; carId: string }[] = [];

  for (const compat of carCompatibility) {
    const key = `${compat.carBrand}|||${compat.carModel}`;
    if (!seen.has(key) && !garageSet.has(key)) {
      seen.add(key);
      result.push({
        brand: compat.carBrand,
        model: compat.carModel,
        carId: compat.carId,
      });
    }
  }

  return result;
}

export function ProductCompatibleGarageBars({
  carCompatibility,
}: {
  carCompatibility: CarCompatibility;
}) {
  const loaderData =
    useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const isAuthenticated = !!loaderData?.isAuthenticated;

  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });
  const userCars = garageCarsQuery.data?.userCars ?? [];
  const guestCars = useGuestGarageCars(!isAuthenticated);

  const unaddedCompatibleCars = useMemo(() => {
    const garageCarKeys = isAuthenticated
      ? userCars.map((c) => `${c.carDetails.brand}|||${c.carDetails.model}`)
      : guestCars.map((c) => `${c.carDetails.brand}|||${c.carDetails.model}`);

    return getUnaddedCompatibleCars(carCompatibility, garageCarKeys);
  }, [carCompatibility, guestCars, isAuthenticated, userCars]);

  const [addGarageDialogCar, setAddGarageDialogCar] = useState<{
    make: string;
    model: string;
  } | null>(null);

  if (unaddedCompatibleCars.length === 0) return null;

  return (
    <>
      <div className="space-y-2">
        {unaddedCompatibleCars.map((car) => (
          <div
            key={`${car.brand}-${car.model}`}
            className="flex items-center gap-3 rounded-[4px] border border-[#e6e6e6] bg-[#f9f9f9] px-3 py-2.5"
          >
            <CarFront className="size-4 shrink-0 text-black/30" />
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-snug text-black/50">
                Fits{" "}
                <span className="font-medium text-black/70">
                  {car.brand} {car.model}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setAddGarageDialogCar({ make: car.brand, model: car.model })
              }
              className="shrink-0 cursor-pointer text-xs font-medium whitespace-nowrap text-black/50 underline underline-offset-2 transition-colors duration-150 hover:text-black"
            >
              Add to Garage
            </button>
          </div>
        ))}
      </div>

      {addGarageDialogCar ? (
        <AddNewCarDialog
          open
          onOpenChange={(open) => {
            if (!open) setAddGarageDialogCar(null);
          }}
          prefilledCar={addGarageDialogCar}
          lockPrefilledFields
          onSuccess={() => {
            setAddGarageDialogCar(null);
          }}
        />
      ) : null}
    </>
  );
}
