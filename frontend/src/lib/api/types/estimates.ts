// Estimate-related types

export interface LineItem {
  id: number;
  kind: "critical" | "optional";
  label: string;
  price: string;
  is_labor: boolean;
  justification_media_id: number | null;
}

export interface ApproverInfo {
  id: number;
  name: string;
  role: string;
}

export interface Estimate {
  id: number;
  job_id: number;
  version: number;
  approved_at: string | null;
  approved_ip: string | null;
  approved_by_id: number | null;
  approval_type: "customer" | "internal" | null;
  approver: ApproverInfo | null;
  total_approved: string | null;
  paid_amount: string;
  balance: string;
  is_pending_approval: boolean;
  line_items: LineItem[];
  created_at: string;
}

export interface LineItemCreate {
  kind: "critical" | "optional";
  label: string;
  price: number;
  is_labor?: boolean;
  justification_media_id?: number;
}

export interface EstimateCreate {
  line_items: LineItemCreate[];
}

export interface InternalApprovalRequest {
  selected_optional_ids?: number[];
  notes?: string;
}

export interface PaymentUpdateRequest {
  paid_amount: number;
}
