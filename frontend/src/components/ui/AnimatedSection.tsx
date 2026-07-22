"use client";

// AnimatedSection - Reusable wrapper for scroll-triggered animations
// Single Responsibility: handles intersection-based reveal animations

import { motion, type Variants } from "framer-motion";
import { viewportOnce } from "@/lib/animations";

interface AnimatedSectionProps {
  children: React.ReactNode;
  variants?: Variants;
  className?: string;
  delay?: number;
}

const defaultVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export function AnimatedSection({
  children,
  variants = defaultVariants,
  className = "",
  delay = 0,
}: AnimatedSectionProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={{
        ...variants,
        visible: {
          ...variants.visible,
          transition: {
            ...(typeof variants.visible === "object" && "transition" in variants.visible
              ? variants.visible.transition
              : {}),
            delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedGroup({
  children,
  className = "",
  staggerDelay = 0.1,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={viewportOnce}
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: 0.1,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
