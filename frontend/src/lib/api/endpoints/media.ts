// Media API endpoints

import { request } from "../client";
import type {
  MediaUploadRequest,
  MediaUploadResponse,
  MediaAssetCreate,
  MediaAssetResponse,
} from "../types";

export const mediaApi = {
  requestUploadUrl: (jobId: number, data: MediaUploadRequest) =>
    request<MediaUploadResponse>(`/jobs/${jobId}/media/upload-url`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  confirmUpload: (jobId: number, data: MediaAssetCreate) =>
    request<MediaAssetResponse>(`/jobs/${jobId}/media`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  list: (jobId: number) => request<MediaAssetResponse[]>(`/jobs/${jobId}/media`),

  uploadFile: async (jobId: number, file: File, mediaType: "photo" | "voice") => {
    // Get presigned URL
    const { upload_url, object_key } = await mediaApi.requestUploadUrl(jobId, {
      media_type: mediaType,
      content_type: file.type,
    });

    // Upload to MinIO
    await fetch(upload_url, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    // Confirm upload
    return mediaApi.confirmUpload(jobId, {
      object_key,
      media_type: mediaType,
    });
  },
};
