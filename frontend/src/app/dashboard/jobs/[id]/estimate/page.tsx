"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { api, Estimate } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp } from "@/lib/animations";

export default function EstimateViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const jobId = parseInt(id);
  const { user } = useAuth();
  const currency = user?.chain_currency || "KES";

  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paidAmount, setPaidAmount] = useState("");
  const [updatingPayment, setUpdatingPayment] = useState(false);

  // Check if user can approve internally or edit payment
  const canApproveOrEdit = user && ["hq", "manager"].includes(user.role);

  useEffect(() => {
    loadEstimate();
  }, [jobId]);

  const loadEstimate = async () => {
    try {
      const data = await api.estimates.getLatest(jobId);
      setEstimate(data);
      if (data.paid_amount) {
        setPaidAmount(data.paid_amount);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load estimate");
    } finally {
      setLoading(false);
    }
  };

  const handleInternalApprove = async () => {
    if (!estimate) return;
    setApproving(true);
    try {
      // Approve all items (critical + optional)
      const optionalIds = estimate.line_items
        .filter(item => item.kind === "optional")
        .map(item => item.id);
      const updated = await api.estimates.internalApprove(jobId, {
        selected_optional_ids: optionalIds,
      });
      setEstimate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!estimate) return;
    setUpdatingPayment(true);
    try {
      const amount = parseFloat(paidAmount) || 0;
      const updated = await api.estimates.updatePayment(jobId, amount);
      setEstimate(updated);
      setShowPaymentModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update payment");
    } finally {
      setUpdatingPayment(false);
    }
  };

  const criticalItems = estimate?.line_items.filter((item) => item.kind === "critical") || [];
  const optionalItems = estimate?.line_items.filter((item) => item.kind === "optional") || [];

  const criticalTotal = criticalItems.reduce(
    (sum, item) => sum + parseFloat(item.price),
    0
  );
  const optionalTotal = optionalItems.reduce(
    (sum, item) => sum + parseFloat(item.price),
    0
  );
  const grandTotal = criticalTotal + optionalTotal;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-KE", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !estimate) {
    return (
      <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
        <div className="mb-6">
          <Link
            href={`/dashboard/jobs/${jobId}`}
            className="text-sm text-navy-500 hover:text-navy-700 mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Job
          </Link>
        </div>
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-navy-900 mb-2">No Estimate Found</h3>
          <p className="text-navy-500 mb-4">
            {error || "This job doesn't have an estimate yet"}
          </p>
          <Link href={`/dashboard/jobs/${jobId}/estimate/new`}>
            <Button variant="primary">Create Estimate</Button>
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/jobs/${jobId}`}
          className="text-sm text-navy-500 hover:text-navy-700 mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Job
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">Estimate</h1>
            <p className="text-navy-600">Version {estimate.version}</p>
          </div>
          <div className="flex items-center gap-3">
            {estimate.approved_at ? (
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                Approved
              </span>
            ) : (
              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                Pending Approval
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Line Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Critical Items */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Required Work</h2>
            {criticalItems.length === 0 ? (
              <p className="text-navy-400 text-sm">No required items</p>
            ) : (
              <div className="space-y-3">
                {criticalItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 border-b border-navy-50 last:border-0"
                  >
                    <span className="text-navy-900">{item.label}</span>
                    <span className="font-medium text-navy-900">
                      {currency} {parseFloat(item.price).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 font-semibold">
                  <span className="text-navy-700">Subtotal</span>
                  <span className="text-navy-900">{currency} {criticalTotal.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Optional Items */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Recommended (Optional)</h2>
            {optionalItems.length === 0 ? (
              <p className="text-navy-400 text-sm">No optional items</p>
            ) : (
              <div className="space-y-3">
                {optionalItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between py-3 border-b border-navy-50 last:border-0"
                  >
                    <span className="text-navy-900">{item.label}</span>
                    <span className="font-medium text-navy-900">
                      {currency} {parseFloat(item.price).toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 font-semibold">
                  <span className="text-navy-700">Subtotal</span>
                  <span className="text-navy-900">{currency} {optionalTotal.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm sticky top-6">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Summary</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-500">Required Work</dt>
                <dd className="font-medium text-navy-900">
                  {currency} {criticalTotal.toLocaleString()}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-500">Optional Items</dt>
                <dd className="font-medium text-navy-900">
                  {currency} {optionalTotal.toLocaleString()}
                </dd>
              </div>
              <div className="border-t border-navy-100 pt-3 flex justify-between">
                <dt className="font-medium text-navy-900">Total (if all selected)</dt>
                <dd className="font-bold text-navy-900">
                  {currency} {grandTotal.toLocaleString()}
                </dd>
              </div>

              {estimate.approved_at && estimate.total_approved && (
                <>
                  <div className="border-t border-navy-100 pt-3 flex justify-between">
                    <dt className="font-medium text-green-700">Approved Amount</dt>
                    <dd className="font-bold text-green-700">
                      {currency} {parseFloat(estimate.total_approved).toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-navy-500">Paid</dt>
                    <dd className="font-medium text-navy-900">
                      {currency} {parseFloat(estimate.paid_amount || "0").toLocaleString()}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="font-medium text-orange-600">Balance</dt>
                    <dd className="font-bold text-orange-600">
                      {currency} {parseFloat(estimate.balance || "0").toLocaleString()}
                    </dd>
                  </div>
                </>
              )}
            </dl>

            {/* Approval Info */}
            {estimate.approved_at && (
              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-medium">
                    {estimate.approval_type === "internal"
                      ? `Approved by ${estimate.approver?.name || "Staff"}`
                      : "Customer Approved"}
                  </span>
                </div>
                <p className="text-sm text-green-700">
                  Approved on {formatDate(estimate.approved_at)}
                  {estimate.approval_type === "internal" && estimate.approver && (
                    <span className="ml-1 capitalize">({estimate.approver.role})</span>
                  )}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-6 space-y-3">
              {/* Internal Approval for HQ/Manager */}
              {!estimate.approved_at && canApproveOrEdit && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleInternalApprove}
                  disabled={approving}
                >
                  {approving ? "Approving..." : "Approve Quotation"}
                </Button>
              )}

              {/* Edit Payment for HQ/Manager */}
              {estimate.approved_at && canApproveOrEdit && (
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    setPaidAmount(estimate.paid_amount || "0");
                    setShowPaymentModal(true);
                  }}
                >
                  Edit Payment
                </Button>
              )}

              {!estimate.approved_at && (
                <Link href={`/dashboard/jobs/${jobId}/estimate/new`}>
                  <Button variant="secondary" className="w-full">
                    Create New Version
                  </Button>
                </Link>
              )}
              <Link href={`/dashboard/jobs/${jobId}`}>
                <Button variant="outline" className="w-full">
                  Back to Job
                </Button>
              </Link>
            </div>
          </div>

          {/* Metadata */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <h3 className="text-sm font-medium text-navy-700 mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-navy-500">Estimate ID</dt>
                <dd className="text-navy-900">#{estimate.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-500">Version</dt>
                <dd className="text-navy-900">{estimate.version}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-500">Created</dt>
                <dd className="text-navy-900">{formatDate(estimate.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-navy-500">Line Items</dt>
                <dd className="text-navy-900">{estimate.line_items.length}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Payment Edit Modal */}
      {showPaymentModal && estimate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-navy-100">
              <h3 className="text-lg font-semibold text-navy-900">Edit Payment</h3>
              <p className="text-sm text-navy-600 mt-1">
                Update the paid amount for this quotation
              </p>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 bg-navy-50 rounded-lg">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-navy-500">Total Approved</span>
                  <span className="font-medium text-navy-900">
                    {currency} {parseFloat(estimate.total_approved || "0").toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-navy-500">Current Balance</span>
                  <span className="font-medium text-orange-600">
                    {currency} {parseFloat(estimate.balance || "0").toLocaleString()}
                  </span>
                </div>
              </div>
              <label className="block">
                <span className="text-sm font-medium text-navy-700">Paid Amount ({currency})</span>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  min="0"
                  max={estimate.total_approved || undefined}
                  step="0.01"
                  className="mt-1 w-full px-4 py-3 border border-navy-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  placeholder="0.00"
                />
              </label>
              {paidAmount && parseFloat(paidAmount) > 0 && estimate.total_approved && (
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">New Balance</span>
                    <span className="font-bold text-green-800">
                      {currency} {(parseFloat(estimate.total_approved) - parseFloat(paidAmount)).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-navy-100 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowPaymentModal(false)}
                className="flex-1"
                disabled={updatingPayment}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdatePayment}
                disabled={updatingPayment}
                className="flex-1"
              >
                {updatingPayment ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
