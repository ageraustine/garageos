"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui";
import { api, PayrollPeriodDetail, PayrollItemResponse, PayrollStatus, PayrollItemStatus } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";
import { use } from "react";

const STATUS_COLORS: Record<PayrollStatus, string> = {
  draft: "bg-gray-100 text-gray-800",
  pending_approval: "bg-yellow-100 text-yellow-800",
  approved: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<PayrollStatus, string> = {
  draft: "Draft",
  pending_approval: "Pending Approval",
  approved: "Approved",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ITEM_STATUS_COLORS: Record<PayrollItemStatus, string> = {
  pending: "bg-gray-100 text-gray-800",
  processing: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function PayrollDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [period, setPeriod] = useState<PayrollPeriodDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showManualPayModal, setShowManualPayModal] = useState<PayrollItemResponse | null>(null);

  useEffect(() => {
    loadPeriod();
  }, [id]);

  const loadPeriod = async () => {
    try {
      setLoading(true);
      const data = await api.hr.payroll.getPeriod(parseInt(id));
      setPeriod(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load payroll period");
    } finally {
      setLoading(false);
    }
  };

  const generateItems = async () => {
    if (!period) return;
    try {
      setProcessing(true);
      await api.hr.payroll.generateItems(period.id);
      loadPeriod();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate payroll items");
    } finally {
      setProcessing(false);
    }
  };

  const updateStatus = async (newStatus: PayrollStatus) => {
    if (!period) return;
    try {
      setProcessing(true);
      await api.hr.payroll.updateStatus(period.id, newStatus);
      loadPeriod();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setProcessing(false);
    }
  };

  const processMpesa = async () => {
    if (!period) return;
    try {
      setProcessing(true);
      await api.hr.payroll.processMpesa(period.id);
      loadPeriod();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process M-Pesa payments");
    } finally {
      setProcessing(false);
    }
  };

  const retryItem = async (itemId: number) => {
    try {
      await api.hr.payroll.retryItem(itemId);
      loadPeriod();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to retry payment");
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!period) {
    return (
      <div className="text-center py-12">
        <p className="text-navy-600">Payroll period not found</p>
        <Link href="/dashboard/hr/payroll" className="text-gold-600 hover:underline">
          Back to Payroll
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/hr/payroll" className="text-navy-400 hover:text-navy-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-navy-900">
            {MONTHS[period.period_month - 1]} {period.period_year} Payroll
          </h1>
          <p className="text-navy-600">
            {period.branch_name || "All Branches"} - {period.employee_count} employees
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[period.status]}`}>
          {STATUS_LABELS[period.status]}
        </span>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
          <p className="text-sm text-navy-500">Total Gross</p>
          <p className="text-xl font-bold text-navy-900">{formatCurrency(period.total_gross)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
          <p className="text-sm text-navy-500">Total Deductions</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(period.total_deductions)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
          <p className="text-sm text-navy-500">Total Net</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(period.total_net)}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
          <p className="text-sm text-navy-500">Processed</p>
          <p className="text-xl font-bold text-navy-900">
            {period.processed_count}/{period.employee_count}
            {period.failed_count > 0 && (
              <span className="text-red-600 text-sm ml-2">({period.failed_count} failed)</span>
            )}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm mb-6">
        <div className="flex flex-wrap gap-3">
          {period.status === "draft" && period.items.length === 0 && (
            <Button variant="primary" onClick={generateItems} disabled={processing}>
              {processing ? "Generating..." : "Generate from Salaries"}
            </Button>
          )}
          {period.status === "draft" && period.items.length > 0 && (
            <Button variant="primary" onClick={() => updateStatus("pending_approval")} disabled={processing}>
              Submit for Approval
            </Button>
          )}
          {period.status === "pending_approval" && (
            <>
              <Button variant="primary" onClick={() => updateStatus("approved")} disabled={processing}>
                Approve
              </Button>
              <Button variant="outline" onClick={() => updateStatus("draft")} disabled={processing}>
                Return to Draft
              </Button>
            </>
          )}
          {period.status === "approved" && (
            <Button variant="primary" onClick={processMpesa} disabled={processing}>
              {processing ? "Processing..." : "Process M-Pesa Payments"}
            </Button>
          )}
          {(period.status === "draft" || period.status === "pending_approval") && (
            <Button
              variant="outline"
              onClick={() => updateStatus("cancelled")}
              disabled={processing}
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              Cancel
            </Button>
          )}
        </div>
      </div>

      {/* Items Table */}
      {period.items.length === 0 ? (
        <div className="bg-white rounded-xl p-12 border border-navy-100 shadow-sm text-center">
          <p className="text-navy-500">No payroll items generated yet</p>
          {period.status === "draft" && (
            <p className="text-sm text-navy-400 mt-2">
              Click Generate from Salaries to create items based on current employee salaries
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-navy-50 border-b border-navy-100">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Employee</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Phone</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-navy-600">Gross</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-navy-600">Deductions</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-navy-600">Net</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Method</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-navy-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {period.items.map((item) => (
                <tr key={item.id} className="hover:bg-navy-50">
                  <td className="px-6 py-4 font-medium text-navy-900">{item.employee_name}</td>
                  <td className="px-6 py-4 text-navy-600 font-mono text-sm">{item.employee_phone}</td>
                  <td className="px-6 py-4 text-right text-navy-600">{formatCurrency(item.gross_amount)}</td>
                  <td className="px-6 py-4 text-right text-red-600">{formatCurrency(item.deductions)}</td>
                  <td className="px-6 py-4 text-right font-medium text-navy-900">{formatCurrency(item.net_amount)}</td>
                  <td className="px-6 py-4 text-navy-600 capitalize">
                    {item.method === "mpesa_b2c" ? "M-Pesa" : "Manual"}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-lg text-xs font-medium ${ITEM_STATUS_COLORS[item.status]}`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                    {item.mpesa_receipt && (
                      <span className="block text-xs text-navy-400 mt-1">{item.mpesa_receipt}</span>
                    )}
                    {item.manual_reference && (
                      <span className="block text-xs text-navy-400 mt-1">{item.manual_reference}</span>
                    )}
                    {item.error_message && (
                      <span className="block text-xs text-red-500 mt-1">{item.error_message}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {item.status === "pending" && period.status === "approved" && (
                      <button
                        onClick={() => setShowManualPayModal(item)}
                        className="text-gold-600 hover:text-gold-800 text-sm font-medium"
                      >
                        Mark Paid
                      </button>
                    )}
                    {item.status === "failed" && (
                      <button
                        onClick={() => retryItem(item.id)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        Retry
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Manual Pay Modal */}
      {showManualPayModal && (
        <ManualPayModal
          item={showManualPayModal}
          onClose={() => setShowManualPayModal(null)}
          onSuccess={() => {
            setShowManualPayModal(null);
            loadPeriod();
          }}
        />
      )}
    </motion.div>
  );
}

function ManualPayModal({
  item,
  onClose,
  onSuccess,
}: {
  item: PayrollItemResponse;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.hr.payroll.markManualPayment(item.id, {
        reference,
        notes: notes || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark payment");
      setSaving(false);
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-navy-900">Mark as Paid</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-navy-50 rounded-lg p-4 mb-4">
          <p className="text-navy-600">
            <strong>{item.employee_name}</strong>
          </p>
          <p className="text-lg font-bold text-navy-900">{formatCurrency(item.net_amount)}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              Payment Reference *
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Bank transfer ref, cheque number, etc."
              required
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
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
              {saving ? "Saving..." : "Mark as Paid"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
