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
  display_name?: string;
  currency?: string;
  branding?: {
    logo_url?: string;
    primary_color?: string;
    accent_color?: string;
  } | null;
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
}

export interface RegisterData {
  chain_name: string;
  display_name: string;
  owner_name: string;
  phone: string;
  pin: string;
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
