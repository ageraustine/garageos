"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import { api, MarketplaceListingItem, MarketplaceSeller } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp } from "@/lib/animations";

export default function DashboardMarketplacePage() {
  const { user } = useAuth();
  const currency = user?.chain_currency || "KES";
  const [sellerProfile, setSellerProfile] = useState<MarketplaceSeller | null>(null);
  const [myListings, setMyListings] = useState<MarketplaceListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Get seller profile
      const seller = await api.marketplace.sellers.getMe().catch(() => null);
      setSellerProfile(seller);

      if (seller) {
        // Load seller's listings (including hidden ones)
        const listings = await api.marketplace.sellers.getMyListings();
        setMyListings(listings);

        // Count unread messages
        const conversations = await api.marketplace.conversations.list("seller");
        const unread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
        setUnreadMessages(unread);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">My Marketplace</h1>
          <p className="text-navy-600">Manage your listings and messages</p>
        </div>
        <div className="flex gap-3">
          <Link href="/marketplace">
            <Button variant="outline">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Marketplace
            </Button>
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gold-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-900">{myListings.length}</p>
              <p className="text-sm text-navy-500">Active Listings</p>
            </div>
          </div>
        </div>

        <Link href="/dashboard/marketplace/messages">
          <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm hover:border-gold-300 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center relative">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                )}
              </div>
              <div>
                <p className="text-2xl font-bold text-navy-900">{unreadMessages}</p>
                <p className="text-sm text-navy-500">Unread Messages</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/marketplace">
          <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm hover:border-gold-300 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-lg font-bold text-navy-900">Explore</p>
                <p className="text-sm text-navy-500">Browse Parts</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
      )}

      {/* My Listings */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-navy-900">My Listings</h2>
        <Link href="/dashboard/marketplace/my-listings" className="text-sm text-gold-600 hover:text-gold-700">
          View All
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
        </div>
      ) : myListings.length === 0 ? (
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
          <p className="text-navy-500 mb-4">
            Start selling spare parts and consumables on the marketplace
          </p>
          <Link href="/dashboard/marketplace/listings/new">
            <Button variant="primary">Create Your First Listing</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {myListings.slice(0, 8).map((listing) => (
            <ListingCard key={listing.id} listing={listing} currency={currency} onUpdate={loadData} />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function ListingCard({
  listing,
  currency,
  onUpdate
}: {
  listing: MarketplaceListingItem;
  currency: string;
  onUpdate: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(`Delete "${listing.title}"?`)) return;

    setDeleting(true);
    try {
      await api.marketplace.listings.delete(listing.id);
      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleActive = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.marketplace.listings.update(listing.id, { is_active: !listing.is_active });
      onUpdate();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update");
    }
  };

  return (
    <div className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <Link href={`/marketplace/listings/${listing.id}`}>
        <div className="aspect-square bg-navy-50 relative cursor-pointer">
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
          {/* Status Badge */}
          {!listing.is_active && (
            <div className="absolute top-2 right-2">
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-gray-100 text-gray-600">
                Inactive
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="p-4">
        <Link href={`/marketplace/listings/${listing.id}`}>
          <h3 className="font-semibold text-navy-900 line-clamp-2 mb-1 hover:text-gold-600 cursor-pointer">
            {listing.title}
          </h3>
        </Link>
        <p className="text-sm text-navy-500 mb-2">{listing.category_name}</p>

        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-lg font-bold text-gold-600">
            {currency} {listing.price.toLocaleString()}
          </span>
          <span className="text-xs text-navy-400">{listing.views_count} views</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-3 border-t border-navy-100">
          <Link href={`/dashboard/marketplace/listings/${listing.id}/edit`} className="flex-1">
            <button className="w-full px-3 py-2 text-sm font-medium text-navy-700 bg-navy-50 hover:bg-navy-100 rounded-lg transition-colors flex items-center justify-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </button>
          </Link>
          <button
            onClick={handleToggleActive}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              listing.is_active
                ? "text-orange-600 bg-orange-50 hover:bg-orange-100"
                : "text-green-600 bg-green-50 hover:bg-green-100"
            }`}
            title={listing.is_active ? "Hide listing" : "Show listing"}
          >
            {listing.is_active ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
            title="Delete listing"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
