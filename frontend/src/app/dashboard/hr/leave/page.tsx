"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { api, LeaveRequestResponse, LeaveBalanceResponse, LeaveStatus, LeaveType } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";
import { useAuth } from "@/hooks/useAuth";

const STATUS_COLORS: Record<LeaveStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-800",
};

const STATUS_LABELS: Record<LeaveStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: "Annual Leave",
  sick: "Sick Leave",
  maternity: "Maternity Leave",
  paternity: "Paternity Leave",
  unpaid: "Unpaid Leave",
  compassionate: "Compassionate Leave",
};

export default function LeavePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<LeaveRequestResponse[]>([]);
  const [myRequests, setMyRequests] = useState<LeaveRequestResponse[]>([]);
  const [myBalance, setMyBalance] = useState<LeaveBalanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "">("");
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<LeaveRequestResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"my" | "team">("my");

  const isManager = user?.role === "hq" || user?.role === "manager";

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const promises: Promise<unknown>[] = [
        api.hr.leave.getMyRequests(statusFilter || undefined),
      ];

      if (user) {
        promises.push(api.hr.leave.getBalance(user.id));
      }

      if (isManager) {
        promises.push(api.hr.leave.listRequests({ status: statusFilter || undefined }));
      }

      const results = await Promise.all(promises);
      setMyRequests(results[0] as LeaveRequestResponse[]);
      setMyBalance(results[1] as LeaveBalanceResponse);
      if (isManager && results[2]) {
        setRequests(results[2] as LeaveRequestResponse[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: number) => {
    try {
      await api.hr.leave.approveRequest(requestId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request");
    }
  };

  const handleCancel = async (requestId: number) => {
    try {
      await api.hr.leave.cancelRequest(requestId);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel request");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Leave Management</h1>
          <p className="text-navy-600">Request and manage leave</p>
        </div>
        <Button variant="primary" onClick={() => setShowRequestModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Request Leave
        </Button>
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

      {/* My Balance */}
      {myBalance && (
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">My Leave Balance ({myBalance.year})</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Annual</p>
              <p className="text-xl font-bold text-blue-800">
                {myBalance.annual.remaining}/{myBalance.annual.entitled}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">Sick</p>
              <p className="text-xl font-bold text-red-800">
                {myBalance.sick.remaining}/{myBalance.sick.entitled}
              </p>
            </div>
            <div className="p-3 bg-pink-50 rounded-lg">
              <p className="text-sm text-pink-600">Maternity</p>
              <p className="text-xl font-bold text-pink-800">
                {myBalance.maternity.remaining}/{myBalance.maternity.entitled}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-600">Paternity</p>
              <p className="text-xl font-bold text-purple-800">
                {myBalance.paternity.remaining}/{myBalance.paternity.entitled}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Compassionate</p>
              <p className="text-xl font-bold text-gray-800">
                {myBalance.compassionate.remaining}/{myBalance.compassionate.entitled}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs (for managers) */}
      {isManager && (
        <div className="flex border-b border-navy-200 mb-6">
          <button
            onClick={() => setActiveTab("my")}
            className={`px-4 py-2 font-medium border-b-2 -mb-px ${
              activeTab === "my"
                ? "text-gold-600 border-gold-500"
                : "text-navy-500 border-transparent hover:text-navy-700"
            }`}
          >
            My Requests
          </button>
          <button
            onClick={() => setActiveTab("team")}
            className={`px-4 py-2 font-medium border-b-2 -mb-px ${
              activeTab === "team"
                ? "text-gold-600 border-gold-500"
                : "text-navy-500 border-transparent hover:text-navy-700"
            }`}
          >
            Team Requests
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm text-navy-500 mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeaveStatus | "")}
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

      {/* Requests Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <RequestsTable
          requests={activeTab === "my" || !isManager ? myRequests : requests}
          showEmployee={activeTab === "team" && isManager}
          isManager={isManager}
          onApprove={handleApprove}
          onReject={(req) => setShowRejectModal(req)}
          onCancel={handleCancel}
        />
      )}

      {/* Request Modal */}
      {showRequestModal && (
        <RequestLeaveModal
          onClose={() => setShowRequestModal(false)}
          onSuccess={() => {
            setShowRequestModal(false);
            loadData();
          }}
        />
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <RejectModal
          request={showRejectModal}
          onClose={() => setShowRejectModal(null)}
          onSuccess={() => {
            setShowRejectModal(null);
            loadData();
          }}
        />
      )}
    </motion.div>
  );
}

function RequestsTable({
  requests,
  showEmployee,
  isManager,
  onApprove,
  onReject,
  onCancel,
}: {
  requests: LeaveRequestResponse[];
  showEmployee: boolean;
  isManager: boolean;
  onApprove: (id: number) => void;
  onReject: (req: LeaveRequestResponse) => void;
  onCancel: (id: number) => void;
}) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
    });
  };

  if (requests.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 border border-navy-100 shadow-sm text-center">
        <p className="text-navy-500">No leave requests found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden">
      <table className="w-full">
        <thead className="bg-navy-50 border-b border-navy-100">
          <tr>
            {showEmployee && (
              <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Employee</th>
            )}
            <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Type</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Period</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Days</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Status</th>
            <th className="text-right px-6 py-3 text-sm font-medium text-navy-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100">
          {requests.map((req) => (
            <tr key={req.id} className="hover:bg-navy-50">
              {showEmployee && (
                <td className="px-6 py-4 font-medium text-navy-900">{req.employee_name}</td>
              )}
              <td className="px-6 py-4 text-navy-600">{LEAVE_TYPE_LABELS[req.leave_type]}</td>
              <td className="px-6 py-4 text-navy-600">
                {formatDate(req.start_date)} - {formatDate(req.end_date)}
              </td>
              <td className="px-6 py-4 text-navy-600">{req.days_requested}</td>
              <td className="px-6 py-4">
                <span className={`px-2 py-1 rounded-lg text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                  {STATUS_LABELS[req.status]}
                </span>
                {req.rejection_reason && (
                  <p className="text-xs text-red-500 mt-1">{req.rejection_reason}</p>
                )}
              </td>
              <td className="px-6 py-4 text-right space-x-2">
                {req.status === "pending" && showEmployee && isManager && (
                  <>
                    <button
                      onClick={() => onApprove(req.id)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => onReject(req)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Reject
                    </button>
                  </>
                )}
                {req.status === "pending" && !showEmployee && (
                  <button
                    onClick={() => onCancel(req.id)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Cancel
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestLeaveModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [leaveType, setLeaveType] = useState<LeaveType>("annual");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.hr.leave.createRequest({
        leave_type: leaveType,
        start_date: startDate,
        end_date: endDate,
        reason: reason || undefined,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
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
          <h2 className="text-xl font-semibold text-navy-900">Request Leave</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Leave Type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
            >
              {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Reason (Optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
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
              {saving ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function RejectModal({
  request,
  onClose,
  onSuccess,
}: {
  request: LeaveRequestResponse;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.hr.leave.rejectRequest(request.id, { rejection_reason: reason });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request");
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
          <h2 className="text-xl font-semibold text-navy-900">Reject Leave Request</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-navy-600 mb-4">
          Rejecting leave request from <strong>{request.employee_name}</strong>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Rejection Reason *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
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
            <Button type="submit" variant="primary" disabled={saving} className="flex-1 bg-red-500 hover:bg-red-600">
              {saving ? "Rejecting..." : "Reject"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
