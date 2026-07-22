"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { api, JobListItem } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

const STATUS_COLORS: Record<string, string> = {
  intake: "bg-blue-100 text-blue-800",
  diagnosis: "bg-yellow-100 text-yellow-800",
  working: "bg-orange-100 text-orange-800",
  washing: "bg-purple-100 text-purple-800",
  ready: "bg-green-100 text-green-800",
  paid: "bg-gray-100 text-gray-800",
};

const STATUS_OPTIONS = [
  { value: "", label: "All Jobs" },
  { value: "intake", label: "Checked In" },
  { value: "diagnosis", label: "Diagnosing" },
  { value: "working", label: "In Progress" },
  { value: "washing", label: "Washing" },
  { value: "ready", label: "Ready" },
  { value: "paid", label: "Complete" },
];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function JobsListPage() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    loadJobs();
  }, [statusFilter]);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const data = await api.jobs.list(statusFilter || undefined);
      setJobs(data);
    } catch (err) {
      console.error("Failed to load jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  const copyMagicLink = async (token: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/job/${token}`);
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Jobs</h1>
          <p className="text-navy-600">Manage your service jobs</p>
        </div>
        <Link href="/dashboard/jobs/new">
          <Button variant="primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Job
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm mb-6">
        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === opt.value
                  ? "bg-navy-900 text-white"
                  : "bg-navy-100 text-navy-700 hover:bg-navy-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Jobs List */}
      <div className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-navy-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-navy-600 mb-4">No jobs found</p>
            <Link href="/dashboard/jobs/new">
              <Button variant="primary">Create Your First Job</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-navy-100">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/dashboard/jobs/${job.id}`}
                className="block p-4 hover:bg-navy-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono font-bold text-navy-900">
                        {job.plate}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[job.status] || "bg-gray-100"
                        }`}
                      >
                        {job.status_label}
                      </span>
                    </div>
                    <p className="text-sm text-navy-600">
                      {job.vehicle_make} {job.vehicle_model}
                      {job.customer_name && (
                        <span className="ml-2 text-navy-400">• {job.customer_name}</span>
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {job.services.map((svc, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-navy-100 text-navy-600 rounded text-xs"
                        >
                          {svc}
                        </span>
                      ))}
                    </div>
                    {job.assigned_employees.length > 0 && (
                      <div className="flex items-center gap-1 mt-2">
                        <svg className="w-3.5 h-3.5 text-navy-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-xs text-navy-500">
                          {job.assigned_employees.map((e) => e.name).join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-navy-500">{formatDate(job.intake_at)}</p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        copyMagicLink(job.magic_link_token);
                      }}
                      className="text-xs text-gold-600 hover:text-gold-700 mt-1"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
