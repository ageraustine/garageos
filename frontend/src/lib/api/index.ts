// GarageOS API client - modular structure
// Re-exports combined api object and all types for backward compatibility

// Re-export client utilities
export {
  API_BASE,
  AUTH_LOGOUT_EVENT,
  SESSION_CONFIG,
  triggerLogout,
  refreshToken,
  request,
  getAuthToken,
} from "./client";

// Re-export all types
export * from "./types";

// Import all endpoint modules
import { authApi } from "./endpoints/auth";
import { jobsApi } from "./endpoints/jobs";
import { servicesApi } from "./endpoints/services";
import { quotationApi } from "./endpoints/quotation";
import { estimatesApi } from "./endpoints/estimates";
import { employeesApi } from "./endpoints/employees";
import { branchesApi } from "./endpoints/branches";
import { customersApi } from "./endpoints/customers";
import { mediaApi } from "./endpoints/media";
import { trustScoreApi } from "./endpoints/trust-score";
import { linkApi } from "./endpoints/link";
import { hrApi } from "./endpoints/hr";
import { analyticsApi } from "./endpoints/analytics";
import { expensesApi } from "./endpoints/expenses";
import { marketplaceApi } from "./endpoints/marketplace";

// Combined API object for backward compatibility
export const api = {
  auth: authApi,
  link: linkApi,
  jobs: jobsApi,
  services: servicesApi,
  quotation: quotationApi,
  estimates: estimatesApi,
  employees: employeesApi,
  branches: branchesApi,
  customers: customersApi,
  media: mediaApi,
  trustScore: trustScoreApi,
  hr: hrApi,
  analytics: analyticsApi,
  expenses: expensesApi,
  marketplace: marketplaceApi,
};

// Also export individual APIs for direct imports
export {
  authApi,
  jobsApi,
  servicesApi,
  quotationApi,
  estimatesApi,
  employeesApi,
  branchesApi,
  customersApi,
  mediaApi,
  trustScoreApi,
  linkApi,
  hrApi,
  analyticsApi,
  expensesApi,
  marketplaceApi,
};
