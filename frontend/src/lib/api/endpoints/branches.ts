// Branches API endpoints

import { request, API_BASE, getAuthToken } from "../client";
import type {
  BranchResponse,
  BranchCreate,
  BranchUpdate,
} from "../types";

export const branchesApi = {
  list: () => request<BranchResponse[]>("/branches"),

  create: (data: BranchCreate) =>
    request<BranchResponse>("/branches", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  get: (id: number) => request<BranchResponse>(`/branches/${id}`),

  update: (id: number, data: BranchUpdate) =>
    request<BranchResponse>(`/branches/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetch(`${API_BASE}/branches/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getAuthToken() || ""}`,
      },
    }),
};
