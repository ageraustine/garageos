from app.schemas.hr.salary import (
    SalaryCreate,
    SalaryResponse,
    CurrentSalaryResponse,
    SalaryHistoryResponse,
)
from app.schemas.hr.payroll import (
    PayrollPeriodCreate,
    PayrollPeriodResponse,
    PayrollPeriodDetailResponse,
    PayrollItemResponse,
    PayrollItemEmployee,
    PayrollStatusUpdate,
    ProcessPayrollRequest,
    ProcessPayrollResponse,
    ManualPaymentRequest,
    PayrollItemUpdate,
)
from app.schemas.hr.attendance import (
    ClockInRequest,
    ClockOutRequest,
    AttendanceResponse,
    AttendanceWithEmployee,
    BranchAttendanceSummary,
    AttendanceReportRequest,
    EmployeeAttendanceSummary,
)
from app.schemas.hr.leave import (
    LeaveRequestCreate,
    LeaveRequestUpdate,
    LeaveRequestResponse,
    LeaveApproveRequest,
    LeaveRejectRequest,
    LeaveBalanceItem,
    LeaveBalanceResponse,
)
from app.schemas.hr.review import (
    PerformanceReviewCreate,
    PerformanceReviewUpdate,
    PerformanceReviewResponse,
    EmployeeCommentRequest,
    ReviewListFilters,
)
from app.schemas.hr.role_change import (
    RoleChangeResponse,
    RoleChangeHistoryResponse,
    PromotionRequest,
)

__all__ = [
    # Salary
    "SalaryCreate",
    "SalaryResponse",
    "CurrentSalaryResponse",
    "SalaryHistoryResponse",
    # Payroll
    "PayrollPeriodCreate",
    "PayrollPeriodResponse",
    "PayrollPeriodDetailResponse",
    "PayrollItemResponse",
    "PayrollItemEmployee",
    "PayrollStatusUpdate",
    "ProcessPayrollRequest",
    "ProcessPayrollResponse",
    "ManualPaymentRequest",
    "PayrollItemUpdate",
    # Attendance
    "ClockInRequest",
    "ClockOutRequest",
    "AttendanceResponse",
    "AttendanceWithEmployee",
    "BranchAttendanceSummary",
    "AttendanceReportRequest",
    "EmployeeAttendanceSummary",
    # Leave
    "LeaveRequestCreate",
    "LeaveRequestUpdate",
    "LeaveRequestResponse",
    "LeaveApproveRequest",
    "LeaveRejectRequest",
    "LeaveBalanceItem",
    "LeaveBalanceResponse",
    # Review
    "PerformanceReviewCreate",
    "PerformanceReviewUpdate",
    "PerformanceReviewResponse",
    "EmployeeCommentRequest",
    "ReviewListFilters",
    # Role Change
    "RoleChangeResponse",
    "RoleChangeHistoryResponse",
    "PromotionRequest",
]
