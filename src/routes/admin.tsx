import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  Coins,
  Filter,
  Hourglass,
  ImagePlus,
  ListChecks,
  Lock,
  LoaderCircle,
  LogOut,
  Menu,
  MessageCircle,
  Pencil,
  RefreshCcw,
  Save,
  Scissors,
  Send,
  Settings2,
  ShieldCheck,
  Store,
  ThumbsUp,
  Trash2,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import {
  deleteAdminAvailabilityException,
  deleteAdminBarber,
  deleteAdminBooking,
  deleteAdminService,
  getAdminDashboardState,
  loginAdmin,
  logoutAdmin,
  updateAdminBookingStatus,
  updateAdminSettings,
  uploadAdminBarberPhoto,
  upsertAdminAvailabilityException,
  upsertAdminBarber,
  upsertAdminService,
} from "@/lib/booking-api";
import { ImageWithFallback } from "@/components/site/ImageWithFallback";
import {
  AVAILABILITY_EXCEPTION_TYPES,
  BOOKING_STATUS_VALUES,
  TR_MOBILE_PHONE_ERROR_MESSAGE,
  formatPrice,
  normalizeTrMobilePhone,
  type AppSettings,
  type AvailabilityException,
  type AvailabilityExceptionType,
  type Barber,
  type Booking,
  type BookingStatus,
  type ServiceItem,
} from "@/lib/booking-domain";
import {
  buildAppointmentStats,
  buildBarberPerformance,
  buildEarningsSummary,
  getBookingDurationLabel,
} from "@/lib/admin-analytics";

export const Route = createFileRoute("/admin")({
  loader: () => getAdminDashboardState(),
  head: () => ({
    meta: [
      { title: "Admin — Okan Yıldız Barber's Club" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type AdminSection =
  | "appointments"
  | "barbers"
  | "services"
  | "availability"
  | "earnings"
  | "settings";

type DashboardState = Awaited<ReturnType<typeof getAdminDashboardState>>;

type BarberFormState = {
  id: string;
  name: string;
  phone: string;
  whatsappPhone: string;
  photoUrl: string;
  title: string;
  bio: string;
  isActive: boolean;
  sortOrder: string;
};

type ServiceFormState = {
  id: string;
  name: string;
  description: string;
  price: string;
  durationMinutes: string;
  isActive: boolean;
  sortOrder: string;
};

type AvailabilityFormState = {
  id: string;
  type: AvailabilityExceptionType;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  barberId: string;
  appliesToAllBarbers: boolean;
};

type SettingsFormState = {
  businessName: string;
  mainWhatsappNumber: string;
  address: string;
  instagramUrl: string;
  workingHours: string;
};

type AsyncAction = () => Promise<void>;

const ACCEPTED_BARBER_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_BARBER_PHOTO_FILE_BYTES = 8 * 1024 * 1024;

const adminSections: Array<{
  id: AdminSection;
  label: string;
  icon: ReactNode;
}> = [
  { id: "appointments", label: "Randevular", icon: <CalendarDays size={16} /> },
  { id: "barbers", label: "Berberler", icon: <Scissors size={16} /> },
  { id: "services", label: "Hizmetler & Fiyatlar", icon: <BriefcaseBusiness size={16} /> },
  { id: "availability", label: "Çalışma Takvimi", icon: <CalendarClock size={16} /> },
  { id: "earnings", label: "Kazanç", icon: <Coins size={16} /> },
  { id: "settings", label: "Ayarlar", icon: <Settings2 size={16} /> },
];

function toWa(phone: string): string {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("90")) return digits;
  if (digits.startsWith("0")) return `90${digits.slice(1)}`;
  return `90${digits}`;
}

function todayStr(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(value: string): string {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}.${month}.${year}`;
}

function formatTimestamp(value?: string): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("tr-TR");
}

function getExceptionTypeLabel(type: AvailabilityExceptionType): string {
  if (type === "full_day_closed") return "Tam gün kapalı";
  if (type === "custom_hours") return "Saat bazlı kapalı";
  return "Tam dolu";
}

function emptyBarberForm(): BarberFormState {
  return {
    id: "",
    name: "",
    phone: "",
    whatsappPhone: "",
    photoUrl: "",
    title: "",
    bio: "",
    isActive: true,
    sortOrder: "0",
  };
}

function emptyServiceForm(): ServiceFormState {
  return {
    id: "",
    name: "",
    description: "",
    price: "0",
    durationMinutes: "60",
    isActive: true,
    sortOrder: "0",
  };
}

function emptyAvailabilityForm(): AvailabilityFormState {
  return {
    id: "",
    type: AVAILABILITY_EXCEPTION_TYPES[0],
    title: "",
    description: "",
    startDate: todayStr(),
    endDate: todayStr(),
    startTime: "",
    endTime: "",
    barberId: "",
    appliesToAllBarbers: true,
  };
}

function settingsToForm(settings: AppSettings): SettingsFormState {
  return {
    businessName: settings.businessName,
    mainWhatsappNumber: settings.mainWhatsappNumber,
    address: settings.address,
    instagramUrl: settings.instagramUrl,
    workingHours: settings.workingHours,
  };
}

function barberToForm(barber: Barber): BarberFormState {
  return {
    id: barber.id,
    name: barber.name,
    phone: barber.phone,
    whatsappPhone: barber.whatsappPhone,
    photoUrl: barber.photoUrl,
    title: barber.title,
    bio: barber.bio,
    isActive: barber.isActive,
    sortOrder: String(barber.sortOrder),
  };
}

function serviceToForm(service: ServiceItem): ServiceFormState {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    price: String(service.price),
    durationMinutes: String(service.durationMinutes),
    isActive: service.isActive,
    sortOrder: String(service.sortOrder),
  };
}

function exceptionToForm(exception: AvailabilityException): AvailabilityFormState {
  return {
    id: exception.id,
    type: exception.type,
    title: exception.title,
    description: exception.description,
    startDate: exception.startDate,
    endDate: exception.endDate,
    startTime: exception.startTime,
    endTime: exception.endTime,
    barberId: exception.barberId || "",
    appliesToAllBarbers: exception.appliesToAllBarbers,
  };
}

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getSectionLabel(section: AdminSection): string {
  return adminSections.find((item) => item.id === section)?.label || "Panel";
}

function isAcceptedBarberPhotoType(
  value: string,
): value is (typeof ACCEPTED_BARBER_PHOTO_TYPES)[number] {
  return ACCEPTED_BARBER_PHOTO_TYPES.includes(
    value as (typeof ACCEPTED_BARBER_PHOTO_TYPES)[number],
  );
}

function dataUrlToMimeType(dataUrl: string): string {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,/i.exec(dataUrl);
  return match?.[1] || "image/jpeg";
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Fotoğraf önizlemesi oluşturulamadı."));
    };
    reader.onerror = () => reject(new Error("Fotoğraf önizlemesi oluşturulamadı."));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Görsel okunamadı."));
    };
    image.src = objectUrl;
  });
}

async function compressBarberPhoto(file: File): Promise<{
  dataUrl: string;
  contentType: "image/jpeg" | "image/webp";
}> {
  const image = await loadImageElement(file);
  const scale = Math.min(1, 800 / Math.max(image.width, 1));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Fotoğraf sıkıştırma şu anda desteklenmiyor.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const webpDataUrl = canvas.toDataURL("image/webp", 0.75);
  if (webpDataUrl.startsWith("data:image/webp")) {
    return {
      dataUrl: webpDataUrl,
      contentType: "image/webp",
    };
  }

  return {
    dataUrl: canvas.toDataURL("image/jpeg", 0.75),
    contentType: "image/jpeg",
  };
}

function AdminPage() {
  const initialState = Route.useLoaderData();
  const [screenState, setScreenState] = useState(initialState);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setScreenState(initialState);
  }, [initialState]);

  const refresh = async () => {
    setLoading(true);
    try {
      setScreenState(await getAdminDashboardState());
    } finally {
      setLoading(false);
    }
  };

  if (!screenState.authenticated) {
    return <LoginScreen loading={loading} onSuccess={refresh} />;
  }

  return (
    <AdminDashboard
      state={screenState}
      loading={loading}
      onRefresh={refresh}
      onLogout={async () => {
        await logoutAdmin();
        await refresh();
      }}
    />
  );
}

function LoginScreen({ loading, onSuccess }: { loading: boolean; onSuccess: () => Promise<void> }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lockUntil, setLockUntil] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timerId);
  }, []);

  const locked = lockUntil > now;
  const remaining = Math.max(0, Math.ceil((lockUntil - now) / 1000));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (locked || submitting || loading) return;

    setSubmitting(true);

    try {
      const result = await loginAdmin({ data: { password } });
      if (result.ok) {
        setPassword("");
        setError("");
        setLockUntil(0);
        await onSuccess();
        return;
      }

      setError(result.error);
      if ("retryAfter" in result && typeof result.retryAfter === "number") {
        setLockUntil(Date.now() + result.retryAfter * 1000);
      }
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-navy text-bone flex items-center justify-center px-6 overflow-x-hidden [&_input]:min-h-11 [&_input]:text-base md:[&_input]:text-sm [&_button]:min-h-11">
      <form
        onSubmit={(event) => {
          void submit(event);
        }}
        className="w-full max-w-sm bg-card-dark border border-border-soft rounded-xl p-8"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center">
            <Lock size={18} className="text-gold" />
          </div>
          <div>
            <h1 className="font-display text-2xl tracking-wider text-bone">ADMIN GİRİŞİ</h1>
            <p className="text-xs text-bone/50">Okan Yıldız Barber's Club</p>
          </div>
        </div>

        <label className="font-sub text-xs tracking-[0.2em] uppercase text-bone/60 mb-2 block">
          Şifre
        </label>
        <input
          type="password"
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setError("");
          }}
          disabled={locked || submitting || loading}
          className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold disabled:opacity-50"
          autoFocus
        />

        {locked ? (
          <p className="text-red-400 text-xs mt-2">
            Çok fazla deneme. {remaining} saniye bekleyin.
          </p>
        ) : error ? (
          <p className="text-red-400 text-xs mt-2">{error}</p>
        ) : null}

        <button
          type="submit"
          disabled={locked || submitting || loading}
          className="w-full mt-4 bg-gold text-navy font-sub text-xs tracking-[0.25em] uppercase py-3 rounded hover:bg-gold-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {locked
            ? `Kilitli (${remaining}s)`
            : submitting || loading
              ? "Giriş Yapılıyor..."
              : "Giriş Yap"}
        </button>
      </form>
    </main>
  );
}

function AdminDashboard({
  state,
  loading,
  onRefresh,
  onLogout,
}: {
  state: Extract<DashboardState, { authenticated: true }>;
  loading: boolean;
  onRefresh: () => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [section, setSection] = useState<AdminSection>("appointments");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const stats = useMemo(() => buildAppointmentStats(state.bookings), [state.bookings]);
  const earnings = useMemo(() => buildEarningsSummary(state.bookings), [state.bookings]);
  const performance = useMemo(
    () => buildBarberPerformance(state.bookings, state.barbers),
    [state.barbers, state.bookings],
  );

  const runAction = async (
    busy: string,
    successMessage: string,
    action: AsyncAction,
  ): Promise<boolean> => {
    setBusyKey(busy);
    setActionError("");
    setActionSuccess("");

    try {
      await action();
      setActionSuccess(successMessage);
      await onRefresh();
      return true;
    } catch (error) {
      console.error(error);
      setActionError(error instanceof Error ? error.message : "İşlem başarısız oldu.");
      return false;
    } finally {
      setBusyKey(null);
    }
  };

  useEffect(() => {
    setMobileNavOpen(false);
  }, [section]);

  useEffect(() => {
    if (!mobileNavOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  return (
    <main className="min-h-screen bg-navy text-bone overflow-x-hidden [&_button]:min-h-11 [&_input]:min-h-11 [&_input]:text-base [&_select]:min-h-11 [&_select]:text-base [&_textarea]:text-base md:[&_input]:text-sm md:[&_select]:text-sm md:[&_textarea]:text-sm">
      {mobileNavOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Menüyü kapat"
            onClick={() => setMobileNavOpen(false)}
            className="absolute inset-0 bg-navy/75 backdrop-blur-sm"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(86vw,22rem)] border-r border-border-soft bg-card-dark px-5 py-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-border-soft pb-4">
              <div>
                <p className="font-sub text-[10px] tracking-[0.3em] uppercase text-gold">
                  Admin Paneli
                </p>
                <p className="font-display text-2xl tracking-wider text-bone">Menü</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-soft text-bone/75 transition-colors hover:border-gold hover:text-gold"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {adminSections.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left font-sub text-[11px] tracking-[0.18em] uppercase transition-colors ${
                    section === item.id
                      ? "border-gold bg-gold text-navy"
                      : "border-border-soft text-bone/70 hover:border-gold hover:text-gold"
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  void onRefresh();
                }}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border-soft px-4 py-3 font-sub text-[10px] tracking-[0.2em] uppercase text-bone/75 transition-colors hover:border-gold hover:text-gold disabled:opacity-40"
              >
                <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
                Yenile
              </button>
              <button
                type="button"
                onClick={() => {
                  void onLogout();
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 font-sub text-[10px] tracking-[0.2em] uppercase text-navy transition-colors hover:bg-gold-light"
              >
                <LogOut size={14} />
                Çıkış
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="border-b border-border-soft bg-navy/95 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 py-5">
          <div className="flex items-start justify-between gap-4 lg:gap-5">
            <div className="min-w-0 flex-1">
              <div className="mb-4 flex items-center gap-3 lg:hidden">
                <button
                  type="button"
                  aria-label="Menüyü aç"
                  onClick={() => setMobileNavOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border-soft text-bone/80 transition-colors hover:border-gold hover:text-gold"
                >
                  <Menu size={18} />
                </button>
                <div className="min-w-0">
                  <p className="font-sub text-[10px] tracking-[0.28em] uppercase text-gold">
                    Aktif Bölüm
                  </p>
                  <p className="truncate font-display text-xl tracking-wider text-bone">
                    {getSectionLabel(section)}
                  </p>
                </div>
              </div>

              <p className="font-sub text-[10px] tracking-[0.3em] uppercase text-gold mb-2">
                Admin Paneli
              </p>
              <h1 className="font-display text-3xl lg:text-4xl tracking-wider break-words">
                {state.settings.businessName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-bone/55">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck size={14} className="text-gold" />
                  Session korumalı
                </span>
                <span>Auth modu: {state.authMode}</span>
                <span>Son giriş: {formatTimestamp(state.loggedInAt)}</span>
              </div>
            </div>

            <div className="hidden lg:flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  void onRefresh();
                }}
                disabled={loading}
                className="inline-flex items-center gap-2 border border-border-soft text-bone/75 font-sub text-xs tracking-[0.25em] uppercase px-4 py-3 rounded hover:border-gold hover:text-gold transition-colors disabled:opacity-40"
              >
                <RefreshCcw size={14} className={loading ? "animate-spin" : ""} />
                Yenile
              </button>
              <button
                onClick={() => {
                  void onLogout();
                }}
                className="inline-flex items-center gap-2 bg-gold text-navy font-sub text-xs tracking-[0.25em] uppercase px-4 py-3 rounded hover:bg-gold-light transition-colors"
              >
                <LogOut size={14} />
                Çıkış
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3 mt-6">
            <StatCard icon={<ListChecks size={16} />} label="Toplam" value={stats.total} />
            <StatCard icon={<CalendarDays size={16} />} label="Bugün" value={stats.today} />
            <StatCard icon={<Hourglass size={16} />} label="Bekliyor" value={stats.pending} />
            <StatCard icon={<ThumbsUp size={16} />} label="Onaylandı" value={stats.confirmed} />
            <StatCard
              icon={<Coins size={16} />}
              label="Bugünkü Kazanç"
              value={earnings.today}
              accent
              money
            />
          </div>

          <div className="hidden lg:flex gap-2 mt-5 overflow-x-auto pb-1">
            {adminSections.map((item) => (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 font-sub text-[11px] tracking-[0.2em] uppercase transition-colors ${
                  section === item.id
                    ? "bg-gold text-navy border-gold"
                    : "border-border-soft text-bone/65 hover:border-gold hover:text-gold"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-5 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="flex w-full items-center justify-between rounded-2xl border border-border-soft bg-card-dark px-4 py-3 text-left"
            >
              <span className="flex items-center gap-3 text-bone">
                <Menu size={16} className="text-gold" />
                <span className="font-sub text-[11px] tracking-[0.18em] uppercase">
                  {getSectionLabel(section)}
                </span>
              </span>
              <span className="text-xs text-bone/55">Sekmeler</span>
            </button>
          </div>

          {state.loadError ? (
            <p className="mt-4 text-amber-300 text-sm">{state.loadError}</p>
          ) : null}
          {actionError ? <p className="mt-4 text-red-300 text-sm">{actionError}</p> : null}
          {actionSuccess ? <p className="mt-4 text-emerald-300 text-sm">{actionSuccess}</p> : null}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 lg:px-8 py-8">
        {section === "appointments" ? (
          <AppointmentsSection
            bookings={state.bookings}
            busyKey={busyKey}
            onStatusChange={(id, status) =>
              runAction(`booking:${id}:status`, "Randevu durumu güncellendi.", async () => {
                await updateAdminBookingStatus({ data: { id, status } });
              })
            }
            onDelete={(id) =>
              runAction(`booking:${id}:delete`, "Randevu silindi.", async () => {
                await deleteAdminBooking({ data: { id } });
              })
            }
          />
        ) : null}

        {section === "barbers" ? (
          <BarbersSection
            barbers={state.barbers}
            performance={performance}
            busyKey={busyKey}
            onSave={(form) =>
              runAction(
                `barber:${form.id || "new"}:save`,
                form.id ? "Berber güncellendi." : "Berber eklendi.",
                async () => {
                  await upsertAdminBarber({
                    data: {
                      id: form.id,
                      name: form.name,
                      phone: form.phone,
                      whatsappPhone: form.whatsappPhone,
                      photoUrl: form.photoUrl,
                      title: form.title,
                      bio: form.bio,
                      isActive: form.isActive,
                      sortOrder: parseNumber(form.sortOrder, 0),
                    },
                  });
                },
              )
            }
            onToggle={(barber) =>
              runAction(`barber:${barber.id}:toggle`, "Berber durumu güncellendi.", async () => {
                await upsertAdminBarber({
                  data: {
                    id: barber.id,
                    name: barber.name,
                    phone: barber.phone,
                    whatsappPhone: barber.whatsappPhone,
                    photoUrl: barber.photoUrl,
                    title: barber.title,
                    bio: barber.bio,
                    isActive: !barber.isActive,
                    sortOrder: barber.sortOrder,
                  },
                });
              })
            }
            onDelete={(id) =>
              runAction(`barber:${id}:delete`, "Berber silindi.", async () => {
                await deleteAdminBarber({ data: { id } });
              })
            }
          />
        ) : null}

        {section === "services" ? (
          <ServicesSection
            services={state.services}
            busyKey={busyKey}
            onSave={(form) =>
              runAction(
                `service:${form.id || "new"}:save`,
                form.id ? "Hizmet güncellendi." : "Hizmet eklendi.",
                async () => {
                  await upsertAdminService({
                    data: {
                      id: form.id,
                      name: form.name,
                      description: form.description,
                      price: parseNumber(form.price, 0),
                      durationMinutes: parseNumber(form.durationMinutes, 60),
                      isActive: form.isActive,
                      sortOrder: parseNumber(form.sortOrder, 0),
                    },
                  });
                },
              )
            }
            onToggle={(service) =>
              runAction(`service:${service.id}:toggle`, "Hizmet durumu güncellendi.", async () => {
                await upsertAdminService({
                  data: {
                    id: service.id,
                    name: service.name,
                    description: service.description,
                    price: service.price,
                    durationMinutes: service.durationMinutes,
                    isActive: !service.isActive,
                    sortOrder: service.sortOrder,
                  },
                });
              })
            }
            onDelete={(id) =>
              runAction(`service:${id}:delete`, "Hizmet silindi.", async () => {
                await deleteAdminService({ data: { id } });
              })
            }
          />
        ) : null}

        {section === "availability" ? (
          <AvailabilitySection
            exceptions={state.availabilityExceptions}
            barbers={state.barbers}
            busyKey={busyKey}
            onSave={(form) =>
              runAction(
                `availability:${form.id || "new"}:save`,
                form.id ? "Takvim kaydı güncellendi." : "Takvim kaydı eklendi.",
                async () => {
                  await upsertAdminAvailabilityException({
                    data: {
                      id: form.id,
                      type: form.type,
                      title: form.title,
                      description: form.description,
                      startDate: form.startDate,
                      endDate: form.endDate,
                      startTime: form.startTime,
                      endTime: form.endTime,
                      barberId: form.barberId,
                      appliesToAllBarbers: form.appliesToAllBarbers,
                    },
                  });
                },
              )
            }
            onDelete={(id) =>
              runAction(`availability:${id}:delete`, "Takvim kaydı silindi.", async () => {
                await deleteAdminAvailabilityException({ data: { id } });
              })
            }
          />
        ) : null}

        {section === "earnings" ? (
          <EarningsSection earnings={earnings} performance={performance} />
        ) : null}

        {section === "settings" ? (
          <SettingsSection
            settings={state.settings}
            busyKey={busyKey}
            authMode={state.authMode}
            loggedInAt={state.loggedInAt}
            onSave={(form) =>
              runAction("settings:save", "Ayarlar güncellendi.", async () => {
                await updateAdminSettings({ data: form });
              })
            }
          />
        ) : null}
      </div>
    </main>
  );
}

function AppointmentsSection({
  bookings,
  busyKey,
  onStatusChange,
  onDelete,
}: {
  bookings: Booking[];
  busyKey: string | null;
  onStatusChange: (id: string, status: BookingStatus) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "">("");
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      bookings.filter((booking) => {
        if (dateFilter && booking.date !== dateFilter) return false;
        if (statusFilter && booking.status !== statusFilter) return false;
        if (!query.trim()) return true;

        const haystack = [
          booking.name,
          booking.phone,
          booking.serviceName || booking.service,
          booking.barberName || booking.barber,
        ]
          .join(" ")
          .toLocaleLowerCase("tr");

        return haystack.includes(query.trim().toLocaleLowerCase("tr"));
      }),
    [bookings, dateFilter, statusFilter, query],
  );

  return (
    <SectionPanel
      title="Randevular"
      description="Mevcut çalışan randevu akışı korunur; burada filtreleme, durum güncelleme ve silme yapılır."
    >
      <div className="grid lg:grid-cols-[1.3fr_1fr_1fr] gap-3 mb-6">
        <FieldBlock label="Tarih">
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
            className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
          />
        </FieldBlock>
        <FieldBlock label="Durum">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as BookingStatus | "")}
            className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
          >
            <option value="">Tümü</option>
            {BOOKING_STATUS_VALUES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </FieldBlock>
        <FieldBlock label="Ara">
          <div className="relative">
            <Filter size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-bone/40" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Müşteri, telefon, hizmet"
              className="w-full bg-navy border border-border-soft rounded-md pl-10 pr-4 py-3 text-bone focus:outline-none focus:border-gold"
            />
          </div>
        </FieldBlock>
      </div>

      <div className="space-y-4">
        {filtered.length === 0 ? (
          <EmptyState
            title="Gösterilecek randevu yok"
            description="Filtreleri temizleyin veya yeni bir rezervasyon oluşturun."
          />
        ) : null}

        {filtered.map((booking) => {
          const busyStatus = busyKey === `booking:${booking.id}:status`;
          const busyDelete = busyKey === `booking:${booking.id}:delete`;
          const whatsapp = toWa(booking.phone);
          const priceLabel =
            typeof booking.servicePriceAtBooking === "number"
              ? formatPrice(booking.servicePriceAtBooking)
              : "Legacy kayıt / 0 ₺";

          return (
            <article
              key={booking.id}
              className="rounded-2xl border border-border-soft bg-card-dark p-5 lg:p-6"
            >
              <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-5">
                <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge tone="gold">{booking.status}</Badge>
                    <span className="font-sub text-[10px] tracking-[0.2em] uppercase text-bone/45">
                      {formatTimestamp(booking.created_at)}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
                    <InfoPair label="Müşteri" value={booking.name} />
                    <InfoPair label="Telefon" value={booking.phone} />
                    <InfoPair
                      label="Hizmet"
                      value={`${booking.serviceName || booking.service} · ${getBookingDurationLabel(booking)}`}
                    />
                    <InfoPair
                      label="Berber"
                      value={booking.barberName || booking.barber || "Atanmadı"}
                    />
                    <InfoPair label="Tarih" value={formatShortDate(booking.date)} />
                    <InfoPair label="Saat" value={booking.time} />
                    <InfoPair label="Snapshot fiyat" value={priceLabel} />
                    <InfoPair label="Not" value={booking.note || "Yok"} muted={!booking.note} />
                  </div>
                </div>

                <div className="w-full xl:w-80 rounded-xl border border-border-soft/70 bg-navy p-4 space-y-4">
                  <FieldBlock label="Durum Güncelle">
                    <select
                      defaultValue={booking.status}
                      onChange={(event) => {
                        const nextStatus = event.target.value as BookingStatus;
                        if (nextStatus === booking.status) return;
                        void onStatusChange(booking.id, nextStatus);
                      }}
                      disabled={busyStatus}
                      className="w-full bg-card-dark border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold disabled:opacity-50"
                    >
                      {BOOKING_STATUS_VALUES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </FieldBlock>

                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={`https://wa.me/${whatsapp}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 border border-border-soft text-bone/75 font-sub text-[11px] tracking-[0.2em] uppercase px-3 py-3 rounded hover:border-gold hover:text-gold transition-colors"
                    >
                      <MessageCircle size={14} />
                      WhatsApp
                    </a>
                    <a
                      href={`tel:${booking.phone}`}
                      className="inline-flex items-center justify-center gap-2 border border-border-soft text-bone/75 font-sub text-[11px] tracking-[0.2em] uppercase px-3 py-3 rounded hover:border-gold hover:text-gold transition-colors"
                    >
                      <Send size={14} />
                      Ara
                    </a>
                  </div>

                  <button
                    onClick={() => {
                      void onDelete(booking.id);
                    }}
                    disabled={busyDelete}
                    className="w-full inline-flex items-center justify-center gap-2 bg-red-500/10 text-red-300 border border-red-500/20 font-sub text-[11px] tracking-[0.2em] uppercase px-4 py-3 rounded hover:bg-red-500/15 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                    {busyDelete ? "Siliniyor..." : "Sil"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </SectionPanel>
  );
}

function BarbersSection({
  barbers,
  performance,
  busyKey,
  onSave,
  onToggle,
  onDelete,
}: {
  barbers: Barber[];
  performance: ReturnType<typeof buildBarberPerformance>;
  busyKey: string | null;
  onSave: (form: BarberFormState) => Promise<boolean>;
  onToggle: (barber: Barber) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [form, setForm] = useState<BarberFormState>(emptyBarberForm());
  const [formError, setFormError] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedPhone = useMemo(() => normalizeTrMobilePhone(form.phone), [form.phone]);
  const normalizedWhatsappPhone = useMemo(
    () => normalizeTrMobilePhone(form.whatsappPhone),
    [form.whatsappPhone],
  );
  const phoneError = form.phone.trim() && !normalizedPhone ? TR_MOBILE_PHONE_ERROR_MESSAGE : "";
  const whatsappError =
    form.whatsappPhone.trim() && !normalizedWhatsappPhone ? TR_MOBILE_PHONE_ERROR_MESSAGE : "";
  const effectiveWhatsappPreview = form.whatsappPhone.trim()
    ? normalizedWhatsappPhone
    : normalizedPhone;
  const previewUrl = photoPreview || form.photoUrl;

  const resetForm = () => {
    setForm(emptyBarberForm());
    setFormError("");
    setPhotoError("");
    setPhotoPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const loadForm = (barber: Barber) => {
    setForm(barberToForm(barber));
    setFormError("");
    setPhotoError("");
    setPhotoPreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handlePhotoSelect = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setPhotoError("");
    setFormError("");

    if (!isAcceptedBarberPhotoType(file.type)) {
      setPhotoError("Yalnızca JPG, PNG veya WEBP yükleyebilirsiniz.");
      return;
    }

    if (file.size > MAX_BARBER_PHOTO_FILE_BYTES) {
      setPhotoError("Fotoğraf en fazla 8 MB olabilir.");
      return;
    }

    setPhotoUploading(true);

    try {
      const compressed = await compressBarberPhoto(file);
      setPhotoPreview(compressed.dataUrl);

      const nextBarberId = form.id || crypto.randomUUID();
      const uploadResult = await uploadAdminBarberPhoto({
        data: {
          barberId: nextBarberId,
          contentType: compressed.contentType,
          dataUrl: compressed.dataUrl,
        },
      });

      setForm((current) => ({
        ...current,
        id: current.id || nextBarberId,
        photoUrl: uploadResult.photoUrl,
      }));
      setPhotoPreview("");
    } catch (error) {
      console.error(error);
      setPhotoError(
        error instanceof Error ? error.message : "Fotoğraf yüklenirken bir sorun oluştu.",
      );
      setPhotoPreview("");
    } finally {
      setPhotoUploading(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (photoUploading) {
      setFormError("Fotoğraf yükleniyor. Yükleme bitince tekrar deneyin.");
      return;
    }

    if (phoneError || whatsappError) {
      setFormError(phoneError || whatsappError);
      return;
    }

    setFormError("");
    const saved = await onSave(form);
    if (saved) {
      resetForm();
    }
  };

  return (
    <SectionPanel
      title="Berberler"
      description="Aktif/pasif yönetimi, iletişim bilgileri ve sıralama artık panelden yönetilir."
    >
      <div className="grid xl:grid-cols-[1.05fr_1.4fr] gap-6">
        <div className="rounded-2xl border border-border-soft bg-card-dark p-5 lg:p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="font-display text-2xl tracking-wider text-bone">
                {form.id ? "Berber Düzenle" : "Yeni Berber"}
              </p>
              <p className="text-bone/55 text-sm mt-2">
                Booking modal yalnızca aktif berberleri müşteriye gösterir.
              </p>
            </div>
            {form.id ? (
              <button
                onClick={resetForm}
                className="font-sub text-[10px] tracking-[0.2em] uppercase text-bone/55 hover:text-gold transition-colors"
              >
                Temizle
              </button>
            ) : null}
          </div>

          <form
            onSubmit={(event) => {
              void submit(event);
            }}
            className="space-y-4"
          >
            <FieldBlock label="Ad Soyad">
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
              />
            </FieldBlock>
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldBlock label="Telefon">
                <div className="space-y-2">
                  <input
                    value={form.phone}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, phone: event.target.value }));
                      setFormError("");
                    }}
                    placeholder="0532 123 45 67"
                    inputMode="tel"
                    className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
                  />
                  {phoneError ? (
                    <p className="text-sm text-red-300">{phoneError}</p>
                  ) : normalizedPhone ? (
                    <p className="text-sm text-bone/55">Kaydedilecek format: {normalizedPhone}</p>
                  ) : null}
                </div>
              </FieldBlock>
              <FieldBlock label="WhatsApp">
                <div className="space-y-2">
                  <input
                    value={form.whatsappPhone}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, whatsappPhone: event.target.value }));
                      setFormError("");
                    }}
                    placeholder="Boşsa telefon numarası kullanılır"
                    inputMode="tel"
                    className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
                  />
                  {whatsappError ? (
                    <p className="text-sm text-red-300">{whatsappError}</p>
                  ) : effectiveWhatsappPreview ? (
                    <p className="text-sm text-bone/55">
                      Kaydedilecek WhatsApp: {effectiveWhatsappPreview}
                    </p>
                  ) : (
                    <p className="text-sm text-bone/45">Boşsa telefon numarası kullanılır.</p>
                  )}
                </div>
              </FieldBlock>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldBlock label="Unvan">
                <input
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, title: event.target.value }))
                  }
                  className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
                />
              </FieldBlock>
              <FieldBlock label="Sıralama">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sortOrder: event.target.value }))
                  }
                  className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
                />
              </FieldBlock>
            </div>
            <FieldBlock label="Fotoğraf">
              <div className="space-y-4">
                <div className="overflow-hidden rounded-2xl border border-border-soft bg-navy">
                  <div className="aspect-[4/5] bg-navy-3">
                    {previewUrl ? (
                      <ImageWithFallback
                        src={previewUrl}
                        alt={form.name || "Berber fotoğrafı"}
                        className="h-full"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-bone/40">
                        <div className="text-center">
                          <Camera size={28} className="mx-auto mb-3 text-gold/70" />
                          <p className="font-sub text-[11px] tracking-[0.2em] uppercase">
                            Önizleme Yok
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    void handlePhotoSelect(event);
                  }}
                  className="hidden"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={photoUploading}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-border-soft px-4 py-3 font-sub text-[11px] tracking-[0.2em] uppercase text-bone/80 transition-colors hover:border-gold hover:text-gold disabled:opacity-40"
                  >
                    {photoUploading ? (
                      <LoaderCircle size={16} className="animate-spin" />
                    ) : (
                      <ImagePlus size={16} />
                    )}
                    {previewUrl ? "Fotoğrafı Değiştir" : "Galeriden Fotoğraf Seç"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm((current) => ({ ...current, photoUrl: "" }));
                      setPhotoPreview("");
                      setPhotoError("");
                      if (fileInputRef.current) {
                        fileInputRef.current.value = "";
                      }
                    }}
                    disabled={!previewUrl || photoUploading}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 font-sub text-[11px] tracking-[0.2em] uppercase text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-40"
                  >
                    <Trash2 size={16} />
                    Kaldır
                  </button>
                </div>

                <div className="space-y-2">
                  <input
                    value={form.photoUrl}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, photoUrl: event.target.value }));
                      setPhotoPreview("");
                      setPhotoError("");
                    }}
                    placeholder="https://... veya yükleme sonrası otomatik dolar"
                    className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
                  />
                  <p className="text-sm text-bone/45">
                    JPG, PNG veya WEBP yükleyin. Yüklemeden önce 800px genişliğe kadar sıkıştırılır.
                  </p>
                  {photoError ? <p className="text-sm text-red-300">{photoError}</p> : null}
                </div>
              </div>
            </FieldBlock>
            <FieldBlock label="Bio">
              <textarea
                rows={4}
                value={form.bio}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bio: event.target.value }))
                }
                className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone resize-none focus:outline-none focus:border-gold"
              />
            </FieldBlock>
            {formError ? <p className="text-sm text-red-300">{formError}</p> : null}
            <ToggleRow
              label="Aktif"
              description="Aktif olmayan berber booking modal içinde görünmez."
              checked={form.isActive}
              onChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
            />
            <button
              type="submit"
              disabled={busyKey === `barber:${form.id || "new"}:save`}
              className="w-full inline-flex items-center justify-center gap-2 bg-gold text-navy font-sub text-xs tracking-[0.25em] uppercase px-4 py-3 rounded hover:bg-gold-light transition-colors disabled:opacity-40"
            >
              <Save size={14} />
              {busyKey === `barber:${form.id || "new"}:save` ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {barbers.map((barber) => {
            const metrics =
              performance.find(
                (item) => item.barberId === barber.id || item.barberName === barber.name,
              ) || null;

            return (
              <article
                key={barber.id}
                className="rounded-2xl border border-border-soft bg-card-dark p-5 lg:p-6"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      {barber.photoUrl ? (
                        <div className="h-16 w-16 overflow-hidden rounded-2xl border border-border-soft">
                          <ImageWithFallback
                            src={barber.photoUrl}
                            alt={barber.name}
                            className="h-full"
                          />
                        </div>
                      ) : null}
                      <h3 className="font-display text-2xl tracking-wider">{barber.name}</h3>
                      <Badge tone={barber.isActive ? "emerald" : "slate"}>
                        {barber.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                    <p className="font-sub text-[10px] tracking-[0.25em] uppercase text-gold">
                      {barber.title || "Uzman Berber"}
                    </p>
                    <p className="text-bone/60 text-sm leading-relaxed">{barber.bio || "-"}</p>
                    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                      <InfoPair label="Telefon" value={barber.phone || "-"} />
                      <InfoPair label="WhatsApp" value={barber.whatsappPhone || "-"} />
                      <InfoPair label="Sıralama" value={String(barber.sortOrder)} />
                      <InfoPair
                        label="Toplam Kazanç"
                        value={metrics ? formatPrice(metrics.totalRevenue) : "0 ₺"}
                      />
                    </div>
                  </div>

                  <div className="w-full lg:w-72 rounded-xl border border-border-soft/70 bg-navy p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <MetricTile label="Tamamlanan" value={metrics?.completedAppointments || 0} />
                      <MetricTile label="İptal" value={metrics?.cancelledAppointments || 0} />
                      <MetricTile label="Gelmedi" value={metrics?.noShowAppointments || 0} />
                      <MetricTile label="Oran" value={`${metrics?.completionRate || 0}%`} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => loadForm(barber)}
                        className="inline-flex items-center justify-center gap-2 border border-border-soft text-bone/75 font-sub text-[11px] tracking-[0.2em] uppercase px-3 py-3 rounded hover:border-gold hover:text-gold transition-colors"
                      >
                        <Pencil size={14} />
                        Düzenle
                      </button>
                      <button
                        onClick={() => {
                          void onToggle(barber);
                        }}
                        disabled={busyKey === `barber:${barber.id}:toggle`}
                        className="inline-flex items-center justify-center gap-2 border border-border-soft text-bone/75 font-sub text-[11px] tracking-[0.2em] uppercase px-3 py-3 rounded hover:border-gold hover:text-gold transition-colors disabled:opacity-40"
                      >
                        {barber.isActive ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                        {barber.isActive ? "Pasife Al" : "Aktifleştir"}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        void onDelete(barber.id);
                      }}
                      disabled={busyKey === `barber:${barber.id}:delete`}
                      className="w-full inline-flex items-center justify-center gap-2 bg-red-500/10 text-red-300 border border-red-500/20 font-sub text-[11px] tracking-[0.2em] uppercase px-4 py-3 rounded hover:bg-red-500/15 transition-colors disabled:opacity-40"
                    >
                      <Trash2 size={14} />
                      Sil
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </SectionPanel>
  );
}

function ServicesSection({
  services,
  busyKey,
  onSave,
  onToggle,
  onDelete,
}: {
  services: ServiceItem[];
  busyKey: string | null;
  onSave: (form: ServiceFormState) => Promise<boolean>;
  onToggle: (service: ServiceItem) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [form, setForm] = useState<ServiceFormState>(emptyServiceForm());

  return (
    <SectionPanel
      title="Hizmetler & Fiyatlar"
      description="Müşteriye gösterilen aktif hizmet kataloğu ve booking snapshot fiyatı bu listeden beslenir."
    >
      <div className="grid xl:grid-cols-[1.05fr_1.4fr] gap-6">
        <div className="rounded-2xl border border-border-soft bg-card-dark p-5 lg:p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="font-display text-2xl tracking-wider text-bone">
                {form.id ? "Hizmet Düzenle" : "Yeni Hizmet"}
              </p>
              <p className="text-bone/55 text-sm mt-2">
                Fiyat değişse bile eski booking dokümanları snapshot fiyatıyla kalır.
              </p>
            </div>
            {form.id ? (
              <button
                onClick={() => setForm(emptyServiceForm())}
                className="font-sub text-[10px] tracking-[0.2em] uppercase text-bone/55 hover:text-gold transition-colors"
              >
                Temizle
              </button>
            ) : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void onSave(form).then((saved) => {
                if (saved) {
                  setForm(emptyServiceForm());
                }
              });
            }}
            className="space-y-4"
          >
            <FieldBlock label="Hizmet Adı">
              <input
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
              />
            </FieldBlock>
            <FieldBlock label="Açıklama">
              <textarea
                rows={4}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone resize-none focus:outline-none focus:border-gold"
              />
            </FieldBlock>
            <div className="grid sm:grid-cols-3 gap-4">
              <FieldBlock label="Fiyat (₺)">
                <input
                  type="number"
                  value={form.price}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, price: event.target.value }))
                  }
                  className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
                />
              </FieldBlock>
              <FieldBlock label="Süre (dk)">
                <input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, durationMinutes: event.target.value }))
                  }
                  className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
                />
              </FieldBlock>
              <FieldBlock label="Sıralama">
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, sortOrder: event.target.value }))
                  }
                  className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
                />
              </FieldBlock>
            </div>
            <ToggleRow
              label="Aktif"
              description="Aktif olmayan hizmet booking modal içinde görünmez."
              checked={form.isActive}
              onChange={(checked) => setForm((current) => ({ ...current, isActive: checked }))}
            />
            <button
              type="submit"
              disabled={busyKey === `service:${form.id || "new"}:save`}
              className="w-full inline-flex items-center justify-center gap-2 bg-gold text-navy font-sub text-xs tracking-[0.25em] uppercase px-4 py-3 rounded hover:bg-gold-light transition-colors disabled:opacity-40"
            >
              <Save size={14} />
              {busyKey === `service:${form.id || "new"}:save` ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {services.map((service) => (
            <article
              key={service.id}
              className="rounded-2xl border border-border-soft bg-card-dark p-5 lg:p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-display text-2xl tracking-wider">{service.name}</h3>
                    <Badge tone={service.isActive ? "emerald" : "slate"}>
                      {service.isActive ? "Aktif" : "Pasif"}
                    </Badge>
                  </div>
                  <p className="text-bone/60 text-sm leading-relaxed">
                    {service.description || "-"}
                  </p>
                  <div className="grid sm:grid-cols-3 gap-3">
                    <InfoPair label="Fiyat" value={formatPrice(service.price)} />
                    <InfoPair label="Süre" value={`${service.durationMinutes} dk`} />
                    <InfoPair label="Sıralama" value={String(service.sortOrder)} />
                  </div>
                </div>

                <div className="w-full lg:w-72 rounded-xl border border-border-soft/70 bg-navy p-4 space-y-3">
                  <button
                    onClick={() => setForm(serviceToForm(service))}
                    className="w-full inline-flex items-center justify-center gap-2 border border-border-soft text-bone/75 font-sub text-[11px] tracking-[0.2em] uppercase px-3 py-3 rounded hover:border-gold hover:text-gold transition-colors"
                  >
                    <Pencil size={14} />
                    Düzenle
                  </button>
                  <button
                    onClick={() => {
                      void onToggle(service);
                    }}
                    disabled={busyKey === `service:${service.id}:toggle`}
                    className="w-full inline-flex items-center justify-center gap-2 border border-border-soft text-bone/75 font-sub text-[11px] tracking-[0.2em] uppercase px-3 py-3 rounded hover:border-gold hover:text-gold transition-colors disabled:opacity-40"
                  >
                    {service.isActive ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                    {service.isActive ? "Pasife Al" : "Aktifleştir"}
                  </button>
                  <button
                    onClick={() => {
                      void onDelete(service.id);
                    }}
                    disabled={busyKey === `service:${service.id}:delete`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-red-500/10 text-red-300 border border-red-500/20 font-sub text-[11px] tracking-[0.2em] uppercase px-4 py-3 rounded hover:bg-red-500/15 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                    Sil
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </SectionPanel>
  );
}

function AvailabilitySection({
  exceptions,
  barbers,
  busyKey,
  onSave,
  onDelete,
}: {
  exceptions: AvailabilityException[];
  barbers: Barber[];
  busyKey: string | null;
  onSave: (form: AvailabilityFormState) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const [form, setForm] = useState<AvailabilityFormState>(emptyAvailabilityForm());

  return (
    <SectionPanel
      title="Çalışma Takvimi"
      description="Tam gün kapatma, saat aralığı kapatma ve berber bazlı izin kayıtları Firestore üzerinden yönetilir."
    >
      <div className="grid xl:grid-cols-[1.05fr_1.4fr] gap-6">
        <div className="rounded-2xl border border-border-soft bg-card-dark p-5 lg:p-6">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <p className="font-display text-2xl tracking-wider text-bone">
                {form.id ? "Kayıt Düzenle" : "Yeni Kayıt"}
              </p>
              <p className="text-bone/55 text-sm mt-2">
                Kapalı günler tarihte disable olur, saat bazlı kapatmalar slot listesinden düşer.
              </p>
            </div>
            {form.id ? (
              <button
                onClick={() => setForm(emptyAvailabilityForm())}
                className="font-sub text-[10px] tracking-[0.2em] uppercase text-bone/55 hover:text-gold transition-colors"
              >
                Temizle
              </button>
            ) : null}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void onSave(form).then((saved) => {
                if (saved) {
                  setForm(emptyAvailabilityForm());
                }
              });
            }}
            className="space-y-4"
          >
            <FieldBlock label="Kayıt Tipi">
              <select
                value={form.type}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    type: event.target.value as AvailabilityExceptionType,
                    startTime: event.target.value === "custom_hours" ? current.startTime : "",
                    endTime: event.target.value === "custom_hours" ? current.endTime : "",
                  }))
                }
                className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
              >
                {AVAILABILITY_EXCEPTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {getExceptionTypeLabel(type)}
                  </option>
                ))}
              </select>
            </FieldBlock>
            <FieldBlock label="Başlık">
              <input
                value={form.title}
                onChange={(event) =>
                  setForm((current) => ({ ...current, title: event.target.value }))
                }
                className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
              />
            </FieldBlock>
            <FieldBlock label="Açıklama">
              <textarea
                rows={3}
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone resize-none focus:outline-none focus:border-gold"
              />
            </FieldBlock>
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldBlock label="Başlangıç Tarihi">
                <input
                  type="date"
                  value={form.startDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, startDate: event.target.value }))
                  }
                  className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
                />
              </FieldBlock>
              <FieldBlock label="Bitiş Tarihi">
                <input
                  type="date"
                  value={form.endDate}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, endDate: event.target.value }))
                  }
                  className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
                />
              </FieldBlock>
            </div>
            {form.type === "custom_hours" ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <FieldBlock label="Başlangıç Saati">
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, startTime: event.target.value }))
                    }
                    className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
                  />
                </FieldBlock>
                <FieldBlock label="Bitiş Saati">
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, endTime: event.target.value }))
                    }
                    className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
                  />
                </FieldBlock>
              </div>
            ) : null}
            <ToggleRow
              label="Tüm berberlere uygula"
              description="Kapalı gün veya saat aralığı tüm ekip için geçerli olsun."
              checked={form.appliesToAllBarbers}
              onChange={(checked) =>
                setForm((current) => ({
                  ...current,
                  appliesToAllBarbers: checked,
                  barberId: checked ? "" : current.barberId,
                }))
              }
            />
            {!form.appliesToAllBarbers ? (
              <FieldBlock label="Berber">
                <select
                  value={form.barberId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, barberId: event.target.value }))
                  }
                  className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
                >
                  <option value="">Berber seçin</option>
                  {barbers.map((barber) => (
                    <option key={barber.id} value={barber.id}>
                      {barber.name}
                    </option>
                  ))}
                </select>
              </FieldBlock>
            ) : null}
            <button
              type="submit"
              disabled={busyKey === `availability:${form.id || "new"}:save`}
              className="w-full inline-flex items-center justify-center gap-2 bg-gold text-navy font-sub text-xs tracking-[0.25em] uppercase px-4 py-3 rounded hover:bg-gold-light transition-colors disabled:opacity-40"
            >
              <Save size={14} />
              {busyKey === `availability:${form.id || "new"}:save` ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {exceptions.length === 0 ? (
            <EmptyState
              title="Takvim kaydı yok"
              description="İlk kapalı gün veya izin kaydını oluşturarak başlayın."
            />
          ) : null}

          {exceptions.map((exception) => (
            <article
              key={exception.id}
              className="rounded-2xl border border-border-soft bg-card-dark p-5 lg:p-6"
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-display text-2xl tracking-wider">{exception.title}</h3>
                    <Badge tone="gold">{getExceptionTypeLabel(exception.type)}</Badge>
                  </div>
                  <p className="text-bone/60 text-sm leading-relaxed">
                    {exception.description || "-"}
                  </p>
                  <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                    <InfoPair
                      label="Tarih Aralığı"
                      value={`${formatShortDate(exception.startDate)} - ${formatShortDate(exception.endDate)}`}
                    />
                    <InfoPair
                      label="Saat Aralığı"
                      value={
                        exception.type === "custom_hours"
                          ? `${exception.startTime} - ${exception.endTime}`
                          : "Tam gün"
                      }
                    />
                    <InfoPair
                      label="Kapsam"
                      value={
                        exception.appliesToAllBarbers
                          ? "Tüm berberler"
                          : barbers.find((barber) => barber.id === exception.barberId)?.name ||
                            "Özel"
                      }
                    />
                    <InfoPair label="Oluşturulma" value={formatTimestamp(exception.createdAt)} />
                  </div>
                </div>

                <div className="w-full lg:w-64 rounded-xl border border-border-soft/70 bg-navy p-4 space-y-3">
                  <button
                    onClick={() => setForm(exceptionToForm(exception))}
                    className="w-full inline-flex items-center justify-center gap-2 border border-border-soft text-bone/75 font-sub text-[11px] tracking-[0.2em] uppercase px-3 py-3 rounded hover:border-gold hover:text-gold transition-colors"
                  >
                    <Pencil size={14} />
                    Düzenle
                  </button>
                  <button
                    onClick={() => {
                      void onDelete(exception.id);
                    }}
                    disabled={busyKey === `availability:${exception.id}:delete`}
                    className="w-full inline-flex items-center justify-center gap-2 bg-red-500/10 text-red-300 border border-red-500/20 font-sub text-[11px] tracking-[0.2em] uppercase px-4 py-3 rounded hover:bg-red-500/15 transition-colors disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                    Sil
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </SectionPanel>
  );
}

function EarningsSection({
  earnings,
  performance,
}: {
  earnings: ReturnType<typeof buildEarningsSummary>;
  performance: ReturnType<typeof buildBarberPerformance>;
}) {
  return (
    <SectionPanel
      title="Kazanç"
      description="Sadece Tamamlandı durumundaki randevular kazanca dahil edilir ve snapshot fiyat kullanılır."
    >
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Coins size={16} />} label="Bugün" value={earnings.today} accent money />
        <StatCard
          icon={<CalendarDays size={16} />}
          label="Bu Hafta"
          value={earnings.thisWeek}
          money
        />
        <StatCard
          icon={<CalendarClock size={16} />}
          label="Bu Ay"
          value={earnings.thisMonth}
          money
        />
        <StatCard icon={<Store size={16} />} label="Tüm Zamanlar" value={earnings.allTime} money />
      </div>

      <div className="rounded-2xl border border-border-soft bg-card-dark overflow-hidden">
        <div className="px-5 lg:px-6 py-5 border-b border-border-soft">
          <h3 className="font-display text-2xl tracking-wider">Berber Performansı</h3>
        </div>
        <div className="divide-y divide-border-soft">
          {performance.map((item) => (
            <div
              key={item.barberId}
              className="px-5 lg:px-6 py-5 grid md:grid-cols-2 xl:grid-cols-6 gap-3 items-center"
            >
              <InfoPair label="Berber" value={item.barberName} />
              <InfoPair label="Toplam Randevu" value={String(item.totalAppointments)} />
              <InfoPair label="Tamamlanan" value={String(item.completedAppointments)} />
              <InfoPair
                label="İptal / Gelmedi"
                value={`${item.cancelledAppointments} / ${item.noShowAppointments}`}
              />
              <InfoPair label="Kazanç" value={formatPrice(item.totalRevenue)} />
              <InfoPair label="Tamamlama Oranı" value={`${item.completionRate}%`} />
            </div>
          ))}
        </div>
      </div>
    </SectionPanel>
  );
}

function SettingsSection({
  settings,
  authMode,
  loggedInAt,
  busyKey,
  onSave,
}: {
  settings: AppSettings;
  authMode: string;
  loggedInAt?: string;
  busyKey: string | null;
  onSave: (form: SettingsFormState) => Promise<boolean>;
}) {
  const [form, setForm] = useState<SettingsFormState>(() => settingsToForm(settings));

  useEffect(() => {
    setForm(settingsToForm(settings));
  }, [settings]);

  return (
    <SectionPanel
      title="Ayarlar"
      description="İşletme kimliği, ana WhatsApp ve çalışma saatleri hem landing page hem booking akışında kullanılır."
    >
      <div className="grid xl:grid-cols-[1.05fr_1fr] gap-6">
        <div className="rounded-2xl border border-border-soft bg-card-dark p-5 lg:p-6">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void onSave(form);
            }}
            className="space-y-4"
          >
            <FieldBlock label="İşletme Adı">
              <input
                value={form.businessName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, businessName: event.target.value }))
                }
                className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
              />
            </FieldBlock>
            <FieldBlock label="Ana WhatsApp">
              <input
                value={form.mainWhatsappNumber}
                onChange={(event) =>
                  setForm((current) => ({ ...current, mainWhatsappNumber: event.target.value }))
                }
                className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
              />
            </FieldBlock>
            <FieldBlock label="Adres">
              <input
                value={form.address}
                onChange={(event) =>
                  setForm((current) => ({ ...current, address: event.target.value }))
                }
                className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
              />
            </FieldBlock>
            <FieldBlock label="Instagram URL">
              <input
                value={form.instagramUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, instagramUrl: event.target.value }))
                }
                className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone focus:outline-none focus:border-gold"
              />
            </FieldBlock>
            <FieldBlock label="Çalışma Saatleri">
              <textarea
                rows={5}
                value={form.workingHours}
                onChange={(event) =>
                  setForm((current) => ({ ...current, workingHours: event.target.value }))
                }
                className="w-full bg-navy border border-border-soft rounded-md px-4 py-3 text-bone resize-none focus:outline-none focus:border-gold"
              />
            </FieldBlock>
            <button
              type="submit"
              disabled={busyKey === "settings:save"}
              className="w-full inline-flex items-center justify-center gap-2 bg-gold text-navy font-sub text-xs tracking-[0.25em] uppercase px-4 py-3 rounded hover:bg-gold-light transition-colors disabled:opacity-40"
            >
              <Save size={14} />
              {busyKey === "settings:save" ? "Kaydediliyor..." : "Ayarları Kaydet"}
            </button>
          </form>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border-soft bg-card-dark p-5 lg:p-6">
            <h3 className="font-display text-2xl tracking-wider mb-4">Canlı Kullanım</h3>
            <div className="space-y-3">
              <InfoPair label="Business Name" value={settings.businessName} />
              <InfoPair label="WhatsApp" value={settings.mainWhatsappNumber} />
              <InfoPair label="Adres" value={settings.address} />
              <InfoPair label="Instagram" value={settings.instagramUrl || "-"} />
            </div>
          </div>

          <div className="rounded-2xl border border-border-soft bg-card-dark p-5 lg:p-6">
            <h3 className="font-display text-2xl tracking-wider mb-4">Güvenlik Durumu</h3>
            <div className="space-y-3">
              <InfoPair label="Admin Erişimi" value="Server-side session" />
              <InfoPair label="Cookie" value="HttpOnly / SameSite=Strict" />
              <InfoPair label="Auth Mode" value={authMode} />
              <InfoPair label="Son Giriş" value={formatTimestamp(loggedInAt)} />
            </div>
          </div>
        </div>
      </div>
    </SectionPanel>
  );
}

function SectionPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-6">
        <h2 className="font-display text-4xl tracking-wider text-bone">{title}</h2>
        <p className="text-bone/60 mt-3 max-w-3xl">{description}</p>
      </div>
      {children}
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent = false,
  money = false,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  accent?: boolean;
  money?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        accent ? "bg-gold/10 border-gold/30" : "bg-card-dark border-border-soft"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={`w-9 h-9 rounded-full flex items-center justify-center ${
            accent ? "bg-gold text-navy" : "bg-navy text-gold"
          }`}
        >
          {icon}
        </span>
        <span
          className={`font-display text-2xl tracking-wider ${accent ? "text-gold" : "text-bone"}`}
        >
          {money ? formatPrice(value) : value}
        </span>
      </div>
      <p className="font-sub text-[10px] tracking-[0.25em] uppercase text-bone/60">{label}</p>
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border-soft bg-card-dark px-3 py-3">
      <p className="font-display text-xl tracking-wider text-bone">{value}</p>
      <p className="font-sub text-[10px] tracking-[0.2em] uppercase text-bone/50 mt-1">{label}</p>
    </div>
  );
}

function FieldBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="font-sub text-[10px] tracking-[0.25em] uppercase text-bone/55 mb-2 inline-block">
        {label}
      </span>
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-border-soft bg-navy px-4 py-4 flex items-center justify-between gap-4">
      <div>
        <p className="font-sub text-[10px] tracking-[0.25em] uppercase text-bone">{label}</p>
        <p className="text-bone/55 text-sm mt-1">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-14 h-8 rounded-full transition-colors relative ${
          checked ? "bg-gold" : "bg-border-soft"
        }`}
      >
        <span
          className={`absolute top-1 w-6 h-6 rounded-full bg-navy transition-transform ${
            checked ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

function Badge({ children, tone }: { children: ReactNode; tone: "gold" | "emerald" | "slate" }) {
  const toneClass =
    tone === "gold"
      ? "bg-gold/10 text-gold border-gold/20"
      : tone === "emerald"
        ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/20"
        : "bg-bone/10 text-bone/70 border-border-soft";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 font-sub text-[10px] tracking-[0.2em] uppercase ${toneClass}`}
    >
      {children}
    </span>
  );
}

function InfoPair({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <p className="font-sub text-[10px] tracking-[0.25em] uppercase text-bone/45">{label}</p>
      <p className={`text-sm mt-1 ${muted ? "text-bone/45" : "text-bone"}`}>{value}</p>
    </div>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border-soft bg-card-dark/50 p-10 text-center">
      <p className="font-display text-2xl tracking-wider text-bone">{title}</p>
      <p className="text-bone/55 mt-3">{description}</p>
    </div>
  );
}
