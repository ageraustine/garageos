// Header component - Single Responsibility: navigation and branding
"use client";

import { useState } from "react";
import { Container, Button, MenuIcon } from "@/components/ui";
import { navLinks } from "@/lib/data";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-navy-100">
      <Container>
        <nav className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center shadow-md shadow-gold-500/20">
              <span className="text-navy-900 font-bold text-lg">G</span>
            </div>
            <span className="font-bold text-xl text-navy-900">GarageOS</span>
          </a>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-navy-600 hover:text-navy-900 font-medium transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <a
              href="/login"
              className="text-navy-600 hover:text-navy-900 font-medium transition-colors"
            >
              Log In
            </a>
            <Button size="sm" href="/register">Get Started</Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 -mr-2 text-navy-600"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <MenuIcon size={24} />
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-navy-100">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="text-navy-600 hover:text-navy-900 font-medium py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-4 border-t border-navy-100">
                <Button variant="outline" size="sm" href="/login">
                  Log In
                </Button>
                <Button size="sm" href="/register">Get Started</Button>
              </div>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
