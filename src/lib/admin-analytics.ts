import {
  getBookingRevenue,
  getBookingDurationMinutes,
  isRevenueBooking,
  type Barber,
  type Booking,
} from "./booking-domain";

export type EarningsSummary = {
  today: number;
  thisWeek: number;
  thisMonth: number;
  allTime: number;
};

export type BarberPerformance = {
  barberId: string;
  barberName: string;
  totalAppointments: number;
  completedAppointments: number;
  cancelledAppointments: number;
  noShowAppointments: number;
  totalRevenue: number;
  completionRate: number;
};

function startOfDay(date: Date): Date {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function startOfWeek(date: Date): Date {
  const value = startOfDay(date);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function parseBookingDate(booking: Booking): Date | null {
  if (!booking.date) return null;
  const parsed = new Date(`${booking.date}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildEarningsSummary(bookings: Booking[], now = new Date()): EarningsSummary {
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);

  const summary: EarningsSummary = {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    allTime: 0,
  };

  for (const booking of bookings) {
    if (!isRevenueBooking(booking.status)) continue;

    const bookingDate = parseBookingDate(booking);
    const revenue = getBookingRevenue(booking);
    summary.allTime += revenue;

    if (!bookingDate) continue;

    if (bookingDate >= monthStart) {
      summary.thisMonth += revenue;
    }

    if (bookingDate >= weekStart) {
      summary.thisWeek += revenue;
    }

    if (bookingDate >= todayStart && bookingDate < tomorrowStart) {
      summary.today += revenue;
    }
  }

  return summary;
}

export function buildBarberPerformance(
  bookings: Booking[],
  barbers: Barber[],
): BarberPerformance[] {
  const performanceByKey = new Map<string, BarberPerformance>();

  for (const barber of barbers) {
    performanceByKey.set(barber.id, {
      barberId: barber.id,
      barberName: barber.name,
      totalAppointments: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
      noShowAppointments: 0,
      totalRevenue: 0,
      completionRate: 0,
    });
  }

  for (const booking of bookings) {
    const barberKey = booking.barberId || booking.barberName || booking.barber || "unknown";
    const barberName = booking.barberName || booking.barber || "Bilinmiyor";
    const current = performanceByKey.get(barberKey) ?? {
      barberId: barberKey,
      barberName,
      totalAppointments: 0,
      completedAppointments: 0,
      cancelledAppointments: 0,
      noShowAppointments: 0,
      totalRevenue: 0,
      completionRate: 0,
    };

    current.totalAppointments += 1;

    if (booking.status === "Tamamlandı") {
      current.completedAppointments += 1;
      current.totalRevenue += getBookingRevenue(booking);
    } else if (booking.status === "İptal") {
      current.cancelledAppointments += 1;
    } else if (booking.status === "Gelmedi") {
      current.noShowAppointments += 1;
    }

    performanceByKey.set(barberKey, current);
  }

  return Array.from(performanceByKey.values())
    .map((row) => ({
      ...row,
      completionRate:
        row.totalAppointments > 0
          ? Math.round((row.completedAppointments / row.totalAppointments) * 100)
          : 0,
    }))
    .sort((left, right) => {
      if (left.totalRevenue !== right.totalRevenue) {
        return right.totalRevenue - left.totalRevenue;
      }
      return left.barberName.localeCompare(right.barberName, "tr");
    });
}

export function buildAppointmentStats(bookings: Booking[], now = new Date()) {
  const todayKey = startOfDay(now).toISOString().slice(0, 10);

  return {
    total: bookings.length,
    today: bookings.filter((booking) => booking.date === todayKey).length,
    pending: bookings.filter((booking) => booking.status === "Bekliyor").length,
    confirmed: bookings.filter((booking) => booking.status === "Onaylandı").length,
    completed: bookings.filter((booking) => booking.status === "Tamamlandı").length,
    noShow: bookings.filter((booking) => booking.status === "Gelmedi").length,
  };
}

export function getBookingDurationLabel(booking: Booking): string {
  const duration = getBookingDurationMinutes(booking);
  return `${duration} dk`;
}
