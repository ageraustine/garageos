// Branch-related types

export interface BranchListItem {
  id: number;
  name: string;
}

export interface BranchResponse {
  id: number;
  name: string;
  bays: number;
  geo_lat: number | null;
  geo_lng: number | null;
  employee_count: number;
  created_at: string;
}

export interface BranchCreate {
  name: string;
  bays?: number;
  geo_lat?: number | null;
  geo_lng?: number | null;
}

export interface BranchUpdate {
  name?: string;
  bays?: number;
  geo_lat?: number | null;
  geo_lng?: number | null;
}
