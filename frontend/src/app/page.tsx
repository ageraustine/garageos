// Landing page - composes section components
// Following SOLID: each section has a single responsibility

import {
  Header,
  Hero,
  Features,
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
        <Hero />
        <Features />
        <HowItWorks />
        <ForChains />
        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
