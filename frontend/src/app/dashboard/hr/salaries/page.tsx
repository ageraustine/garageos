"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { api, EmployeeListItem, SalaryHistoryResponse, SalaryCreate } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

export default function SalariesPage() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryResponse | null>(null);
  const [showSetSalaryModal, setShowSetSalaryModal] = useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const data = await api.employees.list({ include_inactive: false });
      setEmployees(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const loadSalaryHistory = async (employee: EmployeeListItem) => {
    try {
      setSelectedEmployee(employee);
      const history = await api.hr.salaries.getHistory(employee.id);
      setSalaryHistory(history);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load salary history");
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(parseFloat(amount));
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Salary Management</h1>
        <p className="text-navy-600">View and update employee salaries</p>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee List */}
        <div className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-navy-100 bg-navy-50">
            <h2 className="font-semibold text-navy-900">Employees</h2>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <div className="divide-y divide-navy-100 max-h-[600px] overflow-y-auto">
              {employees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => loadSalaryHistory(emp)}
                  className={`w-full p-4 text-left hover:bg-navy-50 transition-colors ${
                    selectedEmployee?.id === emp.id ? "bg-gold-50 border-l-4 border-gold-500" : ""
                  }`}
                >
                  <p className="font-medium text-navy-900">{emp.name}</p>
                  <p className="text-sm text-navy-500">{emp.role_label}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Salary Detail */}
        <div className="lg:col-span-2">
          {selectedEmployee && salaryHistory ? (
            <div className="bg-white rounded-xl border border-navy-100 shadow-sm">
              <div className="p-4 border-b border-navy-100 flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-navy-900">{salaryHistory.employee_name}</h2>
                  <p className="text-sm text-navy-500">
                    Current: {salaryHistory.current_salary ? formatCurrency(salaryHistory.current_salary) : "Not set"}
                  </p>
                </div>
                <Button variant="primary" onClick={() => setShowSetSalaryModal(true)}>
                  {salaryHistory.current_salary ? "Update Salary" : "Set Salary"}
                </Button>
              </div>

              {/* Salary History */}
              <div className="p-4">
                <h3 className="font-medium text-navy-800 mb-4">Salary History</h3>
                {salaryHistory.history.length === 0 ? (
                  <p className="text-navy-500 text-center py-8">No salary records yet</p>
                ) : (
                  <div className="space-y-3">
                    {salaryHistory.history.map((record) => (
                      <div
                        key={record.id}
                        className={`p-4 rounded-lg border ${
                          !record.effective_to
                            ? "bg-green-50 border-green-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-lg font-semibold text-navy-900">
                            {formatCurrency(record.gross_monthly)}
                          </span>
                          {!record.effective_to && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              Current
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-navy-600 space-y-1">
                          <p>
                            <span className="text-navy-500">Effective:</span>{" "}
                            {new Date(record.effective_from).toLocaleDateString()}
                            {record.effective_to && (
                              <> - {new Date(record.effective_to).toLocaleDateString()}</>
                            )}
                          </p>
                          <p>
                            <span className="text-navy-500">Reason:</span> {record.change_reason}
                          </p>
                          {record.notes && (
                            <p>
                              <span className="text-navy-500">Notes:</span> {record.notes}
                            </p>
                          )}
                          <p className="text-xs text-navy-400">
                            Set by {record.created_by_name} on{" "}
                            {new Date(record.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-navy-100 shadow-sm p-12 text-center">
              <svg
                className="w-16 h-16 mx-auto text-navy-300 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                />
              </svg>
              <h3 className="text-lg font-semibold text-navy-900 mb-2">Select an Employee</h3>
              <p className="text-navy-500">Choose an employee to view their salary history</p>
            </div>
          )}
        </div>
      </div>

      {/* Set Salary Modal */}
      {showSetSalaryModal && selectedEmployee && (
        <SetSalaryModal
          employee={selectedEmployee}
          onClose={() => setShowSetSalaryModal(false)}
          onSuccess={() => {
            setShowSetSalaryModal(false);
            loadSalaryHistory(selectedEmployee);
          }}
        />
      )}
    </motion.div>
  );
}

function SetSalaryModal({
  employee,
  onClose,
  onSuccess,
}: {
  employee: EmployeeListItem;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [grossMonthly, setGrossMonthly] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [changeReason, setChangeReason] = useState("initial");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.hr.salaries.set(employee.id, {
        gross_monthly: parseFloat(grossMonthly),
        effective_from: effectiveFrom,
        change_reason: changeReason,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to set salary");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-navy-900">Set Salary</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-navy-600 mb-4">Setting salary for: <strong>{employee.name}</strong></p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              Gross Monthly Salary (KES)
            </label>
            <input
              type="number"
              value={grossMonthly}
              onChange={(e) => setGrossMonthly(e.target.value)}
              placeholder="50000"
              required
              min="0"
              step="100"
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Effective From</label>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              required
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Reason</label>
            <select
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            >
              <option value="initial">Initial Salary</option>
              <option value="promotion">Promotion</option>
              <option value="annual_review">Annual Review</option>
              <option value="market_adjustment">Market Adjustment</option>
              <option value="performance">Performance Based</option>
              <option value="correction">Correction</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving} className="flex-1">
              {saving ? "Saving..." : "Set Salary"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
