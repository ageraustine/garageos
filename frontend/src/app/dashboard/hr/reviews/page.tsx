"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { api, PerformanceReviewResponse, EmployeeListItem, ReviewPeriodType } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";
import { useAuth } from "@/hooks/useAuth";

const PERIOD_LABELS: Record<ReviewPeriodType, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  annual: "Annual",
  probation: "Probation",
};

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<PerformanceReviewResponse[]>([]);
  const [myReviews, setMyReviews] = useState<PerformanceReviewResponse[]>([]);
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<PerformanceReviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"my" | "team">("team");

  const isManager = user?.role === "hq" || user?.role === "manager";

  useEffect(() => {
    loadData();
  }, [showDrafts]);

  const loadData = async () => {
    try {
      setLoading(true);
      const promises: Promise<unknown>[] = [];

      if (isManager) {
        promises.push(api.hr.reviews.list({ is_draft: showDrafts ? true : undefined }));
        promises.push(api.employees.list({ include_inactive: false }));
      }

      if (user) {
        promises.push(api.hr.reviews.getEmployeeHistory(user.id));
      }

      const results = await Promise.all(promises);

      if (isManager) {
        setReviews(results[0] as PerformanceReviewResponse[]);
        setEmployees(results[1] as EmployeeListItem[]);
        setMyReviews((results[2] || []) as PerformanceReviewResponse[]);
      } else if (user) {
        setMyReviews(results[0] as PerformanceReviewResponse[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-KE", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getRatingColor = (rating: number | null) => {
    if (rating === null) return "text-gray-400";
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 3.5) return "text-blue-600";
    if (rating >= 2.5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Performance Reviews</h1>
          <p className="text-navy-600">Manage employee performance reviews</p>
        </div>
        {isManager && (
          <Button variant="primary" onClick={() => setShowCreateModal(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Review
          </Button>
        )}
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

      {/* Tabs */}
      {isManager && (
        <div className="flex border-b border-navy-200 mb-6">
          <button
            onClick={() => setActiveTab("team")}
            className={`px-4 py-2 font-medium border-b-2 -mb-px ${
              activeTab === "team"
                ? "text-gold-600 border-gold-500"
                : "text-navy-500 border-transparent hover:text-navy-700"
            }`}
          >
            Team Reviews
          </button>
          <button
            onClick={() => setActiveTab("my")}
            className={`px-4 py-2 font-medium border-b-2 -mb-px ${
              activeTab === "my"
                ? "text-gold-600 border-gold-500"
                : "text-navy-500 border-transparent hover:text-navy-700"
            }`}
          >
            My Reviews
          </button>
        </div>
      )}

      {/* Filters (for managers viewing team reviews) */}
      {isManager && activeTab === "team" && (
        <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm mb-6">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showDrafts}
                onChange={(e) => setShowDrafts(e.target.checked)}
                className="w-4 h-4 text-gold-500 border-navy-300 rounded focus:ring-gold-500"
              />
              <span className="text-sm text-navy-600">Show only drafts</span>
            </label>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <ReviewsList
          reviews={activeTab === "team" && isManager ? reviews : myReviews}
          showEmployee={activeTab === "team" && isManager}
          onSelect={setSelectedReview}
          formatDate={formatDate}
          getRatingColor={getRatingColor}
        />
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateReviewModal
          employees={employees}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}

      {/* Review Detail Modal */}
      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          isManager={isManager}
          isOwn={selectedReview.employee_id === user?.id}
          onClose={() => setSelectedReview(null)}
          onUpdate={() => {
            setSelectedReview(null);
            loadData();
          }}
          formatDate={formatDate}
          getRatingColor={getRatingColor}
        />
      )}
    </motion.div>
  );
}

function ReviewsList({
  reviews,
  showEmployee,
  onSelect,
  formatDate,
  getRatingColor,
}: {
  reviews: PerformanceReviewResponse[];
  showEmployee: boolean;
  onSelect: (review: PerformanceReviewResponse) => void;
  formatDate: (dateStr: string) => string;
  getRatingColor: (rating: number | null) => string;
}) {
  if (reviews.length === 0) {
    return (
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
            d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-navy-900 mb-2">No reviews found</h3>
        <p className="text-navy-500">Performance reviews will appear here</p>
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
            <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Period</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Type</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Overall Rating</th>
            <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Status</th>
            <th className="text-right px-6 py-3 text-sm font-medium text-navy-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-100">
          {reviews.map((review) => (
            <tr key={review.id} className="hover:bg-navy-50">
              {showEmployee && (
                <td className="px-6 py-4 font-medium text-navy-900">{review.employee_name}</td>
              )}
              <td className="px-6 py-4 text-navy-600">
                {formatDate(review.period_start)} - {formatDate(review.period_end)}
              </td>
              <td className="px-6 py-4 text-navy-600">{PERIOD_LABELS[review.period_type]}</td>
              <td className="px-6 py-4">
                <span className={`text-lg font-bold ${getRatingColor(review.overall_rating)}`}>
                  {review.overall_rating?.toFixed(1) || "-"}
                </span>
                <span className="text-navy-400">/5</span>
              </td>
              <td className="px-6 py-4">
                {review.is_draft ? (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-xs font-medium">
                    Draft
                  </span>
                ) : review.acknowledged_by_employee ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-medium">
                    Acknowledged
                  </span>
                ) : (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-medium">
                    Pending Ack
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  onClick={() => onSelect(review)}
                  className="text-gold-600 hover:text-gold-800 font-medium"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CreateReviewModal({
  employees,
  onClose,
  onSuccess,
}: {
  employees: EmployeeListItem[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [employeeId, setEmployeeId] = useState<number>(employees[0]?.id || 0);
  const [periodType, setPeriodType] = useState<ReviewPeriodType>("quarterly");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.hr.reviews.create({
        employee_id: employeeId,
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create review");
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
          <h2 className="text-xl font-semibold text-navy-900">Start Performance Review</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Employee</label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.role_label})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Review Type</label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as ReviewPeriodType)}
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
            >
              {Object.entries(PERIOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Period Start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Period End</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving} className="flex-1">
              {saving ? "Creating..." : "Create Draft"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function ReviewDetailModal({
  review,
  isManager,
  isOwn,
  onClose,
  onUpdate,
  formatDate,
  getRatingColor,
}: {
  review: PerformanceReviewResponse;
  isManager: boolean;
  isOwn: boolean;
  onClose: () => void;
  onUpdate: () => void;
  formatDate: (dateStr: string) => string;
  getRatingColor: (rating: number | null) => string;
}) {
  const [editing, setEditing] = useState(false);
  const [ratings, setRatings] = useState({
    quality: review.rating_quality || 0,
    productivity: review.rating_productivity || 0,
    teamwork: review.rating_teamwork || 0,
    punctuality: review.rating_punctuality || 0,
    customerService: review.rating_customer_service || 0,
  });
  const [feedback, setFeedback] = useState({
    strengths: review.strengths || "",
    improvements: review.areas_for_improvement || "",
    goals: review.goals_next_period || "",
    comments: review.reviewer_comments || "",
  });
  const [employeeComments, setEmployeeComments] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = isManager && review.is_draft;
  const canAcknowledge = isOwn && !review.is_draft && !review.acknowledged_by_employee;
  const canSubmit = isManager && review.is_draft;

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await api.hr.reviews.update(review.id, {
        rating_quality: ratings.quality,
        rating_productivity: ratings.productivity,
        rating_teamwork: ratings.teamwork,
        rating_punctuality: ratings.punctuality,
        rating_customer_service: ratings.customerService,
        strengths: feedback.strengths,
        areas_for_improvement: feedback.improvements,
        goals_next_period: feedback.goals,
        reviewer_comments: feedback.comments,
      });
      setEditing(false);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save review");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);

    try {
      await api.hr.reviews.submit(review.id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSaving(false);
    }
  };

  const handleAcknowledge = async () => {
    setSaving(true);
    setError(null);

    try {
      await api.hr.reviews.acknowledge(
        review.id,
        employeeComments ? { employee_comments: employeeComments } : undefined
      );
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to acknowledge review");
    } finally {
      setSaving(false);
    }
  };

  const RatingInput = ({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) => (
    <div>
      <label className="block text-sm font-medium text-navy-700 mb-1">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded ${
              n <= value ? "bg-gold-500 text-white" : "bg-gray-100 text-gray-400"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );

  const RatingDisplay = ({ label, value }: { label: string; value: number | null }) => (
    <div className="flex justify-between items-center py-2 border-b border-navy-100">
      <span className="text-navy-600">{label}</span>
      <span className={`font-bold ${getRatingColor(value)}`}>
        {value?.toFixed(1) || "-"}/5
      </span>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-xl my-8"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-navy-900">Performance Review</h2>
            <p className="text-navy-600">
              {review.employee_name} - {PERIOD_LABELS[review.period_type]}
            </p>
          </div>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Period Info */}
        <div className="bg-navy-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-navy-500">Period:</span>{" "}
              <span className="text-navy-900">{formatDate(review.period_start)} - {formatDate(review.period_end)}</span>
            </div>
            <div>
              <span className="text-navy-500">Reviewer:</span>{" "}
              <span className="text-navy-900">{review.reviewer_name}</span>
            </div>
            {review.trust_score_at_review && (
              <div>
                <span className="text-navy-500">Trust Score:</span>{" "}
                <span className="text-navy-900">{review.trust_score_at_review}</span>
              </div>
            )}
            {review.jobs_completed !== null && (
              <div>
                <span className="text-navy-500">Jobs Completed:</span>{" "}
                <span className="text-navy-900">{review.jobs_completed}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-4">{error}</div>
        )}

        {/* Ratings */}
        {editing ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <RatingInput label="Quality" value={ratings.quality} onChange={(v) => setRatings({ ...ratings, quality: v })} />
            <RatingInput label="Productivity" value={ratings.productivity} onChange={(v) => setRatings({ ...ratings, productivity: v })} />
            <RatingInput label="Teamwork" value={ratings.teamwork} onChange={(v) => setRatings({ ...ratings, teamwork: v })} />
            <RatingInput label="Punctuality" value={ratings.punctuality} onChange={(v) => setRatings({ ...ratings, punctuality: v })} />
            <RatingInput label="Customer Service" value={ratings.customerService} onChange={(v) => setRatings({ ...ratings, customerService: v })} />
          </div>
        ) : (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-navy-900">Ratings</h3>
              <div className="text-right">
                <span className="text-sm text-navy-500">Overall</span>
                <p className={`text-2xl font-bold ${getRatingColor(review.overall_rating)}`}>
                  {review.overall_rating?.toFixed(1) || "-"}/5
                </p>
              </div>
            </div>
            <RatingDisplay label="Quality" value={review.rating_quality} />
            <RatingDisplay label="Productivity" value={review.rating_productivity} />
            <RatingDisplay label="Teamwork" value={review.rating_teamwork} />
            <RatingDisplay label="Punctuality" value={review.rating_punctuality} />
            <RatingDisplay label="Customer Service" value={review.rating_customer_service} />
          </div>
        )}

        {/* Feedback */}
        <div className="space-y-4 mb-6">
          <h3 className="font-semibold text-navy-900">Feedback</h3>

          {editing ? (
            <>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Strengths</label>
                <textarea
                  value={feedback.strengths}
                  onChange={(e) => setFeedback({ ...feedback, strengths: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Areas for Improvement</label>
                <textarea
                  value={feedback.improvements}
                  onChange={(e) => setFeedback({ ...feedback, improvements: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Goals for Next Period</label>
                <textarea
                  value={feedback.goals}
                  onChange={(e) => setFeedback({ ...feedback, goals: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Reviewer Comments</label>
                <textarea
                  value={feedback.comments}
                  onChange={(e) => setFeedback({ ...feedback, comments: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
                />
              </div>
            </>
          ) : (
            <>
              {review.strengths && (
                <div>
                  <p className="text-sm text-navy-500">Strengths</p>
                  <p className="text-navy-900">{review.strengths}</p>
                </div>
              )}
              {review.areas_for_improvement && (
                <div>
                  <p className="text-sm text-navy-500">Areas for Improvement</p>
                  <p className="text-navy-900">{review.areas_for_improvement}</p>
                </div>
              )}
              {review.goals_next_period && (
                <div>
                  <p className="text-sm text-navy-500">Goals for Next Period</p>
                  <p className="text-navy-900">{review.goals_next_period}</p>
                </div>
              )}
              {review.reviewer_comments && (
                <div>
                  <p className="text-sm text-navy-500">Reviewer Comments</p>
                  <p className="text-navy-900">{review.reviewer_comments}</p>
                </div>
              )}
              {review.employee_comments && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-600">Employee Response</p>
                  <p className="text-blue-800">{review.employee_comments}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Acknowledge Section */}
        {canAcknowledge && (
          <div className="border-t border-navy-200 pt-4 mb-4">
            <h3 className="font-semibold text-navy-900 mb-2">Acknowledge Review</h3>
            <textarea
              value={employeeComments}
              onChange={(e) => setEmployeeComments(e.target.value)}
              placeholder="Optional: Add your comments..."
              rows={2}
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 mb-3"
            />
            <Button variant="primary" onClick={handleAcknowledge} disabled={saving}>
              {saving ? "Acknowledging..." : "Acknowledge Review"}
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-navy-200">
          {editing ? (
            <>
              <Button type="button" variant="outline" onClick={() => setEditing(false)} className="flex-1">
                Cancel
              </Button>
              <Button type="button" variant="primary" onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? "Saving..." : "Save Draft"}
              </Button>
            </>
          ) : (
            <>
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Close
              </Button>
              {canEdit && (
                <Button type="button" variant="outline" onClick={() => setEditing(true)} className="flex-1">
                  Edit
                </Button>
              )}
              {canSubmit && (
                <Button type="button" variant="primary" onClick={handleSubmit} disabled={saving} className="flex-1">
                  {saving ? "Submitting..." : "Submit Review"}
                </Button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
