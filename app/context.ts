// Authentication context for React Router v7 middleware
import { createContext } from "react-router";
import type { UserProfile } from "./lib/client";

// Create contexts for authentication data
export const authContext = createContext<{
  isAuthenticated: boolean;
  user: UserProfile | null;
  selectedCar: string | null;
  selectedCarId: string | null;
  selectedCarYear: number | null;
}>({
  isAuthenticated: false,
  user: null,
  selectedCar: null,
  selectedCarId: null,
  selectedCarYear: null,
});
