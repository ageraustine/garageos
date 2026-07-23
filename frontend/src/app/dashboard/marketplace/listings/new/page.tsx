"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import {
  api,
  MarketplaceCategoryTree,
  MarketplaceListingCreate,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp } from "@/lib/animations";

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
];

export default function NewListingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const currency = user?.chain_currency || "KES";

  const [categories, setCategories] = useState<MarketplaceCategoryTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [price, setPrice] = useState("");
  const [condition, setCondition] = useState<"new" | "used" | "refurbished">("new");
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [quantityAvailable, setQuantityAvailable] = useState("1");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [vehicleYearFrom, setVehicleYearFrom] = useState("");
  const [vehicleYearTo, setVehicleYearTo] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await api.marketplace.categories.list();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  const flattenCategories = (cats: MarketplaceCategoryTree[]): { id: number; name: string; depth: number }[] => {
    const result: { id: number; name: string; depth: number }[] = [];
    const flatten = (items: MarketplaceCategoryTree[], depth: number) => {
      for (const cat of items) {
        result.push({ id: cat.id, name: cat.name, depth });
        if (cat.children && cat.children.length > 0) {
          flatten(cat.children, depth + 1);
        }
      }
    };
    flatten(cats, 0);
    return result;
  };

  const allCategories = flattenCategories(categories);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > 10) {
      setError("Maximum 10 images allowed");
      return;
    }

    const newImages = [...images, ...files];
    setImages(newImages);

    // Create previews
    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = imagePreviews.filter((_, i) => i !== index);
    URL.revokeObjectURL(imagePreviews[index]);
    setImages(newImages);
    setImagePreviews(newPreviews);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryId) {
      setError("Please select a category");
      return;
    }

    if (!price || parseFloat(price) <= 0) {
      setError("Please enter a valid price");
      return;
    }

    setSaving(true);
    try {
      const listingData: MarketplaceListingCreate = {
        title: title.trim(),
        description: description.trim() || undefined,
        category_id: categoryId,
        price: parseFloat(price),
        condition,
        is_negotiable: isNegotiable,
        quantity_available: parseInt(quantityAvailable) || 1,
        vehicle_make: vehicleMake.trim() || undefined,
        vehicle_model: vehicleModel.trim() || undefined,
        vehicle_year_from: vehicleYearFrom ? parseInt(vehicleYearFrom) : undefined,
        vehicle_year_to: vehicleYearTo ? parseInt(vehicleYearTo) : undefined,
        part_number: partNumber.trim() || undefined,
        brand: brand.trim() || undefined,
      };

      const listing = await api.marketplace.listings.create(listingData);

      // Upload images
      const imageErrors: string[] = [];
      for (let i = 0; i < images.length; i++) {
        try {
          await api.marketplace.listings.uploadImage(listing.id, images[i], i === 0);
        } catch (imgErr) {
          console.error("Failed to upload image:", imgErr);
          imageErrors.push(`Image ${i + 1}: ${imgErr instanceof Error ? imgErr.message : "Upload failed"}`);
        }
      }

      if (imageErrors.length > 0) {
        setError(`Listing created but some images failed to upload:\n${imageErrors.join("\n")}`);
        setSaving(false);
        return;
      }

      router.push(`/marketplace/listings/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
      setSaving(false);
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
    <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/marketplace" className="text-navy-400 hover:text-navy-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Create Listing</h1>
          <p className="text-navy-600">Add a new spare part or product to the marketplace</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Basic Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Toyota Brake Pads (Front)"
                required
                maxLength={200}
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Category *</label>
              <select
                value={categoryId || ""}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                required
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white"
              >
                <option value="">Select a category</option>
                {allCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {"  ".repeat(cat.depth)}{cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the part, condition, fitment notes, etc."
                rows={4}
                maxLength={5000}
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Pricing & Availability</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Price ({currency}) *</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Condition *</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as "new" | "used" | "refurbished")}
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white"
              >
                {CONDITIONS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Quantity Available</label>
              <input
                type="number"
                value={quantityAvailable}
                onChange={(e) => setQuantityAvailable(e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNegotiable}
                  onChange={(e) => setIsNegotiable(e.target.checked)}
                  className="w-4 h-4 text-gold-600 rounded focus:ring-gold-500"
                />
                <span className="text-sm text-navy-700">Price is negotiable</span>
              </label>
            </div>
          </div>
        </div>

        {/* Vehicle Compatibility */}
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Vehicle Compatibility (Optional)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Vehicle Make</label>
              <input
                type="text"
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                placeholder="e.g., Toyota"
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Vehicle Model</label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="e.g., Corolla"
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Year From</label>
              <input
                type="number"
                value={vehicleYearFrom}
                onChange={(e) => setVehicleYearFrom(e.target.value)}
                placeholder="e.g., 2015"
                min="1900"
                max="2030"
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Year To</label>
              <input
                type="number"
                value={vehicleYearTo}
                onChange={(e) => setVehicleYearTo(e.target.value)}
                placeholder="e.g., 2020"
                min="1900"
                max="2030"
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
          </div>
        </div>

        {/* Part Details */}
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Part Details (Optional)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Part Number / OEM</label>
              <input
                type="text"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                placeholder="e.g., 04465-12590"
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., Toyota Genuine"
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Images</h2>
          <p className="text-sm text-navy-500 mb-4">Add up to 10 photos. First image will be the cover.</p>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative aspect-square bg-navy-50 rounded-lg overflow-hidden group">
                <img src={preview} alt="" className="w-full h-full object-cover" />
                {index === 0 && (
                  <div className="absolute top-1 left-1 text-xs bg-gold-500 text-white px-1.5 py-0.5 rounded">
                    Cover
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {images.length < 10 && (
              <label className="aspect-square bg-navy-50 border-2 border-dashed border-navy-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-navy-100 transition-colors">
                <svg className="w-8 h-8 text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs text-navy-500 mt-1">Add Photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Link href="/dashboard/marketplace" className="flex-1">
            <Button type="button" variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" variant="primary" disabled={saving} className="flex-1">
            {saving ? "Creating..." : "Create Listing"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
