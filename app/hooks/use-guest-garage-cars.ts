import { useEffect, useState } from "react";
import {
  getGuestGarage,
  GUEST_GARAGE_CHANGED_EVENT,
  GUEST_GARAGE_STORAGE_KEY,
  type GuestCar,
} from "~/lib/guest-garage-manager";

/**
 * Live view of guest garage from localStorage; updates when add/remove runs anywhere in the app
 * or when another tab changes the same key.
 */
export function useGuestGarageCars(enabled: boolean): GuestCar[] {
  const [cars, setCars] = useState<GuestCar[]>(() =>
    enabled ? getGuestGarage() : []
  );

  useEffect(() => {
    if (!enabled) {
      setCars([]);
      return;
    }

    const sync = () => setCars(getGuestGarage());

    sync();
    window.addEventListener(GUEST_GARAGE_CHANGED_EVENT, sync);
    const onStorage = (e: StorageEvent) => {
      if (e.key === GUEST_GARAGE_STORAGE_KEY) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(GUEST_GARAGE_CHANGED_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [enabled]);

  return cars;
}
