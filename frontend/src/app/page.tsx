// Landing page - composes section components
// Two products: Platform + Marketplace - presented Steve Jobs style

import {
  Header,
  Hero,
  KillerFeatures,
  PlatformSuite,
  HowItWorks,
  ForChains,
  Testimonials,
  CTA,
  Footer,
} from "@/components/sections";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        {/* Hero: Two products, bold intro */}
        <Hero />
        {/* Platform killer features: Magic Link, Photo Verified, Trust Score, Voice */}
        <KillerFeatures />
        {/* Complete suite: CRM, Analytics, HR */}
        <PlatformSuite />
        {/* How the platform works */}
        <HowItWorks />
        {/* Why chains choose us */}
        <ForChains />
        {/* Social proof */}
        <Testimonials />
        {/* Final CTA */}
        <CTA />
      </main>
      <Footer />
    </>
  );
}
