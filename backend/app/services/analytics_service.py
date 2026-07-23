"""Analytics service for job and business metrics."""

from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Optional, List, Tuple
from sqlmodel import Session, select, func, and_, or_, text
from sqlalchemy import extract, case

from app.models.job import Job, JobStatus
from app.models.payment import Payment, PaymentStatus
from app.models.estimate import Estimate
from app.models.line_item import LineItem, LineItemKind
from app.models.service import Service, JobService, JobStageCompletion
from app.models.branch import Branch
from app.models.employee import Employee
from app.models.expense import Expense, ExpenseCategory
from app.schemas.analytics import (
    KPISummary, StatusDistribution, JobFunnel, RevenueDataPoint, RevenueTrend,
    ServicePerformance, ServiceAnalytics, BranchPerformance, BranchComparison,
    EmployeePerformance, EmployeeAnalytics, DayOfWeekStats, TimeAnalytics,
    CustomerMetrics, EstimateAccuracy, AnalyticsDashboard, ExpenseAnalytics,
    ExpenseCategorySummary,
)
from app.schemas.expense import CATEGORY_LABELS


STATUS_LABELS = {
    "intake": "Checked In",
    "diagnosis": "Diagnosing",
    "working": "In Progress",
    "washing": "Washing",
    "ready": "Ready",
    "paid": "Complete",
}

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class AnalyticsService:
    """Analytics and reporting service."""

    def __init__(self, db: Session):
        self.db = db

    def get_kpis(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
        include_comparison: bool = True,
    ) -> KPISummary:
        """Get high-level KPIs for the dashboard."""
        # Build base query filters
        filters = self._build_job_filters(chain_id, start_date, end_date, branch_id)

        # Total jobs in period
        total_jobs = self.db.exec(
            select(func.count(Job.id)).where(*filters)
        ).one()

        # Completed jobs (status = paid)
        completed_jobs = self.db.exec(
            select(func.count(Job.id)).where(
                *filters,
                Job.status == JobStatus.PAID
            )
        ).one()

        # Get revenue breakdown (labor vs parts)
        labor_income, parts_revenue = self._get_income_breakdown(chain_id, start_date, end_date, branch_id)
        gross_income = labor_income + parts_revenue

        # Total revenue (backward compatible - use gross_income)
        total_revenue = gross_income if gross_income > 0 else self._get_revenue(chain_id, start_date, end_date, branch_id)

        # Average job value
        avg_job_value = Decimal("0")
        if completed_jobs > 0:
            avg_job_value = total_revenue / completed_jobs

        # Average turnaround time (intake to paid)
        avg_turnaround = self._get_average_turnaround(chain_id, start_date, end_date, branch_id)

        # Completion rate
        completion_rate = 0.0
        if total_jobs > 0:
            completion_rate = (completed_jobs / total_jobs) * 100

        # Comeback rate (quality indicator)
        comeback_count = self.db.exec(
            select(func.count(Job.id)).where(
                *filters,
                Job.is_comeback == True
            )
        ).one()
        comeback_rate = 0.0
        if total_jobs > 0:
            comeback_rate = (comeback_count / total_jobs) * 100

        # Get total expenses
        total_expenses = self._get_expenses(chain_id, start_date, end_date, branch_id)

        # Get parts cost (expenses linked to jobs = COGS)
        parts_cost = self._get_job_linked_expenses(chain_id, start_date, end_date, branch_id)

        # Calculate net income (gross income - all expenses)
        net_income = gross_income - total_expenses
        gross_profit = net_income  # Alias for backward compatibility

        profit_margin = 0.0
        if gross_income > 0:
            profit_margin = float(net_income / gross_income * 100)

        # Calculate comparison with previous period
        jobs_change_pct = None
        revenue_change_pct = None
        expenses_change_pct = None

        if include_comparison:
            period_length = (end_date - start_date).days + 1
            prev_end = start_date - timedelta(days=1)
            prev_start = prev_end - timedelta(days=period_length - 1)

            prev_filters = self._build_job_filters(chain_id, prev_start, prev_end, branch_id)

            prev_total_jobs = self.db.exec(
                select(func.count(Job.id)).where(*prev_filters)
            ).one()

            prev_revenue = self._get_revenue(chain_id, prev_start, prev_end, branch_id)
            prev_expenses = self._get_expenses(chain_id, prev_start, prev_end, branch_id)

            if prev_total_jobs > 0:
                jobs_change_pct = ((total_jobs - prev_total_jobs) / prev_total_jobs) * 100
            elif total_jobs > 0:
                jobs_change_pct = 100.0

            if prev_revenue > 0:
                revenue_change_pct = float((total_revenue - prev_revenue) / prev_revenue * 100)
            elif total_revenue > 0:
                revenue_change_pct = 100.0

            if prev_expenses > 0:
                expenses_change_pct = float((total_expenses - prev_expenses) / prev_expenses * 100)
            elif total_expenses > 0:
                expenses_change_pct = 100.0

        return KPISummary(
            total_jobs=total_jobs,
            completed_jobs=completed_jobs,
            gross_income=gross_income,
            labor_income=labor_income,
            parts_revenue=parts_revenue,
            total_revenue=total_revenue,
            total_expenses=total_expenses,
            parts_cost=parts_cost,
            net_income=net_income,
            gross_profit=gross_profit,
            profit_margin=round(profit_margin, 1),
            average_job_value=avg_job_value,
            average_turnaround_hours=avg_turnaround,
            completion_rate=round(completion_rate, 1),
            comeback_rate=round(comeback_rate, 1),
            jobs_change_pct=round(jobs_change_pct, 1) if jobs_change_pct is not None else None,
            revenue_change_pct=round(revenue_change_pct, 1) if revenue_change_pct is not None else None,
            expenses_change_pct=round(expenses_change_pct, 1) if expenses_change_pct is not None else None,
        )

    def get_job_funnel(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> JobFunnel:
        """Get job status funnel with conversion rates."""
        filters = self._build_job_filters(chain_id, start_date, end_date, branch_id)

        # Get counts by status
        status_counts = self.db.exec(
            select(Job.status, func.count(Job.id))
            .where(*filters)
            .group_by(Job.status)
        ).all()

        counts_dict = {status.value: count for status, count in status_counts}
        total_jobs = sum(counts_dict.values())

        # Build status distribution
        statuses = []
        for status in JobStatus:
            count = counts_dict.get(status.value, 0)
            pct = (count / total_jobs * 100) if total_jobs > 0 else 0
            statuses.append(StatusDistribution(
                status=status.value,
                status_label=STATUS_LABELS.get(status.value, status.value),
                count=count,
                percentage=round(pct, 1),
            ))

        # Calculate conversion rates (jobs that passed through each stage)
        # Jobs past intake = diagnosis + working + washing + ready + paid
        past_intake = sum(counts_dict.get(s, 0) for s in ["diagnosis", "working", "washing", "ready", "paid"])
        past_diagnosis = sum(counts_dict.get(s, 0) for s in ["working", "washing", "ready", "paid"])
        past_working = sum(counts_dict.get(s, 0) for s in ["washing", "ready", "paid"])
        past_ready = counts_dict.get("paid", 0)

        intake_to_diagnosis = (past_intake / total_jobs * 100) if total_jobs > 0 else 0
        diagnosis_to_working = (past_diagnosis / past_intake * 100) if past_intake > 0 else 0
        working_to_ready = (past_working / past_diagnosis * 100) if past_diagnosis > 0 else 0
        ready_to_paid = (past_ready / past_working * 100) if past_working > 0 else 0

        return JobFunnel(
            total_jobs=total_jobs,
            statuses=statuses,
            intake_to_diagnosis_pct=round(intake_to_diagnosis, 1),
            diagnosis_to_working_pct=round(diagnosis_to_working, 1),
            working_to_ready_pct=round(working_to_ready, 1),
            ready_to_paid_pct=round(ready_to_paid, 1),
        )

    def get_revenue_trend(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
        period: str = "daily",  # daily, weekly, monthly
    ) -> RevenueTrend:
        """Get revenue trends over time."""
        # Join jobs to get branch filter
        base_query = (
            select(
                func.date(Payment.created_at).label("payment_date"),
                func.sum(Payment.amount).label("revenue"),
                func.count(Payment.id).label("job_count")
            )
            .join(Job, Payment.job_id == Job.id)
            .join(Branch, Job.branch_id == Branch.id)
            .where(
                Branch.chain_id == chain_id,
                Payment.status == PaymentStatus.SUCCESS,
                func.date(Payment.created_at) >= start_date,
                func.date(Payment.created_at) <= end_date,
            )
        )

        if branch_id:
            base_query = base_query.where(Job.branch_id == branch_id)

        base_query = base_query.group_by(func.date(Payment.created_at)).order_by(func.date(Payment.created_at))

        results = self.db.exec(base_query).all()

        # Build data points
        data_points = []
        total_revenue = Decimal("0")

        for payment_date, revenue, job_count in results:
            data_points.append(RevenueDataPoint(
                date=payment_date.isoformat(),
                revenue=revenue or Decimal("0"),
                job_count=job_count or 0,
            ))
            total_revenue += revenue or Decimal("0")

        # Calculate average daily revenue
        days = (end_date - start_date).days + 1
        avg_daily = total_revenue / days if days > 0 else Decimal("0")

        return RevenueTrend(
            period=period,
            data_points=data_points,
            total_revenue=total_revenue,
            average_daily_revenue=avg_daily,
        )

    def get_service_analytics(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> ServiceAnalytics:
        """Get service performance breakdown."""
        # Count jobs per service
        query = (
            select(
                Service.id,
                Service.name,
                func.count(JobService.id).label("job_count"),
            )
            .join(JobService, Service.id == JobService.service_id)
            .join(Job, JobService.job_id == Job.id)
            .join(Branch, Job.branch_id == Branch.id)
            .where(
                Branch.chain_id == chain_id,
                func.date(Job.created_at) >= start_date,
                func.date(Job.created_at) <= end_date,
            )
        )

        if branch_id:
            query = query.where(Job.branch_id == branch_id)

        query = query.group_by(Service.id, Service.name).order_by(func.count(JobService.id).desc())

        results = self.db.exec(query).all()

        total_instances = sum(r[2] for r in results)
        total_revenue = self._get_revenue(chain_id, start_date, end_date, branch_id)

        services = []
        for service_id, service_name, job_count in results:
            # Estimate revenue per service (proportional to job count)
            revenue_share = (job_count / total_instances) if total_instances > 0 else 0
            service_revenue = total_revenue * Decimal(str(revenue_share))
            avg_revenue = service_revenue / job_count if job_count > 0 else Decimal("0")
            pct_of_total = (job_count / total_instances * 100) if total_instances > 0 else 0

            # Calculate average completion time for this service
            avg_completion = self._get_service_avg_completion(service_id, start_date, end_date, branch_id)

            services.append(ServicePerformance(
                service_id=service_id,
                service_name=service_name,
                job_count=job_count,
                revenue=service_revenue,
                average_revenue=avg_revenue,
                percentage_of_total=round(pct_of_total, 1),
                average_completion_hours=avg_completion,
            ))

        return ServiceAnalytics(
            services=services,
            total_service_instances=total_instances,
        )

    def get_branch_comparison(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
    ) -> BranchComparison:
        """Compare all branches (HQ view)."""
        branches = self.db.exec(
            select(Branch).where(Branch.chain_id == chain_id)
        ).all()

        branch_performances = []
        for branch in branches:
            kpis = self.get_kpis(chain_id, start_date, end_date, branch.id, include_comparison=False)
            avg_turnaround = self._get_average_turnaround(chain_id, start_date, end_date, branch.id)

            branch_performances.append(BranchPerformance(
                branch_id=branch.id,
                branch_name=branch.name,
                job_count=kpis.total_jobs,
                completed_jobs=kpis.completed_jobs,
                revenue=kpis.total_revenue,
                average_job_value=kpis.average_job_value,
                completion_rate=kpis.completion_rate,
                average_turnaround_hours=avg_turnaround,
            ))

        # Sort by revenue descending
        branch_performances.sort(key=lambda x: x.revenue, reverse=True)

        # Chain totals
        chain_totals = self.get_kpis(chain_id, start_date, end_date)

        return BranchComparison(
            branches=branch_performances,
            chain_totals=chain_totals,
        )

    def get_employee_analytics(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> EmployeeAnalytics:
        """Get employee performance metrics."""
        # Get job counts per employee (as advisor)
        query = (
            select(
                Employee.id,
                Employee.name,
                Employee.role,
                func.count(Job.id).label("job_count"),
                func.sum(case((Job.status == JobStatus.PAID, 1), else_=0)).label("completed_jobs"),
            )
            .join(Job, Employee.id == Job.advisor_id)
            .join(Branch, Job.branch_id == Branch.id)
            .where(
                Branch.chain_id == chain_id,
                func.date(Job.created_at) >= start_date,
                func.date(Job.created_at) <= end_date,
            )
        )

        if branch_id:
            query = query.where(Job.branch_id == branch_id)

        query = query.group_by(Employee.id, Employee.name, Employee.role).order_by(func.count(Job.id).desc())

        results = self.db.exec(query).all()

        employees = []
        for emp_id, emp_name, role, job_count, completed_jobs in results:
            # Count stages completed by this employee
            stages_completed = self.db.exec(
                select(func.count(JobStageCompletion.id))
                .join(JobService, JobStageCompletion.job_service_id == JobService.id)
                .join(Job, JobService.job_id == Job.id)
                .where(
                    JobStageCompletion.completed_by_id == emp_id,
                    func.date(JobStageCompletion.completed_at) >= start_date,
                    func.date(JobStageCompletion.completed_at) <= end_date,
                )
            ).one() or 0

            employees.append(EmployeePerformance(
                employee_id=emp_id,
                employee_name=emp_name,
                role=role.value if hasattr(role, 'value') else str(role),
                job_count=job_count,
                completed_jobs=completed_jobs or 0,
                stages_completed=stages_completed,
                average_stage_time_hours=None,  # Complex to calculate
            ))

        return EmployeeAnalytics(
            employees=employees,
            total_employees=len(employees),
        )

    def get_time_analytics(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> TimeAnalytics:
        """Get time-based analytics (busiest days, etc.)."""
        # Get job counts by day of week (0=Sunday in PostgreSQL, 1=Monday, etc.)
        query = (
            select(
                extract('dow', Job.created_at).label("day_of_week"),
                func.count(Job.id).label("job_count"),
            )
            .join(Branch, Job.branch_id == Branch.id)
            .where(
                Branch.chain_id == chain_id,
                func.date(Job.created_at) >= start_date,
                func.date(Job.created_at) <= end_date,
            )
        )

        if branch_id:
            query = query.where(Job.branch_id == branch_id)

        query = query.group_by(extract('dow', Job.created_at))

        results = self.db.exec(query).all()

        # Convert to dict (PostgreSQL: 0=Sunday, 1=Monday, ..., 6=Saturday)
        # We want Monday=0, ..., Sunday=6
        dow_counts = {int(dow): count for dow, count in results}

        # Get revenue by day of week
        revenue_query = (
            select(
                extract('dow', Payment.created_at).label("day_of_week"),
                func.sum(Payment.amount).label("revenue"),
            )
            .join(Job, Payment.job_id == Job.id)
            .join(Branch, Job.branch_id == Branch.id)
            .where(
                Branch.chain_id == chain_id,
                Payment.status == PaymentStatus.SUCCESS,
                func.date(Payment.created_at) >= start_date,
                func.date(Payment.created_at) <= end_date,
            )
        )

        if branch_id:
            revenue_query = revenue_query.where(Job.branch_id == branch_id)

        revenue_query = revenue_query.group_by(extract('dow', Payment.created_at))

        revenue_results = self.db.exec(revenue_query).all()
        dow_revenue = {int(dow): revenue or Decimal("0") for dow, revenue in revenue_results}

        # Calculate weeks in period for average
        weeks_in_period = max(1, (end_date - start_date).days / 7)

        # Build day stats (convert PostgreSQL dow to Python weekday)
        # PostgreSQL: 0=Sunday, 1=Monday, ..., 6=Saturday
        # Python/our format: 0=Monday, ..., 6=Sunday
        pg_to_python = {0: 6, 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5}

        days_of_week = []
        for pg_dow in range(7):
            py_dow = pg_to_python[pg_dow]
            count = dow_counts.get(pg_dow, 0)
            revenue = dow_revenue.get(pg_dow, Decimal("0"))

            days_of_week.append(DayOfWeekStats(
                day=DAY_NAMES[py_dow],
                day_index=py_dow,
                job_count=count,
                revenue=revenue,
                average_jobs=round(count / weeks_in_period, 1),
            ))

        # Sort by Python weekday (Monday first)
        days_of_week.sort(key=lambda x: x.day_index)

        # Find busiest and slowest days
        busiest = max(days_of_week, key=lambda x: x.job_count)
        slowest = min(days_of_week, key=lambda x: x.job_count)

        total_jobs = sum(d.job_count for d in days_of_week)
        avg_per_day = total_jobs / 7 if total_jobs > 0 else 0

        return TimeAnalytics(
            busiest_day=busiest.day,
            slowest_day=slowest.day,
            days_of_week=days_of_week,
            average_jobs_per_day=round(avg_per_day, 1),
        )

    def get_customer_metrics(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> CustomerMetrics:
        """Get customer analytics."""
        filters = self._build_job_filters(chain_id, start_date, end_date, branch_id)

        # Total unique customers (by phone)
        unique_phones = self.db.exec(
            select(func.count(func.distinct(Job.customer_phone)))
            .where(*filters, Job.customer_phone.isnot(None))
        ).one() or 0

        # New customers (first job in this period)
        # A customer is "new" if they have no jobs before start_date
        subquery = (
            select(Job.customer_phone)
            .join(Branch, Job.branch_id == Branch.id)
            .where(
                Branch.chain_id == chain_id,
                Job.customer_phone.isnot(None),
                func.date(Job.created_at) < start_date,
            )
        )

        new_customers = self.db.exec(
            select(func.count(func.distinct(Job.customer_phone)))
            .where(
                *filters,
                Job.customer_phone.isnot(None),
                Job.customer_phone.notin_(subquery)
            )
        ).one() or 0

        returning_customers = unique_phones - new_customers

        # Total jobs for average calculation
        total_jobs = self.db.exec(
            select(func.count(Job.id)).where(*filters, Job.customer_phone.isnot(None))
        ).one() or 0

        avg_jobs_per_customer = total_jobs / unique_phones if unique_phones > 0 else 0
        repeat_rate = (returning_customers / unique_phones * 100) if unique_phones > 0 else 0

        return CustomerMetrics(
            total_unique_customers=unique_phones,
            new_customers=new_customers,
            returning_customers=returning_customers,
            repeat_rate=round(repeat_rate, 1),
            average_jobs_per_customer=round(avg_jobs_per_customer, 2),
        )

    def get_estimate_accuracy(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> EstimateAccuracy:
        """Get estimate vs actual payment accuracy."""
        # Get estimates for jobs in period
        query = (
            select(Estimate)
            .join(Job, Estimate.job_id == Job.id)
            .join(Branch, Job.branch_id == Branch.id)
            .where(
                Branch.chain_id == chain_id,
                func.date(Job.created_at) >= start_date,
                func.date(Job.created_at) <= end_date,
            )
        )

        if branch_id:
            query = query.where(Job.branch_id == branch_id)

        estimates = self.db.exec(query).all()

        total_estimates = len(estimates)
        approved_estimates = sum(1 for e in estimates if e.approved_at is not None)
        approval_rate = (approved_estimates / total_estimates * 100) if total_estimates > 0 else 0

        # Calculate accuracy for approved estimates
        total_estimated = Decimal("0")
        total_actual = Decimal("0")
        underestimate_count = 0
        overestimate_count = 0

        for estimate in estimates:
            if estimate.total_approved is None:
                continue

            # Get actual payment for this job
            actual_paid = self.db.exec(
                select(func.sum(Payment.amount))
                .where(
                    Payment.job_id == estimate.job_id,
                    Payment.status == PaymentStatus.SUCCESS
                )
            ).one() or Decimal("0")

            if actual_paid > 0:
                total_estimated += estimate.total_approved
                total_actual += actual_paid

                if actual_paid > estimate.total_approved:
                    underestimate_count += 1
                elif actual_paid < estimate.total_approved:
                    overestimate_count += 1

        avg_estimate = total_estimated / approved_estimates if approved_estimates > 0 else Decimal("0")
        avg_actual = total_actual / approved_estimates if approved_estimates > 0 else Decimal("0")

        # Accuracy as percentage (100% = perfect match)
        accuracy = 100.0
        if total_estimated > 0 and total_actual > 0:
            ratio = float(min(total_estimated, total_actual) / max(total_estimated, total_actual))
            accuracy = ratio * 100

        return EstimateAccuracy(
            total_estimates=total_estimates,
            approved_estimates=approved_estimates,
            approval_rate=round(approval_rate, 1),
            average_estimate=avg_estimate,
            average_actual=avg_actual,
            accuracy_percentage=round(accuracy, 1),
            underestimate_count=underestimate_count,
            overestimate_count=overestimate_count,
        )

    def get_expense_analytics(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> ExpenseAnalytics:
        """Get expense analytics for dashboard."""
        # Base filters
        filters = [
            Expense.chain_id == chain_id,
            Expense.expense_date >= start_date,
            Expense.expense_date <= end_date,
        ]
        if branch_id is not None:
            filters.append(Expense.branch_id == branch_id)

        # Total expenses
        total = self.db.exec(
            select(func.sum(Expense.amount)).where(*filters)
        ).one() or Decimal("0")

        expense_count = self.db.exec(
            select(func.count(Expense.id)).where(*filters)
        ).one() or 0

        # By category
        category_results = self.db.exec(
            select(
                Expense.category,
                func.sum(Expense.amount).label("total"),
            )
            .where(*filters)
            .group_by(Expense.category)
            .order_by(func.sum(Expense.amount).desc())
        ).all()

        by_category = []
        for cat, cat_total in category_results:
            pct = (float(cat_total) / float(total) * 100) if total > 0 else 0
            by_category.append(ExpenseCategorySummary(
                category=cat.value,
                category_label=CATEGORY_LABELS.get(cat.value, cat.value),
                amount=cat_total or Decimal("0"),
                percentage=round(pct, 1),
            ))

        # Top vendors
        vendor_results = self.db.exec(
            select(
                Expense.vendor,
                func.sum(Expense.amount).label("total"),
            )
            .where(*filters, Expense.vendor.isnot(None))
            .group_by(Expense.vendor)
            .order_by(func.sum(Expense.amount).desc())
            .limit(5)
        ).all()

        top_vendors = [
            {"vendor": v or "Unknown", "amount": float(a or 0)}
            for v, a in vendor_results
        ]

        return ExpenseAnalytics(
            total_expenses=total,
            expense_count=expense_count,
            by_category=by_category,
            top_vendors=top_vendors,
        )

    def get_full_dashboard(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> AnalyticsDashboard:
        """Get complete analytics dashboard."""
        return AnalyticsDashboard(
            period_start=start_date,
            period_end=end_date,
            kpis=self.get_kpis(chain_id, start_date, end_date, branch_id),
            job_funnel=self.get_job_funnel(chain_id, start_date, end_date, branch_id),
            revenue_trend=self.get_revenue_trend(chain_id, start_date, end_date, branch_id),
            service_analytics=self.get_service_analytics(chain_id, start_date, end_date, branch_id),
            time_analytics=self.get_time_analytics(chain_id, start_date, end_date, branch_id),
            customer_metrics=self.get_customer_metrics(chain_id, start_date, end_date, branch_id),
            estimate_accuracy=self.get_estimate_accuracy(chain_id, start_date, end_date, branch_id),
            expense_analytics=self.get_expense_analytics(chain_id, start_date, end_date, branch_id),
        )

    # Helper methods

    def _build_job_filters(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> list:
        """Build common job query filters."""
        # Need to join Branch to filter by chain_id
        filters = [
            Job.branch_id == Branch.id,
            Branch.chain_id == chain_id,
            func.date(Job.created_at) >= start_date,
            func.date(Job.created_at) <= end_date,
        ]
        if branch_id:
            filters.append(Job.branch_id == branch_id)
        return filters

    def _get_revenue(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> Decimal:
        """
        Get total revenue from:
        1. Successful M-Pesa payments
        2. Manually recorded payments (estimate.paid_amount)
        """
        # M-Pesa payments
        mpesa_query = (
            select(func.sum(Payment.amount))
            .join(Job, Payment.job_id == Job.id)
            .join(Branch, Job.branch_id == Branch.id)
            .where(
                Branch.chain_id == chain_id,
                Payment.status == PaymentStatus.SUCCESS,
                func.date(Payment.created_at) >= start_date,
                func.date(Payment.created_at) <= end_date,
            )
        )

        if branch_id:
            mpesa_query = mpesa_query.where(Job.branch_id == branch_id)

        mpesa_total = self.db.exec(mpesa_query).one() or Decimal("0")

        # Manual payments from estimates (paid_amount field)
        manual_query = (
            select(func.sum(Estimate.paid_amount))
            .join(Job, Estimate.job_id == Job.id)
            .join(Branch, Job.branch_id == Branch.id)
            .where(
                Branch.chain_id == chain_id,
                Estimate.approved_at.isnot(None),
                Estimate.paid_amount > 0,
                func.date(Job.created_at) >= start_date,
                func.date(Job.created_at) <= end_date,
            )
        )

        if branch_id:
            manual_query = manual_query.where(Job.branch_id == branch_id)

        manual_total = self.db.exec(manual_query).one() or Decimal("0")

        # Return the higher of the two (to avoid double-counting when both exist)
        # In practice, a job will typically have EITHER M-Pesa payments OR manual payments
        return max(mpesa_total, manual_total)

    def _get_expenses(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> Decimal:
        """Get total expenses for period."""
        query = (
            select(func.sum(Expense.amount))
            .where(
                Expense.chain_id == chain_id,
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date,
            )
        )

        if branch_id:
            query = query.where(Expense.branch_id == branch_id)

        result = self.db.exec(query).one()
        return result or Decimal("0")

    def _get_average_turnaround(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> Optional[float]:
        """Get average turnaround time in hours (intake to paid)."""
        query = (
            select(
                func.avg(
                    extract('epoch', Job.actual_ready_at - Job.intake_at) / 3600
                )
            )
            .join(Branch, Job.branch_id == Branch.id)
            .where(
                Branch.chain_id == chain_id,
                Job.status == JobStatus.PAID,
                Job.actual_ready_at.isnot(None),
                func.date(Job.created_at) >= start_date,
                func.date(Job.created_at) <= end_date,
            )
        )

        if branch_id:
            query = query.where(Job.branch_id == branch_id)

        result = self.db.exec(query).one()
        return round(float(result), 1) if result else None

    def _get_service_avg_completion(
        self,
        service_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> Optional[float]:
        """Get average completion time for a service."""
        query = (
            select(
                func.avg(
                    extract('epoch', JobService.completed_at - JobService.started_at) / 3600
                )
            )
            .join(Job, JobService.job_id == Job.id)
            .where(
                JobService.service_id == service_id,
                JobService.completed_at.isnot(None),
                JobService.started_at.isnot(None),
                func.date(Job.created_at) >= start_date,
                func.date(Job.created_at) <= end_date,
            )
        )

        if branch_id:
            query = query.where(Job.branch_id == branch_id)

        result = self.db.exec(query).one()
        return round(float(result), 1) if result else None

    def _get_income_breakdown(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> Tuple[Decimal, Decimal]:
        """
        Get income breakdown from paid estimates:
        - Labor income: sum of line items where is_labor=True
        - Parts revenue: sum of line items where is_labor=False

        Returns (labor_income, parts_revenue)

        IMPORTANT: Only counts the LATEST estimate per job to avoid double-counting
        when estimates are edited/re-approved.
        """
        # First, get the latest estimate ID for each paid job in the period
        # Subquery to get max version per job
        latest_estimate_subquery = (
            select(
                Estimate.job_id,
                func.max(Estimate.version).label("max_version")
            )
            .join(Job, Estimate.job_id == Job.id)
            .join(Branch, Job.branch_id == Branch.id)
            .where(
                Branch.chain_id == chain_id,
                Estimate.approved_at.isnot(None),
                Job.status == JobStatus.PAID,
                func.date(Job.created_at) >= start_date,
                func.date(Job.created_at) <= end_date,
            )
            .group_by(Estimate.job_id)
        )

        if branch_id:
            latest_estimate_subquery = latest_estimate_subquery.where(Job.branch_id == branch_id)

        latest_estimates = latest_estimate_subquery.subquery()

        # Query line items from ONLY the latest estimates
        base_query = (
            select(
                LineItem.is_labor,
                func.sum(LineItem.price).label("total")
            )
            .join(Estimate, LineItem.estimate_id == Estimate.id)
            .join(Job, Estimate.job_id == Job.id)
            .join(Branch, Job.branch_id == Branch.id)
            .join(
                latest_estimates,
                and_(
                    Estimate.job_id == latest_estimates.c.job_id,
                    Estimate.version == latest_estimates.c.max_version
                )
            )
            .where(
                Branch.chain_id == chain_id,
                Estimate.approved_at.isnot(None),
                Job.status == JobStatus.PAID,
                func.date(Job.created_at) >= start_date,
                func.date(Job.created_at) <= end_date,
            )
            .group_by(LineItem.is_labor)
        )

        if branch_id:
            base_query = base_query.where(Job.branch_id == branch_id)

        results = self.db.exec(base_query).all()

        labor_income = Decimal("0")
        parts_revenue = Decimal("0")

        for is_labor, total in results:
            if is_labor:
                labor_income = total or Decimal("0")
            else:
                parts_revenue = total or Decimal("0")

        return labor_income, parts_revenue

    def _get_job_linked_expenses(
        self,
        chain_id: int,
        start_date: date,
        end_date: date,
        branch_id: Optional[int] = None,
    ) -> Decimal:
        """
        Get expenses linked to specific jobs (cost of goods sold).
        These are parts/materials costs for jobs.
        """
        query = (
            select(func.sum(Expense.amount))
            .where(
                Expense.chain_id == chain_id,
                Expense.job_id.isnot(None),  # Only job-linked expenses
                Expense.expense_date >= start_date,
                Expense.expense_date <= end_date,
            )
        )

        if branch_id:
            query = query.where(Expense.branch_id == branch_id)

        result = self.db.exec(query).one()
        return result or Decimal("0")
