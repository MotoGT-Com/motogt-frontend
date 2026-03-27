import { Link, href, useRouteLoaderData } from "react-router";
import { Loader2 } from "lucide-react";
import { AddNewCarDialog } from "~/components/add-new-car-dialog";
import { cn } from "~/lib/utils";
import type { UserCarsResponse } from "~/lib/client";
import { useTranslation } from "react-i18next";
import type { Route } from "../routes/+types/_main";
import { useAuthModal } from "~/context/AuthModalContext";

type UserCar = UserCarsResponse["data"]["userCars"][0];

export function GarageHoverPopupContent({
  userCars,
  isLoading,
  className,
}: {
  userCars: UserCar[];
  isLoading?: boolean;
  className?: string;
}) {
  const { i18n } = useTranslation();
  const loaderData =
    useRouteLoaderData<Route.ComponentProps["loaderData"]>("routes/_main");
  const isAuthenticated = !!loaderData?.isAuthenticated;
  const { openAuthModal } = useAuthModal();
  const isRTL = (i18n.language || "").startsWith("ar");
  const hasCars = userCars.length > 0;
  const strings = {
    title: isRTL ? "كراجك" : "My Garage",
    viewGarage: isRTL ? "عرض كراجك" : "View My Garage",
    viewParts: isRTL ? "عرض القطع" : "View parts",
    noCars: isRTL ? "لا توجد سيارات" : "No cars",
    emptyTitle: isRTL
      ? "لا توجد سيارات في كراجك بعد"
      : "No cars in your garage yet",
    emptyDesc: isRTL
      ? "أضف سيارتك لرؤية القطع المناسبة لمركبتك."
      : "Add your car to see parts that match your vehicle.",
    carCount: (count: number) =>
      isRTL ? `${count} سيارة` : `${count} car${count === 1 ? "" : "s"}`,
    loading: isRTL ? "جاري تحميل السيارات..." : "Loading cars...",
  };

  return (
    <div
      className={cn("w-[480px] max-w-[95vw]", className)}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-black">
            {strings.title}
          </h3>
          <p className="text-sm text-black/50">
            {hasCars ? strings.carCount(userCars.length) : strings.noCars}
          </p>
        </div>
        <Link
          to="/my-garage"
          className="text-sm text-black/50 hover:text-black underline"
        >
          {strings.viewGarage}
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" />
          <span className="text-sm">{strings.loading}</span>
        </div>
      ) : hasCars ? (
        <div className="max-h-[220px] overflow-y-auto pr-2 space-y-3">
          {userCars.map((car) => {
            const year =
              car.carDetails.year ??
              car.carDetails.yearFrom ??
              car.carDetails.yearTo ??
              null;
            const params = new URLSearchParams();
            params.set("carId", car.carId);
            params.set("carBrand", car.carDetails.brand);
            params.set("carModel", car.carDetails.model);
            if (year) {
              params.set("carYear", String(year));
            }
            return (
              <Link
                key={car.id}
                to={`/shop?${params.toString()}`}
                className="group flex items-center justify-between gap-4 rounded-[6px] border border-[#e6e6e6] bg-white px-4 py-3 hover:border-[#cf172f] hover:bg-[#fff5f6] transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <img
                    src={car.carDetails.image || "/car-placeholder.png"}
                    alt={`${car.carDetails.brand} ${car.carDetails.model}`}
                    className="h-12 w-24 object-contain"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-black truncate">
                      {car.carDetails.brand} - {car.carDetails.model}
                    </div>
                    {year && (
                      <div className="text-sm text-black/50">
                        {year}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-sm font-medium text-[#cf172f]">
                  {strings.viewParts}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-4 px-2 py-2 text-left">
          <div className="rounded-[6px] border border-[#e6e6e6] bg-white p-4">
            <div className="flex items-center gap-4">
              <img
                loading="lazy"
                src="/car-placeholder.png"
                alt="Add car"
                className="h-12 w-24 object-contain"
              />
              <div className="flex-1">
                <p className="text-sm font-semibold text-black">
                  {strings.emptyTitle}
                </p>
                <p className="text-sm text-black/50">
                  {strings.emptyDesc}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-end">
        <AddNewCarDialog />
      </div>
    </div>
  );
}
