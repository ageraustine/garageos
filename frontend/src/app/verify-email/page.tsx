"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Container, Button } from "@/components/ui";
import { api } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token provided");
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await api.auth.verifyEmail(token);

        // Store tokens
        localStorage.setItem("access_token", response.access_token);
        localStorage.setItem("refresh_token", response.refresh_token);

        setStatus("success");

        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push("/dashboard");
        }, 2000);
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to verify email"
        );
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-navy-50 py-12 flex items-center">
      <Container className="max-w-md">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="bg-white rounded-2xl shadow-xl p-8 border border-navy-100 text-center"
        >
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 justify-center mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-gold-400 to-gold-600 rounded-xl flex items-center justify-center">
              <span className="text-navy-900 font-bold text-xl">G</span>
            </div>
            <span className="text-xl font-bold text-navy-900">GarageOS</span>
          </Link>

          {status === "verifying" && (
            <>
              <div className="w-16 h-16 mx-auto mb-6">
                <div className="w-full h-full border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
              </div>
              <h1 className="text-2xl font-bold text-navy-900 mb-2">
                Verifying Your Email
              </h1>
              <p className="text-navy-600">
                Please wait while we verify your email address...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-navy-900 mb-2">
                Email Verified!
              </h1>
              <p className="text-navy-600 mb-6">
                Your account is now active. Redirecting to your dashboard...
              </p>
              <Link href="/dashboard">
                <Button variant="primary" size="lg" className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-navy-900 mb-2">
                Verification Failed
              </h1>
              <p className="text-red-600 mb-6">
                {errorMessage}
              </p>
              <div className="space-y-4">
                <Link href="/login">
                  <Button variant="primary" size="lg" className="w-full">
                    Go to Login
                  </Button>
                </Link>
                <p className="text-sm text-navy-500">
                  Need a new verification link?{" "}
                  <Link href="/resend-verification" className="text-gold-600 hover:text-gold-700 font-medium">
                    Resend email
                  </Link>
                </p>
              </div>
            </>
          )}
        </motion.div>
      </Container>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-navy-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
