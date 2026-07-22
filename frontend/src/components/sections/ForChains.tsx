// ForChains component - Single Responsibility: showcase chain-specific benefits
"use client";

import { motion } from "framer-motion";
import { Container, Button, CheckIcon, ArrowRightIcon } from "@/components/ui";
import { chainBenefits } from "@/lib/data";
import { fadeInUp, staggerContainer, staggerItem, viewportOnce, slideInLeft, slideInRight } from "@/lib/animations";

export function ForChains() {
  return (
    <section id="for-chains" className="py-20 lg:py-32 bg-gradient-to-b from-white to-gold-50 overflow-hidden">
      <Container>
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Content */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={slideInLeft}
          >
            <motion.div
              variants={fadeInUp}
              className="inline-flex items-center gap-2 px-3 py-1 bg-navy-900 text-gold-400 rounded-full text-sm font-medium mb-6"
            >
              For Multi-Branch Chains
            </motion.div>

            <motion.h2
              variants={fadeInUp}
              className="text-3xl lg:text-4xl font-bold text-navy-900 mb-6"
            >
              One truth across every branch
            </motion.h2>

            <motion.p
              variants={fadeInUp}
              className="text-lg text-navy-600 mb-8"
            >
              GarageOS was designed for chains from day one. Every feature
              optimizes for cross-branch consistency, HQ visibility, and brand
              stickiness over single-shop convenience.
            </motion.p>

            <motion.ul
              variants={staggerContainer}
              className="space-y-4 mb-10"
            >
              {chainBenefits.map((benefit, index) => (
                <motion.li
                  key={benefit}
                  variants={staggerItem}
                  custom={index}
                  className="flex items-start gap-3"
                >
                  <motion.div
                    whileHover={{ scale: 1.2, rotate: 10 }}
                    className="w-6 h-6 rounded-full bg-gold-100 flex items-center justify-center flex-shrink-0 mt-0.5"
                  >
                    <CheckIcon size={14} className="text-gold-600" />
                  </motion.div>
                  <span className="text-navy-700">{benefit}</span>
                </motion.li>
              ))}
            </motion.ul>

            <motion.div
              variants={fadeInUp}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button href="#demo" className="group">
                See the Brand Dashboard
                <ArrowRightIcon className="ml-2 group-hover:translate-x-1 transition-transform" size={18} />
              </Button>
            </motion.div>
          </motion.div>

          {/* Visual - Brand Dashboard mockup */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={viewportOnce}
            variants={slideInRight}
            className="relative"
          >
            <motion.div
              whileHover={{ y: -5 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-navy-900 rounded-2xl p-6 shadow-2xl border border-navy-700"
            >
              {/* Dashboard header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <motion.div
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    className="w-8 h-8 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center"
                  >
                    <span className="text-navy-900 font-bold text-xs">AF</span>
                  </motion.div>
                  <div>
                    <p className="text-white font-semibold text-sm">
                      AutoFix Kenya
                    </p>
                    <p className="text-navy-500 text-xs">12 Branches</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-navy-400 text-xs">Network Trust Score</p>
                  <motion.p
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={viewportOnce}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="text-2xl font-bold text-gold-400"
                  >
                    91.7
                  </motion.p>
                </div>
              </div>

              {/* Branch tiles */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                whileInView="visible"
                viewport={viewportOnce}
                className="grid grid-cols-3 gap-3"
              >
                {[
                  { name: "Westlands", score: 94.2, jobs: 8, status: "green" },
                  { name: "Karen", score: 92.1, jobs: 5, status: "green" },
                  { name: "Mombasa Rd", score: 89.5, jobs: 12, status: "yellow" },
                  { name: "Kilimani", score: 95.0, jobs: 4, status: "green" },
                  { name: "Thika", score: 78.3, jobs: 6, status: "red" },
                  { name: "Nakuru", score: 91.8, jobs: 3, status: "green" },
                ].map((branch) => (
                  <motion.div
                    key={branch.name}
                    variants={staggerItem}
                    whileHover={{ scale: 1.05 }}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      branch.status === "green"
                        ? "bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/60"
                        : branch.status === "yellow"
                        ? "bg-gold-500/10 border-gold-500/30 hover:border-gold-500/60"
                        : "bg-red-500/10 border-red-500/30 hover:border-red-500/60"
                    }`}
                  >
                    <p className="text-white text-xs font-medium truncate">
                      {branch.name}
                    </p>
                    <p
                      className={`text-lg font-bold ${
                        branch.status === "green"
                          ? "text-emerald-400"
                          : branch.status === "yellow"
                          ? "text-gold-400"
                          : "text-red-400"
                      }`}
                    >
                      {branch.score}
                    </p>
                    <p className="text-navy-500 text-xs">{branch.jobs} jobs</p>
                  </motion.div>
                ))}
              </motion.div>

              {/* Alert */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={viewportOnce}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.02 }}
                className="mt-4 bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-3 cursor-pointer"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                >
                  <span className="text-white text-xs">!</span>
                </motion.div>
                <div>
                  <p className="text-red-400 text-sm font-medium">
                    Thika branch needs attention
                  </p>
                  <p className="text-navy-500 text-xs mt-1">
                    3 jobs with estimate overruns this week. Click to review.
                  </p>
                </div>
              </motion.div>
            </motion.div>

            {/* Decorative elements */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={viewportOnce}
              transition={{ delay: 0.2 }}
              className="absolute -z-10 -top-4 -right-4 w-full h-full bg-gold-200 rounded-2xl"
            />
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
