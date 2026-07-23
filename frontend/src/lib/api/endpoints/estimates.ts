// Estimates API endpoints

import { request } from "../client";
import type {
  Estimate,
  EstimateCreate,
  InternalApprovalRequest,
} from "../types";

export const estimatesApi = {
  getLatest: (jobId: number) => request<Estimate>(`/jobs/${jobId}/estimates/latest`),

  create: (jobId: number, data: EstimateCreate) =>
    request<Estimate>(`/jobs/${jobId}/estimates`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Internal approval by HQ/manager
  internalApprove: (jobId: number, data?: InternalApprovalRequest) =>
    request<Estimate>(`/jobs/${jobId}/estimates/internal-approve`, {
      method: "POST",
      body: JSON.stringify(data || {}),
    }),

  // Update payment amount (HQ/manager only)
  updatePayment: (jobId: number, paidAmount: number) =>
    request<Estimate>(`/jobs/${jobId}/estimates/payment`, {
      method: "PATCH",
      body: JSON.stringify({ paid_amount: paidAmount }),
    }),
};
