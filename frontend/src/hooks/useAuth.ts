"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  AUTH_LOGOUT_EVENT,
  SESSION_CONFIG,
  refreshToken,
  triggerLogout,
  type RegisterData,
  type RegisterResponse,
  type UserResponse,
} from "@/lib/api";
import type { User, AuthState } from "@/lib/auth-types";

export function useAuth(): AuthState & {
  login: (phone: string, pin: string) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<RegisterResponse>;
  refreshUser: () => Promise<void>;
} {
  const router = useRouter();
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Track last user activity
  const lastActivityRef = useRef<number>(Date.now());

  // Listen for logout events (e.g., token expiration)
  useEffect(() => {
    const handleLogout = () => {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      router.push("/login?expired=true");
    };

    window.addEventListener(AUTH_LOGOUT_EVENT, handleLogout);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handleLogout);
  }, [router]);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    // Track various user interactions
    const events = ["mousedown", "keydown", "touchstart", "scroll", "mousemove"];

    // Throttle mousemove to avoid excessive updates
    let mouseMoveTimeout: NodeJS.Timeout | null = null;
    const throttledMouseMove = () => {
      if (!mouseMoveTimeout) {
        mouseMoveTimeout = setTimeout(() => {
          updateActivity();
          mouseMoveTimeout = null;
        }, 1000);
      }
    };

    events.forEach((event) => {
      if (event === "mousemove") {
        window.addEventListener(event, throttledMouseMove);
      } else {
        window.addEventListener(event, updateActivity);
      }
    });

    return () => {
      events.forEach((event) => {
        if (event === "mousemove") {
          window.removeEventListener(event, throttledMouseMove);
        } else {
          window.removeEventListener(event, updateActivity);
        }
      });
      if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
    };
  }, []);

  // Proactive token refresh while user is active
  useEffect(() => {
    const checkAndRefresh = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const timeSinceActivity = Date.now() - lastActivityRef.current;

      // If user has been idle for too long, log them out
      if (timeSinceActivity > SESSION_CONFIG.IDLE_TIMEOUT_MS) {
        triggerLogout();
        return;
      }

      // User is active, refresh the token
      const success = await refreshToken();
      if (!success) {
        // Refresh failed, log out
        triggerLogout();
      }
    };

    // Initial check after a short delay
    const initialTimeout = setTimeout(checkAndRefresh, 10000);

    // Set up interval for periodic refresh
    const interval = setInterval(checkAndRefresh, SESSION_CONFIG.REFRESH_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, []);

  // Check auth on mount (use silent version to avoid triggering logout events)
  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (token) {
      api.auth
        .meSilent()
        .then((userData: UserResponse) => {
          const user: User = {
            ...userData,
            role: userData.role as User["role"],
          };
          setState({ user, isLoading: false, isAuthenticated: true });
        })
        .catch(() => {
          // Silently clear invalid tokens without triggering logout redirect
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          setState({ user: null, isLoading: false, isAuthenticated: false });
        });
    } else {
      setState({ user: null, isLoading: false, isAuthenticated: false });
    }
  }, []);

  const login = useCallback(async (phone: string, pin: string) => {
    const tokens = await api.auth.login(phone, pin);
    localStorage.setItem("access_token", tokens.access_token);
    localStorage.setItem("refresh_token", tokens.refresh_token);

    // Reset activity timestamp on login
    lastActivityRef.current = Date.now();

    const userData = await api.auth.me();
    const user: User = {
      ...userData,
      role: userData.role as User["role"],
    };
    setState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<RegisterResponse> => {
    // Registration now returns a message to check email, not tokens
    // User must verify email before they can log in
    const response = await api.auth.register(data);
    return response;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  const refreshUser = useCallback(async () => {
    const userData = await api.auth.me();
    const user: User = {
      ...userData,
      role: userData.role as User["role"],
    };
    setState({ user, isLoading: false, isAuthenticated: true });
  }, []);

  return { ...state, login, logout, register, refreshUser };
}
