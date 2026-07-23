// Customer CRM types

export interface CustomerListItem {
  id: number;
  phone: string;
  name: string;
  email: string | null;
  tags: string[] | null;
  vehicle_count: number;
  job_count: number;
  total_spent: string;
  last_visit: string | null;
  created_at: string;
}

export interface CustomerVehicle {
  id: number;
  plate: string;
  make: string;
  model: string;
  year: number | null;
  job_count: number;
  last_service: string | null;
}

export interface CustomerJob {
  id: number;
  vehicle_plate: string;
  vehicle_make: string;
  vehicle_model: string;
  status: string;
  status_label: string;
  services: string[];
  total_paid: string | null;
  intake_at: string;
  completed_at: string | null;
}

export interface CustomerNote {
  id: number;
  content: string;
  is_pinned: boolean;
  created_by_id: number;
  created_by_name: string;
  created_at: string;
}

export interface CustomerDetail {
  id: number;
  phone: string;
  name: string;
  email: string | null;
  address: string | null;
  tags: string[] | null;
  consent_flags: Record<string, boolean> | null;
  created_at: string;
  vehicle_count: number;
  job_count: number;
  total_spent: string;
  last_visit: string | null;
  vehicles: CustomerVehicle[];
  recent_jobs: CustomerJob[];
  notes: CustomerNote[];
}

export interface CustomerCreate {
  phone: string;
  name: string;
  email?: string;
  address?: string;
  tags?: string[];
}

export interface CustomerUpdate {
  name?: string;
  email?: string;
  address?: string;
  tags?: string[];
}

export interface CustomerNoteCreate {
  content: string;
  is_pinned?: boolean;
}
