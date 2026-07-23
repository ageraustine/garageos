// Testimonials component - Single Responsibility: display social proof
"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui";
import { testimonials } from "@/lib/data";
import { fadeInUp, staggerContainer, staggerItem, viewportOnce } from "@/lib/animations";

export function Testimonials() {
  return (
    <section className="py-20 lg:py-32 bg-white overflow-hidden">
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
            Social Proof
          </motion.p>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl lg:text-5xl font-bold text-navy-900 mb-4"
          >
            The industry is talking.
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-navy-500">
            Hear from operators who transformed their businesses with GarageOS.
          </motion.p>
        </motion.div>

        {/* Testimonials Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-6 lg:gap-8"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.author}
              variants={staggerItem}
              custom={index}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              className="bg-stone-50 rounded-2xl p-8 relative border border-stone-200 hover:border-gold-300 hover:shadow-lg transition-all cursor-pointer"
            >
              {/* Quote mark */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={viewportOnce}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="absolute top-6 right-8 text-6xl font-serif text-gold-300"
              >
                &ldquo;
              </motion.div>

              {/* Quote */}
              <p className="text-navy-700 leading-relaxed mb-6 relative z-10">
                {testimonial.quote}
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="w-12 h-12 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center shadow-lg shadow-gold-500/25"
                >
                  <span className="text-white font-semibold">
                    {testimonial.author
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </span>
                </motion.div>
                <div>
                  <p className="font-semibold text-navy-900">
                    {testimonial.author}
                  </p>
                  <p className="text-sm text-navy-500">
                    {testimonial.role}, {testimonial.company}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
