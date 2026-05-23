import { createContext, useContext } from "react";

export type BookingPrefill = {
  serviceId?: string;
  barberId?: string;
};

type BookingContextValue = {
  open: (opts?: BookingPrefill) => void;
  close: () => void;
};

export const BookingContext = createContext<BookingContextValue | null>(null);

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used inside BookingProvider");
  }

  return context;
}
