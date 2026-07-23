"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import {
  api,
  MarketplaceCategoryTree,
  MarketplaceListing,
  MarketplaceListingUpdate,
  MarketplaceListingImage,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp } from "@/lib/animations";

const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
  { value: "refurbished", label: "Refurbished" },
];

export default function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const listingId = parseInt(id);
  const router = useRouter();
  const { user } = useAuth();
  const currency = user?.chain_currency || "KES";

  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [categories, setCategories] = useState<MarketplaceCategoryTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
  const [isActive, setIsActive] = useState(true);

  // Images state
  const [existingImages, setExistingImages] = useState<MarketplaceListingImage[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  useEffect(() => {
    loadData();
  }, [listingId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [listingData, categoriesData] = await Promise.all([
        api.marketplace.listings.get(listingId),
        api.marketplace.categories.list(),
      ]);

      setListing(listingData);
      setCategories(categoriesData);
      setExistingImages(listingData.images);

      // Populate form
      setTitle(listingData.title);
      setDescription(listingData.description || "");
      setCategoryId(listingData.category_id);
      setPrice(String(listingData.price));
      setCondition(listingData.condition as "new" | "used" | "refurbished");
      setIsNegotiable(listingData.is_negotiable);
      setQuantityAvailable(String(listingData.quantity_available));
      setVehicleMake(listingData.vehicle_make || "");
      setVehicleModel(listingData.vehicle_model || "");
      setVehicleYearFrom(listingData.vehicle_year_from ? String(listingData.vehicle_year_from) : "");
      setVehicleYearTo(listingData.vehicle_year_to ? String(listingData.vehicle_year_to) : "");
      setPartNumber(listingData.part_number || "");
      setBrand(listingData.brand || "");
      setIsActive(listingData.is_active);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load listing");
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

  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + newImages.length + files.length;
    if (totalImages > 10) {
      setError("Maximum 10 images allowed");
      return;
    }

    const addedImages = [...newImages, ...files];
    setNewImages(addedImages);

    // Create previews
    const addedPreviews = files.map((file) => URL.createObjectURL(file));
    setNewImagePreviews([...newImagePreviews, ...addedPreviews]);
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(newImagePreviews[index]);
    setNewImages(newImages.filter((_, i) => i !== index));
    setNewImagePreviews(newImagePreviews.filter((_, i) => i !== index));
  };

  const deleteExistingImage = async (image: MarketplaceListingImage) => {
    if (!confirm("Delete this image?")) return;

    try {
      await api.marketplace.listings.deleteImage(listingId, image.id);
      setExistingImages(existingImages.filter((img) => img.id !== image.id));
      setSuccess("Image deleted");
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete image");
    }
  };

  const setPrimaryImage = async (image: MarketplaceListingImage) => {
    // Note: This would require a backend endpoint to set primary image
    // For now we'll just update locally
    setExistingImages(
      existingImages.map((img) => ({
        ...img,
        is_primary: img.id === image.id,
      }))
    );
    setSuccess("Primary image updated");
    setTimeout(() => setSuccess(null), 2000);
  };

  const uploadNewImages = async () => {
    if (newImages.length === 0) return;

    setUploadingImages(true);
    const imageErrors: string[] = [];

    for (let i = 0; i < newImages.length; i++) {
      try {
        const isPrimary = existingImages.length === 0 && i === 0;
        await api.marketplace.listings.uploadImage(listingId, newImages[i], isPrimary);
      } catch (err) {
        imageErrors.push(`Image ${i + 1}: ${err instanceof Error ? err.message : "Upload failed"}`);
      }
    }

    setUploadingImages(false);

    if (imageErrors.length > 0) {
      setError(`Some images failed to upload:\n${imageErrors.join("\n")}`);
    } else {
      setSuccess("Images uploaded successfully");
      // Clear new images and reload
      newImagePreviews.forEach((preview) => URL.revokeObjectURL(preview));
      setNewImages([]);
      setNewImagePreviews([]);
      loadData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

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
      const updateData: MarketplaceListingUpdate = {
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
        is_active: isActive,
      };

      await api.marketplace.listings.update(listingId, updateData);

      // Upload any new images
      if (newImages.length > 0) {
        await uploadNewImages();
      }

      setSuccess("Listing updated successfully");
      setTimeout(() => {
        router.push("/dashboard/marketplace/my-listings");
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing");
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

  if (!listing) {
    return (
      <div className="text-center py-12">
        <p className="text-navy-600">Listing not found</p>
        <Link href="/dashboard/marketplace/my-listings">
          <Button variant="primary" className="mt-4">Back to My Listings</Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/marketplace/my-listings" className="text-navy-400 hover:text-navy-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Edit Listing</h1>
          <p className="text-navy-600">Update your listing details</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 whitespace-pre-line">{error}</div>
      )}

      {success && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Status Toggle */}
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-navy-900">Listing Status</h2>
              <p className="text-sm text-navy-500">
                {isActive ? "Your listing is visible to buyers" : "Your listing is hidden from buyers"}
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gold-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gold-500"></div>
              <span className="ml-3 text-sm font-medium text-navy-700">
                {isActive ? "Active" : "Inactive"}
              </span>
            </label>
          </div>
        </div>

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
          <p className="text-sm text-navy-500 mb-4">
            {existingImages.length + newImages.length} of 10 images. Click on an existing image to set as primary.
          </p>

          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            {/* Existing Images */}
            {existingImages.map((image) => (
              <div key={image.id} className="relative aspect-square bg-navy-50 rounded-lg overflow-hidden group">
                <img src={image.url} alt="" className="w-full h-full object-cover" />
                {image.is_primary && (
                  <div className="absolute top-1 left-1 text-xs bg-gold-500 text-white px-1.5 py-0.5 rounded">
                    Primary
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {!image.is_primary && (
                    <button
                      type="button"
                      onClick={() => setPrimaryImage(image)}
                      className="w-8 h-8 bg-gold-500 text-white rounded-full flex items-center justify-center hover:bg-gold-600"
                      title="Set as primary"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteExistingImage(image)}
                    className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                    title="Delete image"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {/* New Images */}
            {newImagePreviews.map((preview, index) => (
              <div key={`new-${index}`} className="relative aspect-square bg-navy-50 rounded-lg overflow-hidden group">
                <img src={preview} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-1 left-1 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded">
                  New
                </div>
                <button
                  type="button"
                  onClick={() => removeNewImage(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}

            {/* Add Image Button */}
            {existingImages.length + newImages.length < 10 && (
              <label className="aspect-square bg-navy-50 border-2 border-dashed border-navy-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-navy-100 transition-colors">
                <svg className="w-8 h-8 text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs text-navy-500 mt-1">Add Photo</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleNewImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>

          {/* Upload Button for New Images */}
          {newImages.length > 0 && (
            <div className="mt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={uploadNewImages}
                disabled={uploadingImages}
              >
                {uploadingImages ? "Uploading..." : `Upload ${newImages.length} New Image${newImages.length > 1 ? "s" : ""}`}
              </Button>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <Link href="/dashboard/marketplace/my-listings" className="flex-1">
            <Button type="button" variant="outline" className="w-full">Cancel</Button>
          </Link>
          <Button type="submit" variant="primary" disabled={saving} className="flex-1">
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
