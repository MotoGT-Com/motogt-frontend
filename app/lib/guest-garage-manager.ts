export const GUEST_GARAGE_STORAGE_KEY = "motogt_guest_garage";
const GUEST_GARAGE_KEY = GUEST_GARAGE_STORAGE_KEY;

/** Fired on the window after guest garage localStorage changes (same tab + other tabs via storage). */
export const GUEST_GARAGE_CHANGED_EVENT = "motogt:guest-garage-changed";

function notifyGuestGarageChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(GUEST_GARAGE_CHANGED_EVENT));
}

export type GuestCar = {
  id: string;
  carId: string;
  carDetails: {
    brand: string;
    model: string;
    year: number;
    image?: string | null;
  };
};

export function getGuestGarage(): GuestCar[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GUEST_GARAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as GuestCar[];
  } catch {
    try {
      localStorage.removeItem(GUEST_GARAGE_KEY);
    } catch {}
    return [];
  }
}

function setGuestGarage(cars: GuestCar[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(GUEST_GARAGE_KEY, JSON.stringify(cars));
    notifyGuestGarageChanged();
  } catch {}
}

export function addToGuestGarage(car: GuestCar): void {
  const cars = getGuestGarage();
  const alreadyExists = cars.some(
    (c) => c.carId === car.carId && c.carDetails.year === car.carDetails.year
  );
  if (alreadyExists) return;
  cars.push(car);
  setGuestGarage(cars);
}

export function removeFromGuestGarage(id: string): void {
  const cars = getGuestGarage();
  setGuestGarage(cars.filter((c) => c.id !== id));
}

export function clearGuestGarage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_GARAGE_KEY);
    notifyGuestGarageChanged();
  } catch {}
}
