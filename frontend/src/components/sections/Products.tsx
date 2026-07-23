// Products component - showcases both GarageOS products
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Container, Button, ArrowRightIcon } from "@/components/ui";
import { products } from "@/lib/data";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const ICONS = {
  platform: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
      />
    </svg>
  ),
  marketplace: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  ),
};

export function Products() {
  return (
    <section id="products" className="py-20 lg:py-28 bg-white">
      <Container>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
        >
          {/* Section Header */}
          <motion.div variants={fadeInUp} className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-navy-900 mb-4">
              Two Products, One Mission
            </h2>
            <p className="text-xl text-navy-600 max-w-2xl mx-auto">
              Building trust infrastructure for East Africa's auto repair ecosystem
            </p>
          </motion.div>

          {/* Products Grid */}
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {products.map((product, index) => (
              <motion.div
                key={product.id}
                variants={fadeInUp}
                custom={index}
                whileHover={{ y: -5 }}
                className={`relative rounded-2xl border-2 p-8 lg:p-10 transition-all ${
                  product.color === "gold"
                    ? "border-gold-200 bg-gradient-to-br from-gold-50 to-white hover:border-gold-400"
                    : "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white hover:border-emerald-400"
                }`}
              >
                {/* Icon */}
                <div
                  className={`w-14 h-14 rounded-xl flex items-center justify-center mb-6 ${
                    product.color === "gold"
                      ? "bg-gold-500 text-white"
                      : "bg-emerald-500 text-white"
                  }`}
                >
                  {ICONS[product.icon as keyof typeof ICONS]}
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-navy-900 mb-2">
                  {product.name}
                </h3>
                <p
                  className={`text-sm font-medium mb-4 ${
                    product.color === "gold" ? "text-gold-600" : "text-emerald-600"
                  }`}
                >
                  {product.tagline}
                </p>
                <p className="text-navy-600 mb-6">{product.description}</p>

                {/* Highlights */}
                <ul className="space-y-3 mb-8">
                  {product.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <svg
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                          product.color === "gold"
                            ? "text-gold-500"
                            : "text-emerald-500"
                        }`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-navy-700">{highlight}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href={product.href}>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      variant={product.color === "gold" ? "primary" : "outline"}
                      size="lg"
                      className={`w-full group ${
                        product.color === "emerald"
                          ? "border-emerald-500 text-emerald-700 hover:bg-emerald-500 hover:text-white"
                          : ""
                      }`}
                    >
                      {product.cta}
                      <ArrowRightIcon
                        className="ml-2 group-hover:translate-x-1 transition-transform"
                        size={20}
                      />
                    </Button>
                  </motion.div>
                </Link>

                {/* Decorative element */}
                <div
                  className={`absolute top-4 right-4 w-20 h-20 rounded-full opacity-10 ${
                    product.color === "gold" ? "bg-gold-500" : "bg-emerald-500"
                  }`}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
