// Public garage profile types

export interface BranchPublic {
  id: number;
  name: string;
  address?: string;
  city?: string;
  geo_lat?: number;
  geo_lng?: number;
  phone?: string;
  whatsapp?: string;
  operating_hours?: Record<string, string>;
  image_url?: string;
  bays: number;
}

export interface ServicePublic {
  id: number;
  name: string;
  description?: string;
  stages: string[];
}

export interface GarageListItem {
  id: number;
  slug: string;
  display_name: string;
  tagline?: string;
  logo_url?: string;
  cover_image_url?: string;
  city?: string;
  specialties?: string[];
  branch_count: number;
  is_featured: boolean;
  year_established?: number;
}

export interface GarageProfile {
  id: number;
  slug: string;
  display_name: string;

  // Hero
  tagline?: string;
  logo_url?: string;
  cover_image_url?: string;
  primary_color?: string;
  accent_color?: string;

  // About
  description?: string;
  year_established?: number;
  specialties?: string[];

  // Contact
  phone?: string;
  whatsapp?: string;
  email?: string;

  // Location
  address?: string;
  city?: string;

  // Online presence
  website?: string;
  social_links?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
    youtube?: string;
  };

  // Gallery
  gallery_images?: string[];

  // Operating hours
  operating_hours?: Record<string, string>;

  // Stats
  branch_count: number;
  total_jobs_completed: number;
  years_in_business?: number;

  // Related data
  branches: BranchPublic[];
  services: ServicePublic[];

  is_featured: boolean;
  created_at: string;
}

export interface GarageListResponse {
  items: GarageListItem[];
  total: number;
  limit: number;
  offset: number;
}
