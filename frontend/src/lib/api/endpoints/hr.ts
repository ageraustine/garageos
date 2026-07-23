// HR API endpoints - Salaries, Payroll, Attendance, Leave, Reviews

import { request } from "../client";
import type {
  SalaryResponse,
  SalaryHistoryResponse,
  SalaryCreate,
  PayrollStatus,
  PayrollPeriodResponse,
  PayrollPeriodDetail,
  PayrollPeriodCreate,
  PayrollItemResponse,
  ManualPaymentRequest,
  AttendanceResponse,
  ClockInRequest,
  ClockOutRequest,
  BranchAttendanceSummary,
  LeaveStatus,
  LeaveRequestResponse,
  LeaveRequestCreate,
  LeaveRejectRequest,
  LeaveBalanceResponse,
  ReviewPeriodType,
  PerformanceReviewResponse,
  PerformanceReviewCreate,
  PerformanceReviewUpdate,
  EmployeeCommentRequest,
  RoleChangeHistoryResponse,
} from "../types";

export const hrApi = {
  // Salaries
  salaries: {
    getCurrent: (employeeId: number) =>
      request<SalaryResponse>(`/hr/salaries/employees/${employeeId}/salary`),
    getHistory: (employeeId: number) =>
      request<SalaryHistoryResponse>(`/hr/salaries/employees/${employeeId}/salary/history`),
    set: (employeeId: number, data: SalaryCreate) =>
      request<SalaryResponse>(`/hr/salaries/employees/${employeeId}/salary`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Payroll
  payroll: {
    listPeriods: (params?: { year?: number; month?: number; status?: PayrollStatus }) => {
      const searchParams = new URLSearchParams();
      if (params?.year) searchParams.set("year", String(params.year));
      if (params?.month) searchParams.set("month", String(params.month));
      if (params?.status) searchParams.set("status", params.status);
      const query = searchParams.toString();
      return request<PayrollPeriodResponse[]>(`/hr/payroll/periods${query ? `?${query}` : ""}`);
    },
    createPeriod: (data: PayrollPeriodCreate) =>
      request<PayrollPeriodResponse>("/hr/payroll/periods", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    getPeriod: (id: number) =>
      request<PayrollPeriodDetail>(`/hr/payroll/periods/${id}`),
    generateItems: (periodId: number) =>
      request<PayrollPeriodDetail>(`/hr/payroll/periods/${periodId}/generate`, {
        method: "POST",
      }),
    updateStatus: (periodId: number, status: PayrollStatus) =>
      request<PayrollPeriodResponse>(`/hr/payroll/periods/${periodId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    processMpesa: (periodId: number) =>
      request<{ processed: number; failed: number }>(`/hr/payroll/periods/${periodId}/process`, {
        method: "POST",
      }),
    markManualPayment: (itemId: number, data: ManualPaymentRequest) =>
      request<PayrollItemResponse>(`/hr/payroll/items/${itemId}/manual-pay`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    retryItem: (itemId: number) =>
      request<PayrollItemResponse>(`/hr/payroll/items/${itemId}/retry`, {
        method: "POST",
      }),
  },

  // Attendance
  attendance: {
    clockIn: (data: ClockInRequest) =>
      request<AttendanceResponse>("/hr/attendance/clock-in", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    clockOut: (data?: ClockOutRequest) =>
      request<AttendanceResponse>("/hr/attendance/clock-out", {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    getMyToday: () =>
      request<AttendanceResponse | null>("/hr/attendance/me/today"),
    getBranchSummary: (branchId: number, date?: string) => {
      const query = date ? `?target_date=${date}` : "";
      return request<BranchAttendanceSummary>(`/hr/attendance/branch/${branchId}/summary${query}`);
    },
  },

  // Leave
  leave: {
    listRequests: (params?: { status?: LeaveStatus; branch_id?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set("status", params.status);
      if (params?.branch_id) searchParams.set("branch_id", String(params.branch_id));
      const query = searchParams.toString();
      return request<LeaveRequestResponse[]>(`/hr/leave/requests${query ? `?${query}` : ""}`);
    },
    getMyRequests: (status?: LeaveStatus) => {
      const query = status ? `?status=${status}` : "";
      return request<LeaveRequestResponse[]>(`/hr/leave/requests/me${query}`);
    },
    createRequest: (data: LeaveRequestCreate) =>
      request<LeaveRequestResponse>("/hr/leave/requests", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    approveRequest: (requestId: number) =>
      request<LeaveRequestResponse>(`/hr/leave/requests/${requestId}/approve`, {
        method: "POST",
      }),
    rejectRequest: (requestId: number, data: LeaveRejectRequest) =>
      request<LeaveRequestResponse>(`/hr/leave/requests/${requestId}/reject`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    cancelRequest: (requestId: number) =>
      request<LeaveRequestResponse>(`/hr/leave/requests/${requestId}/cancel`, {
        method: "POST",
      }),
    getBalance: (employeeId: number, year?: number) => {
      const query = year ? `?year=${year}` : "";
      return request<LeaveBalanceResponse>(`/hr/leave/balance/${employeeId}${query}`);
    },
  },

  // Performance Reviews
  reviews: {
    list: (params?: { employee_id?: number; is_draft?: boolean; period_type?: ReviewPeriodType }) => {
      const searchParams = new URLSearchParams();
      if (params?.employee_id) searchParams.set("employee_id", String(params.employee_id));
      if (params?.is_draft !== undefined) searchParams.set("is_draft", String(params.is_draft));
      if (params?.period_type) searchParams.set("period_type", params.period_type);
      const query = searchParams.toString();
      return request<PerformanceReviewResponse[]>(`/hr/reviews${query ? `?${query}` : ""}`);
    },
    create: (data: PerformanceReviewCreate) =>
      request<PerformanceReviewResponse>("/hr/reviews", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    get: (reviewId: number) =>
      request<PerformanceReviewResponse>(`/hr/reviews/${reviewId}`),
    update: (reviewId: number, data: PerformanceReviewUpdate) =>
      request<PerformanceReviewResponse>(`/hr/reviews/${reviewId}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    submit: (reviewId: number) =>
      request<PerformanceReviewResponse>(`/hr/reviews/${reviewId}/submit`, {
        method: "POST",
      }),
    acknowledge: (reviewId: number, data?: EmployeeCommentRequest) =>
      request<PerformanceReviewResponse>(`/hr/reviews/${reviewId}/acknowledge`, {
        method: "POST",
        body: JSON.stringify(data || {}),
      }),
    getEmployeeHistory: (employeeId: number) =>
      request<PerformanceReviewResponse[]>(`/hr/reviews/employees/${employeeId}/history`),
  },

  // Role Changes
  roleChanges: {
    getHistory: (employeeId: number) =>
      request<RoleChangeHistoryResponse>(`/hr/role-changes/employees/${employeeId}`),
  },
};
