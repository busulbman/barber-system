import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Star,
  Calendar as CalIcon,
  User,
  Phone,
  Mail,
  MessageSquare,
  Scissors,
  AlertTriangle,
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import {
  ANY_BARBER_ID,
  TIME_SLOTS,
  formatDuration,
  formatPrice,
  getActiveBarbers,
  getDateClosureMessage,
  isDateUnavailable,
  phoneRegex,
  type PublicBarberOption,
  type PublicBookingCatalog,
  type ServiceItem,
} from "@/lib/booking-domain";
import {
  createPublicBooking,
  getBookingAvailability,
  getPublicCatalogState,
} from "@/lib/booking-api";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  prefill?: { serviceId?: string; barberId?: string };
};

type BarberDayState = {
  hasAnyAvailability: boolean;
  message: string;
};

function fmtDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDate(value: string): string {
  if (!value) return "";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function toWhatsappDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return `90${digits.slice(1)}`;
  return digits;
}

function buildDefaultBarberState(
  catalog: PublicBookingCatalog | null,
  date: string,
  option: PublicBarberOption,
): BarberDayState {
  if (!catalog || !date || option.id === ANY_BARBER_ID) {
    return { hasAnyAvailability: true, message: "" };
  }

  const closureMessage = getDateClosureMessage(catalog.availabilityExceptions, date, option.id);
  if (closureMessage) {
    return { hasAnyAvailability: false, message: closureMessage };
  }

  return { hasAnyAvailability: true, message: "" };
}

export function BookingModal({ isOpen, onClose, prefill }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [serviceId, setServiceId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [availabilityError, setAvailabilityError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [catalog, setCatalog] = useState<PublicBookingCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [takenSlots, setTakenSlots] = useState<Set<string>>(new Set());
  const [barberDayState, setBarberDayState] = useState<Record<string, BarberDayState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resolvedBarberName, setResolvedBarberName] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setStep(1);
    setServiceId(prefill?.serviceId || "");
    setBarberId(prefill?.barberId || "");
    setDate(undefined);
    setTime("");
    setName("");
    setPhone("");
    setEmail("");
    setNote("");
    setErrors({});
    setAvailabilityError("");
    setSubmitError("");
    setTakenSlots(new Set());
    setBarberDayState({});
    setResolvedBarberName("");
  }, [isOpen, prefill]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    setCatalogLoading(true);
    setCatalogError("");

    void getPublicCatalogState()
      .then((result) => {
        if (!active) return;
        setCatalog(result);
        setServiceId((current) =>
          current && result.services.some((service) => service.id === current) ? current : current,
        );
        setBarberId((current) => {
          if (current && result.barbers.some((barber) => barber.id === current)) {
            return current;
          }
          return result.barbers[0]?.id || "";
        });
      })
      .catch((error) => {
        console.error(error);
        if (!active) return;
        setCatalogError("Randevu verileri yuklenemedi. Lutfen tekrar deneyin.");
      })
      .finally(() => {
        if (!active) return;
        setCatalogLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  const dateStr = date ? fmtDate(date) : "";
  const selectedService =
    catalog?.services.find((service) => service.id === serviceId) || undefined;
  const selectedBarber = catalog?.barbers.find((barber) => barber.id === barberId) || undefined;
  const activeBarbers = useMemo(
    () => getActiveBarbers(catalog?.barbers.filter((barber) => !barber.isAnyOption) || []),
    [catalog],
  );

  useEffect(() => {
    if (!dateStr || !selectedService || !catalog) {
      setTakenSlots(new Set());
      setAvailabilityError("");
      setBarberDayState({});
      return;
    }

    let active = true;
    setAvailabilityError("");

    const requestedBarberId = barberId || ANY_BARBER_ID;
    const activeOptions = catalog.barbers.filter((barber) => !barber.isAnyOption);

    void Promise.all([
      getBookingAvailability({
        data: {
          date: dateStr,
          barberId: requestedBarberId,
          serviceId: selectedService.id,
        },
      }),
      Promise.all(
        activeOptions.map(async (barber) => {
          const response = await getBookingAvailability({
            data: {
              date: dateStr,
              barberId: barber.id,
              serviceId: selectedService.id,
            },
          });

          const closureMessage = getDateClosureMessage(
            catalog.availabilityExceptions,
            dateStr,
            barber.id,
          );

          return [
            barber.id,
            {
              hasAnyAvailability: response.takenSlots.length < TIME_SLOTS.length,
              message:
                closureMessage ||
                (response.takenSlots.length < TIME_SLOTS.length ? "" : "Bugun musait degil"),
            },
          ] as const;
        }),
      ),
    ])
      .then(([availability, barberStates]) => {
        if (!active) return;
        setTakenSlots(new Set(availability.takenSlots));
        setBarberDayState(Object.fromEntries(barberStates));
      })
      .catch((error) => {
        console.error(error);
        if (!active) return;
        setTakenSlots(new Set());
        setBarberDayState({});
        setAvailabilityError("Musait saatler yuklenemedi. Lutfen tekrar deneyin.");
      });

    return () => {
      active = false;
    };
  }, [catalog, barberId, dateStr, selectedService, isOpen]);

  useEffect(() => {
    if (!dateStr || !selectedBarber || selectedBarber.id === ANY_BARBER_ID) return;
    const state = barberDayState[selectedBarber.id];
    if (!state || state.hasAnyAvailability) return;
    setTime("");
  }, [barberDayState, dateStr, selectedBarber]);

  const selectedBarberDayState =
    (selectedBarber && barberDayState[selectedBarber.id]) ||
    buildDefaultBarberState(
      catalog,
      dateStr,
      selectedBarber || {
        id: "",
        name: "",
        phone: "",
        whatsappPhone: "",
        photoUrl: "",
        title: "",
        bio: "",
        isActive: false,
        sortOrder: 0,
      },
    );

  const selectedDateMessage = useMemo(() => {
    if (!dateStr || !catalog) return "";

    const closureMessage = getDateClosureMessage(
      catalog.availabilityExceptions,
      dateStr,
      barberId || ANY_BARBER_ID,
    );

    if (closureMessage) {
      return `${closureMessage} nedeniyle bu tarihte hizmet verilmiyor.`;
    }

    if (
      selectedBarber &&
      selectedBarber.id !== ANY_BARBER_ID &&
      selectedBarberDayState.message &&
      !selectedBarberDayState.hasAnyAvailability
    ) {
      return selectedBarberDayState.message;
    }

    if (takenSlots.size >= TIME_SLOTS.length) {
      return "Secilen tarih icin uygun saat kalmadi.";
    }

    return "";
  }, [barberId, catalog, dateStr, selectedBarber, selectedBarberDayState, takenSlots]);

  const next = () => {
    const nextErrors: Record<string, string> = {};
    setSubmitError("");

    if (step === 1 && !serviceId) nextErrors.serviceId = "Lutfen bir hizmet secin.";
    if (step === 2 && !barberId) nextErrors.barberId = "Lutfen bir berber secin.";
    if (step === 3) {
      if (!date) nextErrors.date = "Lutfen bir tarih secin.";
      if (!time) nextErrors.time = "Lutfen bir saat secin.";
      if (selectedDateMessage) nextErrors.time = selectedDateMessage;
    }
    if (step === 4) {
      if (name.trim().length < 2) nextErrors.name = "Ad soyad en az 2 karakter olmali.";
      if (!phoneRegex.test(phone.trim())) {
        nextErrors.phone = "Gecerli bir telefon girin (05XX XXX XX XX).";
      }
      if (email && !/^\S+@\S+\.\S+$/.test(email)) {
        nextErrors.email = "Gecerli bir e-posta girin.";
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setStep((current) => Math.min(6, current + 1) as Step);
    }
  };

  const back = () => setStep((current) => Math.max(1, current - 1) as Step);

  const buildWhatsAppMessage = (barberName: string) =>
    [
      "YENI RANDEVU - OKAN YILDIZ BARBER'S CLUB",
      "--------------------------------",
      `Ad Soyad : ${name.trim()}`,
      `Telefon  : ${phone.trim()}`,
      `Hizmet   : ${selectedService?.name || "-"}`,
      `Berber   : ${barberName}`,
      `Tarih    : ${displayDate(dateStr)}`,
      `Saat     : ${time}`,
      `Not      : ${note.trim() || "-"}`,
      "--------------------------------",
    ].join("\n");

  const confirm = async () => {
    if (!selectedService || !barberId || submitting) return;

    setSubmitting(true);
    setSubmitError("");

    try {
      const result = await createPublicBooking({
        data: {
          serviceId: selectedService.id,
          barberId,
          date: dateStr,
          time,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          note: note.trim(),
        },
      });

      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }

      const resolvedName = result.booking.barberName || result.booking.barber;
      setResolvedBarberName(resolvedName);
      setBarberId(result.booking.barberId || barberId);
      setStep(6);

      const whatsappDigits = toWhatsappDigits(catalog?.settings.mainWhatsappNumber || "");
      if (whatsappDigits) {
        const url = `https://wa.me/${whatsappDigits}?text=${encodeURIComponent(buildWhatsAppMessage(resolvedName))}`;
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      console.error(error);
      setSubmitError("Randevu kaydi su anda olusturulamadi. Lutfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const renderCatalogBody = () => {
    if (catalogLoading) {
      return (
        <div className="py-16 text-center text-bone/70">
          <p className="font-sub text-xs tracking-[0.25em] uppercase text-gold mb-3">
            Randevu verileri
          </p>
          <p>Katalog yukleniyor...</p>
        </div>
      );
    }

    if (catalogError || !catalog) {
      return (
        <div className="py-16 text-center">
          <AlertTriangle className="mx-auto text-gold mb-4" size={28} />
          <p className="text-red-300 text-sm">{catalogError || "Katalog yuklenemedi."}</p>
        </div>
      );
    }

    if (step === 1) {
      return (
        <div className="grid sm:grid-cols-2 gap-3">
          {catalog.services.map((service) => {
            const selected = serviceId === service.id;
            return (
              <button
                key={service.id}
                onClick={() => {
                  setServiceId(service.id);
                  setTime("");
                  setErrors((current) => ({ ...current, serviceId: "" }));
                }}
                className={`text-left p-4 rounded-lg border transition-all ${
                  selected
                    ? "border-gold bg-gold/10"
                    : "border-border-soft bg-card-dark hover:border-gold/40"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display text-xl tracking-wider text-bone">{service.name}</h3>
                  {selected ? <Check className="text-gold flex-shrink-0" size={18} /> : null}
                </div>
                <p className="text-bone/60 text-sm leading-relaxed mb-4">{service.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-sub tracking-[0.15em] uppercase text-bone/60 inline-flex items-center gap-1.5">
                    <Clock size={11} /> {formatDuration(service.durationMinutes)}
                  </span>
                  <span className="font-display text-base tracking-wider bg-gold text-navy px-2.5 py-0.5 rounded">
                    {formatPrice(service.price)}
                  </span>
                </div>
              </button>
            );
          })}
          {errors.serviceId ? (
            <p className="sm:col-span-2 text-red-400 text-xs">{errors.serviceId}</p>
          ) : null}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4">
          <p className="text-bone/55 text-sm">
            Tarih secildikten sonra izinli veya dolu olan berberler otomatik olarak devre disi
            kalir.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {catalog.barbers.map((option) => {
              const selected = barberId === option.id;
              const dailyState = buildDefaultBarberState(catalog, dateStr, option);
              const hasDailyState =
                option.id === ANY_BARBER_ID ? dailyState : barberDayState[option.id] || dailyState;
              const disabled = Boolean(dateStr) && !hasDailyState.hasAnyAvailability;

              return (
                <button
                  key={option.id}
                  disabled={disabled}
                  onClick={() => {
                    setBarberId(option.id);
                    setTime("");
                    setErrors((current) => ({ ...current, barberId: "" }));
                  }}
                  className={`text-left p-5 rounded-lg border transition-all ${
                    selected
                      ? "border-gold bg-gold/10"
                      : "border-border-soft bg-card-dark hover:border-gold/40"
                  } ${disabled ? "opacity-50 cursor-not-allowed hover:border-border-soft" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-navy-3 flex items-center justify-center">
                        <Scissors size={16} className="text-gold" />
                      </div>
                      <div>
                        <h3 className="font-display text-lg tracking-wider text-bone leading-tight">
                          {option.name.toUpperCase()}
                        </h3>
                        <p className="font-sub text-[10px] tracking-[0.2em] uppercase text-gold mt-0.5">
                          {option.title || "Uzman Berber"}
                        </p>
                      </div>
                    </div>
                    {selected ? <Check className="text-gold flex-shrink-0" size={18} /> : null}
                  </div>

                  {option.id === ANY_BARBER_ID ? (
                    <p className="text-bone/60 text-sm leading-relaxed">{option.bio}</p>
                  ) : (
                    <p className="text-bone/60 text-sm leading-relaxed">
                      {option.bio || "Detay odakli premium servis deneyimi."}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-2">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        disabled ? "bg-red-400" : "bg-emerald-400 animate-pulse"
                      }`}
                    />
                    <span className="font-sub text-xs tracking-[0.2em] uppercase text-bone/70">
                      {disabled ? hasDailyState.message || "Bugun musait degil" : "Musait"}
                    </span>
                  </div>
                </button>
              );
            })}
            {errors.barberId ? (
              <p className="sm:col-span-2 text-red-400 text-xs">{errors.barberId}</p>
            ) : null}
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="space-y-6">
          <div className="rounded-lg border border-border-soft bg-card-dark/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-sub text-[10px] tracking-[0.25em] uppercase text-gold mb-1">
                Secili berber
              </p>
              <p className="text-bone text-sm">{selectedBarber?.name || "Berber secilmedi"}</p>
            </div>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="inline-flex items-center gap-2 border border-border-soft text-bone/70 font-sub text-[10px] tracking-[0.25em] uppercase px-4 py-2 rounded hover:border-gold hover:text-gold transition-colors"
            >
              Berberi degistir
            </button>
          </div>

          <div>
            <p className="font-sub text-xs tracking-[0.2em] uppercase text-bone/60 mb-3 inline-flex items-center gap-2">
              <CalIcon size={14} className="text-gold" /> Tarih
            </p>
            <div className="rounded-lg border border-border-soft bg-card-dark p-2 flex justify-center">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(value) => {
                  setDate(value);
                  setTime("");
                  setAvailabilityError("");
                }}
                disabled={(value) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (value < today || !selectedService) return true;

                  return isDateUnavailable([], catalog.availabilityExceptions, activeBarbers, {
                    selectedBarberId: barberId || ANY_BARBER_ID,
                    date: fmtDate(value),
                    durationMinutes: selectedService.durationMinutes,
                  });
                }}
                className="p-3 pointer-events-auto"
              />
            </div>
            {errors.date ? <p className="text-red-400 text-xs mt-2">{errors.date}</p> : null}
            {selectedDateMessage ? (
              <p className="text-red-400 text-xs mt-2">{selectedDateMessage}</p>
            ) : null}
          </div>

          <div>
            <p className="font-sub text-xs tracking-[0.2em] uppercase text-bone/60 mb-3 inline-flex items-center gap-2">
              <Clock size={14} className="text-gold" /> Saat
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {TIME_SLOTS.map((slot) => {
                const selected = time === slot;
                const unavailable = takenSlots.has(slot);
                const disabled = unavailable || !date || Boolean(selectedDateMessage);

                return (
                  <button
                    key={slot}
                    disabled={disabled}
                    onClick={() => setTime(slot)}
                    className={`py-3 rounded-md font-sub text-sm tracking-wider transition-all border ${
                      selected
                        ? "bg-gold text-navy border-gold"
                        : unavailable
                          ? "bg-navy-3/40 text-bone/30 border-border-soft cursor-not-allowed line-through"
                          : !date || selectedDateMessage
                            ? "bg-navy-3/40 text-bone/30 border-border-soft cursor-not-allowed"
                            : "border-border-soft text-bone hover:border-gold hover:text-gold"
                    }`}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
            {errors.time ? <p className="text-red-400 text-xs mt-2">{errors.time}</p> : null}
            {availabilityError ? (
              <p className="text-red-400 text-xs mt-2">{availabilityError}</p>
            ) : null}
          </div>
        </div>
      );
    }

    if (step === 4) {
      return (
        <div className="space-y-5">
          <Field
            icon={<User size={14} />}
            label="Ad Soyad *"
            value={name}
            onChange={setName}
            placeholder="Ahmet Yilmaz"
            error={errors.name}
          />
          <Field
            icon={<Phone size={14} />}
            label="Telefon *"
            value={phone}
            onChange={setPhone}
            placeholder="05XX XXX XX XX"
            error={errors.phone}
          />
          <Field
            icon={<Mail size={14} />}
            label="E-posta (opsiyonel)"
            value={email}
            onChange={setEmail}
            placeholder="ornek@mail.com"
            error={errors.email}
          />
          <div>
            <label className="font-sub text-xs tracking-[0.2em] uppercase text-bone/60 mb-2 inline-flex items-center gap-2">
              <MessageSquare size={14} className="text-gold" /> Not (opsiyonel)
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Berberinize iletmek istediginiz bir not..."
              className="w-full bg-card-dark border border-border-soft rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:outline-none focus:border-gold transition-colors resize-none"
            />
          </div>
        </div>
      );
    }

    if (step === 5) {
      return (
        <div className="space-y-4">
          <div className="bg-card-dark border border-border-soft rounded-lg p-6 space-y-4">
            <SummaryRow
              label="Hizmet"
              value={`${selectedService?.name || "-"} · ${selectedService ? formatDuration(selectedService.durationMinutes) : "-"}`}
            />
            <SummaryRow label="Berber" value={selectedBarber?.name || "Müsait olan ilk berber"} />
            <SummaryRow label="Tarih & Saat" value={`${displayDate(dateStr)} — ${time}`} />
            <SummaryRow label="Ad Soyad" value={name} />
            <SummaryRow label="Telefon" value={phone} />
            {email ? <SummaryRow label="E-posta" value={email} /> : null}
            {note ? <SummaryRow label="Not" value={note} /> : null}
            <div className="pt-4 border-t border-border-soft flex items-center justify-between">
              <span className="font-sub text-xs tracking-[0.2em] uppercase text-bone/60">
                Kaydedilecek fiyat snapshot
              </span>
              <span className="font-display text-2xl tracking-wider bg-gold text-navy px-3 py-1 rounded">
                {selectedService ? formatPrice(selectedService.price) : "-"}
              </span>
            </div>
          </div>
          <p className="text-bone/50 text-xs text-center">
            Randevu kaydi yalnizca Firestore yazimi basarili olursa onaylanir.
          </p>
          {submitError ? <p className="text-red-400 text-xs text-center">{submitError}</p> : null}
        </div>
      );
    }

    return (
      <div className="py-6 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", damping: 12, stiffness: 180 }}
          className="mx-auto w-24 h-24 rounded-full bg-gold flex items-center justify-center mb-6"
        >
          <Check className="text-navy" size={48} strokeWidth={3} />
        </motion.div>
        <h3 className="font-display text-5xl tracking-wider text-bone mb-3">
          RANDEVUNUZ <span className="text-gold">ALINDI!</span>
        </h3>
        <p className="text-bone/70 mb-6 max-w-md mx-auto">
          Randevunuz sisteme kaydedildi. Ekip sizinle gerekli teyit icin kisa surede iletisime
          gececek.
        </p>
        <div className="bg-card-dark border border-border-soft rounded-lg p-5 text-left max-w-sm mx-auto space-y-2 text-sm">
          <SummaryRow label="Hizmet" value={selectedService?.name || "-"} compact />
          <SummaryRow
            label="Berber"
            value={resolvedBarberName || selectedBarber?.name || "Müsait olan ilk berber"}
            compact
          />
          <SummaryRow label="Tarih" value={`${displayDate(dateStr)} — ${time}`} compact />
          <SummaryRow label="Ad Soyad" value={name} compact />
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.98 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 22, stiffness: 220 }}
          onClick={(event) => event.stopPropagation()}
          className="relative w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] bg-navy border border-border-soft sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col shadow-2xl"
        >
          <div className="relative flex-shrink-0 px-6 pt-6 pb-4 border-b border-border-soft">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-bone/60 hover:text-gold transition-colors"
              aria-label="Kapat"
            >
              <X size={22} />
            </button>
            <p className="font-sub text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
              Randevu — Adim {Math.min(step, 5)} / 5
            </p>
            <h2 className="font-display text-3xl tracking-wider text-bone">
              {step === 1 && "HIZMET SEC"}
              {step === 2 && "BERBER SEC"}
              {step === 3 && "TARIH & SAAT"}
              {step === 4 && "BILGILERIN"}
              {step === 5 && "ONAY"}
              {step === 6 && "BASARILI"}
            </h2>
            <div className="mt-4 flex gap-1.5">
              {[1, 2, 3, 4, 5].map((value) => (
                <div
                  key={value}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    value <= Math.min(step, 5) ? "bg-gold" : "bg-border-soft"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.25 }}
              >
                {renderCatalogBody()}
              </motion.div>
            </AnimatePresence>
          </div>

          {step < 6 ? (
            <div className="flex-shrink-0 px-6 py-4 border-t border-border-soft flex items-center justify-between gap-3 bg-navy">
              {step > 1 ? (
                <button
                  onClick={back}
                  className="inline-flex items-center gap-2 font-sub text-xs tracking-[0.2em] uppercase text-bone/70 hover:text-gold transition-colors px-2 py-2"
                >
                  <ArrowLeft size={14} /> Geri
                </button>
              ) : (
                <span />
              )}

              {step < 5 ? (
                <button
                  onClick={next}
                  disabled={catalogLoading || Boolean(catalogError)}
                  className="inline-flex items-center gap-2 bg-gold text-navy font-sub text-xs tracking-[0.25em] uppercase px-6 py-3.5 hover:bg-gold-light transition-colors rounded disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Devam <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={confirm}
                  disabled={submitting || catalogLoading || Boolean(catalogError)}
                  className="inline-flex items-center gap-2 bg-gold text-navy font-sub text-xs tracking-[0.25em] uppercase px-6 py-3.5 hover:bg-gold-light transition-colors rounded disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Kaydediliyor..." : "Randevuyu Onayla"} <Check size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex-shrink-0 px-6 py-4 border-t border-border-soft bg-navy">
              <button
                onClick={onClose}
                className="w-full bg-gold text-navy font-sub text-xs tracking-[0.25em] uppercase py-3.5 hover:bg-gold-light transition-colors rounded"
              >
                Kapat
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Field({
  icon,
  label,
  value,
  onChange,
  placeholder,
  error,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
}) {
  return (
    <div>
      <label className="font-sub text-xs tracking-[0.2em] uppercase text-bone/60 mb-2 inline-flex items-center gap-2">
        <span className="text-gold">{icon}</span> {label}
      </label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full bg-card-dark border rounded-md px-4 py-3 text-bone placeholder:text-bone/30 focus:outline-none transition-colors ${
          error ? "border-red-400/60 focus:border-red-400" : "border-border-soft focus:border-gold"
        }`}
      />
      {error ? <p className="text-red-400 text-xs mt-1.5">{error}</p> : null}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  compact,
}: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-start justify-between gap-4 ${compact ? "" : "border-b border-border-soft/50 pb-3 last:border-0 last:pb-0"}`}
    >
      <span className="font-sub text-[10px] tracking-[0.25em] uppercase text-bone/50 pt-0.5 flex-shrink-0">
        {label}
      </span>
      <span className="text-bone text-right text-sm">{value}</span>
    </div>
  );
}
