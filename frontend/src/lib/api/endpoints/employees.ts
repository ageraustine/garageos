// Employees API endpoints

import { request } from "../client";
import type {
  EmployeeListItem,
  EmployeeCreate,
  EmployeeUpdate,
  EmployeeResponse,
  BranchListItem,
  ProfilePictureUploadResponse,
  EmployeeDocument,
  DocumentUploadRequest,
  DocumentUploadResponse,
  DocumentConfirmRequest,
  DocumentType,
} from "../types";

export const employeesApi = {
  list: (params?: { role?: string; branch_id?: number; include_inactive?: boolean }) => {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.set("role", params.role);
    if (params?.branch_id) searchParams.set("branch_id", String(params.branch_id));
    if (params?.include_inactive) searchParams.set("include_inactive", "true");
    const query = searchParams.toString();
    return request<EmployeeListItem[]>(`/employees${query ? `?${query}` : ""}`);
  },

  create: (data: EmployeeCreate) =>
    request<EmployeeResponse>("/employees", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  get: (id: number) => request<EmployeeResponse>(`/employees/${id}`),

  update: (id: number, data: EmployeeUpdate) =>
    request<EmployeeResponse>(`/employees/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  listBranches: () => request<BranchListItem[]>("/employees/branches/list"),

  // Profile picture
  requestProfilePictureUpload: (id: number, contentType: string) =>
    request<ProfilePictureUploadResponse>(`/employees/${id}/profile-picture/upload-url`, {
      method: "POST",
      body: JSON.stringify({ content_type: contentType }),
    }),

  confirmProfilePicture: (id: number, objectKey: string) =>
    request<EmployeeResponse>(`/employees/${id}/profile-picture`, {
      method: "POST",
      body: JSON.stringify({ object_key: objectKey }),
    }),

  uploadProfilePicture: async (id: number, file: File): Promise<EmployeeResponse> => {
    // Get presigned URL
    const { upload_url, object_key } = await employeesApi.requestProfilePictureUpload(id, file.type);

    // Upload file directly to storage
    await fetch(upload_url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    // Confirm upload
    return employeesApi.confirmProfilePicture(id, object_key);
  },

  // Documents
  listDocuments: (id: number) => request<EmployeeDocument[]>(`/employees/${id}/documents`),

  requestDocumentUpload: (id: number, data: DocumentUploadRequest) =>
    request<DocumentUploadResponse>(`/employees/${id}/documents/upload-url`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  confirmDocumentUpload: (id: number, data: DocumentConfirmRequest) =>
    request<EmployeeDocument>(`/employees/${id}/documents`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  uploadDocument: async (
    employeeId: number,
    file: File,
    documentType: DocumentType,
    name: string,
    expiresAt?: string | null
  ): Promise<EmployeeDocument> => {
    // Get presigned URL
    const { upload_url, object_key } = await employeesApi.requestDocumentUpload(employeeId, {
      document_type: documentType,
      name,
      content_type: file.type,
      expires_at: expiresAt,
    });

    // Upload file directly to storage
    await fetch(upload_url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });

    // Confirm upload
    return employeesApi.confirmDocumentUpload(employeeId, {
      object_key,
      document_type: documentType,
      name,
      file_size: file.size,
      expires_at: expiresAt,
    });
  },

  verifyDocument: (employeeId: number, docId: number) =>
    request<EmployeeDocument>(`/employees/${employeeId}/documents/${docId}/verify`, {
      method: "POST",
    }),

  deleteDocument: (employeeId: number, docId: number) =>
    request<void>(`/employees/${employeeId}/documents/${docId}`, {
      method: "DELETE",
    }),
};
