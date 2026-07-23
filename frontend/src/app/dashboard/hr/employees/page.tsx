"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { api, EmployeeListItem, BranchListItem } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

const ROLE_COLORS: Record<string, string> = {
  hq: "bg-purple-100 text-purple-800 border-purple-200",
  manager: "bg-blue-100 text-blue-800 border-blue-200",
  advisor: "bg-green-100 text-green-800 border-green-200",
  mechanic: "bg-orange-100 text-orange-800 border-orange-200",
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [branchFilter, setBranchFilter] = useState<number | "">("");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    loadData();
  }, [showInactive, roleFilter, branchFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empData, branchData] = await Promise.all([
        api.employees.list({
          role: roleFilter || undefined,
          branch_id: branchFilter || undefined,
          include_inactive: showInactive,
        }),
        api.employees.listBranches(),
      ]);
      setEmployees(empData);
      setBranches(branchData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (employee: EmployeeListItem) => {
    try {
      await api.employees.update(employee.id, { is_active: !employee.is_active });
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update employee");
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Employees</h1>
          <p className="text-navy-600">Manage your team members</p>
        </div>
        <Button variant="primary" onClick={() => setShowAddModal(true)}>
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Employee
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm text-navy-500 mb-1">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
            >
              <option value="">All Roles</option>
              <option value="hq">Headquarters</option>
              <option value="manager">Manager</option>
              <option value="advisor">Service Advisor</option>
              <option value="mechanic">Mechanic</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-navy-500 mb-1">Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value ? parseInt(e.target.value) : "")}
              className="px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="showInactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 text-gold-500 border-navy-300 rounded focus:ring-gold-500"
            />
            <label htmlFor="showInactive" className="text-sm text-navy-600">
              Show inactive
            </label>
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
      ) : employees.length === 0 ? (
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
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-navy-900 mb-2">No employees found</h3>
          <p className="text-navy-500 mb-4">Add your first team member to get started</p>
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            Add Employee
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-navy-50 border-b border-navy-100">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Phone</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Role</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Branch</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Status</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-navy-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {employees.map((emp) => (
                <tr key={emp.id} className={!emp.is_active ? "opacity-50" : ""}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {emp.profile_picture_url ? (
                        <img
                          src={emp.profile_picture_url}
                          alt={emp.name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gold-100 flex items-center justify-center text-gold-700 font-medium text-sm">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-navy-900">{emp.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-navy-600 font-mono text-sm">{emp.phone}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-lg border text-xs font-medium ${
                        ROLE_COLORS[emp.role] || "bg-gray-100"
                      }`}
                    >
                      {emp.role_label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-navy-600">{emp.branch_name || "All Branches"}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 rounded-lg text-xs font-medium ${
                        emp.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {emp.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <Link
                      href={`/dashboard/hr/employees/${emp.id}`}
                      className="text-sm text-gold-600 hover:text-gold-700"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => toggleActive(emp)}
                      className={`text-sm ${
                        emp.is_active
                          ? "text-red-600 hover:text-red-800"
                          : "text-green-600 hover:text-green-800"
                      }`}
                    >
                      {emp.is_active ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Employee Modal */}
      {showAddModal && (
        <AddEmployeeModal
          branches={branches}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadData();
          }}
        />
      )}
    </motion.div>
  );
}

function AddEmployeeModal({
  branches,
  onClose,
  onSuccess,
}: {
  branches: BranchListItem[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState<"advisor" | "mechanic" | "manager" | "hq">("advisor");
  const [branchId, setBranchId] = useState<number | null>(branches[0]?.id || null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      await api.employees.create({
        name,
        phone,
        pin,
        role,
        branch_id: role === "hq" ? null : branchId,
      });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create employee");
      setCreating(false);
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
          <h2 className="text-xl font-semibold text-navy-900">Add Employee</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254712345678"
              required
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">PIN (4-6 digits)</label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="****"
              required
              minLength={4}
              maxLength={6}
              pattern="[0-9]{4,6}"
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            >
              <option value="advisor">Service Advisor</option>
              <option value="mechanic">Mechanic</option>
              <option value="manager">Branch Manager</option>
              <option value="hq">Headquarters</option>
            </select>
          </div>

          {role !== "hq" && (
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">Branch</label>
              <select
                value={branchId || ""}
                onChange={(e) => setBranchId(parseInt(e.target.value))}
                required
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={creating} className="flex-1">
              {creating ? "Creating..." : "Add Employee"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
