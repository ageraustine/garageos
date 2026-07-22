"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Container, Button } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp } from "@/lib/animations";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, isLoading } = useAuth();

  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionExpired = searchParams.get("expired") === "true";

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) router.push("/dashboard");
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(phone, pin);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-50">
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
            Welcome Back
          </h1>
          <p className="text-navy-600 mb-6">
            Enter your phone number and PIN to continue
          </p>

          {sessionExpired && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg"
            >
              <p className="text-amber-800 text-sm font-medium">
                Your session has expired. Please log in again.
              </p>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                placeholder="+254712345678"
                autoComplete="tel"
              />
            </div>

            {/* PIN */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                PIN
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
                autoComplete="current-password"
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
              {isSubmitting ? "Logging in..." : "Log In"}
            </Button>
          </form>

          <p className="mt-8 text-center text-navy-500">
            New to GarageOS?{" "}
            <Link
              href="/register"
              className="text-gold-600 hover:text-gold-700 font-medium hover:underline"
            >
              Create an account
            </Link>
          </p>
        </motion.div>
      </Container>
    </div>
  );
}
