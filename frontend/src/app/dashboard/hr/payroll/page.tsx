"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import { api, PayrollPeriodResponse, PayrollStatus } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

const STATUS_COLORS: Record<PayrollStatus, string> = {
  draft: "bg-gray-100 text-gray-800 border-gray-200",
  pending_approval: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-blue-100 text-blue-800 border-blue-200",
  processing: "bg-purple-100 text-purple-800 border-purple-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function PayrollPage() {
  const router = useRouter();
  const [periods, setPeriods] = useState<PayrollPeriodResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState<number>(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<PayrollStatus | "">("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadPeriods();
  }, [yearFilter, statusFilter]);

  const loadPeriods = async () => {
    try {
      setLoading(true);
      const data = await api.hr.payroll.listPeriods({
        year: yearFilter,
        status: statusFilter || undefined,
      });
      setPeriods(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payroll periods");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Payroll</h1>
          <p className="text-navy-600">Manage payroll periods and disbursements</p>
        </div>
        <Button variant="primary" onClick={() => setShowCreateModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Payroll
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm text-navy-500 mb-1">Year</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(parseInt(e.target.value))}
              className="px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-navy-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PayrollStatus | "")}
              className="px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
            >
              <option value="">All Status</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
        </div>
      ) : periods.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-navy-100 shadow-sm text-center">
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
              d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-navy-900 mb-2">No payroll periods</h3>
          <p className="text-navy-500 mb-4">Create your first payroll period to get started</p>
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            Create Payroll Period
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-navy-50 border-b border-navy-100">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Period</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Branch</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Employees</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Total Net</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-navy-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {periods.map((period) => (
                <tr key={period.id} className="hover:bg-navy-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-medium text-navy-900">
                      {MONTHS[period.period_month - 1]} {period.period_year}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-navy-600">
                    {period.branch_name || "All Branches"}
                  </td>
                  <td className="px-6 py-4 text-navy-600">
                    {period.employee_count} employees
                    {period.status === "completed" && (
                      <span className="text-sm text-green-600 ml-2">
                        ({period.processed_count} paid)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-medium text-navy-900">
                    {formatCurrency(period.total_net)}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-lg border text-xs font-medium ${
                        STATUS_COLORS[period.status]
                      }`}
                    >
                      {STATUS_LABELS[period.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/hr/payroll/${period.id}`}
                      className="text-gold-600 hover:text-gold-800 font-medium"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreatePayrollModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(id) => {
            setShowCreateModal(false);
            router.push(`/dashboard/hr/payroll/${id}`);
          }}
        />
      )}
    </motion.div>
  );
}

function CreatePayrollModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (id: number) => void;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const period = await api.hr.payroll.createPeriod({
        period_year: year,
        period_month: month,
      });
      onSuccess(period.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create payroll period");
      setCreating(false);
    }
  };

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() + 1 - i);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-navy-900">Create Payroll Period</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
              >
                {MONTHS.map((m, i) => (
                  <option key={i} value={i + 1}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={creating} className="flex-1">
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
