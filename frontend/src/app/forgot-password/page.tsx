"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Container, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.auth.forgotPassword(email);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reset email");
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>

            <h1 className="text-2xl font-bold text-navy-900 mb-2">
              Check Your Email
            </h1>
            <p className="text-navy-600 mb-6">
              If an account exists with <span className="font-medium text-gold-600">{email}</span>, we&apos;ve sent a link to reset your PIN.
            </p>
            <p className="text-sm text-navy-500 mb-8">
              The link will expire in 1 hour.
            </p>

            <Link href="/login">
              <Button variant="primary" size="lg" className="w-full">
                Back to Login
              </Button>
            </Link>
          </motion.div>
        </Container>
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
            Forgot Your PIN?
          </h1>
          <p className="text-navy-600 mb-6">
            Enter your email address and we&apos;ll send you a link to reset your PIN.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-navy-200 rounded-xl focus:ring-2 focus:ring-gold-500 focus:border-gold-500 transition-all"
                placeholder="you@example.com"
                autoComplete="email"
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
              {isSubmitting ? "Sending..." : "Send Reset Link"}
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
