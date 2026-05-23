import {
  blockedSlotsFor,
  canBarberTakeBooking,
  findAssignableBarbers,
  findBarberById,
  findServiceById,
  getBookingDurationMinutes,
  getCandidateBarbers,
  isBookingActive,
  normalizeBookingRecord,
  sortBookingsByCreatedAt,
  type Barber,
  type Booking,
  type BookingStatus,
  type PublicBookingInput,
  type ServiceItem,
} from "./booking-domain";
import {
  createBookingDocument,
  createBookingSlotLock,
  deleteBookingDocument,
  deleteBookingSlotLock,
  FirestoreConflictError,
  getBookingDocument,
  getFirestoreAuthMode,
  queryBookingDocuments,
  updateBookingStatusDocument,
} from "./firestore-rest.server";
import { listAvailabilityExceptions, listBarbers, listServices } from "./catalog-repository.server";

const FIRESTORE_ACCESS_POLICY = "allow-dev-fallback" as const;
const SLOT_UNAVAILABLE_MESSAGE = "Seçilen saat artık müsait değil. Lütfen farklı bir saat seçin.";

export class BookingConflictError extends Error {
  constructor(message = SLOT_UNAVAILABLE_MESSAGE) {
    super(message);
    this.name = "BookingConflictError";
  }
}

function usesServiceAccountLocks(): boolean {
  return getFirestoreAuthMode() === "service-account";
}

function buildSlotLockIds({
  barberId,
  date,
  time,
  durationMinutes,
}: {
  barberId: string;
  date: string;
  time: string;
  durationMinutes: number;
}): Array<{ slotId: string; slotTime: string }> {
  return blockedSlotsFor(time, durationMinutes).map((slotTime) => ({
    slotTime,
    slotId: `${date}__${slotTime.replace(":", "-")}__${barberId}`,
  }));
}

async function releaseSlotLocks(slotIds: string[]): Promise<void> {
  if (slotIds.length === 0) return;

  const results = await Promise.allSettled(
    slotIds.map((slotId) => deleteBookingSlotLock(slotId, FIRESTORE_ACCESS_POLICY)),
  );
  const failed = results.find((result) => result.status === "rejected");
  if (failed?.status === "rejected") {
    throw failed.reason;
  }
}

async function acquireSlotLocks({
  bookingId,
  barber,
  date,
  time,
  durationMinutes,
  serviceName,
}: {
  bookingId: string;
  barber: Barber;
  date: string;
  time: string;
  durationMinutes: number;
  serviceName: string;
}): Promise<string[]> {
  const lockTargets = buildSlotLockIds({
    barberId: barber.id,
    date,
    time,
    durationMinutes,
  });
  const acquiredSlotIds: string[] = [];

  try {
    for (const target of lockTargets) {
      await createBookingSlotLock(
        target.slotId,
        {
          bookingId,
          bookingDate: date,
          bookingTime: time,
          barber: barber.name,
          slotTime: target.slotTime,
          service: serviceName,
          createdAt: new Date().toISOString(),
        },
        FIRESTORE_ACCESS_POLICY,
      );
      acquiredSlotIds.push(target.slotId);
    }
  } catch (error) {
    await releaseSlotLocks(acquiredSlotIds);

    if (error instanceof FirestoreConflictError) {
      throw new BookingConflictError();
    }

    throw error;
  }

  return acquiredSlotIds;
}

function normalizeBookingDocument(record: { id: string; data: Record<string, unknown> }): Booking {
  return normalizeBookingRecord(record.id, record.data);
}

async function getBookingById(id: string): Promise<Booking> {
  return normalizeBookingDocument(await getBookingDocument(id, FIRESTORE_ACCESS_POLICY));
}

async function releaseSlotLocksForBooking(booking: Booking): Promise<void> {
  if (!usesServiceAccountLocks()) return;
  if (!isBookingActive(booking.status)) return;
  if (!booking.barberId) return;

  const slotIds = buildSlotLockIds({
    barberId: booking.barberId,
    date: booking.date,
    time: booking.time,
    durationMinutes: getBookingDurationMinutes(booking),
  }).map((target) => target.slotId);

  await releaseSlotLocks(slotIds);
}

async function loadAvailabilityContext() {
  const [barbers, services, availabilityExceptions] = await Promise.all([
    listBarbers(),
    listServices(),
    listAvailabilityExceptions(),
  ]);

  return {
    barbers,
    services,
    availabilityExceptions,
  };
}

function ensureActiveService(services: ServiceItem[], serviceId: string): ServiceItem {
  const service = findServiceById(services, serviceId);
  if (!service || !service.isActive) {
    throw new BookingConflictError("Seçilen hizmet şu anda aktif değil.");
  }
  return service;
}

function ensureCandidateBarbers(barbers: Barber[], barberId: string): Barber[] {
  const activeBarbers = barbers.filter((barber) => barber.isActive);
  const candidates = getCandidateBarbers(barberId, activeBarbers);

  if (candidates.length === 0) {
    throw new BookingConflictError("Seçilen berber şu anda müsait değil.");
  }

  return candidates;
}

async function createBookingWithAssignedBarber(
  input: PublicBookingInput,
  service: ServiceItem,
  assignedBarber: Barber,
): Promise<Booking> {
  const bookingId = crypto.randomUUID();
  const acquiredSlotIds = usesServiceAccountLocks()
    ? await acquireSlotLocks({
        bookingId,
        barber: assignedBarber,
        date: input.date,
        time: input.time,
        durationMinutes: service.durationMinutes,
        serviceName: service.name,
      })
    : [];

  try {
    const created = await createBookingDocument(
      {
        service: service.name,
        barber: assignedBarber.name,
        serviceId: service.id,
        serviceName: service.name,
        servicePriceAtBooking: service.price,
        serviceDurationAtBooking: service.durationMinutes,
        barberId: assignedBarber.id,
        barberName: assignedBarber.name,
        barberWhatsappAtBooking: assignedBarber.whatsappPhone,
        date: input.date,
        time: input.time,
        name: input.name,
        phone: input.phone,
        email: input.email,
        note: input.note,
      },
      {
        accessPolicy: FIRESTORE_ACCESS_POLICY,
        operation: "public booking create",
        documentId: bookingId,
      },
    );

    return normalizeBookingDocument(created);
  } catch (error) {
    await releaseSlotLocks(acquiredSlotIds);
    throw error;
  }
}

export async function listBookings(date?: string): Promise<Booking[]> {
  const records = await queryBookingDocuments(date, FIRESTORE_ACCESS_POLICY);
  return sortBookingsByCreatedAt(records.map((record) => normalizeBookingDocument(record)));
}

export async function createBooking(input: PublicBookingInput): Promise<Booking> {
  const { barbers, services, availabilityExceptions } = await loadAvailabilityContext();
  const service = ensureActiveService(services, input.serviceId);
  const activeCandidates = ensureCandidateBarbers(barbers, input.barberId);
  const existingBookings = await listBookings(input.date);

  const assignableBarbers = findAssignableBarbers(
    existingBookings,
    availabilityExceptions,
    activeCandidates,
    {
      selectedBarberId: input.barberId,
      date: input.date,
      time: input.time,
      durationMinutes: service.durationMinutes,
    },
  );

  if (assignableBarbers.length === 0) {
    throw new BookingConflictError();
  }

  for (const barber of assignableBarbers) {
    try {
      return await createBookingWithAssignedBarber(input, service, barber);
    } catch (error) {
      if (error instanceof BookingConflictError) {
        continue;
      }
      throw error;
    }
  }

  throw new BookingConflictError();
}

async function assertBookingStillAvailable(booking: Booking): Promise<void> {
  const { barbers, services, availabilityExceptions } = await loadAvailabilityContext();
  const barber =
    (booking.barberId ? findBarberById(barbers, booking.barberId) : undefined) ||
    barbers.find((item) => item.name === booking.barberName);
  const durationMinutes = getBookingDurationMinutes(booking);
  const bookings = (await listBookings(booking.date)).filter((item) => item.id !== booking.id);

  if (!barber || !barber.isActive) {
    throw new BookingConflictError("Bu randevu yeniden etkinleştirilemedi.");
  }

  const service =
    (booking.serviceId ? findServiceById(services, booking.serviceId) : undefined) ||
    services.find((item) => item.name === booking.serviceName);

  const effectiveDuration = service?.durationMinutes ?? durationMinutes;
  const available = canBarberTakeBooking(bookings, availabilityExceptions, barber, {
    date: booking.date,
    time: booking.time,
    durationMinutes: effectiveDuration,
  });

  if (!available) {
    throw new BookingConflictError();
  }
}

export async function updateBookingStatus(id: string, status: BookingStatus): Promise<void> {
  const booking = await getBookingById(id);
  if (booking.status === status) return;

  if (!usesServiceAccountLocks()) {
    if (!isBookingActive(booking.status) && isBookingActive(status)) {
      await assertBookingStillAvailable(booking);
    }

    await updateBookingStatusDocument(id, status, FIRESTORE_ACCESS_POLICY);
    return;
  }

  if (!isBookingActive(booking.status) && isBookingActive(status)) {
    await assertBookingStillAvailable(booking);

    const barber =
      (await listBarbers()).find((item) => item.id === booking.barberId) ||
      (await listBarbers()).find((item) => item.name === booking.barberName);

    if (!barber) {
      throw new BookingConflictError("Bu randevu yeniden etkinleştirilemedi.");
    }

    const acquiredSlotIds = await acquireSlotLocks({
      bookingId: booking.id,
      barber,
      date: booking.date,
      time: booking.time,
      durationMinutes: getBookingDurationMinutes(booking),
      serviceName: booking.serviceName,
    });

    try {
      await updateBookingStatusDocument(id, status, FIRESTORE_ACCESS_POLICY);
      return;
    } catch (error) {
      await releaseSlotLocks(acquiredSlotIds);
      throw error;
    }
  }

  await updateBookingStatusDocument(id, status, FIRESTORE_ACCESS_POLICY);

  if (isBookingActive(booking.status) && !isBookingActive(status)) {
    await releaseSlotLocksForBooking(booking);
  }
}

export async function deleteBooking(id: string): Promise<void> {
  const booking = await getBookingById(id);
  await deleteBookingDocument(id, FIRESTORE_ACCESS_POLICY);

  if (usesServiceAccountLocks() && isBookingActive(booking.status)) {
    await releaseSlotLocksForBooking(booking);
  }
}

export { getFirestoreAuthMode };
