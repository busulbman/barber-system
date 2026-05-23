import { Suspense, lazy, useCallback, useEffect, useState, type ReactNode } from "react";
import { BookingContext, type BookingPrefill } from "./booking-context";

const LazyBookingModal = lazy(async () => {
  const module = await import("./BookingModal");
  return { default: module.BookingModal };
});

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [prefill, setPrefill] = useState<BookingPrefill>({});

  const open = useCallback((opts?: BookingPrefill) => {
    setPrefill(opts || {});
    setIsOpen(true);
  }, []);
  const close = useCallback(() => setIsOpen(false), []);

  // Intercept all clicks on anchors pointing to #randevu
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const anchor = target.closest("a") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href") || "";
      if (href === "#randevu" || href.endsWith("#randevu")) {
        e.preventDefault();
        open();
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  return (
    <BookingContext.Provider value={{ open, close }}>
      {children}
      {isOpen ? (
        <Suspense fallback={null}>
          <LazyBookingModal isOpen={isOpen} onClose={close} prefill={prefill} />
        </Suspense>
      ) : null}
    </BookingContext.Provider>
  );
}
