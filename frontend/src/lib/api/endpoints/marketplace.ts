// Marketplace API endpoints

import { request } from "../client";
import type {
  MarketplaceCategoryTree,
  MarketplaceCategory,
  MarketplaceListingItem,
  MarketplaceListing,
  MarketplaceListingCreate,
  MarketplaceListingUpdate,
  MarketplaceListingSearchParams,
  MarketplaceListingImage,
  MarketplaceSellerItem,
  MarketplaceSeller,
  MarketplaceSellerCreate,
  MarketplaceSellerUpdate,
  MarketplaceConversationItem,
  MarketplaceConversation,
  MarketplaceConversationCreate,
  MarketplaceMessage,
} from "../types";

export const marketplaceApi = {
  // Categories
  categories: {
    list: () => request<MarketplaceCategoryTree[]>("/marketplace/categories", {}, true),
    listFlat: () => request<MarketplaceCategory[]>("/marketplace/categories/flat", {}, true),
    get: (slug: string) => request<MarketplaceCategory>(`/marketplace/categories/${slug}`, {}, true),
  },

  // Listings
  listings: {
    search: (params?: MarketplaceListingSearchParams) => {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set("search", params.search);
      if (params?.category_id) searchParams.set("category_id", String(params.category_id));
      if (params?.seller_id) searchParams.set("seller_id", String(params.seller_id));
      if (params?.condition) searchParams.set("condition", params.condition);
      if (params?.min_price) searchParams.set("min_price", String(params.min_price));
      if (params?.max_price) searchParams.set("max_price", String(params.max_price));
      if (params?.vehicle_make) searchParams.set("vehicle_make", params.vehicle_make);
      if (params?.vehicle_model) searchParams.set("vehicle_model", params.vehicle_model);
      if (params?.city) searchParams.set("city", params.city);
      if (params?.sort) searchParams.set("sort", params.sort);
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.offset) searchParams.set("offset", String(params.offset));
      const query = searchParams.toString();
      return request<MarketplaceListingItem[]>(`/marketplace/listings${query ? `?${query}` : ""}`, {}, true);
    },

    get: (id: number) => request<MarketplaceListing>(`/marketplace/listings/${id}`, {}, true),

    create: (data: MarketplaceListingCreate) =>
      request<MarketplaceListing>("/marketplace/listings", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (id: number, data: MarketplaceListingUpdate) =>
      request<MarketplaceListing>(`/marketplace/listings/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    delete: (id: number) =>
      request<void>(`/marketplace/listings/${id}`, { method: "DELETE" }),

    // Image upload
    requestImageUpload: (listingId: number, contentType: string) =>
      request<{ upload_url: string; object_key: string }>(`/marketplace/listings/${listingId}/images/upload-url`, {
        method: "POST",
        body: JSON.stringify({ content_type: contentType }),
      }),

    confirmImageUpload: (listingId: number, objectKey: string, isPrimary: boolean = false) =>
      request<MarketplaceListingImage>(`/marketplace/listings/${listingId}/images`, {
        method: "POST",
        body: JSON.stringify({ object_key: objectKey, is_primary: isPrimary }),
      }),

    uploadImage: async (listingId: number, file: File, isPrimary: boolean = false): Promise<MarketplaceListingImage> => {
      const { upload_url, object_key } = await marketplaceApi.listings.requestImageUpload(listingId, file.type);
      await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      return marketplaceApi.listings.confirmImageUpload(listingId, object_key, isPrimary);
    },

    deleteImage: (listingId: number, imageId: number) =>
      request<void>(`/marketplace/listings/${listingId}/images/${imageId}`, { method: "DELETE" }),
  },

  // Sellers
  sellers: {
    list: (params?: { city?: string; seller_type?: string; limit?: number; offset?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.city) searchParams.set("city", params.city);
      if (params?.seller_type) searchParams.set("seller_type", params.seller_type);
      if (params?.limit) searchParams.set("limit", String(params.limit));
      if (params?.offset) searchParams.set("offset", String(params.offset));
      const query = searchParams.toString();
      return request<MarketplaceSellerItem[]>(`/marketplace/sellers${query ? `?${query}` : ""}`, {}, true);
    },

    get: (id: number) => request<MarketplaceSeller>(`/marketplace/sellers/${id}`, {}, true),

    getMe: () => request<MarketplaceSeller | null>("/marketplace/sellers/me"),

    getListings: (sellerId: number, limit?: number, offset?: number) => {
      const searchParams = new URLSearchParams();
      if (limit) searchParams.set("limit", String(limit));
      if (offset) searchParams.set("offset", String(offset));
      const query = searchParams.toString();
      return request<MarketplaceListingItem[]>(`/marketplace/sellers/${sellerId}/listings${query ? `?${query}` : ""}`, {}, true);
    },

    getMyListings: (limit?: number, offset?: number) => {
      const searchParams = new URLSearchParams();
      if (limit) searchParams.set("limit", String(limit));
      if (offset) searchParams.set("offset", String(offset));
      const query = searchParams.toString();
      return request<MarketplaceListingItem[]>(`/marketplace/sellers/me/listings${query ? `?${query}` : ""}`);
    },

    create: (data: MarketplaceSellerCreate) =>
      request<MarketplaceSeller>("/marketplace/sellers", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (data: MarketplaceSellerUpdate) =>
      request<MarketplaceSeller>("/marketplace/sellers/me", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),

    // Logo upload
    requestLogoUpload: (contentType: string) =>
      request<{ upload_url: string; object_key: string }>(`/marketplace/sellers/me/logo/upload-url?content_type=${encodeURIComponent(contentType)}`, {
        method: "POST",
      }),

    confirmLogoUpload: (objectKey: string) =>
      request<MarketplaceSeller>(`/marketplace/sellers/me/logo?object_key=${encodeURIComponent(objectKey)}`, {
        method: "POST",
      }),

    uploadLogo: async (file: File): Promise<MarketplaceSeller> => {
      const { upload_url, object_key } = await marketplaceApi.sellers.requestLogoUpload(file.type);
      await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      return marketplaceApi.sellers.confirmLogoUpload(object_key);
    },
  },

  // Conversations
  conversations: {
    list: (role: "buyer" | "seller" = "buyer", includeArchived: boolean = false) => {
      const searchParams = new URLSearchParams();
      searchParams.set("role", role);
      if (includeArchived) searchParams.set("include_archived", "true");
      return request<MarketplaceConversationItem[]>(`/marketplace/conversations?${searchParams.toString()}`);
    },

    get: (id: number) => request<MarketplaceConversation>(`/marketplace/conversations/${id}`),

    start: (data: MarketplaceConversationCreate) =>
      request<MarketplaceConversation>("/marketplace/conversations", {
        method: "POST",
        body: JSON.stringify(data),
      }),

    sendMessage: (conversationId: number, content: string) =>
      request<MarketplaceMessage>(`/marketplace/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),

    markAsRead: (conversationId: number) =>
      request<void>(`/marketplace/conversations/${conversationId}/read`, { method: "POST" }),

    archive: (conversationId: number) =>
      request<void>(`/marketplace/conversations/${conversationId}/archive`, { method: "POST" }),
  },
};
