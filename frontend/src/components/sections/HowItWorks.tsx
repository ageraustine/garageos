// HowItWorks component - Single Responsibility: explain the customer journey
"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui";
import { steps } from "@/lib/data";
import { fadeInUp, staggerContainer, staggerItem, viewportOnce, scaleIn } from "@/lib/animations";

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="py-20 lg:py-32 bg-gradient-to-b from-white via-amber-50/30 to-stone-50 overflow-hidden"
    >
      <Container>
        {/* Section Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <motion.p variants={fadeInUp} className="text-gold-600 font-medium mb-4">
            How It Works
          </motion.p>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl lg:text-5xl font-bold text-navy-900 mb-4"
          >
            From drop-off to drive-away in three steps
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-navy-500">
            Zero friction for customers. Total visibility for operators.
          </motion.p>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="grid lg:grid-cols-3 gap-8 lg:gap-12"
        >
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              variants={staggerItem}
              className="relative"
            >
              {/* Connector line (hidden on mobile and after last item) */}
              {index < steps.length - 1 && (
                <motion.div
                  initial={{ scaleX: 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={viewportOnce}
                  transition={{ delay: 0.5 + index * 0.2, duration: 0.8 }}
                  className="hidden lg:block absolute top-12 left-1/2 w-full h-px bg-gradient-to-r from-gold-400 to-transparent origin-left"
                />
              )}

              {/* Step number */}
              <motion.div
                whileHover={{ scale: 1.1, rotate: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-2xl font-bold text-navy-900 mb-6 shadow-lg shadow-gold-500/25 cursor-pointer"
              >
                {step.number}
              </motion.div>

              {/* Content */}
              <h3 className="text-xl font-bold text-navy-900 mb-3">{step.title}</h3>
              <p className="text-navy-700 leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>

        {/* Visual representation of Magic Link */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={scaleIn}
          className="mt-20 relative"
        >
          <div className="max-w-sm mx-auto">
            {/* Phone mockup */}
            <motion.div
              whileHover={{ y: -10 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-navy-900 rounded-[3rem] p-3 shadow-2xl"
            >
              <div className="bg-white rounded-[2.5rem] overflow-hidden">
                {/* Phone screen */}
                <div className="p-6 pt-12">
                  {/* Status bar mockup */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-xs text-navy-400">9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-2 rounded-sm bg-navy-300" />
                      <div className="w-6 h-3 rounded-sm bg-emerald-500" />
                    </div>
                  </div>

                  {/* Magic Link content */}
                  <div className="text-center mb-6">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                      className="w-12 h-12 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-3"
                    >
                      <div className="w-6 h-6 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg" />
                    </motion.div>
                    <p className="text-sm text-navy-500">Your car at</p>
                    <p className="font-semibold text-navy-900">QuickServ Westlands</p>
                  </div>

                  {/* Progress ring */}
                  <div className="flex justify-center gap-2 mb-6">
                    {["Intake", "Diagnosis", "Working", "Washing", "Ready"].map(
                      (stage, i) => (
                        <motion.div
                          key={stage}
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={viewportOnce}
                          transition={{ delay: 0.5 + i * 0.1, type: "spring" }}
                          whileHover={{ scale: 1.1 }}
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-xs font-medium cursor-pointer transition-shadow ${
                            i < 3
                              ? "bg-emerald-500 text-white hover:shadow-lg hover:shadow-emerald-500/25"
                              : i === 3
                              ? "bg-gold-500 text-white animate-pulse"
                              : "bg-stone-100 text-navy-400 hover:bg-stone-200"
                          }`}
                        >
                          {i < 3 ? "✓" : i + 1}
                        </motion.div>
                      )
                    )}
                  </div>

                  {/* Status */}
                  <motion.div
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="bg-gold-50 border border-gold-200 rounded-xl p-4 mb-4"
                  >
                    <p className="text-sm text-gold-700 font-medium">
                      Currently washing your car
                    </p>
                    <p className="text-xs text-navy-500 mt-1">
                      Updated 2 minutes ago
                    </p>
                  </motion.div>

                  {/* Pay button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-emerald-500 text-white rounded-xl py-3 font-semibold text-sm hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/25"
                  >
                    Pay KES 12,500 via M-Pesa
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Label */}
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={viewportOnce}
              transition={{ delay: 0.8 }}
              className="text-center text-navy-700 mt-6 text-sm font-medium"
            >
              The Magic Link — no app required
            </motion.p>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
