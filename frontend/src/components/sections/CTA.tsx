// CTA component - Single Responsibility: final call to action
"use client";

import { motion } from "framer-motion";
import { Container, Button, ArrowRightIcon } from "@/components/ui";
import { fadeInUp, staggerContainer, viewportOnce } from "@/lib/animations";

export function CTA() {
  return (
    <section id="demo" className="py-20 lg:py-32 bg-navy-950 overflow-hidden">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Heading */}
          <motion.h2
            variants={fadeInUp}
            className="text-3xl lg:text-5xl font-bold text-white mb-6"
          >
            Ready to build trust at every branch?
          </motion.h2>

          <motion.p
            variants={fadeInUp}
            className="text-lg lg:text-xl text-navy-300 mb-10 max-w-2xl mx-auto"
          >
            Join East Africa&apos;s leading auto repair chains. Schedule a demo
            and see how GarageOS transforms customer trust into measurable
            competitive advantage.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={fadeInUp}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button size="lg" href="#contact" className="group">
                Request Demo
                <ArrowRightIcon className="ml-2 group-hover:translate-x-1 transition-transform" size={20} />
              </Button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="lg" href="#contact" className="border-navy-600 text-white hover:bg-navy-800 hover:border-gold-500">
                Talk to Sales
              </Button>
            </motion.div>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ delay: 0.4 }}
            className="mt-16 pt-10 border-t border-navy-800"
          >
            <p className="text-navy-500 text-sm mb-6">Trusted by</p>
            <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
              {["AutoFix Kenya", "QuickServ", "DriveRight Group", "MasterMech"].map(
                (company, index) => (
                  <motion.div
                    key={company}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={viewportOnce}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    whileHover={{ scale: 1.1, color: "#fbbf24" }}
                    className="text-navy-500 font-semibold text-lg cursor-pointer transition-colors"
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
