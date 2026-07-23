// Marketplace types

export interface MarketplaceCategory {
  id: number;
  parent_id: number | null;
  name: string;
  slug: string;
  icon: string | null;
  sort_order: number;
  listings_count: number;
}

export interface MarketplaceCategoryTree extends MarketplaceCategory {
  children: MarketplaceCategoryTree[];
}

export interface MarketplaceSellerItem {
  id: number;
  seller_type: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  is_verified: boolean;
  listings_count: number;
}

export interface MarketplaceSeller {
  id: number;
  seller_type: string;
  chain_id: number | null;
  name: string;
  description: string | null;
  logo_url: string | null;
  phone: string;
  email: string | null;
  whatsapp: string | null;
  location: string | null;
  city: string | null;
  is_verified: boolean;
  is_active: boolean;
  listings_count: number;
  created_at: string;
}

export interface MarketplaceSellerCreate {
  seller_type: string;
  chain_id?: number;
  name: string;
  description?: string;
  phone: string;
  email?: string;
  whatsapp?: string;
  location?: string;
  city?: string;
}

export interface MarketplaceSellerUpdate {
  name?: string;
  description?: string;
  logo_url?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  location?: string;
  city?: string;
  is_active?: boolean;
}

export interface MarketplaceListingImage {
  id: number;
  url: string;
  sort_order: number;
  is_primary: boolean;
}

export interface MarketplaceListingSellerInfo {
  id: number;
  name: string;
  logo_url: string | null;
  phone: string;
  email: string | null;
  whatsapp: string | null;
  city: string | null;
  is_verified: boolean;
}

export interface MarketplaceListingCategoryInfo {
  id: number;
  name: string;
  slug: string;
}

export interface MarketplaceListing {
  id: number;
  seller_id: number;
  category_id: number;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  condition: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year_from: number | null;
  vehicle_year_to: number | null;
  part_number: string | null;
  brand: string | null;
  quantity_available: number;
  is_negotiable: boolean;
  is_active: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
  seller: MarketplaceListingSellerInfo;
  category: MarketplaceListingCategoryInfo;
  images: MarketplaceListingImage[];
}

export interface MarketplaceListingItem {
  id: number;
  title: string;
  price: number;
  currency: string;
  condition: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  is_negotiable: boolean;
  is_active: boolean;
  views_count: number;
  created_at: string;
  primary_image_url: string | null;
  seller_id: number;
  seller_name: string;
  seller_city: string | null;
  seller_is_verified: boolean;
  category_name: string;
}

export interface MarketplaceListingCreate {
  category_id: number;
  title: string;
  description?: string;
  price: number;
  currency?: string;
  condition?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year_from?: number;
  vehicle_year_to?: number;
  part_number?: string;
  brand?: string;
  quantity_available?: number;
  is_negotiable?: boolean;
}

export interface MarketplaceListingUpdate {
  category_id?: number;
  title?: string;
  description?: string;
  price?: number;
  condition?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year_from?: number;
  vehicle_year_to?: number;
  part_number?: string;
  brand?: string;
  quantity_available?: number;
  is_negotiable?: boolean;
  is_active?: boolean;
}

export interface MarketplaceListingSearchParams {
  search?: string;
  category_id?: number;
  seller_id?: number;
  condition?: string;
  min_price?: number;
  max_price?: number;
  vehicle_make?: string;
  vehicle_model?: string;
  city?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export interface MarketplaceMessage {
  id: number;
  sender_type: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export interface MarketplaceConversationListingInfo {
  id: number;
  title: string;
  price: number;
  primary_image_url: string | null;
}

export interface MarketplaceConversationSellerInfo {
  id: number;
  name: string;
  logo_url: string | null;
}

export interface MarketplaceConversationBuyerInfo {
  id: number | null;
  name: string | null;
  phone: string | null;
}

export interface MarketplaceConversation {
  id: number;
  listing: MarketplaceConversationListingInfo;
  seller: MarketplaceConversationSellerInfo;
  buyer: MarketplaceConversationBuyerInfo;
  messages: MarketplaceMessage[];
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
}

export interface MarketplaceConversationItem {
  id: number;
  listing_id: number;
  listing_title: string;
  listing_image_url: string | null;
  other_party_name: string;
  other_party_logo_url: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  is_archived: boolean;
}

export interface MarketplaceConversationCreate {
  listing_id: number;
  message: string;
  buyer_phone?: string;
  buyer_name?: string;
}
