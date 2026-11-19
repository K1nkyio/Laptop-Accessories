import { apiRequest } from "@/lib/api";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
}

interface AuthResponse {
  user: AuthUser;
  token?: string;
}

const AUTH_STORAGE_KEY = "stacked-auth";
let legacyCustomerToken: string | null = null;

export function getStoredAuth(): AuthResponse | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const auth = JSON.parse(raw) as AuthResponse;
    if (auth.token) {
      if (isTokenExpired(auth.token)) {
        clearAuth();
        return null;
      }
      legacyCustomerToken = auth.token;
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: auth.user }));
      return auth;
    }

    return auth;
  } catch (_error) {
    return null;
  }
}

export function storeAuth(auth: AuthResponse) {
  legacyCustomerToken = null;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user: auth.user }));
  window.dispatchEvent(new Event("stacked-auth-change"));
}

export function clearAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
  legacyCustomerToken = null;
  window.dispatchEvent(new Event("stacked-auth-change"));
  void apiRequest<{ ok: true }>("/api/auth/logout", { method: "POST" }).catch(() => {});
}

export function registerAccount(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}) {
  return apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginAccount(input: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function loginWithGoogle(credential: string) {
  return apiRequest<AuthResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export function requestPasswordReset(email: string) {
  return apiRequest<{ ok: true; message: string; resetToken?: string }>("/api/auth/password-reset/request", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function confirmPasswordReset(input: { token: string; password: string }) {
  return apiRequest<{ ok: true }>("/api/auth/password-reset/confirm", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchCurrentUser(token?: string) {
  const legacyToken = token ?? legacyCustomerToken;
  if (legacyToken) {
    await apiRequest<{ ok: true }>("/api/auth/session/exchange", {
      method: "POST",
      headers: { Authorization: `Bearer ${legacyToken}` },
    });
    legacyCustomerToken = null;
  }
  return apiRequest<{ user: AuthUser }>("/api/auth/me");
}

function isTokenExpired(token: string) {
  try {
    const [, payload] = token.split(".");
    const decoded = JSON.parse(window.atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    return typeof decoded.exp !== "number" || decoded.exp * 1000 <= Date.now();
  } catch (_error) {
    return true;
  }
}
