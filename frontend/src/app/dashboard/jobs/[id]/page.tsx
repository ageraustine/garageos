"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button, PDFPreviewModal } from "@/components/ui";
import { api, JobDetail, EmployeeListItem, AssignedEmployee, Estimate } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";
import { useAuth } from "@/hooks/useAuth";

const STATUS_COLORS: Record<string, string> = {
  intake: "bg-blue-100 text-blue-800 border-blue-200",
  diagnosis: "bg-yellow-100 text-yellow-800 border-yellow-200",
  working: "bg-orange-100 text-orange-800 border-orange-200",
  washing: "bg-purple-100 text-purple-800 border-purple-200",
  ready: "bg-green-100 text-green-800 border-green-200",
  paid: "bg-gray-100 text-gray-800 border-gray-200",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Assignment editing state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [allEmployees, setAllEmployees] = useState<EmployeeListItem[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [togglingStage, setTogglingStage] = useState<number | null>(null);

  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // PDF Preview state
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // Estimate state
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [approvingEstimate, setApprovingEstimate] = useState(false);

  const canEditAssignments = user && ["hq", "manager", "advisor"].includes(user.role);
  const canDelete = user && ["hq", "manager"].includes(user.role);
  const canApproveInternally = user && ["hq", "manager"].includes(user.role);

  // Check if user can update stages (assigned to job or has elevated role)
  const canUpdateStages = user && (
    ["hq", "manager", "advisor"].includes(user.role) ||
    job?.assigned_employees.some(e => e.id === user.id)
  );

  useEffect(() => {
    loadJob();
  }, [id]);

  const loadJob = async () => {
    try {
      const data = await api.jobs.get(parseInt(id));
      setJob(data);
      // Load estimate if job has one
      if (data.has_estimate) {
        try {
          const est = await api.estimates.getLatest(data.id);
          setEstimate(est);
        } catch {
          // Estimate not found, ignore
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job");
    } finally {
      setLoading(false);
    }
  };

  const handleInternalApprove = async () => {
    if (!job || !estimate) return;
    setApprovingEstimate(true);
    try {
      // Approve all items (critical + optional)
      const optionalIds = estimate.line_items
        .filter(item => item.kind === "optional")
        .map(item => item.id);
      const updated = await api.estimates.internalApprove(job.id, {
        selected_optional_ids: optionalIds,
      });
      setEstimate(updated);
      // Reload job to update estimate_approved flag
      await loadJob();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve estimate");
    } finally {
      setApprovingEstimate(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!job) return;
    setUpdating(true);
    try {
      await api.jobs.updateStatus(job.id, newStatus);
      await loadJob();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const copyMagicLink = async () => {
    if (!job) return;
    await navigator.clipboard.writeText(`${window.location.origin}/job/${job.magic_link_token}`);
  };

  const openAssignmentModal = async () => {
    try {
      const employees = await api.employees.list();
      setAllEmployees(employees.filter((e) => e.is_active));
      setSelectedEmployeeIds(job?.assigned_employees.map((e) => e.id) || []);
      setShowAssignmentModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    }
  };

  const toggleEmployeeSelection = (id: number) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const saveAssignments = async () => {
    if (!job) return;
    setSavingAssignments(true);
    try {
      await api.jobs.updateAssignments(job.id, selectedEmployeeIds);
      await loadJob();
      setShowAssignmentModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update assignments");
    } finally {
      setSavingAssignments(false);
    }
  };

  const handleToggleStage = async (jobServiceId: number, stageId: number) => {
    if (!canUpdateStages) return;
    setTogglingStage(stageId);
    try {
      const result = await api.jobs.toggleStage(jobServiceId, stageId);
      // Update local state immediately for better UX
      setJob((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          services: prev.services.map((svc) =>
            svc.id === jobServiceId
              ? { ...svc, completed_stage_ids: result.completed_stage_ids }
              : svc
          ),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update stage");
    } finally {
      setTogglingStage(null);
    }
  };

  const handleDownloadQuotation = async () => {
    if (!job) return;
    setDownloadingPdf(true);
    try {
      const blob = await api.quotation.downloadJobPdf(job.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quotation_${job.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleDelete = async () => {
    if (!job) return;
    setDeleting(true);
    try {
      await api.jobs.delete(job.id);
      router.push("/dashboard/jobs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete job");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || "Job not found"}</p>
        <Link href="/dashboard/jobs">
          <Button variant="secondary">Back to Jobs</Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/jobs"
          className="text-sm text-navy-500 hover:text-navy-700 mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Jobs
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900 font-mono">
              {job.plate}
            </h1>
            <p className="text-navy-600">
              {job.vehicle_make} {job.vehicle_model}
              {job.vehicle_year && ` (${job.vehicle_year})`}
            </p>
          </div>
          <span
            className={`px-4 py-2 rounded-lg border font-medium ${
              STATUS_COLORS[job.status] || "bg-gray-100"
            }`}
          >
            {job.status_label}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Services */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-navy-900">Services</h2>
              {job.next_statuses.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-navy-500">Move to:</span>
                  {job.next_statuses.map((nextStatus) => (
                    <Button
                      key={nextStatus}
                      variant="secondary"
                      size="sm"
                      onClick={() => handleStatusChange(nextStatus)}
                      disabled={updating}
                    >
                      {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-4">
              {job.services.map((svc) => {
                const completedCount = svc.completed_stage_ids?.length || 0;
                const totalStages = svc.stages.length;
                const allComplete = completedCount === totalStages;

                return (
                  <div key={svc.id} className="border border-navy-100 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium text-navy-900">{svc.service_name}</h3>
                      <span className={`text-sm px-2 py-1 rounded ${
                        allComplete
                          ? "bg-green-100 text-green-800"
                          : completedCount > 0
                          ? "bg-gold-100 text-gold-800"
                          : "bg-navy-100 text-navy-500"
                      }`}>
                        {completedCount}/{totalStages} done
                      </span>
                    </div>
                    <div className="space-y-2">
                      {svc.stages.map((stage) => {
                        const isCompleted = svc.completed_stage_ids?.includes(stage.id);
                        const isToggling = togglingStage === stage.id;

                        return (
                          <button
                            key={stage.id}
                            onClick={() => handleToggleStage(svc.id, stage.id)}
                            disabled={!canUpdateStages || isToggling}
                            className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition-all ${
                              canUpdateStages
                                ? "hover:bg-navy-50 cursor-pointer"
                                : "cursor-default"
                            } ${isToggling ? "opacity-50" : ""}`}
                          >
                            <div
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                isCompleted
                                  ? "bg-green-500 border-green-500"
                                  : "border-navy-300"
                              }`}
                            >
                              {isCompleted && (
                                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className={`text-sm ${
                              isCompleted ? "text-navy-900" : "text-navy-600"
                            }`}>
                              {stage.name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quotation Section */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-navy-900">Quotation</h2>
              {job.has_estimate && (
                <span
                  className={`text-sm px-2 py-1 rounded ${
                    job.estimate_approved
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {job.estimate_approved ? "Approved" : "Pending Approval"}
                </span>
              )}
            </div>

            {/* Estimate Summary */}
            {estimate && estimate.approved_at && (
              <div className="mb-4 p-4 bg-navy-50 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-navy-500 block">Total</span>
                    <span className="font-semibold text-navy-900">
                      {user?.chain_currency || "KES"} {parseFloat(estimate.total_approved || "0").toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-navy-500 block">Paid</span>
                    <span className="font-semibold text-green-700">
                      {user?.chain_currency || "KES"} {parseFloat(estimate.paid_amount || "0").toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-navy-500 block">Balance</span>
                    <span className="font-semibold text-orange-600">
                      {user?.chain_currency || "KES"} {parseFloat(estimate.balance || "0").toLocaleString()}
                    </span>
                  </div>
                </div>
                {estimate.approver && (
                  <p className="text-xs text-navy-500 mt-3">
                    Approved by {estimate.approver.name} ({estimate.approver.role})
                  </p>
                )}
                {!estimate.approver && estimate.approval_type === "customer" && (
                  <p className="text-xs text-navy-500 mt-3">
                    Approved by customer
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {/* Internal Approve Button for HQ/Manager */}
              {job.has_estimate && !job.estimate_approved && canApproveInternally && (
                <Button
                  variant="primary"
                  onClick={handleInternalApprove}
                  disabled={approvingEstimate}
                >
                  {approvingEstimate ? "Approving..." : "Approve"}
                </Button>
              )}
              <Link href={`/dashboard/jobs/${job.id}/estimate/new`}>
                <Button variant={job.has_estimate && !job.estimate_approved && canApproveInternally ? "secondary" : "primary"}>
                  {job.has_estimate ? "Edit Quotation" : "Create Quotation"}
                </Button>
              </Link>
              {job.has_estimate && (
                <Link href={`/dashboard/jobs/${job.id}/estimate`}>
                  <Button variant="outline">View</Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Job Info */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Details</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-navy-500">Job ID</dt>
                <dd className="font-medium text-navy-900">#{job.id}</dd>
              </div>
              {job.customer_name && (
                <div>
                  <dt className="text-navy-500">Customer</dt>
                  <dd className="font-medium text-navy-900">{job.customer_name}</dd>
                </div>
              )}
              {job.customer_phone && (
                <div>
                  <dt className="text-navy-500">Phone</dt>
                  <dd className="font-medium text-navy-900">
                    <a href={`tel:${job.customer_phone}`} className="text-gold-600 hover:text-gold-700">
                      {job.customer_phone}
                    </a>
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-navy-500">Checked In</dt>
                <dd className="font-medium text-navy-900">{formatDate(job.intake_at)}</dd>
              </div>
              {job.promised_ready_at && (
                <div>
                  <dt className="text-navy-500">Promised Ready</dt>
                  <dd className="font-medium text-navy-900">
                    {formatDate(job.promised_ready_at)}
                  </dd>
                </div>
              )}
              {job.actual_ready_at && (
                <div>
                  <dt className="text-navy-500">Actually Ready</dt>
                  <dd className="font-medium text-green-600">
                    {formatDate(job.actual_ready_at)}
                  </dd>
                </div>
              )}
            </dl>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPdfPreview(true)}
              className="w-full mt-4"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Preview Quotation
            </Button>
          </div>

          {/* Assigned Employees */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-navy-900">Assigned</h2>
              {canEditAssignments && (
                <button
                  onClick={openAssignmentModal}
                  className="text-sm text-gold-600 hover:text-gold-700"
                >
                  Edit
                </button>
              )}
            </div>
            {job.assigned_employees.length > 0 ? (
              <div className="space-y-2">
                {job.assigned_employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-navy-50"
                  >
                    <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center text-gold-700 font-medium text-sm">
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy-900">{emp.name}</p>
                      <p className="text-xs text-navy-500 capitalize">{emp.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-navy-500">No employees assigned</p>
            )}
          </div>

          {/* Customer Link */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Customer Link</h2>
            <p className="text-sm text-navy-600 mb-3">
              Share this link with the customer to let them track their job.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={copyMagicLink}>
                Copy Link
              </Button>
              <Link href={`/job/${job.magic_link_token}`} target="_blank">
                <Button variant="secondary" size="sm">
                  Open
                </Button>
              </Link>
            </div>
          </div>

          {/* Media */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Media</h2>
            <Link href={`/dashboard/jobs/${job.id}/media`}>
              <Button variant="secondary" className="w-full">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Upload Photos/Voice
              </Button>
            </Link>
          </div>

          {/* Delete Job */}
          {canDelete && (
            <div className="bg-white rounded-xl p-6 border border-red-100 shadow-sm">
              <h2 className="text-lg font-semibold text-red-700 mb-2">Danger Zone</h2>
              <p className="text-sm text-navy-600 mb-4">
                Delete this job and all related data permanently.
              </p>
              <Button
                variant="outline"
                className="w-full border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setShowDeleteModal(true)}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Job
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignmentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-navy-100">
              <h3 className="text-lg font-semibold text-navy-900">Assign Employees</h3>
              <p className="text-sm text-navy-600 mt-1">
                Select employees to assign to this job
              </p>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {allEmployees.length === 0 ? (
                <p className="text-navy-500 text-center py-4">No employees available</p>
              ) : (
                <div className="space-y-2">
                  {allEmployees.map((emp) => (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => toggleEmployeeSelection(emp.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                        selectedEmployeeIds.includes(emp.id)
                          ? "border-gold-500 bg-gold-50"
                          : "border-navy-200 hover:border-navy-300"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          selectedEmployeeIds.includes(emp.id)
                            ? "bg-gold-500 border-gold-500"
                            : "border-navy-300"
                        }`}
                      >
                        {selectedEmployeeIds.includes(emp.id) && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-navy-900">{emp.name}</p>
                        <p className="text-xs text-navy-500">{emp.role_label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-navy-100 flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowAssignmentModal(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={saveAssignments}
                disabled={savingAssignments}
                className="flex-1"
              >
                {savingAssignments ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-navy-900">Delete Job</h3>
                  <p className="text-sm text-navy-600">This action cannot be undone</p>
                </div>
              </div>
              <p className="text-navy-700 mb-6">
                Are you sure you want to delete job <span className="font-mono font-bold">{job?.plate}</span>?
                All estimates, media, and related data will be permanently removed.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1"
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {deleting ? "Deleting..." : "Delete Job"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      <PDFPreviewModal
        isOpen={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        onDownload={handleDownloadQuotation}
        fetchPdf={() => api.quotation.previewJobPdf(job.id)}
        title={`Quotation - ${job.plate}`}
      />
    </motion.div>
  );
}
