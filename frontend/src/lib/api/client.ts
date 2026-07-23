// API client core - request function and auth helpers

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface ApiError {
  detail: string;
}

// Event for triggering logout across the app
export const AUTH_LOGOUT_EVENT = "auth:logout";

// Session configuration
export const SESSION_CONFIG = {
  // How often to refresh the token (5 minutes)
  REFRESH_INTERVAL_MS: 5 * 60 * 1000,
  // How long before considering user idle (30 minutes)
  IDLE_TIMEOUT_MS: 30 * 60 * 1000,
};

export function triggerLogout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
  }
}

// Track if we're currently refreshing to prevent multiple refresh attempts
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

export async function refreshToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return false;

  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refresh }),
      });

      if (!response.ok) {
        return false;
      }

      const tokens = await response.json();
      localStorage.setItem("access_token", tokens.access_token);
      localStorage.setItem("refresh_token", tokens.refresh_token);
      return true;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  skipAuth = false
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && !skipAuth && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized - try to refresh token
  if (response.status === 401 && !skipAuth) {
    const refreshed = await refreshToken();

    if (refreshed) {
      // Retry the request with new token
      const newToken = localStorage.getItem("access_token");
      const retryHeaders: HeadersInit = {
        "Content-Type": "application/json",
        ...(newToken && { Authorization: `Bearer ${newToken}` }),
        ...options.headers,
      };

      const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: retryHeaders,
      });

      if (retryResponse.ok) {
        if (retryResponse.status === 204 || retryResponse.headers.get("content-length") === "0") {
          return undefined as T;
        }
        return retryResponse.json();
      }

      // If retry also fails with 401, logout
      if (retryResponse.status === 401) {
        triggerLogout();
        throw new Error("Session expired. Please login again.");
      }

      const error: ApiError = await retryResponse.json().catch(() => ({
        detail: "Request failed",
      }));
      throw new Error(error.detail || "Request failed");
    } else {
      // Refresh failed, logout
      triggerLogout();
      throw new Error("Session expired. Please login again.");
    }
  }

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      detail: "Request failed",
    }));
    throw new Error(error.detail || "Request failed");
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }

  return response.json();
}

// Helper to get auth token for direct fetch calls
export function getAuthToken(): string | null {
  return typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
}
