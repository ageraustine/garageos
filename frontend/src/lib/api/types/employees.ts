// Employee-related types

export interface EmployeeListItem {
  id: number;
  name: string;
  phone: string;
  role: string;
  role_label: string;
  branch_id: number | null;
  branch_name: string | null;
  email: string | null;
  profile_picture_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface EmployeeCreate {
  name: string;
  phone: string;
  pin: string;
  role: "advisor" | "mechanic" | "manager" | "hq";
  branch_id?: number | null;
  email?: string | null;
  id_number?: string | null;
}

export interface EmployeeUpdate {
  name?: string;
  role?: "advisor" | "mechanic" | "manager" | "hq";
  branch_id?: number | null;
  is_active?: boolean;
  email?: string | null;
  id_number?: string | null;
}

export interface EmployeeResponse {
  id: number;
  name: string;
  phone: string;
  role: string;
  branch_id: number | null;
  branch_name: string | null;
  email: string | null;
  id_number: string | null;
  profile_picture_url: string | null;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

// Employee document types
export type DocumentType = "national_id" | "passport" | "police_clearance" | "driving_license" | "certificate" | "other";

export interface EmployeeDocument {
  id: number;
  employee_id: number;
  document_type: string;
  document_type_label: string;
  name: string;
  url: string;
  view_url: string;
  file_size: number | null;
  content_type: string | null;
  expires_at: string | null;
  is_verified: boolean;
  verified_by_name: string | null;
  verified_at: string | null;
  created_at: string;
}

export interface DocumentUploadRequest {
  document_type: DocumentType;
  name: string;
  content_type: string;
  expires_at?: string | null;
}

export interface DocumentUploadResponse {
  upload_url: string;
  object_key: string;
  document_type: DocumentType;
}

export interface DocumentConfirmRequest {
  object_key: string;
  document_type: DocumentType;
  name: string;
  file_size?: number | null;
  expires_at?: string | null;
}

export interface ProfilePictureUploadResponse {
  upload_url: string;
  object_key: string;
}
