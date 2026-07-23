"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { api, MarketplaceListingItem, MarketplaceSeller } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp } from "@/lib/animations";

export default function MyListingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const currency = user?.chain_currency || "KES";

  const [seller, setSeller] = useState<MarketplaceSeller | null>(null);
  const [listings, setListings] = useState<MarketplaceListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const sellerProfile = await api.marketplace.sellers.getMe();
      if (!sellerProfile) {
        router.push("/dashboard/marketplace/sellers/register");
        return;
      }
      setSeller(sellerProfile);

      // Use getMyListings to include hidden listings
      const sellerListings = await api.marketplace.sellers.getMyListings();
      setListings(sellerListings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (listing: MarketplaceListingItem) => {
    try {
      await api.marketplace.listings.update(listing.id, { is_active: !listing.is_active });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing");
    }
  };

  const handleDelete = async (listing: MarketplaceListingItem) => {
    if (!confirm(`Are you sure you want to delete "${listing.title}"?`)) return;

    try {
      await api.marketplace.listings.delete(listing.id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete listing");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/marketplace" className="text-navy-400 hover:text-navy-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-navy-900">My Listings</h1>
            <p className="text-navy-600">Manage your marketplace listings</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/marketplace/sellers/register">
            <Button variant="secondary">Edit Profile</Button>
          </Link>
          <Link href="/dashboard/marketplace/listings/new">
            <Button variant="primary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Listing
            </Button>
          </Link>
        </div>
      </div>

      {/* Seller Stats */}
      {seller && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
            <p className="text-sm text-navy-500">Total Listings</p>
            <p className="text-2xl font-bold text-navy-900">{seller.listings_count}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
            <p className="text-sm text-navy-500">Active</p>
            <p className="text-2xl font-bold text-green-600">
              {listings.filter((l) => l.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
            <p className="text-sm text-navy-500">Inactive</p>
            <p className="text-2xl font-bold text-yellow-600">
              {listings.filter((l) => !l.is_active).length}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
            <p className="text-sm text-navy-500">Total Views</p>
            <p className="text-2xl font-bold text-navy-900">
              {listings.reduce((sum, l) => sum + l.views_count, 0)}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
      )}

      {/* Listings */}
      {listings.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-navy-100 shadow-sm text-center">
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
          <p className="text-navy-500 mb-4">Create your first listing to start selling</p>
          <Link href="/dashboard/marketplace/listings/new">
            <Button variant="primary">Create Listing</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className={`bg-white rounded-xl p-4 border shadow-sm flex gap-4 ${
                listing.is_active ? "border-navy-100" : "border-navy-200 opacity-70"
              }`}
            >
              {/* Image */}
              <div className="w-24 h-24 flex-shrink-0 bg-navy-50 rounded-lg overflow-hidden">
                {listing.primary_image_url ? (
                  <img
                    src={listing.primary_image_url}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-navy-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/dashboard/marketplace/listings/${listing.id}`}
                      className="font-semibold text-navy-900 hover:text-gold-600 line-clamp-1"
                    >
                      {listing.title}
                    </Link>
                    <p className="text-sm text-navy-500">{listing.category_name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!listing.is_active && (
                      <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                        Inactive
                      </span>
                    )}
                    <span className={`text-xs px-2 py-1 rounded ${
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

                <div className="flex items-center gap-4 mt-2">
                  <span className="font-bold text-gold-600">
                    {currency} {listing.price.toLocaleString()}
                  </span>
                  <span className="text-sm text-navy-400">
                    {listing.views_count} views
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Link href={`/dashboard/marketplace/listings/${listing.id}/edit`}>
                  <button className="p-2 text-navy-500 hover:text-navy-700 hover:bg-navy-50 rounded-lg transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </Link>
                <button
                  onClick={() => handleToggleActive(listing)}
                  className={`p-2 rounded-lg transition-colors ${
                    listing.is_active
                      ? "text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                      : "text-green-500 hover:text-green-700 hover:bg-green-50"
                  }`}
                  title={listing.is_active ? "Deactivate" : "Activate"}
                >
                  {listing.is_active ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(listing)}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
