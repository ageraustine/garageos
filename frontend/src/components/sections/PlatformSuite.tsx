// PlatformSuite - CRM, Analytics, HR modules showcase
"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const modules = [
  {
    id: "crm",
    name: "Customer CRM",
    tagline: "Every customer. Every vehicle. Every job. One view.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    features: ["Vehicle history across branches", "Notes & follow-ups", "Phone lookup", "Service reminders"],
    color: "rose",
  },
  {
    id: "analytics",
    name: "Analytics",
    tagline: "Real-time insights. No spreadsheets. No guessing.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    features: ["Revenue trends", "Branch comparison", "Service performance", "Expense tracking"],
    color: "cyan",
  },
  {
    id: "hr",
    name: "HR Management",
    tagline: "Payroll. Attendance. Leave. Reviews. All automated.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    features: ["M-Pesa payroll", "Clock in/out", "Leave management", "Performance reviews"],
    color: "amber",
  },
];

const colorClasses = {
  rose: {
    bg: "bg-rose-50",
    border: "border-rose-200 hover:border-rose-400",
    icon: "bg-rose-500",
    text: "text-rose-600",
    dot: "bg-rose-500",
  },
  cyan: {
    bg: "bg-cyan-50",
    border: "border-cyan-200 hover:border-cyan-400",
    icon: "bg-cyan-500",
    text: "text-cyan-600",
    dot: "bg-cyan-500",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200 hover:border-amber-400",
    icon: "bg-amber-500",
    text: "text-amber-600",
    dot: "bg-amber-500",
  },
};

export function PlatformSuite() {
  return (
    <section className="py-20 lg:py-32 bg-gradient-to-b from-white via-stone-50 to-amber-50/30">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          {/* Header */}
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <p className="text-gold-600 font-medium mb-4">And there's more</p>
            <h2 className="text-3xl lg:text-5xl font-bold text-navy-900 mb-6">
              A complete business suite.
            </h2>
            <p className="text-xl text-navy-500 max-w-2xl mx-auto">
              Everything else you need to run a modern garage chain.
              Built-in. No extra subscriptions.
            </p>
          </motion.div>

          {/* Modules Grid */}
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {modules.map((module, index) => {
              const colors = colorClasses[module.color as keyof typeof colorClasses];
              return (
                <motion.div
                  key={module.id}
                  variants={fadeInUp}
                  custom={index}
                  whileHover={{ y: -8 }}
                  className={`relative rounded-2xl border ${colors.border} p-8 transition-all bg-white shadow-sm hover:shadow-xl`}
                >
                  {/* Icon */}
                  <div className={`w-14 h-14 ${colors.icon} rounded-xl flex items-center justify-center text-white mb-6`}>
                    {module.icon}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-navy-900 mb-2">{module.name}</h3>
                  <p className={`${colors.text} text-sm mb-6`}>{module.tagline}</p>

                  {/* Features */}
                  <ul className="space-y-3">
                    {module.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3 text-sm text-navy-600">
                        <span className={`w-1.5 h-1.5 ${colors.dot} rounded-full`} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Decorative gradient */}
                  <div className={`absolute inset-0 ${colors.bg} rounded-2xl opacity-0 hover:opacity-100 transition-opacity -z-10`} />
                </motion.div>
              );
            })}
          </div>

          {/* Bottom message */}
          <motion.div
            variants={fadeInUp}
            className="text-center mt-16"
          >
            <p className="text-navy-500">
              <span className="text-navy-900 font-medium">All included.</span> No per-module pricing. No hidden fees.
            </p>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
