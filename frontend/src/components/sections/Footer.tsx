// Footer component - Single Responsibility: site navigation and legal

import { Container } from "@/components/ui";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "For Chains", href: "#for-chains" },
    { label: "Pricing", href: "#pricing" },
    { label: "Security", href: "#security" },
  ],
  Company: [
    { label: "About", href: "#about" },
    { label: "Blog", href: "#blog" },
    { label: "Careers", href: "#careers" },
    { label: "Contact", href: "#contact" },
  ],
  Resources: [
    { label: "Documentation", href: "#docs" },
    { label: "API Reference", href: "#api" },
    { label: "Support", href: "#support" },
    { label: "Status", href: "#status" },
  ],
  Legal: [
    { label: "Privacy", href: "#privacy" },
    { label: "Terms", href: "#terms" },
    { label: "Cookie Policy", href: "#cookies" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-navy-950 text-white py-16 lg:py-20 border-t border-navy-800">
      <Container>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center">
                <span className="text-navy-900 font-bold text-sm">G</span>
              </div>
              <span className="font-bold text-xl">GarageOS</span>
            </a>
            <p className="text-navy-400 text-sm leading-relaxed">
              Trust infrastructure for East Africa&apos;s auto repair industry.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-sm mb-4 text-gold-400 uppercase tracking-wider">
                {category}
              </h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-navy-400 hover:text-white transition-colors text-sm"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-navy-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-navy-500 text-sm">
            &copy; {new Date().getFullYear()} GarageOS. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a
              href="#twitter"
              className="text-navy-500 hover:text-gold-400 transition-colors"
            >
              Twitter
            </a>
            <a
              href="#linkedin"
              className="text-navy-500 hover:text-gold-400 transition-colors"
            >
              LinkedIn
            </a>
            <a
              href="#github"
              className="text-navy-500 hover:text-gold-400 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </Container>
    </footer>
  );
}
