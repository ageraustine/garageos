"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Container, Button } from "@/components/ui";
import { api, MarketplaceListing } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp } from "@/lib/animations";

export default function PublicListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const currency = user?.chain_currency || "KES";
  const listingId = Number(params.id);

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);
  const [startingConversation, setStartingConversation] = useState(false);

  useEffect(() => {
    loadListing();
  }, [listingId]);

  const loadListing = async () => {
    try {
      setLoading(true);
      const data = await api.marketplace.listings.get(listingId);
      setListing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listing");
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = async () => {
    if (!listing) return;

    if (!isAuthenticated) {
      router.push(`/login?redirect=/marketplace/listings/${listing.id}`);
      return;
    }

    setStartingConversation(true);
    try {
      const conversation = await api.marketplace.conversations.start({
        listing_id: listing.id,
        message: `Hi, I'm interested in your listing: "${listing.title}"`,
      });
      router.push(`/dashboard/marketplace/messages?conversation=${conversation.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start conversation");
      setStartingConversation(false);
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

  if (error || !listing) {
    return (
      <Container className="py-8">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error || "Listing not found"}
        </div>
      </Container>
    );
  }

  const images = listing.images.length > 0
    ? listing.images.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    : [];

  return (
    <Container className="py-8">
      <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-navy-500 mb-6">
          <Link href="/marketplace" className="hover:text-navy-700">Marketplace</Link>
          <span>/</span>
          <Link href={`/marketplace/categories/${listing.category.slug}`} className="hover:text-navy-700">
            {listing.category.name}
          </Link>
          <span>/</span>
          <span className="text-navy-700 truncate max-w-[200px]">{listing.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Images */}
          <div>
            <div className="aspect-square bg-navy-50 rounded-xl overflow-hidden mb-4">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage].url}
                  alt={listing.title}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <svg className="w-24 h-24 text-navy-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}
            </div>
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(idx)}
                    className={`w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 ${
                      selectedImage === idx ? "border-gold-500" : "border-transparent"
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold text-navy-900">{listing.title}</h1>
              <span className={`text-sm px-3 py-1 rounded-full font-medium flex-shrink-0 ${
                listing.condition === "new"
                  ? "bg-green-100 text-green-700"
                  : listing.condition === "used"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-blue-100 text-blue-700"
              }`}>
                {listing.condition.charAt(0).toUpperCase() + listing.condition.slice(1)}
              </span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl font-bold text-gold-600">
                {listing.currency} {listing.price.toLocaleString()}
              </span>
              {listing.is_negotiable && (
                <span className="text-sm text-navy-500 bg-navy-50 px-2 py-1 rounded">
                  Negotiable
                </span>
              )}
            </div>

            {/* Vehicle Compatibility */}
            {listing.vehicle_make && (
              <div className="bg-navy-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-navy-700 mb-2">Vehicle Compatibility</h3>
                <p className="text-navy-900">
                  {listing.vehicle_make} {listing.vehicle_model || ""}
                  {listing.vehicle_year_from && (
                    <span className="text-navy-500 ml-2">
                      ({listing.vehicle_year_from}
                      {listing.vehicle_year_to && listing.vehicle_year_to !== listing.vehicle_year_from
                        ? ` - ${listing.vehicle_year_to}`
                        : ""})
                    </span>
                  )}
                </p>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {listing.part_number && (
                <div>
                  <p className="text-sm text-navy-500">Part Number</p>
                  <p className="font-medium text-navy-900">{listing.part_number}</p>
                </div>
              )}
              {listing.brand && (
                <div>
                  <p className="text-sm text-navy-500">Brand</p>
                  <p className="font-medium text-navy-900">{listing.brand}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-navy-500">Category</p>
                <p className="font-medium text-navy-900">{listing.category.name}</p>
              </div>
              <div>
                <p className="text-sm text-navy-500">Quantity Available</p>
                <p className="font-medium text-navy-900">{listing.quantity_available}</p>
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-navy-700 mb-2">Description</h3>
                <p className="text-navy-600 whitespace-pre-wrap">{listing.description}</p>
              </div>
            )}

            {/* Contact Seller */}
            <div className="bg-white border border-navy-100 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-4">
                {listing.seller.logo_url ? (
                  <img
                    src={listing.seller.logo_url}
                    alt={listing.seller.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-navy-100 rounded-full flex items-center justify-center">
                    <span className="text-lg font-bold text-navy-600">
                      {listing.seller.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <Link
                    href={`/marketplace/sellers/${listing.seller.id}`}
                    className="font-semibold text-navy-900 hover:text-gold-600 flex items-center gap-1"
                  >
                    {listing.seller.name}
                    {listing.seller.is_verified && (
                      <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </Link>
                  {listing.seller.city && (
                    <p className="text-sm text-navy-500">{listing.seller.city}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handleStartConversation}
                  disabled={startingConversation}
                >
                  {startingConversation ? (
                    "Starting..."
                  ) : !isAuthenticated ? (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Login to Message
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Message Seller
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowContactModal(true)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Modal */}
        {showContactModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-navy-900">Contact Seller</h2>
                <button onClick={() => setShowContactModal(false)} className="text-navy-400 hover:text-navy-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {listing.seller.phone && (
                  <a
                    href={`tel:${listing.seller.phone}`}
                    className="flex items-center gap-3 p-3 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors"
                  >
                    <svg className="w-5 h-5 text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="font-medium text-navy-900">{listing.seller.phone}</span>
                  </a>
                )}

                {listing.seller.whatsapp && (
                  <a
                    href={`https://wa.me/${listing.seller.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in: ${listing.title}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span className="font-medium text-green-700">WhatsApp</span>
                  </a>
                )}

                {listing.seller.email && (
                  <a
                    href={`mailto:${listing.seller.email}?subject=${encodeURIComponent(`Inquiry about: ${listing.title}`)}`}
                    className="flex items-center gap-3 p-3 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors"
                  >
                    <svg className="w-5 h-5 text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium text-navy-900">{listing.seller.email}</span>
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </Container>
  );
}
