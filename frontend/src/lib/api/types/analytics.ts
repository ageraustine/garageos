// Analytics types

export interface KPISummary {
  total_jobs: number;
  completed_jobs: number;

  // Income breakdown
  gross_income: string;  // Total customer payments (labor + parts)
  labor_income: string;  // From labor line items (pure profit)
  parts_revenue: string;  // From parts line items

  // Backward compatibility
  total_revenue: string;  // Same as gross_income

  // Expenses and profit
  total_expenses: string;
  parts_cost: string;  // Expenses linked to jobs (COGS)
  net_income: string;  // gross_income - total_expenses
  gross_profit: string;  // Alias for net_income
  profit_margin: number;

  average_job_value: string;
  average_turnaround_hours: number | null;
  completion_rate: number;
  comeback_rate: number;
  jobs_change_pct: number | null;
  revenue_change_pct: number | null;
  expenses_change_pct: number | null;
}

export interface StatusDistribution {
  status: string;
  status_label: string;
  count: number;
  percentage: number;
}

export interface JobFunnel {
  total_jobs: number;
  statuses: StatusDistribution[];
  intake_to_diagnosis_pct: number;
  diagnosis_to_working_pct: number;
  working_to_ready_pct: number;
  ready_to_paid_pct: number;
}

export interface RevenueDataPoint {
  date: string;
  revenue: string;
  job_count: number;
}

export interface RevenueTrend {
  period: string;
  data_points: RevenueDataPoint[];
  total_revenue: string;
  average_daily_revenue: string;
}

export interface ServicePerformance {
  service_id: number;
  service_name: string;
  job_count: number;
  revenue: string;
  average_revenue: string;
  percentage_of_total: number;
  average_completion_hours: number | null;
}

export interface ServiceAnalytics {
  services: ServicePerformance[];
  total_service_instances: number;
}

export interface BranchPerformance {
  branch_id: number;
  branch_name: string;
  job_count: number;
  completed_jobs: number;
  revenue: string;
  average_job_value: string;
  completion_rate: number;
  average_turnaround_hours: number | null;
}

export interface BranchComparison {
  branches: BranchPerformance[];
  chain_totals: KPISummary;
}

export interface EmployeePerformanceAnalytics {
  employee_id: number;
  employee_name: string;
  role: string;
  job_count: number;
  completed_jobs: number;
  stages_completed: number;
  average_stage_time_hours: number | null;
}

export interface EmployeeAnalytics {
  employees: EmployeePerformanceAnalytics[];
  total_employees: number;
}

export interface DayOfWeekStats {
  day: string;
  day_index: number;
  job_count: number;
  revenue: string;
  average_jobs: number;
}

export interface TimeAnalytics {
  busiest_day: string;
  slowest_day: string;
  days_of_week: DayOfWeekStats[];
  average_jobs_per_day: number;
}

export interface CustomerMetrics {
  total_unique_customers: number;
  new_customers: number;
  returning_customers: number;
  repeat_rate: number;
  average_jobs_per_customer: number;
}

export interface EstimateAccuracy {
  total_estimates: number;
  approved_estimates: number;
  approval_rate: number;
  average_estimate: string;
  average_actual: string;
  accuracy_percentage: number;
  underestimate_count: number;
  overestimate_count: number;
}

export interface ExpenseCategorySummary {
  category: string;
  category_label: string;
  amount: string;
  percentage: number;
}

export interface ExpenseAnalytics {
  total_expenses: string;
  expense_count: number;
  by_category: ExpenseCategorySummary[];
  top_vendors: { vendor: string; amount: number }[];
}

export interface AnalyticsDashboard {
  period_start: string;
  period_end: string;
  kpis: KPISummary;
  job_funnel: JobFunnel;
  revenue_trend: RevenueTrend;
  service_analytics: ServiceAnalytics;
  time_analytics: TimeAnalytics;
  customer_metrics: CustomerMetrics;
  estimate_accuracy: EstimateAccuracy;
  expense_analytics: ExpenseAnalytics | null;
}

export interface AnalyticsParams {
  start_date?: string;
  end_date?: string;
  branch_id?: number;
}
