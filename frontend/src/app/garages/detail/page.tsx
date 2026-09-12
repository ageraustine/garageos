"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { api, GarageProfile, BranchPublic, ServicePublic } from "@/lib/api";

// Icons
const PhoneIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const EmailIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const LocationIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const WebsiteIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
  </svg>
);

export default function GarageProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [garage, setGarage] = useState<GarageProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"about" | "services" | "locations" | "gallery">("about");

  useEffect(() => {
    const loadGarage = async () => {
      try {
        const profile = await api.garages.getBySlug(slug);
        setGarage(profile);
      } catch (err) {
        setError("Garage not found");
      } finally {
        setLoading(false);
      }
    };
    loadGarage();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !garage) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔧</div>
          <h1 className="text-2xl font-bold text-navy-900 mb-2">Garage Not Found</h1>
          <p className="text-navy-500 mb-6">This garage doesn't exist or isn't public.</p>
          <Link
            href="/garages"
            className="text-gold-600 hover:text-gold-700 transition-colors font-medium"
          >
            &larr; Back to all garages
          </Link>
        </div>
      </div>
    );
  }

  const primaryColor = garage.primary_color || "#d4af37";

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 via-amber-50/20 to-white">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href="/garages"
              className="text-navy-600 hover:text-navy-900 transition-colors flex items-center gap-2 font-medium"
            >
              <span>&larr;</span>
              <span>All Garages</span>
            </Link>
            <div className="flex items-center gap-4">
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

      {/* Hero Section */}
      <div className="relative">
        {/* Cover Image */}
        <div className="h-64 md:h-80 bg-gradient-to-br from-amber-100 via-stone-100 to-amber-50 relative overflow-hidden">
          {garage.cover_image_url ? (
            <img
              src={garage.cover_image_url}
              alt={garage.display_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-8xl opacity-10">🔧</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/50 to-transparent" />
        </div>

        {/* Profile Info */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            {/* Logo */}
            <div
              className="w-32 h-32 rounded-2xl bg-white border-4 flex items-center justify-center overflow-hidden shadow-xl"
              style={{ borderColor: primaryColor }}
            >
              {garage.logo_url ? (
                <img
                  src={garage.logo_url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gold-600 font-bold text-5xl">
                  {garage.display_name.charAt(0)}
                </span>
              )}
            </div>

            {/* Name & Info */}
            <div className="flex-1 pt-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl md:text-4xl font-bold text-navy-900">
                  {garage.display_name}
                </h1>
                {garage.is_featured && (
                  <span className="bg-gradient-to-r from-gold-400 to-gold-500 text-navy-900 text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
                    Featured
                  </span>
                )}
              </div>
              {garage.tagline && (
                <p className="text-xl text-navy-600 mt-2">{garage.tagline}</p>
              )}

              {/* Quick Stats */}
              <div className="flex flex-wrap gap-6 mt-4 text-sm">
                {garage.years_in_business && (
                  <div className="text-navy-500">
                    <span className="text-navy-900 font-semibold">{garage.years_in_business}+</span> years
                  </div>
                )}
                <div className="text-navy-500">
                  <span className="text-navy-900 font-semibold">{garage.branch_count}</span> location{garage.branch_count !== 1 ? "s" : ""}
                </div>
                {garage.total_jobs_completed > 0 && (
                  <div className="text-navy-500">
                    <span className="text-navy-900 font-semibold">{garage.total_jobs_completed.toLocaleString()}</span> jobs completed
                  </div>
                )}
                {garage.city && (
                  <div className="text-navy-500 flex items-center gap-1">
                    <LocationIcon />
                    {garage.city}
                  </div>
                )}
              </div>

              {/* Specialties */}
              {garage.specialties && garage.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {garage.specialties.map((specialty) => (
                    <span
                      key={specialty}
                      className="text-sm bg-amber-50 text-amber-700 px-3 py-1 rounded-full border border-amber-200"
                    >
                      {specialty}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Contact Buttons */}
            <div className="flex flex-col gap-3 mt-4 md:mt-0">
              {garage.phone && (
                <a
                  href={`tel:${garage.phone}`}
                  className="flex items-center gap-2 bg-gradient-to-r from-gold-400 to-gold-500 hover:from-gold-500 hover:to-gold-600 text-navy-900 px-6 py-3 rounded-xl font-semibold transition-all shadow-md shadow-gold-500/20"
                >
                  <PhoneIcon />
                  Call Now
                </a>
              )}
              {garage.whatsapp && (
                <a
                  href={`https://wa.me/${garage.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-md"
                >
                  <WhatsAppIcon />
                  WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-stone-200 mt-8 sticky top-[65px] bg-white/95 backdrop-blur-md z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 overflow-x-auto">
            {[
              { id: "about", label: "About" },
              { id: "services", label: "Services" },
              { id: "locations", label: "Locations" },
              ...(garage.gallery_images?.length ? [{ id: "gallery", label: "Gallery" }] : []),
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "border-gold-500 text-gold-600"
                    : "border-transparent text-navy-500 hover:text-navy-900"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {activeTab === "about" && <AboutSection garage={garage} />}
        {activeTab === "services" && <ServicesSection services={garage.services} />}
        {activeTab === "locations" && <LocationsSection branches={garage.branches} garage={garage} />}
        {activeTab === "gallery" && <GallerySection images={garage.gallery_images || []} />}
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

function AboutSection({ garage }: { garage: GarageProfile }) {
  return (
    <div className="grid md:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="md:col-span-2 space-y-8">
        {garage.description && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-navy-900 mb-4">About Us</h2>
            <div className="prose prose-stone max-w-none">
              <p className="text-navy-600 whitespace-pre-line">{garage.description}</p>
            </div>
          </motion.div>
        )}

        {/* Operating Hours */}
        {garage.operating_hours && Object.keys(garage.operating_hours).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-navy-900 mb-4">Operating Hours</h2>
            <div className="grid grid-cols-2 gap-2">
              {["mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((day) => {
                const hours = garage.operating_hours?.[day];
                const dayNames: Record<string, string> = {
                  mon: "Monday",
                  tue: "Tuesday",
                  wed: "Wednesday",
                  thu: "Thursday",
                  fri: "Friday",
                  sat: "Saturday",
                  sun: "Sunday",
                };
                return (
                  <div key={day} className="flex justify-between py-2 border-b border-stone-100 last:border-0">
                    <span className="text-navy-500">{dayNames[day]}</span>
                    <span className={hours ? "text-navy-900 font-medium" : "text-navy-400"}>
                      {hours || "Closed"}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Contact</h2>
          <div className="space-y-4">
            {garage.phone && (
              <a
                href={`tel:${garage.phone}`}
                className="flex items-center gap-3 text-navy-600 hover:text-gold-600 transition-colors"
              >
                <PhoneIcon />
                {garage.phone}
              </a>
            )}
            {garage.whatsapp && (
              <a
                href={`https://wa.me/${garage.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-navy-600 hover:text-green-600 transition-colors"
              >
                <WhatsAppIcon />
                {garage.whatsapp}
              </a>
            )}
            {garage.email && (
              <a
                href={`mailto:${garage.email}`}
                className="flex items-center gap-3 text-navy-600 hover:text-gold-600 transition-colors"
              >
                <EmailIcon />
                {garage.email}
              </a>
            )}
            {garage.website && (
              <a
                href={garage.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-navy-600 hover:text-gold-600 transition-colors"
              >
                <WebsiteIcon />
                Visit Website
              </a>
            )}
            {garage.address && (
              <div className="flex items-start gap-3 text-navy-600">
                <LocationIcon />
                {garage.address}
              </div>
            )}
          </div>
        </motion.div>

        {/* Social Links */}
        {garage.social_links && Object.keys(garage.social_links).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Follow Us</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(garage.social_links).map(([platform, url]) => (
                url && (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-stone-100 hover:bg-gold-100 text-navy-700 hover:text-gold-700 px-4 py-2 rounded-lg capitalize transition-colors"
                  >
                    {platform}
                  </a>
                )
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function ServicesSection({ services }: { services: ServicePublic[] }) {
  if (services.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4 opacity-50">🔧</div>
        <p className="text-navy-500">No services listed yet.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service, index) => (
        <motion.div
          key={service.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white rounded-2xl p-6 border border-stone-200 shadow-sm hover:shadow-md hover:border-gold-300 transition-all"
        >
          <h3 className="text-lg font-semibold text-navy-900 mb-2">{service.name}</h3>
          {service.description && (
            <p className="text-navy-500 text-sm mb-4">{service.description}</p>
          )}
          {service.stages.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-navy-400 uppercase tracking-wide font-medium">Process</p>
              <div className="flex flex-wrap gap-2">
                {service.stages.map((stage, i) => (
                  <span
                    key={i}
                    className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full border border-amber-200"
                  >
                    {i + 1}. {stage}
                  </span>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function LocationsSection({ branches, garage }: { branches: BranchPublic[]; garage: GarageProfile }) {
  if (branches.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4 opacity-50">📍</div>
        <p className="text-navy-500">No locations listed yet.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {branches.map((branch, index) => (
        <motion.div
          key={branch.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white rounded-2xl overflow-hidden border border-stone-200 shadow-sm hover:shadow-md transition-all"
        >
          {/* Branch Image */}
          <div className="h-40 bg-gradient-to-br from-amber-100 to-stone-100 relative">
            {branch.image_url ? (
              <img
                src={branch.image_url}
                alt={branch.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl opacity-30">🏪</span>
              </div>
            )}
          </div>

          <div className="p-6">
            <h3 className="text-lg font-semibold text-navy-900 mb-4">{branch.name}</h3>

            <div className="space-y-3 text-sm">
              {branch.address && (
                <div className="flex items-start gap-3 text-navy-600">
                  <LocationIcon />
                  <span>{branch.address}{branch.city ? `, ${branch.city}` : ""}</span>
                </div>
              )}
              {branch.phone && (
                <a
                  href={`tel:${branch.phone}`}
                  className="flex items-center gap-3 text-navy-600 hover:text-gold-600 transition-colors"
                >
                  <PhoneIcon />
                  {branch.phone}
                </a>
              )}
              {branch.whatsapp && (
                <a
                  href={`https://wa.me/${branch.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-navy-600 hover:text-green-600 transition-colors"
                >
                  <WhatsAppIcon />
                  {branch.whatsapp}
                </a>
              )}
              <div className="text-navy-500">
                {branch.bays} service bay{branch.bays !== 1 ? "s" : ""}
              </div>
            </div>

            {/* Branch Hours (if different from main) */}
            {branch.operating_hours && Object.keys(branch.operating_hours).length > 0 && (
              <div className="mt-4 pt-4 border-t border-stone-100">
                <p className="text-xs text-navy-400 uppercase tracking-wide font-medium mb-2">Hours</p>
                <div className="text-sm text-navy-600">
                  {Object.entries(branch.operating_hours).slice(0, 2).map(([day, hours]) => (
                    <span key={day} className="mr-2">
                      {day}: {hours}
                    </span>
                  ))}
                  ...
                </div>
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function GallerySection({ images }: { images: string[] }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  if (images.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-4 opacity-50">📷</div>
        <p className="text-navy-500">No photos available yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image, index) => (
          <motion.button
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => setSelectedImage(image)}
            className="aspect-square rounded-2xl overflow-hidden bg-stone-100 hover:ring-2 hover:ring-gold-400 transition-all shadow-sm"
          >
            <img
              src={image}
              alt={`Gallery image ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </motion.button>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white text-3xl hover:text-gold-400 transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            &times;
          </button>
          <img
            src={selectedImage}
            alt="Gallery"
            className="max-w-full max-h-full rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
