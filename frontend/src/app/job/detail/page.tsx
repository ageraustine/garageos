"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { Container, Button } from "@/components/ui";
import { api, CustomerJobResponse } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

// Simple UUID generator using crypto
function generateId(): string {
  return crypto.randomUUID();
}

// Status badge colors
const STATUS_COLORS: Record<string, string> = {
  intake: "bg-blue-100 text-blue-800",
  diagnosis: "bg-yellow-100 text-yellow-800",
  working: "bg-orange-100 text-orange-800",
  washing: "bg-purple-100 text-purple-800",
  ready: "bg-green-100 text-green-800",
  paid: "bg-gray-100 text-gray-800",
};

function formatPrice(price: string, currency: string = "KES"): string {
  return `${currency} ${parseFloat(price).toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CustomerJobPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [job, setJob] = useState<CustomerJobResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOptional, setSelectedOptional] = useState<number[]>([]);
  const [approving, setApproving] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [payPhone, setPayPhone] = useState("");
  const [paying, setPaying] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJob() {
      try {
        const data = await api.link.get(token);
        setJob(data);

        // Pre-select all optional items
        if (data.estimate) {
          const optionalIds = data.estimate.line_items
            .filter((item) => item.kind === "optional")
            .map((item) => item.id);
          setSelectedOptional(optionalIds);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load job");
      } finally {
        setLoading(false);
      }
    }
    fetchJob();
  }, [token]);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await api.link.approve(token, selectedOptional);
      // Refresh job data
      const data = await api.link.get(token);
      setJob(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve");
    } finally {
      setApproving(false);
    }
  };

  const toggleOptional = (id: number) => {
    setSelectedOptional((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const calculateTotal = (): string => {
    if (!job?.estimate) return "0";
    const critical = parseFloat(job.estimate.critical_total);
    const optional = job.estimate.line_items
      .filter((item) => item.kind === "optional" && selectedOptional.includes(item.id))
      .reduce((sum, item) => sum + parseFloat(item.price), 0);
    return (critical + optional).toFixed(2);
  };

  const handlePay = async () => {
    if (!job?.estimate?.total_approved || !payPhone) return;

    setPaying(true);
    setPaymentMessage(null);

    try {
      const amount = Math.round(parseFloat(job.estimate.total_approved));
      const response = await api.link.pay(token, {
        phone: payPhone,
        amount,
        idempotency_key: generateId(),
      });

      setPaymentMessage(response.customer_message);
      setShowPayModal(false);

      // Poll for status update or just inform user
      setTimeout(async () => {
        const data = await api.link.get(token);
        setJob(data);
      }, 5000);
    } catch (err) {
      setPaymentMessage(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setPaying(false);
    }
  };

  const canPay = job?.estimate?.approved && ["ready", "working", "washing"].includes(job?.status || "");

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-navy-50 flex items-center justify-center">
        <Container className="max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-xl font-bold text-navy-900 mb-2">Link Error</h1>
            <p className="text-navy-600">{error || "Job not found"}</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy-50 py-6">
      <Container className="max-w-lg">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
          className="space-y-4"
        >
          {/* Header */}
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-lg font-bold text-navy-900">
                  {job.vehicle.make} {job.vehicle.model}
                </h1>
                <p className="text-navy-500">{job.vehicle.plate}</p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[job.status] || "bg-gray-100"}`}
              >
                {job.status_label}
              </span>
            </div>

            {job.branch_name && (
              <p className="text-sm text-navy-500">at {job.branch_name}</p>
            )}

            <div className="mt-4 flex gap-4 text-sm text-navy-600">
              <div>
                <span className="text-navy-400">Checked in:</span>{" "}
                {formatDate(job.intake_at)}
              </div>
              {job.promised_ready_at && (
                <div>
                  <span className="text-navy-400">Ready by:</span>{" "}
                  {formatDate(job.promised_ready_at)}
                </div>
              )}
            </div>
          </div>

          {/* Service Progress */}
          {job.services.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-navy-900 mb-4">Work Progress</h2>
              <div className="space-y-4">
                {job.services.map((svc, idx) => {
                  const progress = svc.total_count > 0
                    ? Math.round((svc.completed_count / svc.total_count) * 100)
                    : 0;
                  const isComplete = svc.completed_count === svc.total_count;

                  return (
                    <div key={idx} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-navy-800">{svc.name}</h3>
                        <span className={`text-sm px-2 py-0.5 rounded ${
                          isComplete
                            ? "bg-green-100 text-green-700"
                            : "bg-navy-100 text-navy-600"
                        }`}>
                          {svc.completed_count}/{svc.total_count}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 bg-navy-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            isComplete ? "bg-green-500" : "bg-gold-500"
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      {/* Stage list */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {svc.stages.map((stage) => (
                          <span
                            key={stage.id}
                            className={`text-xs px-2 py-1 rounded-full ${
                              stage.completed
                                ? "bg-green-100 text-green-700"
                                : "bg-navy-50 text-navy-500"
                            }`}
                          >
                            {stage.completed && "✓ "}{stage.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Estimate */}
          {job.estimate && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-navy-900 mb-4">
                Estimate {job.estimate.approved ? "(Approved)" : ""}
              </h2>

              {/* Critical items */}
              <div className="mb-4">
                <h3 className="text-sm font-medium text-navy-500 mb-2">
                  Required Work
                </h3>
                <div className="space-y-2">
                  {job.estimate.line_items
                    .filter((item) => item.kind === "critical")
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center py-2 border-b border-navy-100"
                      >
                        <span className="text-navy-800">{item.label}</span>
                        <span className="font-medium text-navy-900">
                          {formatPrice(item.price, job?.currency)}
                        </span>
                      </div>
                    ))}
                </div>
                <div className="mt-2 text-right">
                  <span className="text-sm text-navy-500">Subtotal: </span>
                  <span className="font-medium">
                    {formatPrice(job.estimate.critical_total, job?.currency)}
                  </span>
                </div>
              </div>

              {/* Optional items */}
              {job.estimate.line_items.some((item) => item.kind === "optional") && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-navy-500 mb-2">
                    Recommended (Optional)
                  </h3>
                  <div className="space-y-2">
                    {job.estimate.line_items
                      .filter((item) => item.kind === "optional")
                      .map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center py-2 border-b border-navy-100"
                        >
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedOptional.includes(item.id)}
                              onChange={() => toggleOptional(item.id)}
                              disabled={job.estimate?.approved}
                              className="w-4 h-4 text-gold-600 rounded focus:ring-gold-500"
                            />
                            <span className="text-navy-800">{item.label}</span>
                          </label>
                          <span className="font-medium text-navy-900">
                            {formatPrice(item.price, job?.currency)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Total */}
              <div className="pt-4 border-t border-navy-200">
                <div className="flex justify-between items-center text-lg">
                  <span className="font-bold text-navy-900">Total</span>
                  <span className="font-bold text-navy-900">
                    {job.estimate.approved
                      ? formatPrice(job.estimate.total_approved || "0", job?.currency)
                      : formatPrice(calculateTotal(), job?.currency)}
                  </span>
                </div>
              </div>

              {/* Approve button */}
              {job.can_approve && (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-6"
                  onClick={handleApprove}
                  disabled={approving}
                >
                  {approving ? "Approving..." : "Approve Estimate"}
                </Button>
              )}

              {job.estimate.approved && job.estimate.approved_at && (
                <p className="text-sm text-green-600 mt-4 text-center">
                  Approved on {formatDate(job.estimate.approved_at)}
                </p>
              )}

              {/* Pay button */}
              {canPay && (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full mt-4"
                  onClick={() => setShowPayModal(true)}
                >
                  Pay with M-Pesa
                </Button>
              )}

              {paymentMessage && (
                <p className="text-sm text-center mt-4 p-3 bg-blue-50 text-blue-700 rounded-lg">
                  {paymentMessage}
                </p>
              )}
            </div>
          )}

          {/* Media Gallery */}
          {job.media.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h2 className="text-lg font-bold text-navy-900 mb-4">
                Photos & Voice Notes
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {job.media.map((m) => (
                  <div key={m.id} className="relative">
                    {m.type === "photo" ? (
                      <img
                        src={m.url}
                        alt="Job photo"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-full h-32 bg-navy-100 rounded-lg flex items-center justify-center">
                        <audio controls src={m.url} className="w-full px-2" />
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 text-xs bg-black/50 text-white px-2 py-0.5 rounded">
                      {formatDate(m.created_at).split(",")[0]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <p className="text-center text-sm text-navy-400 py-4">
            Powered by GarageOS
          </p>
        </motion.div>

        {/* Payment Modal */}
        {showPayModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl"
            >
              <h2 className="text-xl font-bold text-navy-900 mb-4">Pay with M-Pesa</h2>
              <p className="text-navy-600 mb-4">
                Enter your phone number to receive an M-Pesa payment prompt.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={payPhone}
                  onChange={(e) => setPayPhone(e.target.value)}
                  placeholder="0712345678"
                  className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
              </div>

              <div className="mb-6 p-4 bg-navy-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-navy-600">Amount to Pay</span>
                  <span className="text-xl font-bold text-navy-900">
                    {job?.currency || "KES"} {job?.estimate?.total_approved
                      ? parseFloat(job.estimate.total_approved).toLocaleString()
                      : "0"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowPayModal(false)}
                  disabled={paying}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1"
                  onClick={handlePay}
                  disabled={paying || !payPhone}
                >
                  {paying ? "Sending..." : "Send Prompt"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </Container>
    </div>
  );
}
