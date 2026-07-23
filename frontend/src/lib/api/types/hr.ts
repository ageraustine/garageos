// HR types - Salaries, Payroll, Attendance, Leave, Performance Reviews

// Salary types
export interface SalaryResponse {
  id: number;
  employee_id: number;
  employee_name?: string;
  chain_id: number;
  gross_monthly: string;
  effective_from: string;
  effective_to: string | null;
  change_reason: string;
  notes: string | null;
  created_by_id: number;
  created_by_name?: string;
  created_at: string;
}

export interface SalaryHistoryResponse {
  employee_id: number;
  employee_name: string;
  current_salary: string | null;
  history: SalaryResponse[];
}

export interface SalaryCreate {
  gross_monthly: number;
  effective_from: string;
  change_reason: string;
  notes?: string;
}

// Payroll types
export type PayrollStatus = "draft" | "pending_approval" | "approved" | "processing" | "completed" | "cancelled";
export type DisbursementMethod = "mpesa_b2c" | "manual";
export type PayrollItemStatus = "pending" | "processing" | "completed" | "failed";

export interface PayrollPeriodResponse {
  id: number;
  chain_id: number;
  branch_id: number | null;
  branch_name: string | null;
  period_year: number;
  period_month: number;
  status: PayrollStatus;
  total_gross: string;
  total_net: string;
  total_deductions: string;
  employee_count: number;
  processed_count: number;
  failed_count: number;
  created_by_id: number;
  created_by_name?: string;
  approved_by_id: number | null;
  approved_by_name?: string;
  created_at: string;
  approved_at: string | null;
  completed_at: string | null;
}

export interface PayrollItemResponse {
  id: number;
  payroll_period_id: number;
  employee_id: number;
  employee_name: string;
  employee_phone: string;
  gross_amount: string;
  deductions: string;
  net_amount: string;
  method: DisbursementMethod;
  status: PayrollItemStatus;
  mpesa_receipt: string | null;
  manual_reference: string | null;
  error_message: string | null;
  processed_at: string | null;
}

export interface PayrollPeriodDetail extends PayrollPeriodResponse {
  items: PayrollItemResponse[];
}

export interface PayrollPeriodCreate {
  period_year: number;
  period_month: number;
  branch_id?: number;
}

export interface ManualPaymentRequest {
  reference: string;
  notes?: string;
}

// Attendance types
export interface AttendanceResponse {
  id: number;
  employee_id: number;
  employee_name?: string;
  branch_id: number;
  branch_name?: string;
  attendance_date: string;
  clock_in: string;
  clock_out: string | null;
  total_minutes: number | null;
  overtime_minutes: number;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_lat: number | null;
  clock_out_lng: number | null;
  notes: string | null;
}

export interface ClockInRequest {
  latitude?: number;
  longitude?: number;
}

export interface ClockOutRequest {
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export interface BranchAttendanceSummary {
  branch_id: number;
  branch_name: string;
  date: string;
  total_employees: number;
  present: number;
  absent: number;
  late_arrivals: number;
  total_overtime_minutes: number;
  records: {
    id: number;
    employee_id: number;
    branch_id: number;
    attendance_date: string;
    clock_in: string | null;
    clock_out: string | null;
    total_minutes: number | null;
    overtime_minutes: number | null;
    clock_in_lat: number | null;
    clock_in_lng: number | null;
    clock_out_lat: number | null;
    clock_out_lng: number | null;
    notes: string | null;
    created_at: string;
    employee_name: string;
    employee_role: string;
  }[];
}

// Leave types
export type LeaveType = "annual" | "sick" | "maternity" | "paternity" | "unpaid" | "compassionate";
export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveRequestResponse {
  id: number;
  employee_id: number;
  employee_name?: string;
  chain_id: number;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  days_requested: number;
  reason: string | null;
  status: LeaveStatus;
  reviewed_by_id: number | null;
  reviewed_by_name?: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface LeaveRequestCreate {
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string;
}

export interface LeaveRejectRequest {
  rejection_reason: string;
}

export interface LeaveBalanceItem {
  entitled: number;
  used: number;
  pending: number;
  remaining: number;
}

export interface LeaveBalanceResponse {
  employee_id: number;
  employee_name: string;
  year: number;
  annual: LeaveBalanceItem;
  sick: LeaveBalanceItem;
  maternity: LeaveBalanceItem;
  paternity: LeaveBalanceItem;
  compassionate: LeaveBalanceItem;
}

// Performance Reviews types
export type ReviewPeriodType = "monthly" | "quarterly" | "annual" | "probation";

export interface PerformanceReviewResponse {
  id: number;
  employee_id: number;
  employee_name?: string;
  chain_id: number;
  period_type: ReviewPeriodType;
  period_start: string;
  period_end: string;
  rating_quality: number | null;
  rating_productivity: number | null;
  rating_teamwork: number | null;
  rating_punctuality: number | null;
  rating_customer_service: number | null;
  overall_rating: number | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  goals_next_period: string | null;
  reviewer_comments: string | null;
  employee_comments: string | null;
  trust_score_at_review: number | null;
  jobs_completed: number | null;
  is_draft: boolean;
  reviewer_id: number;
  reviewer_name?: string;
  reviewed_at: string | null;
  acknowledged_by_employee: boolean;
  acknowledged_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface PerformanceReviewCreate {
  employee_id: number;
  period_type: ReviewPeriodType;
  period_start: string;
  period_end: string;
  rating_quality?: number;
  rating_productivity?: number;
  rating_teamwork?: number;
  rating_punctuality?: number;
  rating_customer_service?: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals_next_period?: string;
  reviewer_comments?: string;
}

export interface PerformanceReviewUpdate {
  rating_quality?: number;
  rating_productivity?: number;
  rating_teamwork?: number;
  rating_punctuality?: number;
  rating_customer_service?: number;
  strengths?: string;
  areas_for_improvement?: string;
  goals_next_period?: string;
  reviewer_comments?: string;
}

export interface EmployeeCommentRequest {
  employee_comments: string;
}

// Role Changes types
export type RoleChangeType = "promotion" | "demotion" | "transfer" | "role_change";

export interface RoleChangeResponse {
  id: number;
  employee_id: number;
  chain_id: number;
  change_type: RoleChangeType;
  from_role: string | null;
  to_role: string | null;
  from_branch_id: number | null;
  from_branch_name: string | null;
  to_branch_id: number | null;
  to_branch_name: string | null;
  new_salary_id: number | null;
  effective_date: string;
  reason: string | null;
  approved_by_id: number;
  approved_by_name?: string;
  created_at: string;
}

export interface RoleChangeHistoryResponse {
  employee_id: number;
  employee_name: string;
  current_role: string;
  current_branch_name: string | null;
  history: RoleChangeResponse[];
}
