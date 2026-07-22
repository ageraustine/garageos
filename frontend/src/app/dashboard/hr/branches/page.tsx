"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { api, BranchResponse } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

export default function BranchesPage() {
  const [branches, setBranches] = useState<BranchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchResponse | null>(null);

  useEffect(() => {
    loadBranches();
  }, []);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const data = await api.branches.list();
      setBranches(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (branch: BranchResponse) => {
    if (branch.employee_count > 0) {
      alert(`Cannot delete branch with ${branch.employee_count} employees. Reassign employees first.`);
      return;
    }
    if (!confirm(`Are you sure you want to delete "${branch.name}"?`)) return;
    try {
      await api.branches.delete(branch.id);
      loadBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete branch");
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Branches</h1>
          <p className="text-navy-600">Manage your garage locations</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Branch
        </Button>
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
      ) : branches.length === 0 ? (
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
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          <h3 className="text-lg font-semibold text-navy-900 mb-2">No branches found</h3>
          <p className="text-navy-500 mb-4">Add your first branch to get started</p>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            Add Branch
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-navy-900">{branch.name}</h3>
                  <p className="text-sm text-navy-500">
                    {branch.employee_count} employee{branch.employee_count !== 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingBranch(branch)}
                    className="p-2 text-navy-400 hover:text-navy-600"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(branch)}
                    className="p-2 text-navy-400 hover:text-red-600"
                    disabled={branch.employee_count > 0}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-navy-600">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <span>{branch.bays} service bay{branch.bays !== 1 ? "s" : ""}</span>
                </div>
                {branch.geo_lat && branch.geo_lng && (
                  <div className="flex items-center gap-2 text-navy-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>Location set</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(showAddModal || editingBranch) && (
        <BranchModal
          branch={editingBranch}
          onClose={() => {
            setShowAddModal(false);
            setEditingBranch(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingBranch(null);
            loadBranches();
          }}
        />
      )}
    </motion.div>
  );
}

function BranchModal({
  branch,
  onClose,
  onSuccess,
}: {
  branch: BranchResponse | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(branch?.name || "");
  const [bays, setBays] = useState(branch?.bays || 1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (branch) {
        await api.branches.update(branch.id, { name, bays });
      } else {
        await api.branches.create({ name, bays });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save branch");
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
          <h2 className="text-xl font-semibold text-navy-900">
            {branch ? "Edit Branch" : "Add Branch"}
          </h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Branch Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Westlands, CBD, Industrial Area"
              required
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Service Bays</label>
            <input
              type="number"
              value={bays}
              onChange={(e) => setBays(parseInt(e.target.value) || 1)}
              min={1}
              required
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
            <p className="text-xs text-navy-500 mt-1">Number of cars you can service at once</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={saving} className="flex-1">
              {saving ? "Saving..." : branch ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
