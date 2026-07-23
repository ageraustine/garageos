// Media types

export interface MediaUploadRequest {
  media_type: "photo" | "voice";
  content_type: string;
}

export interface MediaUploadResponse {
  upload_url: string;
  object_key: string;
  expires_in: number;
}

export interface MediaAssetCreate {
  object_key: string;
  media_type: "photo" | "voice";
}

export interface MediaAssetResponse {
  id: number;
  job_id: number;
  type: string;
  url: string;
  view_url: string;  // Presigned URL for viewing
  compressed: boolean;
  opened_by_customer_at: string | null;
  created_at: string;
}
