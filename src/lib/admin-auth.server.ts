import {
  clearSession,
  getRequestHeader,
  getSession,
  setResponseHeader,
  updateSession,
} from "@tanstack/react-start/server";
import { isProductionServer, requireServerEnv } from "./env.server";

const SESSION_COOKIE_NAME = "okan-admin-session";
const SESSION_MAX_AGE = 60 * 60 * 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_SECONDS = 5 * 60;

type AdminSessionData = {
  isAdmin: true;
  loggedInAt: string;
};

type AttemptState = {
  attempts: number;
  lockedUntil: number;
};

const loginAttempts = new Map<string, AttemptState>();

function getAdminLoginPassword(): string {
  const password = requireServerEnv("ADMIN_LOGIN_PASSWORD");

  if (isProductionServer() && password === "okan2025") {
    throw new Error("ADMIN_LOGIN_PASSWORD must be rotated before production deployment.");
  }

  return password;
}

function getSessionConfig() {
  return {
    password: requireServerEnv("SESSION_SECRET"),
    name: SESSION_COOKIE_NAME,
    maxAge: SESSION_MAX_AGE,
    cookie: {
      httpOnly: true,
      path: "/",
      sameSite: "strict" as const,
      secure: isProductionServer(),
    },
  };
}

function getClientKey(): string {
  const cfIp = getRequestHeader("cf-connecting-ip");
  if (cfIp) return cfIp;

  const forwardedFor = getRequestHeader("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return "unknown";
}

function clearAttempts(clientKey: string) {
  loginAttempts.delete(clientKey);
}

function readAttempts(clientKey: string): AttemptState {
  const current = loginAttempts.get(clientKey);
  if (!current) return { attempts: 0, lockedUntil: 0 };

  if (current.lockedUntil > 0 && current.lockedUntil <= Date.now()) {
    loginAttempts.delete(clientKey);
    return { attempts: 0, lockedUntil: 0 };
  }

  return current;
}

function registerFailedAttempt(clientKey: string) {
  const current = readAttempts(clientKey);
  const nextAttempts = current.attempts + 1;

  if (nextAttempts >= MAX_LOGIN_ATTEMPTS) {
    const lockedUntil = Date.now() + LOCK_SECONDS * 1000;
    loginAttempts.set(clientKey, { attempts: 0, lockedUntil });
    return { locked: true, retryAfter: LOCK_SECONDS };
  }

  loginAttempts.set(clientKey, { attempts: nextAttempts, lockedUntil: 0 });
  return {
    locked: false,
    remainingAttempts: MAX_LOGIN_ATTEMPTS - nextAttempts,
  };
}

export async function getAdminSessionSnapshot() {
  setResponseHeader("cache-control", "no-store");
  const session = await getSession<AdminSessionData>(getSessionConfig());

  return {
    authenticated: session.data?.isAdmin === true,
    loggedInAt: session.data?.loggedInAt,
  };
}

export async function requireAdminSession() {
  const snapshot = await getAdminSessionSnapshot();
  if (!snapshot.authenticated) {
    throw new Error("Unauthorized");
  }
  return snapshot;
}

export async function performAdminLogin(password: string) {
  setResponseHeader("cache-control", "no-store");
  const clientKey = getClientKey();
  const attempts = readAttempts(clientKey);

  if (attempts.lockedUntil > Date.now()) {
    return {
      ok: false as const,
      error: `Çok fazla deneme. ${Math.ceil((attempts.lockedUntil - Date.now()) / 1000)} saniye bekleyin.`,
      retryAfter: Math.ceil((attempts.lockedUntil - Date.now()) / 1000),
    };
  }

  const expectedPassword = getAdminLoginPassword();
  if (password !== expectedPassword) {
    const result = registerFailedAttempt(clientKey);
    if (result.locked) {
      return {
        ok: false as const,
        error: `Çok fazla deneme. ${result.retryAfter} saniye bekleyin.`,
        retryAfter: result.retryAfter,
      };
    }

    return {
      ok: false as const,
      error: `Hatalı şifre. (${result.remainingAttempts} deneme kaldı)`,
      remainingAttempts: result.remainingAttempts,
    };
  }

  clearAttempts(clientKey);
  await updateSession<AdminSessionData>(getSessionConfig(), {
    isAdmin: true,
    loggedInAt: new Date().toISOString(),
  });

  return { ok: true as const };
}

export async function performAdminLogout() {
  setResponseHeader("cache-control", "no-store");
  await clearSession(getSessionConfig());
}
