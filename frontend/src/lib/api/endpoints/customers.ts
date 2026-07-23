// Customers API endpoints

import { request } from "../client";
import type {
  CustomerListItem,
  CustomerDetail,
  CustomerCreate,
  CustomerUpdate,
  CustomerNote,
  CustomerNoteCreate,
} from "../types";

export const customersApi = {
  list: (params?: { search?: string; tag?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.set("search", params.search);
    if (params?.tag) searchParams.set("tag", params.tag);
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));
    const query = searchParams.toString();
    return request<CustomerListItem[]>(`/customers${query ? `?${query}` : ""}`);
  },

  get: (id: number) => request<CustomerDetail>(`/customers/${id}`),

  create: (data: CustomerCreate) =>
    request<CustomerDetail>("/customers", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: CustomerUpdate) =>
    request<CustomerDetail>(`/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  lookupByPhone: (phone: string) =>
    request<CustomerListItem | null>(`/customers/lookup/phone/${encodeURIComponent(phone)}`),

  addNote: (customerId: number, data: CustomerNoteCreate) =>
    request<CustomerNote>(`/customers/${customerId}/notes`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateNote: (noteId: number, isPinned: boolean) =>
    request<CustomerNote>(`/customers/notes/${noteId}?is_pinned=${isPinned}`, {
      method: "PATCH",
    }),

  deleteNote: (noteId: number) =>
    request<void>(`/customers/notes/${noteId}`, {
      method: "DELETE",
    }),
};
