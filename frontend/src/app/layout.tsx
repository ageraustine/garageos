import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GarageOS — Trust Infrastructure for Auto Repair Chains",
  description:
    "Photo-verified repairs. Voice-first diagnostics. Un-gameable Trust Scores. One system serving customers and operators across East Africa.",
  keywords: [
    "garage management",
    "auto repair",
    "trust score",
    "Kenya",
    "East Africa",
    "M-Pesa",
    "mechanic app",
  ],
  openGraph: {
    title: "GarageOS — Trust Infrastructure for Auto Repair Chains",
    description:
      "Photo-verified repairs. Voice-first diagnostics. Un-gameable Trust Scores.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} antialiased scroll-smooth`}
    >
      <body className="min-h-screen bg-white text-zinc-900">{children}</body>
    </html>
  );
}
