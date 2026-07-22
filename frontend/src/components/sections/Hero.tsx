// Hero component - Single Responsibility: primary value proposition and CTA
"use client";

import { motion } from "framer-motion";
import { Container, Button, ArrowRightIcon } from "@/components/ui";
import { stats } from "@/lib/data";
import { fadeInUp, staggerContainer, staggerItem, scaleIn } from "@/lib/animations";

export function Hero() {
  return (
    <section className="pt-24 lg:pt-32 pb-16 lg:pb-24 bg-gradient-to-b from-gold-50 via-white to-white overflow-hidden">
      <Container>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Badge */}
          <motion.div
            variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 bg-navy-900 text-gold-400 rounded-full text-sm font-medium mb-8"
          >
            <span className="w-2 h-2 bg-gold-400 rounded-full animate-pulse" />
            Built for East Africa&apos;s leading auto repair chains
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-navy-900 leading-tight mb-6"
          >
            Trust, measured at
            <span className="text-gold-500"> the moment of work</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={fadeInUp}
            className="text-xl lg:text-2xl text-navy-600 mb-10 max-w-2xl mx-auto"
          >
            Photo-verified repairs. Voice-first diagnostics. Un-gameable Trust
            Scores. One system serving customers and operators with the same
            truth.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button size="lg" href="#demo" className="group">
                Request Demo
                <ArrowRightIcon className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button variant="outline" size="lg" href="#how-it-works">
                See How It Works
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 pt-8 border-t border-navy-200"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                variants={staggerItem}
                custom={index}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.1, duration: 0.5, type: "spring" }}
                  className="text-3xl lg:text-4xl font-bold text-navy-900 mb-1"
                >
                  {stat.value}
                </motion.div>
                <div className="text-sm text-navy-500">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </Container>

      {/* Hero Visual - Abstract garage representation */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={scaleIn}
        className="mt-16 relative"
      >
        <Container>
          <motion.div
            whileHover={{ y: -5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative bg-navy-900 rounded-2xl overflow-hidden shadow-2xl mx-auto max-w-5xl border border-navy-700"
          >
            {/* Mock dashboard UI */}
            <div className="aspect-video bg-gradient-to-br from-navy-800 to-navy-950 p-6 lg:p-10">
              {/* Top bar */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="text-navy-400 text-sm font-mono">
                  dashboard.garageos.io
                </div>
              </div>

              {/* Dashboard content mockup */}
              <div className="grid grid-cols-3 gap-4 lg:gap-6">
                {/* Trust Score Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  whileHover={{ scale: 1.02, borderColor: "rgba(245, 158, 11, 0.5)" }}
                  className="bg-navy-800/50 rounded-xl p-4 lg:p-6 border border-navy-700 transition-colors"
                >
                  <div className="text-navy-400 text-xs uppercase tracking-wide mb-2">
                    Branch Trust Score
                  </div>
                  <div className="text-4xl font-bold text-gold-400 mb-1">
                    94.2
                  </div>
                  <div className="text-navy-500 text-sm">+2.1 this week</div>
                </motion.div>

                {/* Active Jobs */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  whileHover={{ scale: 1.02, borderColor: "rgba(245, 158, 11, 0.5)" }}
                  className="bg-navy-800/50 rounded-xl p-4 lg:p-6 border border-navy-700 transition-colors"
                >
                  <div className="text-navy-400 text-xs uppercase tracking-wide mb-2">
                    Active Jobs
                  </div>
                  <div className="text-4xl font-bold text-white mb-1">
                    12
                  </div>
                  <div className="text-navy-500 text-sm">3 ready for pickup</div>
                </motion.div>

                {/* Estimate Accuracy */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  whileHover={{ scale: 1.02, borderColor: "rgba(245, 158, 11, 0.5)" }}
                  className="bg-navy-800/50 rounded-xl p-4 lg:p-6 border border-navy-700 transition-colors"
                >
                  <div className="text-navy-400 text-xs uppercase tracking-wide mb-2">
                    Estimate Accuracy
                  </div>
                  <div className="text-4xl font-bold text-emerald-400 mb-1">
                    97%
                  </div>
                  <div className="text-navy-500 text-sm">Last 30 days</div>
                </motion.div>
              </div>

              {/* Job progress bars */}
              <div className="mt-6 space-y-3">
                {[
                  { plate: "KDA 123A", status: "Working", progress: 65, color: "bg-gold-500", delay: 0.9 },
                  { plate: "KBZ 789X", status: "Washing", progress: 90, color: "bg-sky-500", delay: 1.0 },
                  { plate: "KCE 456M", status: "Ready", progress: 100, color: "bg-emerald-500", delay: 1.1 },
                ].map((job) => (
                  <motion.div
                    key={job.plate}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: job.delay }}
                    whileHover={{ backgroundColor: "rgba(30, 41, 59, 0.5)" }}
                    className="bg-navy-800/30 rounded-lg p-3 flex items-center gap-4 cursor-pointer transition-colors"
                  >
                    <span className="text-navy-300 font-mono text-sm w-24">
                      {job.plate}
                    </span>
                    <span className="text-navy-500 text-sm w-20">
                      {job.status}
                    </span>
                    <div className="flex-1 bg-navy-700 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${job.progress}%` }}
                        transition={{ delay: job.delay + 0.2, duration: 0.8, ease: "easeOut" }}
                        className={`h-full ${job.color}`}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </Container>
      </motion.div>
    </section>
  );
}
