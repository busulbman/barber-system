import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  ANY_BARBER_ID,
  AVAILABILITY_EXCEPTION_TYPES,
  BOOKING_STATUS_VALUES,
  DEFAULT_SETTINGS,
  TR_MOBILE_PHONE_ERROR_MESSAGE,
  buildUnavailableSlots,
  bookingStatusSchema,
  findServiceById,
  isValidTrMobilePhone,
  normalizeTrMobilePhone,
  publicBookingInputSchema,
  type AppSettings,
  type AvailabilityException,
  type Barber,
  type Booking,
  type PublicBookingCatalog,
  type ServiceItem,
} from "./booking-domain";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const timeRegex = /^\d{2}:\d{2}$/;

const optionalPhoneSchema = z
  .string()
  .trim()
  .max(40)
  .refine((value) => value === "" || isValidTrMobilePhone(value), TR_MOBILE_PHONE_ERROR_MESSAGE)
  .transform((value) => (value ? normalizeTrMobilePhone(value) || value : ""));

const optionalUrlSchema = z
  .string()
  .trim()
  .max(2_000_000)
  .refine(
    (value) =>
      value === "" ||
      /^https?:\/\/\S+/i.test(value) ||
      /^data:image\/(?:jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/i.test(value),
    "Geçerli URL girin",
  );

const availabilityInputSchema = z.object({
  date: z.string().regex(dateRegex, "Geçersiz tarih"),
  barberId: z.string().trim().min(1),
  serviceId: z.string().trim().min(1),
});

const adminLoginInputSchema = z.object({
  password: z.string().trim().min(1).max(200),
});

const adminStatusInputSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(BOOKING_STATUS_VALUES),
});

const adminDeleteInputSchema = z.object({
  id: z.string().trim().min(1),
});

const barberInputSchema = z.object({
  id: z.string().trim().optional().default(""),
  name: z.string().trim().min(2).max(120),
  phone: optionalPhoneSchema,
  whatsappPhone: optionalPhoneSchema,
  photoUrl: optionalUrlSchema,
  title: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(500),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

const barberPhotoUploadInputSchema = z.object({
  barberId: z.string().trim().min(1).max(160),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  dataUrl: z.string().trim().min(1).max(6_000_000),
});

const serviceInputSchema = z.object({
  id: z.string().trim().optional().default(""),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500),
  price: z.number().min(0).max(1_000_000),
  durationMinutes: z.number().int().min(15).max(480),
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

const availabilityExceptionInputSchema = z
  .object({
    id: z.string().trim().optional().default(""),
    type: z.enum(AVAILABILITY_EXCEPTION_TYPES),
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500),
    startDate: z.string().regex(dateRegex, "Geçersiz başlangıç tarihi"),
    endDate: z.string().regex(dateRegex, "Geçersiz bitiş tarihi"),
    startTime: z.string().regex(timeRegex, "Geçersiz başlangıç saati").or(z.literal("")),
    endTime: z.string().regex(timeRegex, "Geçersiz bitiş saati").or(z.literal("")),
    barberId: z.string().trim().optional().default(""),
    appliesToAllBarbers: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Bitiş tarihi başlangıç tarihinden önce olamaz.",
        path: ["endDate"],
      });
    }

    if (value.type === "custom_hours") {
      if (!value.startTime || !value.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Saat bazlı kapatma için başlangıç ve bitiş saati gerekli.",
          path: ["startTime"],
        });
      } else if (value.endTime <= value.startTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Bitiş saati başlangıç saatinden sonra olmalı.",
          path: ["endTime"],
        });
      }
    }

    if (!value.appliesToAllBarbers && !value.barberId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Belirli bir berber seçin veya tüm berberlere uygula seçeneğini açın.",
        path: ["barberId"],
      });
    }
  });

const settingsInputSchema = z.object({
  businessName: z.string().trim().min(2).max(160),
  mainWhatsappNumber: optionalPhoneSchema.refine((value) => value.length > 0, "WhatsApp gerekli"),
  address: z.string().trim().min(2).max(240),
  instagramUrl: optionalUrlSchema,
  workingHours: z.string().trim().min(2).max(1000),
});

async function loadBookingRepository() {
  return import("./booking-repository.server");
}

async function loadCatalogRepository() {
  return import("./catalog-repository.server");
}

type AdminDashboardState =
  | {
      authenticated: false;
      bookings: Booking[];
      barbers: Barber[];
      services: ServiceItem[];
      availabilityExceptions: AvailabilityException[];
      settings: AppSettings;
      authMode?: string;
      loggedInAt?: string;
      loadError: string;
    }
  | {
      authenticated: true;
      bookings: Booking[];
      barbers: Barber[];
      services: ServiceItem[];
      availabilityExceptions: AvailabilityException[];
      settings: AppSettings;
      authMode: string;
      loggedInAt?: string;
      loadError: string;
    };

export const getPublicCatalogState = createServerFn({ method: "GET" }).handler(async () => {
  const { getPublicBookingCatalog } = await loadCatalogRepository();
  return getPublicBookingCatalog();
});

export const getBookingAvailability = createServerFn({ method: "GET" })
  .inputValidator(availabilityInputSchema)
  .handler(async ({ data }) => {
    const [{ listBookings }, { getPublicBookingCatalog }] = await Promise.all([
      loadBookingRepository(),
      loadCatalogRepository(),
    ]);

    const [catalog, bookings] = await Promise.all([
      getPublicBookingCatalog(),
      listBookings(data.date),
    ]);

    const selectedService = findServiceById(catalog.services, data.serviceId);
    if (!selectedService) {
      return { takenSlots: [] as string[] };
    }

    const takenSlots = Array.from(
      buildUnavailableSlots(
        bookings,
        catalog.availabilityExceptions,
        catalog.barbers.filter((barber) => barber.id !== ANY_BARBER_ID),
        {
          selectedBarberId: data.barberId,
          date: data.date,
          durationMinutes: selectedService.durationMinutes,
        },
      ),
    );

    return { takenSlots };
  });

export const createPublicBooking = createServerFn({ method: "POST" })
  .inputValidator(publicBookingInputSchema)
  .handler(async ({ data }) => {
    try {
      const { BookingConflictError, createBooking } = await loadBookingRepository();
      const booking = await createBooking(data);

      return {
        ok: true as const,
        booking,
      };
    } catch (error) {
      console.error(error);
      if (error instanceof Error && error.name === "FirestoreConfigurationError") {
        return {
          ok: false as const,
          error: "Sunucu randevu altyapısı şu anda hazır değil. Lütfen daha sonra tekrar deneyin.",
        };
      }

      const { BookingConflictError } = await loadBookingRepository();
      if (error instanceof BookingConflictError) {
        return {
          ok: false as const,
          error: error.message,
        };
      }

      return {
        ok: false as const,
        error: "Randevu kaydı şu anda oluşturulamadı. Lütfen tekrar deneyin.",
      };
    }
  });

export const getAdminDashboardState = createServerFn({ method: "GET" }).handler(async () => {
  const { getAdminSessionSnapshot } = await import("./admin-auth.server");
  const session = await getAdminSessionSnapshot();

  if (!session.authenticated) {
    return {
      authenticated: false as const,
      bookings: [] as Booking[],
      barbers: [] as Barber[],
      services: [] as ServiceItem[],
      availabilityExceptions: [] as AvailabilityException[],
      settings: DEFAULT_SETTINGS,
      loadError: "",
    } satisfies AdminDashboardState;
  }

  const [{ getFirestoreAuthMode, listBookings }, catalogRepository] = await Promise.all([
    loadBookingRepository(),
    loadCatalogRepository(),
  ]);

  try {
    const [bookings, barbers, services, availabilityExceptions, settings] = await Promise.all([
      listBookings(),
      catalogRepository.listBarbers(),
      catalogRepository.listServices(),
      catalogRepository.listAvailabilityExceptions(),
      catalogRepository.getSettings(),
    ]);

    return {
      authenticated: true as const,
      bookings,
      barbers,
      services,
      availabilityExceptions,
      settings,
      authMode: getFirestoreAuthMode(),
      loggedInAt: session.loggedInAt,
      loadError: "",
    } satisfies AdminDashboardState;
  } catch (error) {
    console.error(error);
    return {
      authenticated: true as const,
      bookings: [] as Booking[],
      barbers: [] as Barber[],
      services: [] as ServiceItem[],
      availabilityExceptions: [] as AvailabilityException[],
      settings: DEFAULT_SETTINGS,
      authMode: getFirestoreAuthMode(),
      loggedInAt: session.loggedInAt,
      loadError:
        error instanceof Error
          ? error.message
          : "Admin verileri şu anda yüklenemedi. Lütfen tekrar deneyin.",
    } satisfies AdminDashboardState;
  }
});

export const loginAdmin = createServerFn({ method: "POST" })
  .inputValidator(adminLoginInputSchema)
  .handler(async ({ data }) => {
    const { performAdminLogin } = await import("./admin-auth.server");
    return performAdminLogin(data.password);
  });

export const logoutAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { performAdminLogout } = await import("./admin-auth.server");
  await performAdminLogout();
  return { ok: true as const };
});

export const updateAdminBookingStatus = createServerFn({ method: "POST" })
  .inputValidator(adminStatusInputSchema)
  .handler(async ({ data }) => {
    const { requireAdminSession } = await import("./admin-auth.server");
    await requireAdminSession();

    const { updateBookingStatus } = await loadBookingRepository();
    await updateBookingStatus(data.id, bookingStatusSchema.parse(data.status));

    return { ok: true as const };
  });

export const deleteAdminBooking = createServerFn({ method: "POST" })
  .inputValidator(adminDeleteInputSchema)
  .handler(async ({ data }) => {
    const { requireAdminSession } = await import("./admin-auth.server");
    await requireAdminSession();

    const { deleteBooking } = await loadBookingRepository();
    await deleteBooking(data.id);

    return { ok: true as const };
  });

export const upsertAdminBarber = createServerFn({ method: "POST" })
  .inputValidator(barberInputSchema)
  .handler(async ({ data }) => {
    const { requireAdminSession } = await import("./admin-auth.server");
    await requireAdminSession();

    const { upsertBarber } = await loadCatalogRepository();
    const normalizedPhone = data.phone || "";
    const normalizedWhatsappPhone = data.whatsappPhone || normalizedPhone;
    const barber = await upsertBarber({
      id: data.id,
      name: data.name,
      phone: normalizedPhone,
      whatsappPhone: normalizedWhatsappPhone,
      photoUrl: data.photoUrl,
      title: data.title,
      bio: data.bio,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    });

    return { ok: true as const, barber };
  });

export const uploadAdminBarberPhoto = createServerFn({ method: "POST" })
  .inputValidator(barberPhotoUploadInputSchema)
  .handler(async ({ data }) => {
    const { requireAdminSession } = await import("./admin-auth.server");
    await requireAdminSession();

    const { uploadBarberPhoto } = await import("./firebase-storage.server");
    return uploadBarberPhoto(data);
  });

export const deleteAdminBarber = createServerFn({ method: "POST" })
  .inputValidator(adminDeleteInputSchema)
  .handler(async ({ data }) => {
    const { requireAdminSession } = await import("./admin-auth.server");
    await requireAdminSession();

    const { deleteBarber } = await loadCatalogRepository();
    await deleteBarber(data.id);
    return { ok: true as const };
  });

export const upsertAdminService = createServerFn({ method: "POST" })
  .inputValidator(serviceInputSchema)
  .handler(async ({ data }) => {
    const { requireAdminSession } = await import("./admin-auth.server");
    await requireAdminSession();

    const { upsertService } = await loadCatalogRepository();
    const service = await upsertService({
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      durationMinutes: data.durationMinutes,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
    });

    return { ok: true as const, service };
  });

export const deleteAdminService = createServerFn({ method: "POST" })
  .inputValidator(adminDeleteInputSchema)
  .handler(async ({ data }) => {
    const { requireAdminSession } = await import("./admin-auth.server");
    await requireAdminSession();

    const { deleteService } = await loadCatalogRepository();
    await deleteService(data.id);
    return { ok: true as const };
  });

export const upsertAdminAvailabilityException = createServerFn({ method: "POST" })
  .inputValidator(availabilityExceptionInputSchema)
  .handler(async ({ data }) => {
    const { requireAdminSession } = await import("./admin-auth.server");
    await requireAdminSession();

    const { upsertAvailabilityException } = await loadCatalogRepository();
    const exception = await upsertAvailabilityException({
      id: data.id,
      type: data.type,
      title: data.title,
      description: data.description,
      startDate: data.startDate,
      endDate: data.endDate,
      startTime: data.startTime,
      endTime: data.endTime,
      barberId: data.appliesToAllBarbers ? undefined : data.barberId || undefined,
      appliesToAllBarbers: data.appliesToAllBarbers,
    });

    return { ok: true as const, exception };
  });

export const deleteAdminAvailabilityException = createServerFn({ method: "POST" })
  .inputValidator(adminDeleteInputSchema)
  .handler(async ({ data }) => {
    const { requireAdminSession } = await import("./admin-auth.server");
    await requireAdminSession();

    const { deleteAvailabilityException } = await loadCatalogRepository();
    await deleteAvailabilityException(data.id);
    return { ok: true as const };
  });

export const updateAdminSettings = createServerFn({ method: "POST" })
  .inputValidator(settingsInputSchema)
  .handler(async ({ data }) => {
    const { requireAdminSession } = await import("./admin-auth.server");
    await requireAdminSession();

    const { saveSettings } = await loadCatalogRepository();
    const settings = await saveSettings({
      id: DEFAULT_SETTINGS.id,
      businessName: data.businessName,
      mainWhatsappNumber: data.mainWhatsappNumber,
      address: data.address,
      instagramUrl: data.instagramUrl,
      workingHours: data.workingHours,
    });

    return { ok: true as const, settings };
  });
