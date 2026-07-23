// Hero component - Two products, one revolutionary ecosystem
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Container, Button, ArrowRightIcon } from "@/components/ui";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export function Hero() {
  return (
    <section className="pt-24 lg:pt-32 pb-16 bg-gradient-to-b from-stone-50 via-amber-50/30 to-white overflow-hidden">
      <Container>
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-5xl mx-auto text-center"
        >
          {/* Simple tagline */}
          <motion.p
            variants={fadeInUp}
            className="text-gold-600 text-lg font-medium mb-6 tracking-wide"
          >
            Introducing GarageOS
          </motion.p>

          {/* The headline - Jobs style: simple, bold */}
          <motion.h1
            variants={fadeInUp}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold text-navy-900 leading-tight mb-8"
          >
            The auto repair industry
            <br />
            <span className="bg-gradient-to-r from-gold-500 to-gold-600 bg-clip-text text-transparent">
              will never be the same.
            </span>
          </motion.h1>

          {/* Simple sub - benefit focused */}
          <motion.p
            variants={fadeInUp}
            className="text-xl lg:text-2xl text-navy-600 mb-16 max-w-3xl mx-auto"
          >
            Two revolutionary products. One ecosystem.
            <br className="hidden sm:block" />
            Built for East Africa. Ready for the world.
          </motion.p>
        </motion.div>

        {/* Two Products - Side by Side */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto"
        >
          {/* Platform Card */}
          <motion.div
            variants={fadeInUp}
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative bg-white rounded-3xl p-8 lg:p-10 border border-stone-200 hover:border-gold-400 hover:shadow-xl hover:shadow-gold-500/10 transition-all overflow-hidden group"
          >
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-gold-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Icon */}
            <div className="relative w-16 h-16 bg-gradient-to-br from-gold-400 to-gold-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-gold-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>

            <h2 className="relative text-2xl lg:text-3xl font-bold text-navy-900 mb-3">
              GarageOS Platform
            </h2>
            <p className="relative text-gold-600 font-medium mb-4">
              Trust infrastructure for garage chains
            </p>
            <p className="relative text-navy-600 mb-8 leading-relaxed">
              Photo-verified repairs. Voice diagnostics. Un-gameable Trust Scores.
              CRM. Analytics. HR. Everything a modern garage needs.
            </p>

            <Link href="/register">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative">
                <Button size="lg" className="w-full group">
                  Start Free Trial
                  <ArrowRightIcon className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Marketplace Card */}
          <motion.div
            variants={fadeInUp}
            whileHover={{ y: -8, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="relative bg-white rounded-3xl p-8 lg:p-10 border border-stone-200 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-500/10 transition-all overflow-hidden group"
          >
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Icon */}
            <div className="relative w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>

            <h2 className="relative text-2xl lg:text-3xl font-bold text-navy-900 mb-3">
              GarageOS Marketplace
            </h2>
            <p className="relative text-emerald-600 font-medium mb-4">
              Spare parts. Verified sellers. Direct deals.
            </p>
            <p className="relative text-navy-600 mb-8 leading-relaxed">
              Thousands of parts from verified garages and suppliers.
              Search by vehicle. Message sellers. No middleman.
            </p>

            <Link href="/marketplace">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="relative">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full group border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white"
                >
                  Browse Marketplace
                  <ArrowRightIcon className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
