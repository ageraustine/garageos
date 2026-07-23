// Analytics API endpoints

import { request } from "../client";
import type {
  AnalyticsDashboard,
  AnalyticsParams,
  KPISummary,
  JobFunnel,
  RevenueTrend,
  ServiceAnalytics,
  BranchComparison,
  EmployeeAnalytics,
  TimeAnalytics,
  CustomerMetrics,
  EstimateAccuracy,
} from "../types";

export const analyticsApi = {
  getDashboard: (params?: AnalyticsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);
    if (params?.branch_id) searchParams.set("branch_id", String(params.branch_id));
    const query = searchParams.toString();
    return request<AnalyticsDashboard>(`/analytics/dashboard${query ? `?${query}` : ""}`);
  },

  getKPIs: (params?: AnalyticsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);
    if (params?.branch_id) searchParams.set("branch_id", String(params.branch_id));
    const query = searchParams.toString();
    return request<KPISummary>(`/analytics/kpis${query ? `?${query}` : ""}`);
  },

  getJobFunnel: (params?: AnalyticsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);
    if (params?.branch_id) searchParams.set("branch_id", String(params.branch_id));
    const query = searchParams.toString();
    return request<JobFunnel>(`/analytics/funnel${query ? `?${query}` : ""}`);
  },

  getRevenueTrend: (params?: AnalyticsParams & { period?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);
    if (params?.branch_id) searchParams.set("branch_id", String(params.branch_id));
    if (params?.period) searchParams.set("period", params.period);
    const query = searchParams.toString();
    return request<RevenueTrend>(`/analytics/revenue${query ? `?${query}` : ""}`);
  },

  getServiceAnalytics: (params?: AnalyticsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);
    if (params?.branch_id) searchParams.set("branch_id", String(params.branch_id));
    const query = searchParams.toString();
    return request<ServiceAnalytics>(`/analytics/services${query ? `?${query}` : ""}`);
  },

  getBranchComparison: (params?: Omit<AnalyticsParams, "branch_id">) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);
    const query = searchParams.toString();
    return request<BranchComparison>(`/analytics/branches${query ? `?${query}` : ""}`);
  },

  getEmployeeAnalytics: (params?: AnalyticsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);
    if (params?.branch_id) searchParams.set("branch_id", String(params.branch_id));
    const query = searchParams.toString();
    return request<EmployeeAnalytics>(`/analytics/employees${query ? `?${query}` : ""}`);
  },

  getTimeAnalytics: (params?: AnalyticsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);
    if (params?.branch_id) searchParams.set("branch_id", String(params.branch_id));
    const query = searchParams.toString();
    return request<TimeAnalytics>(`/analytics/time${query ? `?${query}` : ""}`);
  },

  getCustomerMetrics: (params?: AnalyticsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);
    if (params?.branch_id) searchParams.set("branch_id", String(params.branch_id));
    const query = searchParams.toString();
    return request<CustomerMetrics>(`/analytics/customers${query ? `?${query}` : ""}`);
  },

  getEstimateAccuracy: (params?: AnalyticsParams) => {
    const searchParams = new URLSearchParams();
    if (params?.start_date) searchParams.set("start_date", params.start_date);
    if (params?.end_date) searchParams.set("end_date", params.end_date);
    if (params?.branch_id) searchParams.set("branch_id", String(params.branch_id));
    const query = searchParams.toString();
    return request<EstimateAccuracy>(`/analytics/estimates${query ? `?${query}` : ""}`);
  },
};
