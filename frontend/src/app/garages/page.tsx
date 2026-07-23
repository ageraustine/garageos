"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, GarageListItem } from "@/lib/api";

export default function GaragesPage() {
  const [garages, setGarages] = useState<GarageListItem[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [search, setSearch] = useState("");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    // Load cities for filter
    api.garages.getCities().then(setCities).catch(console.error);
  }, []);

  useEffect(() => {
    const loadGarages = async () => {
      setLoading(true);
      try {
        const response = await api.garages.list({
          city: selectedCity || undefined,
          search: search || undefined,
          limit: 50,
        });
        setGarages(response.items);
        setTotal(response.total);
      } catch (error) {
        console.error("Failed to load garages:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(loadGarages, 300);
    return () => clearTimeout(debounce);
  }, [selectedCity, search]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-amber-50/30 to-white">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-9 h-9 bg-gradient-to-br from-gold-400 to-gold-600 rounded-lg flex items-center justify-center shadow-md shadow-gold-500/20">
                <span className="text-navy-900 font-bold text-lg">G</span>
              </div>
              <span className="text-navy-900 font-bold text-xl">GarageOS</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/marketplace"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition-colors hidden sm:block"
              >
                Marketplace
              </Link>
              <Link
                href="/login"
                className="text-sm text-navy-600 hover:text-navy-900 font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="text-sm bg-gradient-to-r from-gold-400 to-gold-500 text-navy-900 font-semibold px-4 py-2 rounded-lg hover:from-gold-500 hover:to-gold-600 transition-all shadow-md shadow-gold-500/20"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-50 via-stone-50 to-amber-50/50 border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-navy-900 mb-4">
            Find Trusted Garages
          </h1>
          <p className="text-navy-600 text-lg max-w-2xl">
            Discover verified auto repair shops with transparent pricing, real
            customer reviews, and professional service.
          </p>

          {/* Search & Filters */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-stone-300 rounded-xl text-navy-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 shadow-sm"
              />
            </div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="px-4 py-3 bg-white border border-stone-300 rounded-xl text-navy-900 focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-gold-400 shadow-sm"
            >
              <option value="">All Cities</option>
              {cities.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl h-72 animate-pulse shadow-sm border border-stone-200"
              />
            ))}
          </div>
        ) : garages.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔧</div>
            <h2 className="text-xl font-semibold text-navy-900 mb-2">
              No garages found
            </h2>
            <p className="text-navy-500">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <>
            <p className="text-navy-500 mb-6">
              {total} garage{total !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {garages.map((garage, index) => (
                <motion.div
                  key={garage.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GarageCard garage={garage} />
                </motion.div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-navy-500">
          <p>&copy; {new Date().getFullYear()} GarageOS. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function GarageCard({ garage }: { garage: GarageListItem }) {
  return (
    <Link href={`/garages/${garage.slug}`}>
      <div className="bg-white rounded-2xl overflow-hidden border border-stone-200 hover:border-gold-400 transition-all hover:shadow-lg hover:shadow-gold-500/10 group">
        {/* Cover Image */}
        <div className="h-32 bg-gradient-to-br from-amber-100 to-stone-100 relative overflow-hidden">
          {garage.cover_image_url ? (
            <img
              src={garage.cover_image_url}
              alt={garage.display_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl opacity-30">🔧</span>
            </div>
          )}
          {garage.is_featured && (
            <div className="absolute top-2 right-2 bg-gradient-to-r from-gold-400 to-gold-500 text-navy-900 text-xs font-semibold px-2 py-1 rounded shadow-sm">
              Featured
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start gap-3">
            {/* Logo */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-50 to-stone-100 flex items-center justify-center overflow-hidden flex-shrink-0 -mt-8 border-2 border-white shadow-md">
              {garage.logo_url ? (
                <img
                  src={garage.logo_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gold-600 font-bold text-lg">
                  {garage.display_name.charAt(0)}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-navy-900 truncate group-hover:text-gold-600 transition-colors">
                {garage.display_name}
              </h3>
              {garage.city && (
                <p className="text-sm text-navy-500">{garage.city}</p>
              )}
            </div>
          </div>

          {garage.tagline && (
            <p className="text-sm text-navy-600 mt-3 line-clamp-2">
              {garage.tagline}
            </p>
          )}

          {/* Stats & Tags */}
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-navy-500">
              <span>{garage.branch_count} location{garage.branch_count !== 1 ? "s" : ""}</span>
              {garage.year_established && (
                <span>Est. {garage.year_established}</span>
              )}
            </div>
          </div>

          {garage.specialties && garage.specialties.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {garage.specialties.slice(0, 3).map((specialty) => (
                <span
                  key={specialty}
                  className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200"
                >
                  {specialty}
                </span>
              ))}
              {garage.specialties.length > 3 && (
                <span className="text-xs text-navy-400">
                  +{garage.specialties.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
