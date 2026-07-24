// Jobs API endpoints

import { request } from "../client";
import type {
  JobListItem,
  JobCreateData,
  JobCreateResponse,
  JobDetail,
  JobResponse,
  JobUpdateData,
  AssignedEmployee,
  StageToggleResponse,
} from "../types";

export const jobsApi = {
  list: (status?: string) =>
    request<JobListItem[]>(`/jobs${status ? `?status=${status}` : ""}`),

  create: (data: JobCreateData) =>
    request<JobCreateResponse>("/jobs", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  get: (id: number) => request<JobDetail>(`/jobs/${id}`),

  update: (id: number, data: JobUpdateData) =>
    request<JobDetail>(`/jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updateStatus: (id: number, status: string) =>
    request<JobResponse>(`/jobs/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),

  updateAssignments: (id: number, employeeIds: number[]) =>
    request<AssignedEmployee[]>(`/jobs/${id}/assignments`, {
      method: "PATCH",
      body: JSON.stringify({ assigned_employee_ids: employeeIds }),
    }),

  toggleStage: (jobServiceId: number, stageId: number) =>
    request<StageToggleResponse>(`/jobs/services/${jobServiceId}/stages/toggle`, {
      method: "POST",
      body: JSON.stringify({ stage_id: stageId }),
    }),

  delete: (id: number) =>
    request<void>(`/jobs/${id}`, {
      method: "DELETE",
    }),
};
