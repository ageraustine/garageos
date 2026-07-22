from sqlalchemy.orm import Session
from sqlalchemy import and_
from datetime import datetime, date
from typing import Optional
from decimal import Decimal
import secrets

from app.models.hr.payroll_period import PayrollPeriod, PayrollStatus
from app.models.hr.payroll_item import PayrollItem, PayrollItemStatus, DisbursementMethod
from app.models.hr.employee_salary import EmployeeSalary
from app.models.employee import Employee
from app.models.branch import Branch
from app.services.hr.salary_service import SalaryService


class PayrollService:
    """Payroll processing with M-Pesa B2C integration."""

    def __init__(self, db: Session, daraja_service=None):
        self.db = db
        self.daraja = daraja_service
        self.salary_service = SalaryService(db)

    def create_period(
        self,
        chain_id: int,
        period_year: int,
        period_month: int,
        created_by_id: int,
        branch_id: Optional[int] = None,
    ) -> PayrollPeriod:
        """Create a new payroll period."""
        # Check for existing period
        existing = self.db.query(PayrollPeriod).filter(
            and_(
                PayrollPeriod.chain_id == chain_id,
                PayrollPeriod.period_year == period_year,
                PayrollPeriod.period_month == period_month,
                PayrollPeriod.branch_id == branch_id,
            )
        ).first()

        if existing:
            raise ValueError("Payroll period already exists for this month")

        period = PayrollPeriod(
            chain_id=chain_id,
            period_year=period_year,
            period_month=period_month,
            branch_id=branch_id,
            status=PayrollStatus.DRAFT,
            created_by_id=created_by_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        self.db.add(period)
        self.db.commit()
        self.db.refresh(period)
        return period

    def generate_items(
        self,
        period_id: int,
        chain_id: int
    ) -> list[PayrollItem]:
        """Generate payroll items from current employee salaries."""
        period = self.db.query(PayrollPeriod).filter(
            and_(
                PayrollPeriod.id == period_id,
                PayrollPeriod.chain_id == chain_id,
            )
        ).first()

        if not period:
            raise ValueError("Payroll period not found")
        if period.status != PayrollStatus.DRAFT:
            raise ValueError("Can only generate items for draft periods")

        # Get target date (end of period month)
        period_end = date(period.period_year, period.period_month, 28)

        # Query employees with their current salaries
        query = self.db.query(Employee, EmployeeSalary).outerjoin(
            EmployeeSalary,
            and_(
                Employee.id == EmployeeSalary.employee_id,
                EmployeeSalary.effective_to.is_(None)
            )
        ).filter(
            and_(
                Employee.chain_id == chain_id,
                Employee.is_active == True
            )
        )

        if period.branch_id:
            query = query.filter(Employee.branch_id == period.branch_id)

        employees_with_salaries = query.all()

        items = []
        total_gross = Decimal("0")
        total_net = Decimal("0")

        for employee, salary in employees_with_salaries:
            if not salary:
                continue  # Skip employees without salary

            gross = salary.gross_monthly
            deductions = Decimal("0")  # Can be extended for taxes, etc.
            net = gross - deductions

            # Check if item already exists
            existing_item = self.db.query(PayrollItem).filter(
                and_(
                    PayrollItem.payroll_period_id == period_id,
                    PayrollItem.employee_id == employee.id,
                )
            ).first()

            if existing_item:
                continue  # Skip if already exists

            item = PayrollItem(
                payroll_period_id=period_id,
                employee_id=employee.id,
                gross_amount=gross,
                deductions=deductions,
                net_amount=net,
                method=DisbursementMethod.MPESA_B2C,
                phone_number=employee.phone,
                status=PayrollItemStatus.PENDING,
                idempotency_key=f"payroll-{period_id}-{employee.id}-{secrets.token_hex(8)}",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
            )
            self.db.add(item)
            items.append(item)

            total_gross += gross
            total_net += net

        # Update period totals
        period.total_gross = total_gross
        period.total_net = total_net
        period.employee_count = len(items)
        period.updated_at = datetime.utcnow()
        self.db.add(period)

        self.db.commit()

        for item in items:
            self.db.refresh(item)

        return items

    def update_period_status(
        self,
        period_id: int,
        chain_id: int,
        new_status: PayrollStatus,
        approved_by_id: Optional[int] = None,
    ) -> PayrollPeriod:
        """Update payroll period status."""
        period = self.db.query(PayrollPeriod).filter(
            and_(
                PayrollPeriod.id == period_id,
                PayrollPeriod.chain_id == chain_id,
            )
        ).first()

        if not period:
            raise ValueError("Payroll period not found")

        # Validate transitions
        valid_transitions = {
            PayrollStatus.DRAFT: [PayrollStatus.PENDING_APPROVAL],
            PayrollStatus.PENDING_APPROVAL: [PayrollStatus.APPROVED, PayrollStatus.DRAFT],
            PayrollStatus.APPROVED: [PayrollStatus.PROCESSING],
            PayrollStatus.PROCESSING: [PayrollStatus.COMPLETED, PayrollStatus.PARTIALLY_PAID],
            PayrollStatus.PARTIALLY_PAID: [PayrollStatus.PROCESSING, PayrollStatus.COMPLETED],
        }

        if new_status not in valid_transitions.get(period.status, []):
            raise ValueError(f"Cannot transition from {period.status} to {new_status}")

        period.status = new_status
        period.updated_at = datetime.utcnow()

        if new_status == PayrollStatus.APPROVED and approved_by_id:
            period.approved_by_id = approved_by_id
            period.approved_at = datetime.utcnow()

        self.db.add(period)
        self.db.commit()
        self.db.refresh(period)
        return period

    async def process_mpesa_disbursements(
        self,
        period_id: int,
        chain_id: int,
        item_ids: Optional[list[int]] = None,
    ) -> dict:
        """Initiate M-Pesa B2C for selected (or all) pending items."""
        period = self.db.query(PayrollPeriod).filter(
            and_(
                PayrollPeriod.id == period_id,
                PayrollPeriod.chain_id == chain_id,
            )
        ).first()

        if not period:
            raise ValueError("Payroll period not found")
        if period.status not in [PayrollStatus.APPROVED, PayrollStatus.PROCESSING, PayrollStatus.PARTIALLY_PAID]:
            raise ValueError("Payroll must be approved before processing")

        if not self.daraja:
            raise ValueError("M-Pesa B2C service not configured")

        # Get items to process
        query = self.db.query(PayrollItem).filter(
            and_(
                PayrollItem.payroll_period_id == period_id,
                PayrollItem.status == PayrollItemStatus.PENDING,
                PayrollItem.method == DisbursementMethod.MPESA_B2C,
            )
        )

        if item_ids:
            query = query.filter(PayrollItem.id.in_(item_ids))

        items = query.all()

        # Update period status to processing
        if period.status == PayrollStatus.APPROVED:
            period.status = PayrollStatus.PROCESSING
            self.db.add(period)

        results = {"initiated": 0, "failed": 0, "skipped": 0, "details": []}

        for item in items:
            try:
                # Call M-Pesa B2C API
                response = await self.daraja.b2c_payment(
                    phone_number=item.phone_number,
                    amount=int(item.net_amount),
                    command_id="SalaryPayment",
                    remarks=f"Salary {period.period_month}/{period.period_year}",
                )

                item.status = PayrollItemStatus.PROCESSING
                item.daraja_conversation_id = response.conversation_id
                item.daraja_originator_conversation_id = response.originator_conversation_id
                item.updated_at = datetime.utcnow()
                self.db.add(item)

                results["initiated"] += 1
                results["details"].append({
                    "item_id": item.id,
                    "employee_id": item.employee_id,
                    "status": "initiated",
                    "conversation_id": response.conversation_id,
                })

            except Exception as e:
                item.status = PayrollItemStatus.FAILED
                item.failure_reason = str(e)
                item.retry_count += 1
                item.updated_at = datetime.utcnow()
                self.db.add(item)

                results["failed"] += 1
                results["details"].append({
                    "item_id": item.id,
                    "employee_id": item.employee_id,
                    "status": "failed",
                    "error": str(e),
                })

        self.db.commit()
        return results

    def mark_manual_payment(
        self,
        item_id: int,
        chain_id: int,
        reference: str,
        recorded_by_id: int,
    ) -> PayrollItem:
        """Mark a payroll item as manually paid."""
        item = self.db.query(PayrollItem).join(PayrollPeriod).filter(
            and_(
                PayrollItem.id == item_id,
                PayrollPeriod.chain_id == chain_id,
            )
        ).first()

        if not item:
            raise ValueError("Payroll item not found")
        if item.status == PayrollItemStatus.SUCCESS:
            raise ValueError("Item already paid")

        item.status = PayrollItemStatus.MANUAL
        item.method = DisbursementMethod.MANUAL
        item.manual_reference = reference
        item.manual_paid_at = datetime.utcnow()
        item.manual_recorded_by_id = recorded_by_id
        item.updated_at = datetime.utcnow()

        self.db.add(item)
        self.db.commit()
        self.db.refresh(item)
        return item

    def update_from_b2c_callback(
        self,
        conversation_id: str,
        result_code: int,
        result_desc: str,
        mpesa_receipt: Optional[str] = None,
    ) -> Optional[PayrollItem]:
        """Update payroll item from M-Pesa B2C callback."""
        item = self.db.query(PayrollItem).filter(
            PayrollItem.daraja_conversation_id == conversation_id
        ).first()

        if not item:
            return None

        if result_code == 0:
            item.status = PayrollItemStatus.SUCCESS
            item.mpesa_receipt = mpesa_receipt
        else:
            item.status = PayrollItemStatus.FAILED
            item.failure_reason = result_desc

        item.updated_at = datetime.utcnow()
        self.db.add(item)

        # Check if all items in period are complete
        period = self.db.query(PayrollPeriod).filter(
            PayrollPeriod.id == item.payroll_period_id
        ).first()

        if period:
            pending_count = self.db.query(PayrollItem).filter(
                and_(
                    PayrollItem.payroll_period_id == period.id,
                    PayrollItem.status.in_([
                        PayrollItemStatus.PENDING,
                        PayrollItemStatus.PROCESSING
                    ])
                )
            ).count()

            if pending_count == 0:
                # All items processed
                failed_count = self.db.query(PayrollItem).filter(
                    and_(
                        PayrollItem.payroll_period_id == period.id,
                        PayrollItem.status == PayrollItemStatus.FAILED
                    )
                ).count()

                if failed_count > 0:
                    period.status = PayrollStatus.PARTIALLY_PAID
                else:
                    period.status = PayrollStatus.COMPLETED

                period.updated_at = datetime.utcnow()
                self.db.add(period)

        self.db.commit()
        self.db.refresh(item)
        return item

    def get_period(self, period_id: int, chain_id: int) -> Optional[PayrollPeriod]:
        """Get a payroll period by ID."""
        return self.db.query(PayrollPeriod).filter(
            and_(
                PayrollPeriod.id == period_id,
                PayrollPeriod.chain_id == chain_id,
            )
        ).first()

    def list_periods(
        self,
        chain_id: int,
        year: Optional[int] = None,
        status: Optional[PayrollStatus] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[PayrollPeriod]:
        """List payroll periods with filters."""
        query = self.db.query(PayrollPeriod).filter(
            PayrollPeriod.chain_id == chain_id
        )

        if year:
            query = query.filter(PayrollPeriod.period_year == year)
        if status:
            query = query.filter(PayrollPeriod.status == status)

        return query.order_by(
            PayrollPeriod.period_year.desc(),
            PayrollPeriod.period_month.desc()
        ).offset(offset).limit(limit).all()

    def get_period_items(self, period_id: int, chain_id: int) -> list[PayrollItem]:
        """Get all items for a payroll period."""
        period = self.get_period(period_id, chain_id)
        if not period:
            return []

        return self.db.query(PayrollItem).filter(
            PayrollItem.payroll_period_id == period_id
        ).all()
