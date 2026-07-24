// Auth-related types

export interface CheckNameResponse {
  available: boolean;
  suggestion: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface UserResponse {
  id: number;
  name: string;
  phone: string;
  role: string;
  chain_id: number | null;  // Null for external sellers
  chain_name: string | null;
  chain_display_name: string | null;
  chain_currency: string;
  branch_id: number | null;
  is_external_seller: boolean;
}

export interface ChainSettingsUpdate {
  // Basic settings
  display_name?: string;
  currency?: string;
  branding?: {
    logo_url?: string;
    primary_color?: string;
    accent_color?: string;
  } | null;

  // Public profile - Hero
  tagline?: string;
  cover_image_url?: string;

  // Public profile - About
  description?: string;
  year_established?: number;
  specialties?: string[];

  // Public profile - Contact
  phone?: string;
  whatsapp?: string;
  email?: string;

  // Public profile - Location
  address?: string;
  city?: string;

  // Public profile - Online presence
  website?: string;
  social_links?: Record<string, string>;

  // Public profile - Gallery & Hours
  gallery_images?: string[];
  operating_hours?: Record<string, string>;

  // Visibility
  is_public?: boolean;
}

export interface ChainSettingsResponse {
  id: number;
  name: string;
  display_name: string;
  currency: string;
  branding: {
    logo_url?: string;
    primary_color?: string;
    accent_color?: string;
  } | null;

  // Public profile fields
  tagline?: string;
  cover_image_url?: string;
  description?: string;
  year_established?: number;
  specialties?: string[];
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  city?: string;
  website?: string;
  social_links?: Record<string, string>;
  gallery_images?: string[];
  operating_hours?: Record<string, string>;
  is_public: boolean;
  is_featured: boolean;
}

export interface RegisterData {
  chain_name: string;
  display_name: string;
  owner_name: string;
  phone: string;
  email: string;
  pin: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface VerifyEmailResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface RegisterSellerData {
  name: string;
  phone: string;
  pin: string;
  email?: string;
  city?: string;
  whatsapp?: string;
}

export interface ProfileUpdate {
  name?: string;
}

export interface ChangePinRequest {
  current_pin: string;
  new_pin: string;
}
