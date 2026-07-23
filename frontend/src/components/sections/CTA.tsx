// CTA component - Single Responsibility: final call to action
"use client";

import { motion } from "framer-motion";
import { Container, Button, ArrowRightIcon } from "@/components/ui";
import { fadeInUp, staggerContainer, viewportOnce } from "@/lib/animations";

export function CTA() {
  return (
    <section id="demo" className="py-20 lg:py-32 bg-gradient-to-b from-stone-50 via-amber-50/50 to-white overflow-hidden">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Heading */}
          <motion.p variants={fadeInUp} className="text-gold-600 font-medium mb-4">
            Get Started
          </motion.p>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl lg:text-5xl font-bold text-navy-900 mb-6"
          >
            Join the auto repair ecosystem
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="text-lg lg:text-xl text-navy-600 mb-10 max-w-2xl mx-auto"
          >
            Whether you&apos;re managing a garage chain or sourcing spare parts,
            GarageOS has the tools you need to grow your business.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" href="/register" className="group">
                Start Free Trial
                <ArrowRightIcon className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="lg" href="/marketplace" className="border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white">
                Browse Marketplace
              </Button>
            </motion.div>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ delay: 0.4 }}
            className="mt-16 pt-10 border-t border-stone-200"
          >
            <p className="text-navy-500 text-sm mb-6">Trusted by leading chains</p>
            <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
              {["AutoFix Kenya", "QuickServ", "DriveRight Group", "MasterMech"].map(
                (company, index) => (
                  <motion.div
                    key={company}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={viewportOnce}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    whileHover={{ scale: 1.1 }}
                    className="text-navy-600 hover:text-gold-600 font-semibold text-lg cursor-pointer transition-colors"
                  >
                    {company}
                  </motion.div>
                )
              )}
            </div>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
