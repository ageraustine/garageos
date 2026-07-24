"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Container, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      router.push("/forgot-password");
    }
  }, [token, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (pin.length < 4 || pin.length > 6) {
      setError("PIN must be 4-6 digits");
      return;
    }

    if (pin !== confirmPin) {
      setError("PINs do not match");
      return;
    }

    if (!token) {
      setError("Invalid reset link");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.auth.resetPassword(token, pin);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset PIN");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-navy-50 py-12 flex items-center">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-navy-900 mb-2">
              PIN Reset Successfully
            </h1>
            <p className="text-navy-600 mb-8">
              Your PIN has been updated. You can now log in with your new PIN.
            </p>

            <Link href="/login">
              <Button variant="primary" size="lg" className="w-full">
                Log In
              </Button>
            </Link>
          </motion.div>
        </Container>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-navy-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-50 py-12 flex items-center">
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
            Set New PIN
          </h1>
          <p className="text-navy-600 mb-6">
            Enter your new 4-6 digit PIN below.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                New PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(e) =>
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="w-full px-4 py-4 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all text-center text-3xl tracking-[0.5em] font-mono"
                placeholder="****"
                maxLength={6}
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Confirm New PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={confirmPin}
                onChange={(e) =>
                  setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="w-full px-4 py-4 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all text-center text-3xl tracking-[0.5em] font-mono"
                placeholder="****"
                maxLength={6}
                autoComplete="new-password"
              />
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
              {isSubmitting ? "Resetting..." : "Reset PIN"}
            </Button>
          </form>

          <p className="mt-8 text-center text-navy-500">
            Remember your PIN?{" "}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-navy-50 flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
