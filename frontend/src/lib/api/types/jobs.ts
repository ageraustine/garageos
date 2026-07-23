// Job-related types

export interface AssignedEmployee {
  id: number;
  name: string;
  role: string;
}

export interface JobCreateData {
  plate: string;
  vehicle_make?: string;
  vehicle_model?: string;
  branch_id: number;
  advisor_id: number;
  service_ids: number[];
  assigned_employee_ids?: number[];
  customer_name?: string;
  customer_phone?: string;
}

export interface JobCreateResponse {
  job_id: number;
  magic_link_token: string;
}

export interface JobResponse {
  id: number;
  vehicle_id: number;
  branch_id: number;
  advisor_id: number;
  assigned_mechanic_id: number | null;
  status: string;
  intake_at: string;
  promised_ready_at: string | null;
  actual_ready_at: string | null;
  magic_link_token: string;
  created_at: string;
}

export interface JobListItem {
  id: number;
  plate: string;
  vehicle_make: string;
  vehicle_model: string;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  status_label: string;
  intake_at: string;
  promised_ready_at: string | null;
  magic_link_token: string;
  services: string[];
  assigned_employees: AssignedEmployee[];
  created_at: string;
}

export interface QuotationTemplateItem {
  id: number;
  name: string;
  price: number;
  is_labor: boolean;
}

export interface JobServiceDetail {
  id: number;
  service_id: number;
  service_name: string;
  stages: { id: number; name: string; order: number }[];
  current_stage_id: number | null;
  current_stage_name: string | null;
  completed_stage_ids: number[];
  quotation_items: QuotationTemplateItem[];
  started_at: string | null;
  completed_at: string | null;
}

export interface StageToggleResponse {
  stage_id: number;
  completed: boolean;
  completed_stage_ids: number[];
}

export interface JobDetail {
  id: number;
  plate: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  status: string;
  status_label: string;
  next_statuses: string[];
  intake_at: string;
  promised_ready_at: string | null;
  actual_ready_at: string | null;
  magic_link_token: string;
  services: JobServiceDetail[];
  assigned_employees: AssignedEmployee[];
  has_estimate: boolean;
  estimate_approved: boolean;
  created_at: string;
}
