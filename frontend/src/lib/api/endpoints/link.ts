// Customer Magic Link API endpoints

import { request } from "../client";
import type {
  CustomerJobResponse,
  EstimateApproveResponse,
  STKPushRequest,
  STKPushResponse,
} from "../types";

export const linkApi = {
  get: (token: string) =>
    request<CustomerJobResponse>(`/link/${token}`),

  approve: (token: string, selectedOptionalIds: number[] = []) =>
    request<EstimateApproveResponse>(`/link/${token}/estimate/approve`, {
      method: "POST",
      body: JSON.stringify({ selected_optional_ids: selectedOptionalIds }),
    }),

  pay: (token: string, data: STKPushRequest) =>
    request<STKPushResponse>(`/link/${token}/pay`, {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
