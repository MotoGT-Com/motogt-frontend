import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouteLoaderData } from "react-router";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import { GarageHoverPopupContent } from "~/components/garage-hover-popup";
import { garageCarsQueryOptions } from "~/lib/queries";
import {
  GUEST_GARAGE_CHANGED_EVENT,
  getGuestGarage,
  type GuestCar,
} from "~/lib/guest-garage-manager";
import type { UserCarsResponse } from "~/lib/client";

type GaragePopupContextValue = {
  openGaragePopup: (options?: { onBeforeOpen?: () => void }) => void;
  closeGaragePopup: () => void;
};

const GaragePopupContext = createContext<GaragePopupContextValue | null>(null);

export function GaragePopupProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const mainLoaderData = useRouteLoaderData("routes/_main") as
    | { isAuthenticated?: boolean }
    | undefined;
  const isAuthenticated = !!mainLoaderData?.isAuthenticated;

  const garageCarsQuery = useQuery({
    ...garageCarsQueryOptions,
    enabled: isAuthenticated,
  });

  const [guestCars, setGuestCars] = useState<GuestCar[]>([]);

  useEffect(() => {
    if (!isAuthenticated) setGuestCars(getGuestGarage());
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated || typeof window === "undefined") return;
    const sync = () => setGuestCars(getGuestGarage());
    window.addEventListener(GUEST_GARAGE_CHANGED_EVENT, sync);
    return () => window.removeEventListener(GUEST_GARAGE_CHANGED_EVENT, sync);
  }, [isAuthenticated]);

  const refreshGarageData = useCallback(() => {
    if (isAuthenticated) {
      void garageCarsQuery.refetch();
      return;
    }
    setGuestCars(getGuestGarage());
  }, [garageCarsQuery, isAuthenticated]);

  const userCars: UserCarsResponse["data"]["userCars"] = isAuthenticated
    ? (garageCarsQuery.data?.userCars ?? [])
    : (guestCars as unknown as UserCarsResponse["data"]["userCars"]);

  const openGaragePopup = useCallback(
    (options?: { onBeforeOpen?: () => void }) => {
      options?.onBeforeOpen?.();
      if (!isAuthenticated) setGuestCars(getGuestGarage());
      setOpen(true);
    },
    [isAuthenticated]
  );

  const closeGaragePopup = useCallback(() => {
    setOpen(false);
  }, []);

  const value = useMemo(
    () => ({ openGaragePopup, closeGaragePopup }),
    [openGaragePopup, closeGaragePopup]
  );

  return (
    <GaragePopupContext.Provider value={value}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="max-w-[520px] border border-[#e6e6e6] bg-[#f2f2f2] p-4 sm:p-5"
          showCloseButton
        >
          <GarageHoverPopupContent
            userCars={userCars}
            isLoading={isAuthenticated && garageCarsQuery.isLoading}
            onNavigateAway={closeGaragePopup}
            onGarageDataChanged={refreshGarageData}
          />
        </DialogContent>
      </Dialog>
    </GaragePopupContext.Provider>
  );
}

export function useGaragePopup() {
  const context = useContext(GaragePopupContext);
  if (!context) {
    throw new Error("useGaragePopup must be used within GaragePopupProvider");
  }
  return context;
}
