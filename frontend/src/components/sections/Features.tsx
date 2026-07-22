// Features component - Single Responsibility: display feature grid
// Open/Closed: features data can be extended without modifying this component
"use client";

import { motion } from "framer-motion";
import { Container, iconMap, type IconName } from "@/components/ui";
import { features } from "@/lib/data";
import { fadeInUp, staggerContainer, staggerItem, viewportOnce } from "@/lib/animations";

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-32 bg-white">
      <Container>
        {/* Section Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="max-w-3xl mx-auto text-center mb-16"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl lg:text-4xl font-bold text-navy-900 mb-4"
          >
            Everything a modern garage needs
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-lg text-navy-600">
            Built from the ground up for multi-branch chains. Every feature
            serves both the customer at the bay and the operator at HQ.
          </motion.p>
        </motion.div>

        {/* Feature Grid */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={viewportOnce}
          variants={staggerContainer}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature) => {
            const IconComponent = iconMap[feature.icon as IconName];
            return (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="group p-6 lg:p-8 rounded-2xl bg-navy-50 hover:bg-gold-50 border border-transparent hover:border-gold-200 transition-all duration-300 cursor-pointer"
              >
                {/* Icon */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                  className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm mb-6 group-hover:bg-gold-500 group-hover:shadow-lg group-hover:shadow-gold-500/25 transition-all duration-300"
                >
                  {IconComponent && (
                    <IconComponent
                      size={24}
                      className="text-gold-600 group-hover:text-navy-900 transition-colors duration-300"
                    />
                  )}
                </motion.div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-navy-900 mb-3 group-hover:text-navy-950">
                  {feature.title}
                </h3>
                <p className="text-navy-600 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
      </Container>
    </section>
  );
}
