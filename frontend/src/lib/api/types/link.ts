// Customer Magic Link types

export interface LinkVehicle {
  plate: string;
  make: string;
  model: string;
  year: number | null;
}

export interface LinkLineItem {
  id: number;
  kind: "critical" | "optional";
  label: string;
  price: string;
  is_labor: boolean;
  media_url: string | null;
}

export interface LinkEstimate {
  id: number;
  version: number;
  approved: boolean;
  approved_at: string | null;
  total_approved: string | null;
  critical_total: string;
  optional_total: string;
  line_items: LinkLineItem[];
}

export interface LinkMedia {
  id: number;
  type: "photo" | "voice";
  url: string;
  created_at: string;
}

export interface LinkStage {
  id: number;
  name: string;
  order: number;
  completed: boolean;
}

export interface LinkService {
  name: string;
  stages: LinkStage[];
  completed_count: number;
  total_count: number;
}

export interface CustomerJobResponse {
  status: string;
  status_label: string;
  intake_at: string;
  promised_ready_at: string | null;
  vehicle: LinkVehicle;
  services: LinkService[];
  estimate: LinkEstimate | null;
  media: LinkMedia[];
  branch_name: string | null;
  chain_name: string | null;
  currency: string;
  can_approve: boolean;
}

export interface EstimateApproveResponse {
  approved: boolean;
  total_approved: string;
  approved_at: string;
}
