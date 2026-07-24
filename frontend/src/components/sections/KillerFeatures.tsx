// KillerFeatures - Steve Jobs style dramatic feature reveals
"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui";
import { fadeInUp, staggerContainer } from "@/lib/animations";

type FeatureColor = "gold" | "emerald" | "sky" | "violet";

const killerFeatures: Array<{
  id: string;
  label: string;
  headline: string;
  subheadline: string;
  description: string;
  visual: string;
  color: FeatureColor;
  stats: Array<{ value: string; label: string }>;
}> = [
  {
    id: "magic-link",
    label: "Magic Link",
    headline: "No app. No download. No friction.",
    subheadline: "Just a link that loads in 2 seconds on 3G.",
    description:
      "Customer receives a WhatsApp message. Taps the link. Instantly sees their car being repaired. Live photos. Service progress. Payment button. That's it.",
    visual: "magic-link",
    color: "gold",
    stats: [
      { value: "2s", label: "Load time on 3G" },
      { value: "0", label: "App installs needed" },
      { value: "100%", label: "Works offline" },
    ],
  },
  {
    id: "photo-verified",
    label: "Photo Verified",
    headline: "Every repair. Timestamped. Undeniable.",
    subheadline: "The end of \"trust me, I fixed it.\"",
    description:
      "Before. During. After. Every claim backed by photos with embedded timestamps. Customers see exactly what was done. Disputes drop by 60%.",
    visual: "photo-verified",
    color: "emerald",
    stats: [
      { value: "60%", label: "Fewer disputes" },
      { value: "94%", label: "Customer satisfaction" },
      { value: "∞", label: "Proof of work" },
    ],
  },
  {
    id: "trust-score",
    label: "Trust Score",
    headline: "A number that can't be faked.",
    subheadline: "Computed. Never edited. Same truth for everyone.",
    description:
      "Built from completed jobs, estimate accuracy, and customer verification. HQ sees it. Customers see it. It's the same number. No gaming. No manipulation.",
    visual: "trust-score",
    color: "sky",
    stats: [
      { value: "4", label: "Trust signals" },
      { value: "1", label: "Source of truth" },
      { value: "0", label: "Ways to cheat" },
    ],
  },
  {
    id: "voice-first",
    label: "Voice First",
    headline: "Speak Sheng. Get line items.",
    subheadline: "AI that understands how mechanics actually talk.",
    description:
      "Greasy hands? No problem. Speak in Sheng, Swahili, or English. AI converts speech to structured repair items. No typing. No training. Just talk.",
    visual: "voice-first",
    color: "violet",
    stats: [
      { value: "3", label: "Languages" },
      { value: "95%", label: "Accuracy" },
      { value: "10x", label: "Faster input" },
    ],
  },
];

function FeatureVisual({ feature }: { feature: (typeof killerFeatures)[0] }) {
  const colorClasses = {
    gold: "from-gold-100 to-gold-50 border-gold-200",
    emerald: "from-emerald-100 to-emerald-50 border-emerald-200",
    sky: "from-sky-100 to-sky-50 border-sky-200",
    violet: "from-violet-100 to-violet-50 border-violet-200",
  };

  const accentClasses = {
    gold: "bg-gold-500 text-white",
    emerald: "bg-emerald-500 text-white",
    sky: "bg-sky-500 text-white",
    violet: "bg-violet-500 text-white",
  };

  if (feature.visual === "magic-link") {
    const stages = [
      { name: "Intake", completed: true },
      { name: "Diagnosis", completed: true },
      { name: "Working", completed: true },
      { name: "Washing", completed: false },
      { name: "Ready", completed: false },
    ];
    const completedCount = stages.filter(s => s.completed).length;
    const progress = Math.round((completedCount / stages.length) * 100);

    return (
      <div className={`relative bg-gradient-to-br ${colorClasses[feature.color]} rounded-3xl p-8 border`}>
        {/* Phone mockup */}
        <div className="relative mx-auto w-72 bg-navy-900 rounded-[2.5rem] p-3 shadow-2xl">
          <div className="bg-white rounded-[2rem] overflow-hidden">
            {/* Status bar */}
            <div className="h-6 bg-stone-100 flex items-center justify-center">
              <div className="w-20 h-4 bg-stone-200 rounded-full" />
            </div>
            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-navy-900 text-sm font-bold">Toyota Corolla</p>
                  <p className="text-navy-500 text-xs">KDA 123A</p>
                </div>
                <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-orange-100 text-orange-700">
                  Working
                </span>
              </div>

              {/* Work Progress */}
              <div className="bg-stone-50 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-navy-800">Brake Service</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold-100 text-gold-700">
                    {completedCount}/{stages.length}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-stone-200 rounded-full overflow-hidden mb-2">
                  <motion.div
                    className="h-full bg-gold-500"
                    initial={{ width: 0 }}
                    whileInView={{ width: `${progress}%` }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                </div>

                {/* Stage pills */}
                <div className="flex flex-wrap gap-1">
                  {stages.map((stage, i) => (
                    <motion.span
                      key={stage.name}
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + i * 0.1 }}
                      className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                        stage.completed
                          ? "bg-green-100 text-green-700"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {stage.completed && "✓ "}{stage.name}
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between px-1">
                <span className="text-xs text-navy-500">Estimate Total</span>
                <span className="text-sm font-bold text-navy-900">KES 12,500</span>
              </div>

              {/* Pay button */}
              <div className={`${accentClasses[feature.color]} rounded-xl py-2.5 text-center text-sm font-medium`}>
                Pay with M-Pesa
              </div>
            </div>
          </div>
        </div>
        {/* WhatsApp bubble */}
        <motion.div
          initial={{ opacity: 0, x: -20, y: 20 }}
          whileInView={{ opacity: 1, x: 0, y: 0 }}
          transition={{ delay: 0.3 }}
          className="absolute -left-4 top-1/2 bg-[#25D366] text-white px-4 py-2 rounded-2xl rounded-bl-none text-sm shadow-lg"
        >
          🔗 Track your repair
        </motion.div>
      </div>
    );
  }

  if (feature.visual === "photo-verified") {
    const photoData = [
      { label: "Before", src: "/assets/before.png", time: "09:14" },
      { label: "During", src: "/assets/during.png", time: "11:32" },
      { label: "After", src: "/assets/after.png", time: "14:45" },
    ];

    return (
      <div className={`relative bg-gradient-to-br ${colorClasses[feature.color]} rounded-3xl p-8 border`}>
        <div className="grid grid-cols-3 gap-3">
          {photoData.map((photo, i) => (
            <motion.div
              key={photo.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.15 }}
              className="flex flex-col"
            >
              <div className="relative bg-white rounded-xl overflow-hidden border border-stone-200 shadow-sm">
                <img
                  src={photo.src}
                  alt={`${photo.label} repair photo`}
                  className="w-full h-auto object-contain"
                />
                <div className="absolute top-2 right-2 bg-navy-900/80 text-[10px] text-white px-1.5 py-0.5 rounded">
                  {photo.time}
                </div>
              </div>
              <div className={`${accentClasses[feature.color]} text-xs px-2 py-1 rounded-md font-medium text-center mt-2`}>
                {photo.label}
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 flex items-center justify-center gap-2 text-emerald-600"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Verified by customer</span>
        </motion.div>
      </div>
    );
  }

  if (feature.visual === "trust-score") {
    return (
      <div className={`relative bg-gradient-to-br ${colorClasses[feature.color]} rounded-3xl p-8 border`}>
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className="relative w-40 h-40 mx-auto mb-6"
          >
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="8" className="text-stone-200" />
              <motion.circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className="text-sky-500"
                strokeDasharray="283"
                initial={{ strokeDashoffset: 283 }}
                whileInView={{ strokeDashoffset: 283 * 0.06 }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-bold text-navy-900">94</span>
              <span className="text-sm text-navy-500">Trust Score</span>
            </div>
          </motion.div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Estimate Accuracy", value: "97%", color: "text-emerald-600" },
              { label: "Verification Rate", value: "89%", color: "text-sky-600" },
              { label: "Timeliness", value: "92%", color: "text-violet-600" },
              { label: "Quality Score", value: "96%", color: "text-gold-600" },
            ].map((metric, i) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="bg-white/80 rounded-lg p-2 border border-stone-200"
              >
                <div className={`font-bold ${metric.color}`}>{metric.value}</div>
                <div className="text-xs text-navy-500">{metric.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (feature.visual === "voice-first") {
    return (
      <div className={`relative bg-gradient-to-br ${colorClasses[feature.color]} rounded-3xl p-8 border`}>
        <div className="space-y-4">
          {/* Voice waveform */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="flex items-center justify-center gap-1 h-16 mb-6"
          >
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="w-1 bg-violet-500 rounded-full"
                initial={{ height: 8 }}
                animate={{ height: [8, Math.random() * 40 + 16, 8] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.05,
                  ease: "easeInOut",
                }}
              />
            ))}
          </motion.div>

          {/* Speech bubble */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-4 relative border border-stone-200 shadow-sm"
          >
            <p className="text-navy-700 text-sm italic">"Brake pads zimechakaa, na discs zinahitaji skimming..."</p>
            <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white border-r border-b border-stone-200 transform rotate-45" />
          </motion.div>

          {/* Converted items */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white/80 rounded-xl p-4 space-y-2 border border-stone-200"
          >
            <div className="text-xs text-navy-500 mb-2">Converted to:</div>
            {["Brake Pads Replacement", "Disc Skimming (Front)"].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-navy-700">{item}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}

export function KillerFeatures() {
  return (
    <section className="py-20 lg:py-32 bg-white">
      <Container>
        {/* Section header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-20"
        >
          <motion.p variants={fadeInUp} className="text-gold-600 font-medium mb-4">
            Platform Features
          </motion.p>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl lg:text-5xl font-bold text-navy-900 mb-6"
          >
            Four features that change everything.
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-xl text-navy-500 max-w-2xl mx-auto">
            Each one solves a problem garages have accepted as unsolvable.
          </motion.p>
        </motion.div>

        {/* Features */}
        <div className="space-y-32">
          {killerFeatures.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className={`grid lg:grid-cols-2 gap-12 lg:gap-20 items-center ${
                index % 2 === 1 ? "lg:flex-row-reverse" : ""
              }`}
            >
              {/* Content */}
              <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-6 ${
                  feature.color === "gold" ? "bg-gold-100 text-gold-700" :
                  feature.color === "emerald" ? "bg-emerald-100 text-emerald-700" :
                  feature.color === "sky" ? "bg-sky-100 text-sky-700" :
                  "bg-violet-100 text-violet-700"
                }`}>
                  {feature.label}
                </div>

                <h3 className="text-3xl lg:text-4xl font-bold text-navy-900 mb-4">
                  {feature.headline}
                </h3>
                <p className={`text-xl mb-6 ${
                  feature.color === "gold" ? "text-gold-600" :
                  feature.color === "emerald" ? "text-emerald-600" :
                  feature.color === "sky" ? "text-sky-600" :
                  "text-violet-600"
                }`}>
                  {feature.subheadline}
                </p>
                <p className="text-lg text-navy-600 mb-8 leading-relaxed">
                  {feature.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  {feature.stats.map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                      className="text-center"
                    >
                      <div className="text-2xl lg:text-3xl font-bold text-navy-900 mb-1">
                        {stat.value}
                      </div>
                      <div className="text-xs text-navy-500">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Visual */}
              <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                <FeatureVisual feature={feature} />
              </div>
            </motion.div>
          ))}
        </div>
      </Container>
    </section>
  );
}
