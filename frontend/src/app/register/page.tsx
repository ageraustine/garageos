"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Container, Button, CheckIcon } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp } from "@/lib/animations";

// Debounce hook for name availability check
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 text-navy-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

// X icon for unavailable
function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    chainName: "",
    displayName: "",
    ownerName: "",
    phone: "",
    email: "",
    pin: "",
    confirmPin: "",
  });

  const [registrationSuccess, setRegistrationSuccess] = useState<{
    success: boolean;
    email: string;
  } | null>(null);

  const [nameStatus, setNameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    suggestion: string | null;
  }>({ checking: false, available: null, suggestion: null });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) router.push("/dashboard");
  }, [isAuthenticated, router]);

  // Debounced name for availability check
  const debouncedName = useDebounce(form.chainName, 300);

  // Check name availability
  useEffect(() => {
    if (debouncedName.length >= 3) {
      setNameStatus((s) => ({ ...s, checking: true }));
      api.auth
        .checkName(debouncedName)
        .then((res) => {
          setNameStatus({
            checking: false,
            available: res.available,
            suggestion: res.suggestion,
          });
        })
        .catch(() => {
          setNameStatus({ checking: false, available: null, suggestion: null });
        });
    } else {
      setNameStatus({ checking: false, available: null, suggestion: null });
    }
  }, [debouncedName]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (form.pin !== form.confirmPin) {
      setError("PINs do not match");
      return;
    }
    if (form.pin.length < 4 || form.pin.length > 6) {
      setError("PIN must be 4-6 digits");
      return;
    }
    if (form.chainName.length < 3) {
      setError("Garage handle must be at least 3 characters");
      return;
    }
    if (!form.email || !form.email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      // Check availability inline if not already confirmed
      let isAvailable = nameStatus.available;
      if (isAvailable !== true) {
        const res = await api.auth.checkName(form.chainName);
        isAvailable = res.available;
        setNameStatus({
          checking: false,
          available: res.available,
          suggestion: res.suggestion,
        });
      }

      if (!isAvailable) {
        setError("Please choose an available garage name");
        setIsSubmitting(false);
        return;
      }

      // Register - this now returns a message, not tokens
      const response = await api.auth.register({
        chain_name: form.chainName.toLowerCase(),
        display_name: form.displayName,
        owner_name: form.ownerName,
        phone: form.phone,
        email: form.email.toLowerCase(),
        pin: form.pin,
      });

      // Show success message instead of redirecting
      setRegistrationSuccess({
        success: true,
        email: response.email,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <div className="min-h-screen bg-navy-50 py-12">
        <Container className="max-w-md">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="bg-white rounded-2xl shadow-xl p-8 border border-navy-100 text-center"
          >
            {/* Success Icon */}
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-navy-900 mb-2">
              Check Your Email
            </h1>
            <p className="text-navy-600 mb-6">
              We&apos;ve sent a verification link to:
            </p>
            <p className="text-lg font-medium text-gold-600 mb-6">
              {registrationSuccess.email}
            </p>
            <p className="text-sm text-navy-500 mb-8">
              Click the link in the email to verify your account and start using GarageOS.
              The link will expire in 24 hours.
            </p>

            <div className="space-y-4">
              <Link href="/login">
                <Button variant="primary" size="lg" className="w-full">
                  Go to Login
                </Button>
              </Link>
              <button
                type="button"
                onClick={() => {
                  api.auth.resendVerification(registrationSuccess.email);
                  alert("Verification email resent!");
                }}
                className="text-sm text-gold-600 hover:text-gold-700 font-medium"
              >
                Didn&apos;t receive the email? Resend
              </button>
            </div>
          </motion.div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-50 py-12">
      <Container className="max-w-md">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="bg-white rounded-2xl shadow-xl p-8 border border-navy-100"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center">
              <span className="text-navy-900 font-bold text-xl">G</span>
            </div>
            <span className="text-xl font-bold text-navy-900">GarageOS</span>
          </Link>

          <h1 className="text-2xl font-bold text-navy-900 mb-2">
            Register Your Garage
          </h1>
          <p className="text-navy-600 mb-8">
            Create your account to start managing your garage chain
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Garage Handle (slug) */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Garage Handle
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-navy-400 font-medium">
                  @
                </span>
                <input
                  type="text"
                  value={form.chainName}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      chainName: e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9-]/g, ""),
                    }))
                  }
                  className="w-full pl-10 pr-12 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                  placeholder="my-garage"
                  maxLength={30}
                />
                {/* Status indicator */}
                <span className="absolute right-4 top-1/2 -translate-y-1/2">
                  {nameStatus.checking && <LoadingSpinner />}
                  {nameStatus.available === true && (
                    <CheckIcon className="text-green-500" size={20} />
                  )}
                  {nameStatus.available === false && (
                    <XIcon className="text-red-500" />
                  )}
                </span>
              </div>
              {nameStatus.available === false && nameStatus.suggestion && (
                <p className="mt-2 text-sm text-navy-500">
                  That name is taken. Try:{" "}
                  <button
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        chainName: nameStatus.suggestion!,
                      }))
                    }
                    className="text-gold-600 hover:text-gold-700 font-medium hover:underline"
                  >
                    @{nameStatus.suggestion}
                  </button>
                </p>
              )}
              {form.chainName.length > 0 && form.chainName.length < 3 && (
                <p className="mt-2 text-sm text-navy-400">
                  At least 3 characters required
                </p>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Garage Display Name
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, displayName: e.target.value }))
                }
                className="w-full px-4 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                placeholder="My Awesome Garage"
                maxLength={100}
              />
            </div>

            {/* Owner Name */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={form.ownerName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, ownerName: e.target.value }))
                }
                className="w-full px-4 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                placeholder="John Doe"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="w-full px-4 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                placeholder="you@example.com"
              />
              <p className="mt-1 text-xs text-navy-400">
                We&apos;ll send a verification link to this address
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                className="w-full px-4 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                placeholder="+254712345678"
              />
              <p className="mt-1 text-xs text-navy-400">
                Used for login - enter with country code
              </p>
            </div>

            {/* PIN */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">
                  PIN (4-6 digits)
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.pin}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      pin: e.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                  className="w-full px-4 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all text-center text-2xl tracking-[0.3em] font-mono"
                  maxLength={6}
                  placeholder="****"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">
                  Confirm PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={form.confirmPin}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      confirmPin: e.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                  className="w-full px-4 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all text-center text-2xl tracking-[0.3em] font-mono"
                  maxLength={6}
                  placeholder="****"
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-sm bg-red-50 p-3 rounded-lg"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <p className="mt-8 text-center text-navy-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-gold-600 hover:text-gold-700 font-medium hover:underline"
            >
              Log in
            </Link>
          </p>
        </motion.div>
      </Container>
    </div>
  );
}
