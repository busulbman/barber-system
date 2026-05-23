import { z } from "zod";

export const ANY_BARBER_ID = "__any__";
export const ANY_BARBER_NAME = "Herhangi Bir Berber";
export const SETTINGS_DOCUMENT_ID = "general";

export const BOOKING_STATUS_VALUES = [
  "Bekliyor",
  "Onaylandı",
  "Tamamlandı",
  "İptal",
  "Gelmedi",
] as const;

export const AVAILABILITY_EXCEPTION_TYPES = [
  "full_day_closed",
  "custom_hours",
  "fully_booked",
] as const;

export const TIME_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
] as const;

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5, 6];
const LEGACY_DEFAULT_PRICE = 3300;

const LEGACY_SERVICE_DESCRIPTIONS: Record<string, string> = {
  "Saç Kesimi": "Yüz hatlarınıza özel, titizlikle yapılan profesyonel saç kesimi.",
  "Sakal Bakımı": "Düzeltme, şekillendirme ve bakımla sakalınızı en iyi haline kavuşturun.",
  "Saç + Sakal": "Komple bakım paketi. Saç kesimi ve şekillendirilmiş sakal.",
  "Cilt Bakımı": "Cildinize özel profesyonel bakım ile tazelenmiş, canlı bir görünüm.",
  "Çocuk Traşı": "Küçük beylere özel, eğlenceli ve güvenli berber deneyimi.",
  Manikür: "Ellerinizi tamamlayan profesyonel bakım hizmeti.",
  Pedikür: "Ayaklarınız için profesyonel bakım ve şekillendirme.",
  "VIP Oda Deneyimi": "Size özel ayrılmış VIP oda ile premium bakım deneyimi.",
};

export const LEGACY_SERVICE_DURATION_MINUTES: Record<string, number> = {
  "Saç Kesimi": 60,
  "Sakal Bakımı": 30,
  "Saç + Sakal": 60,
  "Cilt Bakımı": 45,
  "Çocuk Traşı": 45,
  Manikür: 30,
  Pedikür: 30,
  "VIP Oda Deneyimi": 120,
};

export type BookingStatus = (typeof BOOKING_STATUS_VALUES)[number];
export type AvailabilityExceptionType = (typeof AVAILABILITY_EXCEPTION_TYPES)[number];

export interface Barber {
  id: string;
  name: string;
  phone: string;
  whatsappPhone: string;
  photoUrl: string;
  title: string;
  bio: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicBarberOption extends Barber {
  isAnyOption?: boolean;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AvailabilityException {
  id: string;
  type: AvailabilityExceptionType;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  barberId?: string;
  appliesToAllBarbers: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AppSettings {
  id: string;
  businessName: string;
  mainWhatsappNumber: string;
  address: string;
  instagramUrl: string;
  workingHours: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Booking {
  id: string;
  service: string;
  barber: string;
  date: string;
  time: string;
  name: string;
  phone: string;
  email: string;
  note: string;
  status: BookingStatus;
  created_at?: string;
  serviceId?: string;
  serviceName: string;
  servicePriceAtBooking?: number;
  serviceDurationAtBooking?: number;
  barberId?: string;
  barberName: string;
  barberWhatsappAtBooking?: string;
}

export interface PublicBookingCatalog {
  services: ServiceItem[];
  barbers: PublicBarberOption[];
  availabilityExceptions: AvailabilityException[];
  settings: AppSettings;
}

export const DEFAULT_BARBERS: Barber[] = [
  {
    id: "okan-yildiz",
    name: "Okan Yıldız",
    phone: "+90 542 132 07 06",
    whatsappPhone: "+90 542 132 07 06",
    photoUrl: "",
    title: "Kurucu & Baş Berber",
    bio: "Detay odaklı klasik ve modern erkek bakımında uzman.",
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "berber-1",
    name: "Berber 1",
    phone: "",
    whatsappPhone: "",
    photoUrl: "",
    title: "Uzman Berber",
    bio: "Günlük bakım ve hızlı servis akışında deneyimli ekip üyesi.",
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "berber-2",
    name: "Berber 2",
    phone: "",
    whatsappPhone: "",
    photoUrl: "",
    title: "Uzman Berber",
    bio: "Sakal ve cilt bakım odaklı premium servis uzmanı.",
    isActive: true,
    sortOrder: 3,
  },
];

export const DEFAULT_SERVICES: ServiceItem[] = [
  {
    id: "sac-kesimi",
    name: "Saç Kesimi",
    description: LEGACY_SERVICE_DESCRIPTIONS["Saç Kesimi"],
    price: LEGACY_DEFAULT_PRICE,
    durationMinutes: 60,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: "sakal-bakimi",
    name: "Sakal Bakımı",
    description: LEGACY_SERVICE_DESCRIPTIONS["Sakal Bakımı"],
    price: LEGACY_DEFAULT_PRICE,
    durationMinutes: 30,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: "sac-sakal",
    name: "Saç + Sakal",
    description: LEGACY_SERVICE_DESCRIPTIONS["Saç + Sakal"],
    price: LEGACY_DEFAULT_PRICE,
    durationMinutes: 60,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: "cilt-bakimi",
    name: "Cilt Bakımı",
    description: LEGACY_SERVICE_DESCRIPTIONS["Cilt Bakımı"],
    price: LEGACY_DEFAULT_PRICE,
    durationMinutes: 45,
    isActive: true,
    sortOrder: 4,
  },
  {
    id: "cocuk-trasi",
    name: "Çocuk Traşı",
    description: LEGACY_SERVICE_DESCRIPTIONS["Çocuk Traşı"],
    price: LEGACY_DEFAULT_PRICE,
    durationMinutes: 45,
    isActive: true,
    sortOrder: 5,
  },
  {
    id: "manikur",
    name: "Manikür",
    description: LEGACY_SERVICE_DESCRIPTIONS.Manikür,
    price: LEGACY_DEFAULT_PRICE,
    durationMinutes: 30,
    isActive: true,
    sortOrder: 6,
  },
  {
    id: "pedikur",
    name: "Pedikür",
    description: LEGACY_SERVICE_DESCRIPTIONS.Pedikür,
    price: LEGACY_DEFAULT_PRICE,
    durationMinutes: 30,
    isActive: true,
    sortOrder: 7,
  },
  {
    id: "vip-oda-deneyimi",
    name: "VIP Oda Deneyimi",
    description: LEGACY_SERVICE_DESCRIPTIONS["VIP Oda Deneyimi"],
    price: LEGACY_DEFAULT_PRICE,
    durationMinutes: 120,
    isActive: true,
    sortOrder: 8,
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  id: SETTINGS_DOCUMENT_ID,
  businessName: "Okan Yıldız Barber's Club",
  mainWhatsappNumber: "+90 542 132 07 06",
  address: "Başakşehir, İstanbul",
  instagramUrl: "https://instagram.com/okanyildizbarber",
  workingHours: "Hafta içi: 09:00 – 21:00\nCumartesi: 09:00 – 22:00\nPazar: Kapalı",
};

export const ANY_BARBER_OPTION: PublicBarberOption = {
  id: ANY_BARBER_ID,
  name: ANY_BARBER_NAME,
  phone: "",
  whatsappPhone: "",
  photoUrl: "",
  title: "Müsait olan ilk berber",
  bio: "Takvim uygunluğuna göre ilk boş uzmana otomatik atanır.",
  isActive: true,
  sortOrder: 0,
  isAnyOption: true,
};

export const TR_MOBILE_PHONE_ERROR_MESSAGE = "Telefon numarasını 05xx xxx xx xx formatında girin.";

export const phoneRegex = /^(\+?90|0)?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;

export function normalizeTrMobilePhone(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  let localNumber = digits;

  if (localNumber.startsWith("90") && localNumber.length === 12) {
    localNumber = localNumber.slice(2);
  } else if (localNumber.startsWith("0") && localNumber.length === 11) {
    localNumber = localNumber.slice(1);
  }

  if (!/^5\d{9}$/.test(localNumber)) {
    return null;
  }

  return `+90${localNumber}`;
}

export function isValidTrMobilePhone(value: string): boolean {
  return normalizeTrMobilePhone(value) !== null;
}

export const bookingStatusSchema = z.enum(BOOKING_STATUS_VALUES);
export const availabilityExceptionTypeSchema = z.enum(AVAILABILITY_EXCEPTION_TYPES);

export const publicBookingInputSchema = z.object({
  serviceId: z.string().trim().min(1, "Hizmet seçin"),
  barberId: z.string().trim().min(1, "Berber seçin"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Geçersiz tarih"),
  time: z
    .string()
    .refine((value) => TIME_SLOTS.includes(value as (typeof TIME_SLOTS)[number]), "Geçersiz saat"),
  name: z.string().trim().min(2, "Ad soyad en az 2 karakter olmalı").max(120),
  phone: z
    .string()
    .trim()
    .refine((value) => isValidTrMobilePhone(value), TR_MOBILE_PHONE_ERROR_MESSAGE)
    .transform((value) => normalizeTrMobilePhone(value) || value),
  email: z
    .string()
    .trim()
    .max(120)
    .refine((value) => value === "" || /^\S+@\S+\.\S+$/.test(value), "Geçerli e-posta girin"),
  note: z.string().trim().max(500),
});

export type PublicBookingInput = z.infer<typeof publicBookingInputSchema>;

type TimestampLike = string | { toDate?: () => Date } | null | undefined;

export type BookingRecord = Partial<Omit<Booking, "id" | "created_at">> & {
  createdAt?: TimestampLike;
  created_at?: string;
};

export type BarberRecord = Partial<Barber> & {
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
};

export type ServiceRecord = Partial<ServiceItem> & {
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
};

export type AvailabilityExceptionRecord = Partial<AvailabilityException> & {
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
};

export type AppSettingsRecord = Partial<AppSettings> & {
  createdAt?: TimestampLike;
  updatedAt?: TimestampLike;
};

function normalizeTimestamp(value: TimestampLike): string | undefined {
  const dateValue = typeof value === "object" && value !== null ? value.toDate?.() : undefined;

  if (dateValue instanceof Date) {
    return dateValue.toISOString();
  }

  return typeof value === "string" && value.trim() ? value : undefined;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeRecordTimestamps<
  T extends { createdAt?: TimestampLike; updatedAt?: TimestampLike },
>(raw: T | null | undefined): { createdAt?: string; updatedAt?: string } {
  return {
    createdAt: normalizeTimestamp(raw?.createdAt),
    updatedAt: normalizeTimestamp(raw?.updatedAt),
  };
}

export function normalizeBarberRecord(id: string, raw: BarberRecord | null | undefined): Barber {
  const timestamps = normalizeRecordTimestamps(raw);
  const phone = readString(raw?.phone);
  const whatsappPhone = readString(raw?.whatsappPhone);

  return {
    id,
    name: readString(raw?.name),
    phone: normalizeTrMobilePhone(phone) || phone,
    whatsappPhone: normalizeTrMobilePhone(whatsappPhone) || whatsappPhone,
    photoUrl: readString(raw?.photoUrl),
    title: readString(raw?.title),
    bio: readString(raw?.bio),
    isActive: readBoolean(raw?.isActive, true),
    sortOrder: readNumber(raw?.sortOrder, 0),
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  };
}

export function normalizeServiceRecord(
  id: string,
  raw: ServiceRecord | null | undefined,
): ServiceItem {
  const timestamps = normalizeRecordTimestamps(raw);

  return {
    id,
    name: readString(raw?.name),
    description: readString(raw?.description),
    price: readNumber(raw?.price, LEGACY_DEFAULT_PRICE),
    durationMinutes: readNumber(raw?.durationMinutes, 60),
    isActive: readBoolean(raw?.isActive, true),
    sortOrder: readNumber(raw?.sortOrder, 0),
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  };
}

export function normalizeAvailabilityExceptionRecord(
  id: string,
  raw: AvailabilityExceptionRecord | null | undefined,
): AvailabilityException {
  const timestamps = normalizeRecordTimestamps(raw);

  return {
    id,
    type: availabilityExceptionTypeSchema
      .catch("full_day_closed")
      .parse(readString(raw?.type, "full_day_closed")),
    title: readString(raw?.title),
    description: readString(raw?.description),
    startDate: readString(raw?.startDate),
    endDate: readString(raw?.endDate || raw?.startDate),
    startTime: readString(raw?.startTime),
    endTime: readString(raw?.endTime),
    barberId: readString(raw?.barberId) || undefined,
    appliesToAllBarbers: readBoolean(raw?.appliesToAllBarbers, true),
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  };
}

export function normalizeSettingsRecord(
  id: string,
  raw: AppSettingsRecord | null | undefined,
): AppSettings {
  const timestamps = normalizeRecordTimestamps(raw);
  const mainWhatsappNumber = readString(
    raw?.mainWhatsappNumber,
    DEFAULT_SETTINGS.mainWhatsappNumber,
  );

  return {
    id,
    businessName: readString(raw?.businessName, DEFAULT_SETTINGS.businessName),
    mainWhatsappNumber: normalizeTrMobilePhone(mainWhatsappNumber) || mainWhatsappNumber,
    address: readString(raw?.address, DEFAULT_SETTINGS.address),
    instagramUrl: readString(raw?.instagramUrl, DEFAULT_SETTINGS.instagramUrl),
    workingHours: readString(raw?.workingHours, DEFAULT_SETTINGS.workingHours),
    createdAt: timestamps.createdAt,
    updatedAt: timestamps.updatedAt,
  };
}

export function normalizeBookingRecord(id: string, raw: BookingRecord | null | undefined): Booking {
  const createdAt =
    normalizeTimestamp(raw?.createdAt) ||
    (typeof raw?.created_at === "string" ? raw.created_at : undefined);

  const serviceName = readString(raw?.serviceName || raw?.service);
  const barberName = readString(raw?.barberName || raw?.barber);

  return {
    id,
    service: serviceName,
    barber: barberName,
    serviceId: readString(raw?.serviceId) || undefined,
    serviceName,
    servicePriceAtBooking:
      raw?.servicePriceAtBooking === undefined
        ? undefined
        : readNumber(raw?.servicePriceAtBooking, 0),
    serviceDurationAtBooking:
      raw?.serviceDurationAtBooking === undefined
        ? undefined
        : readNumber(raw?.serviceDurationAtBooking, 60),
    barberId: readString(raw?.barberId) || undefined,
    barberName,
    barberWhatsappAtBooking: readString(raw?.barberWhatsappAtBooking),
    date: readString(raw?.date),
    time: readString(raw?.time),
    name: readString(raw?.name),
    phone: readString(raw?.phone),
    email: readString(raw?.email),
    note: readString(raw?.note),
    status: bookingStatusSchema.catch("Bekliyor").parse(raw?.status),
    created_at: createdAt,
  };
}

export function sortBySortOrder<T extends { sortOrder: number; name: string }>(items: T[]): T[] {
  return [...items].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    return left.name.localeCompare(right.name, "tr");
  });
}

export function sortBookingsByCreatedAt(bookings: Booking[]): Booking[] {
  return [...bookings].sort((left, right) => {
    const leftTime = left.created_at ? Date.parse(left.created_at) : 0;
    const rightTime = right.created_at ? Date.parse(right.created_at) : 0;
    return rightTime - leftTime;
  });
}

export function sortAvailabilityExceptions(
  exceptions: AvailabilityException[],
): AvailabilityException[] {
  return [...exceptions].sort((left, right) => {
    if (left.startDate !== right.startDate) {
      return left.startDate.localeCompare(right.startDate);
    }
    return left.title.localeCompare(right.title, "tr");
  });
}

export function formatPrice(amount: number): string {
  return `${amount.toLocaleString("tr-TR")} ₺`;
}

export function formatDuration(durationMinutes: number): string {
  if (durationMinutes % 60 === 0) {
    const hours = durationMinutes / 60;
    return hours === 1 ? "1 saat" : `${hours} saat`;
  }
  return `${durationMinutes} dak`;
}

export function getActiveBarbers(barbers: Barber[]): Barber[] {
  return sortBySortOrder(barbers.filter((barber) => barber.isActive));
}

export function getActiveServices(services: ServiceItem[]): ServiceItem[] {
  return sortBySortOrder(services.filter((service) => service.isActive));
}

export function buildPublicBarberOptions(barbers: Barber[]): PublicBarberOption[] {
  const activeBarbers = getActiveBarbers(barbers);
  return activeBarbers.length > 0 ? [ANY_BARBER_OPTION, ...activeBarbers] : [];
}

export function findBarberById(barbers: Barber[], barberId: string): Barber | undefined {
  return barbers.find((barber) => barber.id === barberId);
}

export function findServiceById(
  services: ServiceItem[],
  serviceId: string,
): ServiceItem | undefined {
  return services.find((service) => service.id === serviceId);
}

export function getLegacyDurationMinutes(serviceName: string): number {
  return LEGACY_SERVICE_DURATION_MINUTES[serviceName] ?? 60;
}

export function getBookingDurationMinutes(booking: Booking): number {
  if (
    typeof booking.serviceDurationAtBooking === "number" &&
    booking.serviceDurationAtBooking > 0
  ) {
    return booking.serviceDurationAtBooking;
  }
  return getLegacyDurationMinutes(booking.serviceName || booking.service);
}

export function getBookingRevenue(booking: Booking): number {
  // Legacy bookings did not store a price snapshot. We keep them at zero so later
  // price edits do not retroactively distort historical earnings calculations.
  return typeof booking.servicePriceAtBooking === "number" ? booking.servicePriceAtBooking : 0;
}

export function isRevenueBooking(status: BookingStatus): boolean {
  return status === "Tamamlandı";
}

export function isBookingActive(status: BookingStatus): boolean {
  return status !== "İptal" && status !== "Gelmedi";
}

export function slotsForDuration(durationMinutes: number): number {
  return Math.max(1, Math.ceil(durationMinutes / 60));
}

export function blockedSlotsFor(startTime: string, serviceOrDuration: string | number): string[] {
  const durationMinutes =
    typeof serviceOrDuration === "number"
      ? serviceOrDuration
      : (LEGACY_SERVICE_DURATION_MINUTES[serviceOrDuration] ?? 60);

  const startIndex = TIME_SLOTS.indexOf(startTime as (typeof TIME_SLOTS)[number]);
  if (startIndex < 0) return [startTime];
  return TIME_SLOTS.slice(startIndex, startIndex + slotsForDuration(durationMinutes));
}

function getDateWeekday(date: string): number {
  return new Date(`${date}T12:00:00`).getDay();
}

export function isDateWithinRange(date: string, startDate: string, endDate?: string): boolean {
  const end = endDate || startDate;
  return date >= startDate && date <= end;
}

export function appliesExceptionToBarber(
  exception: AvailabilityException,
  barberId: string,
): boolean {
  return exception.appliesToAllBarbers || exception.barberId === barberId;
}

export function getExceptionBlockedSlots(exception: AvailabilityException): Set<string> {
  if (exception.type !== "custom_hours" || !exception.startTime || !exception.endTime) {
    return new Set();
  }

  return new Set(
    TIME_SLOTS.filter((slot) => slot >= exception.startTime && slot < exception.endTime),
  );
}

export function isFullDayException(exception: AvailabilityException): boolean {
  return exception.type === "full_day_closed" || exception.type === "fully_booked";
}

export function getApplicableExceptions(
  exceptions: AvailabilityException[],
  date: string,
  barberId: string,
): AvailabilityException[] {
  return exceptions.filter(
    (exception) =>
      isDateWithinRange(date, exception.startDate, exception.endDate) &&
      appliesExceptionToBarber(exception, barberId),
  );
}

export function getClosedSlotsForBarber(
  exceptions: AvailabilityException[],
  date: string,
  barberId: string,
): Set<string> {
  const blocked = new Set<string>();

  for (const exception of getApplicableExceptions(exceptions, date, barberId)) {
    if (isFullDayException(exception)) {
      for (const slot of TIME_SLOTS) {
        blocked.add(slot);
      }
      continue;
    }

    for (const slot of getExceptionBlockedSlots(exception)) {
      blocked.add(slot);
    }
  }

  return blocked;
}

export function isBarberClosedForDay(
  exceptions: AvailabilityException[],
  date: string,
  barberId: string,
): boolean {
  return getApplicableExceptions(exceptions, date, barberId).some((exception) =>
    isFullDayException(exception),
  );
}

function bookingMatchesBarber(booking: Booking, barber: Barber): boolean {
  if (booking.barberId) return booking.barberId === barber.id;
  return booking.barberName === barber.name || booking.barber === barber.name;
}

export function buildTakenSlotsForBarber(bookings: Booking[], barber: Barber): Set<string> {
  const taken = new Set<string>();

  for (const booking of bookings) {
    if (!isBookingActive(booking.status)) continue;
    if (!bookingMatchesBarber(booking, barber)) continue;

    for (const slot of blockedSlotsFor(booking.time, getBookingDurationMinutes(booking))) {
      taken.add(slot);
    }
  }

  return taken;
}

export function getCandidateBarbers(selectedBarberId: string, activeBarbers: Barber[]): Barber[] {
  if (selectedBarberId === ANY_BARBER_ID) {
    return getActiveBarbers(activeBarbers);
  }

  const barber = findBarberById(activeBarbers, selectedBarberId);
  return barber && barber.isActive ? [barber] : [];
}

export function canBarberTakeBooking(
  bookings: Booking[],
  exceptions: AvailabilityException[],
  barber: Barber,
  {
    date,
    time,
    durationMinutes,
  }: {
    date: string;
    time: string;
    durationMinutes: number;
  },
): boolean {
  if (!DEFAULT_WORKING_DAYS.includes(getDateWeekday(date))) {
    return false;
  }

  if (isBarberClosedForDay(exceptions, date, barber.id)) {
    return false;
  }

  const requestedSlots = blockedSlotsFor(time, durationMinutes);
  const closedSlots = getClosedSlotsForBarber(exceptions, date, barber.id);
  const takenSlots = buildTakenSlotsForBarber(bookings, barber);

  return requestedSlots.every(
    (slot) =>
      TIME_SLOTS.includes(slot as (typeof TIME_SLOTS)[number]) &&
      !closedSlots.has(slot) &&
      !takenSlots.has(slot),
  );
}

export function barberHasAnyAvailabilityOnDate(
  bookings: Booking[],
  exceptions: AvailabilityException[],
  barber: Barber,
  date: string,
  durationMinutes: number,
): boolean {
  return TIME_SLOTS.some((time) =>
    canBarberTakeBooking(bookings, exceptions, barber, { date, time, durationMinutes }),
  );
}

export function findAssignableBarbers(
  bookings: Booking[],
  exceptions: AvailabilityException[],
  activeBarbers: Barber[],
  {
    selectedBarberId,
    date,
    time,
    durationMinutes,
  }: {
    selectedBarberId: string;
    date: string;
    time: string;
    durationMinutes: number;
  },
): Barber[] {
  return getCandidateBarbers(selectedBarberId, activeBarbers).filter((barber) =>
    canBarberTakeBooking(bookings, exceptions, barber, { date, time, durationMinutes }),
  );
}

export function buildUnavailableSlots(
  bookings: Booking[],
  exceptions: AvailabilityException[],
  activeBarbers: Barber[],
  {
    selectedBarberId,
    date,
    durationMinutes,
  }: {
    selectedBarberId: string;
    date: string;
    durationMinutes: number;
  },
): Set<string> {
  const unavailable = new Set<string>();

  for (const time of TIME_SLOTS) {
    const hasCapacity = getCandidateBarbers(selectedBarberId, activeBarbers).some((barber) =>
      canBarberTakeBooking(bookings, exceptions, barber, { date, time, durationMinutes }),
    );

    if (!hasCapacity) {
      unavailable.add(time);
    }
  }

  return unavailable;
}

export function isDateUnavailable(
  bookings: Booking[],
  exceptions: AvailabilityException[],
  activeBarbers: Barber[],
  {
    selectedBarberId,
    date,
    durationMinutes,
  }: {
    selectedBarberId: string;
    date: string;
    durationMinutes: number;
  },
): boolean {
  if (!DEFAULT_WORKING_DAYS.includes(getDateWeekday(date))) {
    return true;
  }

  return !getCandidateBarbers(selectedBarberId, activeBarbers).some((barber) =>
    barberHasAnyAvailabilityOnDate(bookings, exceptions, barber, date, durationMinutes),
  );
}

export function getDateClosureMessage(
  exceptions: AvailabilityException[],
  date: string,
  selectedBarberId: string,
): string {
  if (selectedBarberId === ANY_BARBER_ID) {
    const globalClosure = exceptions.find(
      (exception) =>
        exception.appliesToAllBarbers &&
        isDateWithinRange(date, exception.startDate, exception.endDate) &&
        isFullDayException(exception),
    );
    return globalClosure?.title || "";
  }

  const match = exceptions.find(
    (exception) =>
      appliesExceptionToBarber(exception, selectedBarberId) &&
      isDateWithinRange(date, exception.startDate, exception.endDate) &&
      isFullDayException(exception),
  );

  return match?.title || "";
}
