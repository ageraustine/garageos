"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Container, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp } from "@/lib/animations";

export default function RegisterSellerPage() {
  const router = useRouter();
  const { isAuthenticated, refreshUser } = useAuth();

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    city: "",
    whatsapp: "",
    pin: "",
    confirmPin: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) router.push("/dashboard/marketplace");
  }, [isAuthenticated, router]);

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
    if (form.name.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }
    if (!form.phone) {
      setError("Phone number is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.auth.registerSeller({
        name: form.name,
        phone: form.phone,
        pin: form.pin,
        email: form.email || undefined,
        city: form.city || undefined,
        whatsapp: form.whatsapp || undefined,
      });

      // Store tokens
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);

      // Refresh user state
      await refreshUser();

      router.push("/dashboard/marketplace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Become a Seller
          </h1>
          <p className="text-navy-600 mb-8">
            Create your seller account to list spare parts on the marketplace
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Your Name / Business Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                className="w-full px-4 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                placeholder="John's Auto Parts"
                maxLength={100}
                required
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Phone Number *
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                className="w-full px-4 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                placeholder="+254712345678"
                required
              />
              <p className="mt-1 text-xs text-navy-400">
                Used for login - enter with country code
              </p>
            </div>

            {/* Email (optional) */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Email (optional)
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                className="w-full px-4 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                placeholder="john@example.com"
              />
            </div>

            {/* City (optional) */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                City / Location (optional)
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) =>
                  setForm((f) => ({ ...f, city: e.target.value }))
                }
                className="w-full px-4 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                placeholder="Nairobi"
                maxLength={100}
              />
            </div>

            {/* WhatsApp (optional) */}
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                WhatsApp Number (optional)
              </label>
              <input
                type="tel"
                value={form.whatsapp}
                onChange={(e) =>
                  setForm((f) => ({ ...f, whatsapp: e.target.value }))
                }
                className="w-full px-4 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                placeholder="+254712345678"
              />
              <p className="mt-1 text-xs text-navy-400">
                Buyers can contact you via WhatsApp
              </p>
            </div>

            {/* PIN */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">
                  PIN (4-6 digits) *
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
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-2">
                  Confirm PIN *
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
                  required
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
              {isSubmitting ? "Creating Account..." : "Create Seller Account"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-navy-100">
            <p className="text-center text-navy-500 mb-4">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-gold-600 hover:text-gold-700 font-medium hover:underline"
              >
                Log in
              </Link>
            </p>
            <p className="text-center text-navy-500">
              Own a garage?{" "}
              <Link
                href="/register"
                className="text-gold-600 hover:text-gold-700 font-medium hover:underline"
              >
                Register your garage instead
              </Link>
            </p>
          </div>
        </motion.div>
      </Container>
    </div>
  );
}
