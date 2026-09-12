"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Container, Button } from "@/components/ui";
import {
  api,
  MarketplaceCategory,
  MarketplaceListingItem,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp, staggerContainer } from "@/lib/animations";

const CONDITIONS = [
  { value: "", label: "All Conditions" },
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
];

export default function CategoryPage() {
  const params = useParams();
  const { user } = useAuth();
  const currency = user?.chain_currency || "KES";
  const slug = params.slug as string;

  const [category, setCategory] = useState<MarketplaceCategory | null>(null);
  const [listings, setListings] = useState<MarketplaceListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [condition, setCondition] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    loadInitialData();
  }, [slug]);

  useEffect(() => {
    if (category) {
      loadListings();
    }
  }, [category, condition, sortBy]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const categoryData = await api.marketplace.categories.get(slug);
      setCategory(categoryData);

      const listingsData = await api.marketplace.listings.search({
        category_id: categoryData.id,
        limit: 24,
      });
      setListings(listingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load category");
    } finally {
      setLoading(false);
    }
  };

  const loadListings = async () => {
    if (!category) return;

    try {
      const data = await api.marketplace.listings.search({
        category_id: category.id,
        condition: condition || undefined,
        search: search || undefined,
        sort: sortBy as "newest" | "price_asc" | "price_desc",
        limit: 24,
      });
      setListings(data);
    } catch (err) {
      console.error("Failed to load listings:", err);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadListings();
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

  if (error || !category) {
    return (
      <Container className="py-8">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          {error || "Category not found"}
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
          <span className="text-navy-700">{category.name}</span>
        </motion.div>

        {/* Header */}
        <motion.div variants={fadeInUp} className="mb-6">
          <h1 className="text-2xl lg:text-3xl font-bold text-navy-900 mb-2">
            {category.name}
          </h1>
          <p className="text-navy-500">
            {listings.length} {listings.length === 1 ? "listing" : "listings"} in this category
          </p>
        </motion.div>

        {/* Search & Filters */}
        <motion.div variants={fadeInUp} className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm mb-6">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={`Search in ${category.name}...`}
                  className="w-full pl-10 pr-4 py-2.5 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
              </div>
            </div>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              className="px-4 py-2.5 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white"
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2.5 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
            <Button type="submit" variant="primary">Search</Button>
          </form>
        </motion.div>

        {/* Listings */}
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
            <h3 className="text-lg font-semibold text-navy-900 mb-2">No listings found</h3>
            <p className="text-navy-500 mb-4">
              {search || condition
                ? "Try adjusting your filters or search terms"
                : `No listings in ${category.name} yet`}
            </p>
            <Link href="/marketplace">
              <Button variant="outline">Browse All Listings</Button>
            </Link>
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
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

                      {/* Price */}
                      <div className="flex items-center justify-between mt-2">
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

                      {/* Seller Info */}
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-navy-100">
                        <div className="w-6 h-6 bg-navy-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-navy-600">
                            {listing.seller_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-sm text-navy-600 truncate">{listing.seller_name}</span>
                        {listing.seller_is_verified && (
                          <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                      </div>
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
