"""Analytics schemas for job and business metrics."""

from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal


# === Request Schemas ===

class AnalyticsDateRange(BaseModel):
    """Date range filter for analytics queries."""
    start_date: date
    end_date: date


# === Response Schemas ===

class KPISummary(BaseModel):
    """High-level KPIs for dashboard."""
    total_jobs: int
    completed_jobs: int

    # Revenue breakdown
    gross_income: Decimal = Decimal("0")  # Total customer payments (labor + parts)
    labor_income: Decimal = Decimal("0")  # From is_labor=true line items (pure profit)
    parts_revenue: Decimal = Decimal("0")  # From is_labor=false line items

    # For backward compatibility
    total_revenue: Decimal = Decimal("0")  # Same as gross_income

    # Expenses and profit
    total_expenses: Decimal = Decimal("0")  # All business expenses
    parts_cost: Decimal = Decimal("0")  # Expenses linked to jobs (COGS)
    net_income: Decimal = Decimal("0")  # gross_income - total_expenses
    gross_profit: Decimal = Decimal("0")  # Alias for net_income (backward compat)
    profit_margin: float = 0.0  # percentage (net_income / gross_income)

    average_job_value: Decimal
    average_turnaround_hours: float | None
    completion_rate: float  # percentage
    comeback_rate: float  # percentage (quality indicator)

    # Comparison with previous period
    jobs_change_pct: float | None = None
    revenue_change_pct: float | None = None
    expenses_change_pct: float | None = None


class StatusDistribution(BaseModel):
    """Jobs by status."""
    status: str
    status_label: str
    count: int
    percentage: float


class JobFunnel(BaseModel):
    """Job status funnel for conversion analysis."""
    total_jobs: int
    statuses: List[StatusDistribution]

    # Conversion rates between stages
    intake_to_diagnosis_pct: float
    diagnosis_to_working_pct: float
    working_to_ready_pct: float
    ready_to_paid_pct: float


class RevenueDataPoint(BaseModel):
    """Single data point for revenue trends."""
    date: str  # ISO date string
    revenue: Decimal
    job_count: int


class RevenueTrend(BaseModel):
    """Revenue over time."""
    period: str  # daily, weekly, monthly
    data_points: List[RevenueDataPoint]
    total_revenue: Decimal
    average_daily_revenue: Decimal


class ServicePerformance(BaseModel):
    """Performance metrics for a service."""
    service_id: int
    service_name: str
    job_count: int
    revenue: Decimal
    average_revenue: Decimal
    percentage_of_total: float
    average_completion_hours: float | None


class ServiceAnalytics(BaseModel):
    """Service breakdown analytics."""
    services: List[ServicePerformance]
    total_service_instances: int


class BranchPerformance(BaseModel):
    """Performance metrics for a branch."""
    branch_id: int
    branch_name: str
    job_count: int
    completed_jobs: int
    revenue: Decimal
    average_job_value: Decimal
    completion_rate: float
    average_turnaround_hours: float | None


class BranchComparison(BaseModel):
    """Compare branches (HQ view)."""
    branches: List[BranchPerformance]
    chain_totals: KPISummary


class EmployeePerformance(BaseModel):
    """Performance metrics for an employee."""
    employee_id: int
    employee_name: str
    role: str
    job_count: int
    completed_jobs: int
    stages_completed: int
    average_stage_time_hours: float | None


class EmployeeAnalytics(BaseModel):
    """Employee performance analytics."""
    employees: List[EmployeePerformance]
    total_employees: int


class DayOfWeekStats(BaseModel):
    """Stats for a day of the week."""
    day: str  # Monday, Tuesday, etc.
    day_index: int  # 0-6
    job_count: int
    revenue: Decimal
    average_jobs: float


class TimeAnalytics(BaseModel):
    """Time-based analytics."""
    busiest_day: str
    slowest_day: str
    days_of_week: List[DayOfWeekStats]
    average_jobs_per_day: float


class CustomerMetrics(BaseModel):
    """Customer analytics."""
    total_unique_customers: int
    new_customers: int  # first job in period
    returning_customers: int
    repeat_rate: float  # percentage
    average_jobs_per_customer: float


class EstimateAccuracy(BaseModel):
    """Estimate vs actual payment accuracy."""
    total_estimates: int
    approved_estimates: int
    approval_rate: float
    average_estimate: Decimal
    average_actual: Decimal
    accuracy_percentage: float  # how close estimates are to actuals
    underestimate_count: int
    overestimate_count: int


class ExpenseCategorySummary(BaseModel):
    """Expense summary by category."""
    category: str
    category_label: str
    amount: Decimal
    percentage: float


class ExpenseAnalytics(BaseModel):
    """Expense analytics for dashboard."""
    total_expenses: Decimal
    expense_count: int
    by_category: List[ExpenseCategorySummary]
    top_vendors: List[dict]  # vendor, amount


class AnalyticsDashboard(BaseModel):
    """Complete analytics dashboard response."""
    period_start: date
    period_end: date
    kpis: KPISummary
    job_funnel: JobFunnel
    revenue_trend: RevenueTrend
    service_analytics: ServiceAnalytics
    time_analytics: TimeAnalytics
    customer_metrics: CustomerMetrics
    estimate_accuracy: EstimateAccuracy
    expense_analytics: Optional[ExpenseAnalytics] = None
