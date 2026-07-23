// Trust Score API endpoints

import { request } from "../client";
import type { TrustScoreResponse } from "../types";

export const trustScoreApi = {
  getMyScore: () => request<TrustScoreResponse>("/trust-score/me"),
  getEmployeeScore: (employeeId: number) =>
    request<TrustScoreResponse>(`/trust-score/employee/${employeeId}`),
  getBranchScore: (branchId: number) =>
    request<TrustScoreResponse>(`/trust-score/branch/${branchId}`),
  getChainScore: () => request<TrustScoreResponse>("/trust-score/chain"),
};
