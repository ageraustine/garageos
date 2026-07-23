// Public garage API endpoints (no auth required)

import { request } from "../client";
import type { GarageListResponse, GarageProfile } from "../types/garages";

export interface GarageListParams {
  city?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const garagesApi = {
  /**
   * List all public garages
   */
  list: async (params: GarageListParams = {}): Promise<GarageListResponse> => {
    const searchParams = new URLSearchParams();
    if (params.city) searchParams.set("city", params.city);
    if (params.search) searchParams.set("search", params.search);
    if (params.limit) searchParams.set("limit", params.limit.toString());
    if (params.offset) searchParams.set("offset", params.offset.toString());

    const query = searchParams.toString();
    return request<GarageListResponse>(
      `/garages${query ? `?${query}` : ""}`,
      { method: "GET" },
      true // skipAuth - public endpoint
    );
  },

  /**
   * Get list of cities with public garages
   */
  getCities: async (): Promise<string[]> => {
    return request<string[]>(
      "/garages/cities",
      { method: "GET" },
      true // skipAuth
    );
  },

  /**
   * Get full garage profile by slug
   */
  getBySlug: async (slug: string): Promise<GarageProfile> => {
    return request<GarageProfile>(
      `/garages/${encodeURIComponent(slug)}`,
      { method: "GET" },
      true // skipAuth
    );
  },
};
