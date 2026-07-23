// Landing page content data
// Dependency Inversion: Components depend on this data abstraction, not hardcoded values

import type { Feature, Stat, Step, Testimonial, NavLink } from "./types";

export const navLinks: NavLink[] = [
  { label: "Products", href: "#products" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "For Chains", href: "#for-chains" },
  { label: "Garages", href: "/garages" },
];

export const products = [
  {
    id: "platform",
    name: "GarageOS Platform",
    tagline: "Trust infrastructure for auto repair chains",
    description:
      "Photo-verified repairs, voice-first diagnostics, and un-gameable Trust Scores. One system serving customers and operators with the same truth.",
    icon: "platform",
    color: "gold",
    href: "/register",
    cta: "Start Free Trial",
    highlights: [
      "Photo-verified progress tracking",
      "Voice-first diagnostics in local languages",
      "Un-gameable Trust Scores",
      "Customer Magic Links (no app)",
      "Offline-first for mechanics",
      "M-Pesa payment integration",
    ],
  },
  {
    id: "marketplace",
    name: "GarageOS Marketplace",
    tagline: "Find spare parts from verified sellers",
    description:
      "A classifieds platform where garages and parts sellers list spare parts and consumables. Connect directly with verified sellers across East Africa.",
    icon: "marketplace",
    color: "emerald",
    href: "/dashboard/marketplace",
    cta: "Browse Parts",
    highlights: [
      "Thousands of spare parts listings",
      "Verified garage sellers",
      "Direct buyer-seller messaging",
      "Search by vehicle compatibility",
      "New, used & refurbished parts",
      "Local sellers near you",
    ],
  },
];

export const stats: Stat[] = [
  { value: "98%", label: "Customer Satisfaction" },
  { value: "2s", label: "Link Load Time on 3G" },
  { value: "45%", label: "Fewer Disputes" },
  { value: "100%", label: "Offline Capable" },
];

export const features: Feature[] = [
  {
    icon: "camera",
    title: "Photo-Verified Progress",
    description:
      "Every repair claim backed by timestamped photos. Customers see their car's progress live—no guessing, no surprises.",
  },
  {
    icon: "microphone",
    title: "Voice-First Diagnostics",
    description:
      "Mechanics speak in Sheng, Swahili, or English. AI parses it into line items. No typing with greasy hands.",
  },
  {
    icon: "shield",
    title: "Un-Gameable Trust Score",
    description:
      "Computed from completed jobs, never edited. The same number shown to customers powers HQ decisions.",
  },
  {
    icon: "phone",
    title: "No App Required",
    description:
      "Customers get a Magic Link via WhatsApp/SMS. Opens in under 2 seconds on 3G. Falls back to SMS if data drops.",
  },
  {
    icon: "wifi-off",
    title: "Offline-First for Mechanics",
    description:
      "Photos, voice notes, and status changes queue locally. Auto-sync when connectivity returns. Never blocked.",
  },
  {
    icon: "receipt",
    title: "Estimate Accuracy Lock",
    description:
      "Final bill compared to approved estimate. Any increase requires explicit customer re-approval—never silent.",
  },
];

export const steps: Step[] = [
  {
    number: "01",
    title: "60-Second Intake",
    description:
      "Plate auto-populates vehicle info. Pin damage on a 2D wireframe. Snap photos. Done before the customer finishes their coffee.",
  },
  {
    number: "02",
    title: "Live Customer Link",
    description:
      "Customer receives a Magic Link—no app install. They see diagnosis, approve the quote, toggle optional items, watch progress.",
  },
  {
    number: "03",
    title: "Pay & Go",
    description:
      "M-Pesa STK push from the link. Success generates a digital gate pass. Board flips to Paid & Ready. Zero queue.",
  },
];

export const testimonials: Testimonial[] = [
  {
    quote:
      "We cut customer disputes by 60% in three months. The Trust Score gave us visibility we never had across our 12 branches.",
    author: "James Mwangi",
    role: "Operations Director",
    company: "AutoFix Kenya",
  },
  {
    quote:
      "My mechanics finally stopped fighting with customers about what was found. The photos speak for themselves.",
    author: "Sarah Wanjiku",
    role: "Branch Manager",
    company: "QuickServ Nairobi",
  },
  {
    quote:
      "Our customers share the Magic Link with friends. 'Look at my car being repaired!' Free marketing we didn't expect.",
    author: "David Ochieng",
    role: "CEO",
    company: "DriveRight Group",
  },
];

export const chainBenefits = [
  "Real-time brand dashboard with per-branch Trust Scores",
  "Cross-branch vehicle history vault—any branch sees full service history",
  "Trust-weighted commissions tied to estimate accuracy",
  "Network load balancing across nearby branches",
  "White-label customer links—your brand, GarageOS invisible",
];
