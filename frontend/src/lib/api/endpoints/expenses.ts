// Expenses API endpoints

import { request } from "../client";
import type {
  ExpenseResponse,
  ExpenseCreate,
  ExpenseUpdate,
  ExpenseListParams,
  ExpenseAnalytics,
} from "../types";

export const expensesApi = {
  list: (params?: ExpenseListParams) => {
    const searchParams = new URLSearchParams();
    if (params?.branch_id) searchParams.set("branch_id", String(params.branch_id));
    if (params?.category) searchParams.set("category", params.category);
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const query = searchParams.toString();
    return request<ExpenseResponse[]>(`/expenses${query ? `?${query}` : ""}`);
  },

  get: (expenseId: number) =>
    request<ExpenseResponse>(`/expenses/${expenseId}`),

  create: (data: ExpenseCreate) =>
    request<ExpenseResponse>("/expenses", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (expenseId: number, data: ExpenseUpdate) =>
    request<ExpenseResponse>(`/expenses/${expenseId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (expenseId: number) =>
    request<void>(`/expenses/${expenseId}`, { method: "DELETE" }),

  getAnalytics: (params: { start_date: string; end_date: string; branch_id?: number }) => {
    const searchParams = new URLSearchParams();
    searchParams.set("start_date", params.start_date);
    searchParams.set("end_date", params.end_date);
    if (params.branch_id) searchParams.set("branch_id", String(params.branch_id));
    return request<ExpenseAnalytics>(`/expenses/analytics?${searchParams.toString()}`);
  },

  // Receipt upload
  requestReceiptUpload: (expenseId: number, contentType: string) =>
    request<{ upload_url: string; object_key: string }>(
      `/expenses/${expenseId}/receipt/upload-url?content_type=${encodeURIComponent(contentType)}`,
      { method: "POST" }
    ),

  confirmReceiptUpload: (expenseId: number, objectKey: string) =>
    request<ExpenseResponse>(`/expenses/${expenseId}/receipt?object_key=${encodeURIComponent(objectKey)}`, {
      method: "POST",
    }),

  uploadReceipt: async (expenseId: number, file: File): Promise<ExpenseResponse> => {
    const { upload_url, object_key } = await expensesApi.requestReceiptUpload(expenseId, file.type);
    await fetch(upload_url, {
      method: "PUT",
      body: file,
      headers: { "Content-Type": file.type },
    });
    return expensesApi.confirmReceiptUpload(expenseId, object_key);
  },
};
