"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Container } from "@/components/ui";
import { api, MarketplaceSeller, MarketplaceListingItem } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp, staggerContainer } from "@/lib/animations";

export default function PublicSellerStorefrontPage() {
  const params = useParams();
  const { user } = useAuth();
  const currency = user?.chain_currency || "KES";
  const sellerId = Number(params.id);

  const [seller, setSeller] = useState<MarketplaceSeller | null>(null);
  const [listings, setListings] = useState<MarketplaceListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [sellerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sellerData, listingsData] = await Promise.all([
        api.marketplace.sellers.get(sellerId),
        api.marketplace.sellers.getListings(sellerId),
      ]);
      setSeller(sellerData);
      setListings(listingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load seller");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
        </div>
      </Container>
    );
  }

  if (error || !seller) {
    return (
      <Container className="py-8">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error || "Seller not found"}
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-8">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
        {/* Breadcrumb */}
        <motion.div variants={fadeInUp} className="flex items-center gap-2 text-sm text-navy-500 mb-6">
          <Link href="/marketplace" className="hover:text-navy-700">Marketplace</Link>
          <span>/</span>
          <span className="text-navy-700">Sellers</span>
          <span>/</span>
          <span className="text-navy-700 truncate max-w-[200px]">{seller.name}</span>
        </motion.div>

        {/* Seller Header */}
        <motion.div variants={fadeInUp} className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm mb-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            {/* Logo */}
            {seller.logo_url ? (
              <img
                src={seller.logo_url}
                alt={seller.name}
                className="w-20 h-20 rounded-xl object-cover"
              />
            ) : (
              <div className="w-20 h-20 bg-navy-100 rounded-xl flex items-center justify-center">
                <span className="text-3xl font-bold text-navy-600">
                  {seller.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold text-navy-900">{seller.name}</h1>
                {seller.is_verified && (
                  <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
              </div>

              {seller.city && (
                <p className="text-navy-500 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {seller.city}
                  {seller.location && ` - ${seller.location}`}
                </p>
              )}

              {seller.description && (
                <p className="text-navy-600 mt-3">{seller.description}</p>
              )}

              {/* Stats */}
              <div className="flex items-center gap-6 mt-4">
                <div>
                  <span className="text-2xl font-bold text-navy-900">{seller.listings_count}</span>
                  <span className="text-sm text-navy-500 ml-1">listings</span>
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="flex flex-col gap-2 w-full md:w-auto">
              {seller.phone && (
                <a
                  href={`tel:${seller.phone}`}
                  className="flex items-center gap-2 px-4 py-2 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm font-medium text-navy-700">{seller.phone}</span>
                </a>
              )}

              {seller.whatsapp && (
                <a
                  href={`https://wa.me/${seller.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <span className="text-sm font-medium text-green-700">WhatsApp</span>
                </a>
              )}

              {seller.email && (
                <a
                  href={`mailto:${seller.email}`}
                  className="flex items-center gap-2 px-4 py-2 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors"
                >
                  <svg className="w-5 h-5 text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-medium text-navy-700">Email</span>
                </a>
              )}
            </div>
          </div>
        </motion.div>

        {/* Listings */}
        <motion.div variants={fadeInUp} className="mb-4">
          <h2 className="text-lg font-semibold text-navy-900">
            Listings ({listings.length})
          </h2>
        </motion.div>

        {listings.length === 0 ? (
          <motion.div variants={fadeInUp} className="bg-white rounded-xl p-12 border border-navy-100 shadow-sm text-center">
            <svg
              className="w-16 h-16 mx-auto text-navy-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
            <h3 className="text-lg font-semibold text-navy-900 mb-2">No listings yet</h3>
            <p className="text-navy-500">This seller hasn't added any listings</p>
          </motion.div>
        ) : (
          <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <motion.div key={listing.id} variants={fadeInUp}>
                <Link href={`/marketplace/listings/${listing.id}`}>
                  <div className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden hover:shadow-md hover:border-gold-300 transition-all cursor-pointer h-full">
                    {/* Image */}
                    <div className="aspect-square bg-navy-50 relative">
                      {listing.primary_image_url ? (
                        <img
                          src={listing.primary_image_url}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-16 h-16 text-navy-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={1.5}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                      {/* Condition Badge */}
                      <div className="absolute top-2 left-2">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          listing.condition === "new"
                            ? "bg-green-100 text-green-700"
                            : listing.condition === "used"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {listing.condition.charAt(0).toUpperCase() + listing.condition.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <h3 className="font-semibold text-navy-900 line-clamp-2 mb-1">{listing.title}</h3>
                      <p className="text-sm text-navy-500 mb-2">{listing.category_name}</p>

                      {/* Price */}
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-gold-600">
                          {currency} {listing.price.toLocaleString()}
                        </span>
                        {listing.is_negotiable && (
                          <span className="text-xs text-navy-400">Negotiable</span>
                        )}
                      </div>

                      {/* Vehicle Compatibility */}
                      {listing.vehicle_make && (
                        <p className="text-xs text-navy-400 mt-2">
                          Fits: {listing.vehicle_make} {listing.vehicle_model || ""}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </Container>
  );
}
