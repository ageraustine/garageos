// Services API endpoints

import { request, API_BASE, getAuthToken } from "../client";
import type {
  Service,
  ServiceCreate,
  ServiceUpdate,
  QuotationItem,
  QuotationItemCreate,
  QuotationItemUpdate,
} from "../types";

export const servicesApi = {
  list: () => request<Service[]>("/services"),
  get: (id: number) => request<Service>(`/services/${id}`),
  seedDefaults: () => request<Service[]>("/services/seed-defaults", { method: "POST" }),

  seedTemplates: () => request<{ message: string; items_added: number; items_fixed: number }>("/services/seed-templates", { method: "POST" }),

  create: (data: ServiceCreate) =>
    request<Service>("/services", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: ServiceUpdate) =>
    request<Service>(`/services/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: number) =>
    fetch(`${API_BASE}/services/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getAuthToken() || ""}`,
      },
    }),

  // Quotation Items
  createQuotationItem: (serviceId: number, data: QuotationItemCreate) =>
    request<QuotationItem>(`/services/${serviceId}/quotation-items`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateQuotationItem: (itemId: number, data: QuotationItemUpdate) =>
    request<QuotationItem>(`/services/quotation-items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteQuotationItem: (itemId: number) =>
    fetch(`${API_BASE}/services/quotation-items/${itemId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${getAuthToken() || ""}`,
      },
    }),
};
