"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Container, Button } from "@/components/ui";
import {
  api,
  MarketplaceCategoryTree,
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

export default function PublicMarketplacePage() {
  const { user, isAuthenticated } = useAuth();
  const currency = user?.chain_currency || "KES";
  const [listings, setListings] = useState<MarketplaceListingItem[]>([]);
  const [categories, setCategories] = useState<MarketplaceCategoryTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [condition, setCondition] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadListings();
  }, [selectedCategory, condition, sortBy]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [categoriesData, listingsData] = await Promise.all([
        api.marketplace.categories.list(),
        api.marketplace.listings.search({ limit: 24 }),
      ]);
      setCategories(categoriesData);
      setListings(listingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load marketplace");
    } finally {
      setLoading(false);
    }
  };

  const loadListings = async () => {
    try {
      const data = await api.marketplace.listings.search({
        category_id: selectedCategory || undefined,
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

  const flattenCategories = (cats: MarketplaceCategoryTree[]): { id: number; name: string; slug: string; depth: number }[] => {
    const result: { id: number; name: string; slug: string; depth: number }[] = [];
    const flatten = (items: MarketplaceCategoryTree[], depth: number) => {
      for (const cat of items) {
        result.push({ id: cat.id, name: cat.name, slug: cat.slug, depth });
        if (cat.children && cat.children.length > 0) {
          flatten(cat.children, depth + 1);
        }
      }
    };
    flatten(cats, 0);
    return result;
  };

  const allCategories = flattenCategories(categories);

  return (
    <Container className="py-8">
      <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
        {/* Hero Section */}
        <motion.div variants={fadeInUp} className="text-center mb-10">
          <h1 className="text-3xl lg:text-4xl font-bold text-navy-900 mb-3">
            Auto Parts Marketplace
          </h1>
          <p className="text-lg text-navy-600 max-w-2xl mx-auto">
            Find quality spare parts and consumables from verified sellers across East Africa
          </p>
        </motion.div>

        {/* Action Bar */}
        <motion.div variants={fadeInUp} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <span className="text-navy-500">
              {listings.length} {listings.length === 1 ? "listing" : "listings"} available
            </span>
          </div>
          <div className="flex gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard/marketplace/listings/new">
                <Button variant="primary">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Sell a Part
                </Button>
              </Link>
            ) : (
              <Link href="/login?redirect=/dashboard/marketplace/listings/new">
                <Button variant="primary">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Sell a Part
                </Button>
              </Link>
            )}
          </div>
        </motion.div>

        {/* Search & Filters */}
        <motion.div variants={fadeInUp} className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm mb-6">
          <form onSubmit={handleSearch} className="flex flex-col lg:flex-row gap-4">
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
                  placeholder="Search parts, brands, vehicle models..."
                  className="w-full pl-10 pr-4 py-2.5 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
              </div>
            </div>
            <select
              value={selectedCategory || ""}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
              className="px-4 py-2.5 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white"
            >
              <option value="">All Categories</option>
              {allCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {"  ".repeat(cat.depth)}{cat.name}
                </option>
              ))}
            </select>
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

        {/* Category Quick Links */}
        {categories.length > 0 && (
          <motion.div variants={fadeInUp} className="flex flex-wrap gap-2 mb-6">
            {categories.slice(0, 8).map((cat) => (
              <Link
                key={cat.id}
                href={`/marketplace/categories/${cat.slug}`}
                className="px-4 py-2 bg-white border border-navy-200 rounded-full text-sm text-navy-700 hover:border-gold-500 hover:text-gold-600 transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </motion.div>
        )}

        {/* Error Message */}
        {error && (
          <motion.div variants={fadeInUp} className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">
            {error}
          </motion.div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
          </div>
        ) : listings.length === 0 ? (
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
              {search || selectedCategory || condition
                ? "Try adjusting your filters or search terms"
                : "Be the first to list spare parts on the marketplace"}
            </p>
            {isAuthenticated ? (
              <Link href="/dashboard/marketplace/listings/new">
                <Button variant="primary">Create First Listing</Button>
              </Link>
            ) : (
              <Link href="/login?redirect=/dashboard/marketplace/listings/new">
                <Button variant="primary">Login to Sell</Button>
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {listings.map((listing) => (
              <motion.div key={listing.id} variants={fadeInUp}>
                <ListingCard listing={listing} currency={currency} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </Container>
  );
}

function ListingCard({ listing, currency }: { listing: MarketplaceListingItem; currency: string }) {
  return (
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
            {listing.seller_city && (
              <span className="text-xs text-navy-400 ml-auto">{listing.seller_city}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
