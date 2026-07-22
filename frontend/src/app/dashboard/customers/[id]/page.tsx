"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { api, CustomerDetail, CustomerNote } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

// Status colors for jobs
const STATUS_COLORS: Record<string, string> = {
  intake: "bg-blue-100 text-blue-800",
  diagnosis: "bg-yellow-100 text-yellow-800",
  working: "bg-orange-100 text-orange-800",
  washing: "bg-purple-100 text-purple-800",
  ready: "bg-green-100 text-green-800",
  paid: "bg-gray-100 text-gray-800",
};

function formatCurrency(amount: string | null, currency: string = "KES"): string {
  if (!amount) return "-";
  return `${currency} ${parseFloat(amount).toLocaleString()}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Tab = "profile" | "vehicles" | "jobs" | "notes";

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const customerId = parseInt(id);
  const { user } = useAuth();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  useEffect(() => {
    api.customers
      .get(customerId)
      .then(setCustomer)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [customerId]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setAddingNote(true);
    try {
      const note = await api.customers.addNote(customerId, { content: newNote.trim() });
      setCustomer((prev) =>
        prev ? { ...prev, notes: [note, ...prev.notes] } : prev
      );
      setNewNote("");
    } catch (err) {
      // Handle error
    } finally {
      setAddingNote(false);
    }
  };

  const handleTogglePin = async (note: CustomerNote) => {
    try {
      const updated = await api.customers.updateNote(note.id, !note.is_pinned);
      setCustomer((prev) =>
        prev
          ? {
              ...prev,
              notes: prev.notes.map((n) => (n.id === note.id ? updated : n)),
            }
          : prev
      );
    } catch (err) {
      // Handle error
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm("Delete this note?")) return;

    try {
      await api.customers.deleteNote(noteId);
      setCustomer((prev) =>
        prev
          ? { ...prev, notes: prev.notes.filter((n) => n.id !== noteId) }
          : prev
      );
    } catch (err) {
      // Handle error
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="bg-red-50 text-red-700 p-4 rounded-lg">
        {error || "Customer not found"}
      </div>
    );
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "profile", label: "Profile" },
    { id: "vehicles", label: "Vehicles", count: customer.vehicle_count },
    { id: "jobs", label: "Jobs", count: customer.job_count },
    { id: "notes", label: "Notes", count: customer.notes.length },
  ];

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/customers"
          className="text-sm text-navy-500 hover:text-navy-700 mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Customers
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-navy-900">{customer.name}</h1>
            <p className="text-navy-600">{customer.phone}</p>
          </div>
          {customer.tags && customer.tags.length > 0 && (
            <div className="flex gap-2">
              {customer.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-gold-100 text-gold-700 rounded-full text-sm font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
          <p className="text-sm text-navy-500">Vehicles</p>
          <p className="text-2xl font-bold text-navy-900">{customer.vehicle_count}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
          <p className="text-sm text-navy-500">Total Jobs</p>
          <p className="text-2xl font-bold text-navy-900">{customer.job_count}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
          <p className="text-sm text-navy-500">Total Spent</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(customer.total_spent, user.chain_currency)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
          <p className="text-sm text-navy-500">Last Visit</p>
          <p className="text-2xl font-bold text-navy-900">{formatDate(customer.last_visit)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden">
        <div className="border-b border-navy-100">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-6 py-4 text-sm font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? "text-gold-600"
                    : "text-navy-500 hover:text-navy-700"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className="ml-2 px-2 py-0.5 bg-navy-100 text-navy-600 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold-500" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Tab */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-navy-500 mb-1">Phone</h3>
                  <p className="text-navy-900">{customer.phone}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-navy-500 mb-1">Email</h3>
                  <p className="text-navy-900">{customer.email || "-"}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-navy-500 mb-1">Address</h3>
                  <p className="text-navy-900">{customer.address || "-"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-navy-500 mb-1">Customer Since</h3>
                  <p className="text-navy-900">{formatDate(customer.created_at)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Vehicles Tab */}
          {activeTab === "vehicles" && (
            <div>
              {customer.vehicles.length === 0 ? (
                <p className="text-navy-500 text-center py-8">No vehicles on record</p>
              ) : (
                <div className="grid gap-4">
                  {customer.vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="flex items-center justify-between p-4 bg-navy-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-navy-900">
                          {vehicle.make} {vehicle.model}
                          {vehicle.year && ` (${vehicle.year})`}
                        </p>
                        <p className="text-sm text-navy-600 font-mono">{vehicle.plate}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-navy-600">
                          {vehicle.job_count} job{vehicle.job_count !== 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-navy-400">
                          Last: {formatDate(vehicle.last_service)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === "jobs" && (
            <div>
              {customer.recent_jobs.length === 0 ? (
                <p className="text-navy-500 text-center py-8">No jobs on record</p>
              ) : (
                <div className="space-y-3">
                  {customer.recent_jobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/dashboard/jobs/${job.id}`}
                      className="block p-4 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-navy-900">
                            {job.vehicle_make} {job.vehicle_model}
                            <span className="text-navy-500 ml-2 font-mono text-sm">
                              {job.vehicle_plate}
                            </span>
                          </p>
                          <p className="text-sm text-navy-600 mt-1">
                            {job.services.join(", ") || "No services"}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            STATUS_COLORS[job.status] || "bg-gray-100"
                          }`}
                        >
                          {job.status_label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3 text-sm">
                        <span className="text-navy-500">{formatDate(job.intake_at)}</span>
                        <span className="font-medium text-navy-900">
                          {formatCurrency(job.total_paid, user.chain_currency)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === "notes" && (
            <div>
              {/* Add Note */}
              <div className="mb-6">
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note about this customer..."
                  className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 resize-none"
                  rows={3}
                />
                <div className="flex justify-end mt-2">
                  <Button
                    variant="primary"
                    onClick={handleAddNote}
                    disabled={addingNote || !newNote.trim()}
                  >
                    {addingNote ? "Adding..." : "Add Note"}
                  </Button>
                </div>
              </div>

              {/* Notes List */}
              {customer.notes.length === 0 ? (
                <p className="text-navy-500 text-center py-8">No notes yet</p>
              ) : (
                <div className="space-y-3">
                  {customer.notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-4 rounded-lg border ${
                        note.is_pinned
                          ? "bg-gold-50 border-gold-200"
                          : "bg-white border-navy-100"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <p className="text-navy-900 whitespace-pre-wrap">{note.content}</p>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleTogglePin(note)}
                            className={`p-1 rounded hover:bg-navy-100 ${
                              note.is_pinned ? "text-gold-600" : "text-navy-400"
                            }`}
                            title={note.is_pinned ? "Unpin" : "Pin"}
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.828 5.414l-1.414 1.414 4.243 4.243a1 1 0 01-1.415 1.414l-4.242-4.243-1.414 1.414 4.242 4.243a3 3 0 004.243 0l1.414-1.414L10.243 8l1.414-1.414a1 1 0 111.414 1.414l-1.414 1.414 5.657 5.657-1.414 1.414-5.657-5.657-1.415 1.414a3 3 0 01-4.242 0L.343 8.586l1.414-1.414 4.243 4.242 1.414-1.414-4.243-4.243L4.586 4.34l4.242 4.242z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 rounded text-navy-400 hover:text-red-500 hover:bg-red-50"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-3 text-xs text-navy-500">
                        <span>{note.created_by_name}</span>
                        <span>-</span>
                        <span>{formatDateTime(note.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
