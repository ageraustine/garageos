"use client";

import { useEffect, useState, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import {
  api,
  EmployeeResponse,
  EmployeeDocument,
  BranchListItem,
  DocumentType,
} from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

const ROLE_COLORS: Record<string, string> = {
  hq: "bg-purple-100 text-purple-800 border-purple-200",
  manager: "bg-blue-100 text-blue-800 border-blue-200",
  advisor: "bg-green-100 text-green-800 border-green-200",
  mechanic: "bg-orange-100 text-orange-800 border-orange-200",
};

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "Passport" },
  { value: "police_clearance", label: "Police Clearance" },
  { value: "driving_license", label: "Driving License" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other Document" },
];

export default function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [role, setRole] = useState<"advisor" | "mechanic" | "manager" | "hq">("advisor");
  const [branchId, setBranchId] = useState<number | null>(null);

  // Profile picture upload
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingProfile, setUploadingProfile] = useState(false);

  // Document upload
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("national_id");
  const [docName, setDocName] = useState("");
  const [docExpiresAt, setDocExpiresAt] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const docInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [emp, docs, branchList] = await Promise.all([
        api.employees.get(parseInt(id)),
        api.employees.listDocuments(parseInt(id)),
        api.employees.listBranches(),
      ]);
      setEmployee(emp);
      setDocuments(docs);
      setBranches(branchList);
      // Populate form
      setName(emp.name);
      setEmail(emp.email || "");
      setIdNumber(emp.id_number || "");
      setRole(emp.role as typeof role);
      setBranchId(emp.branch_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employee");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.employees.update(parseInt(id), {
        name,
        email: email || null,
        id_number: idNumber || null,
        role,
        branch_id: role === "hq" ? null : branchId,
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingProfile(true);
    setError(null);
    try {
      await api.employees.uploadProfilePicture(parseInt(id), file);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload profile picture");
    } finally {
      setUploadingProfile(false);
      if (profileInputRef.current) {
        profileInputRef.current.value = "";
      }
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !docName) return;

    setUploadingDoc(true);
    setError(null);
    try {
      await api.employees.uploadDocument(
        parseInt(id),
        file,
        docType,
        docName,
        docExpiresAt || null
      );
      await loadData();
      setShowDocUpload(false);
      setDocName("");
      setDocExpiresAt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload document");
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) {
        docInputRef.current.value = "";
      }
    }
  };

  const handleVerifyDocument = async (docId: number) => {
    try {
      await api.employees.verifyDocument(parseInt(id), docId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify document");
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await api.employees.deleteDocument(parseInt(id), docId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete document");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Employee not found</p>
        <Link href="/dashboard/hr/employees">
          <Button variant="secondary">Back to Employees</Button>
        </Link>
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/hr/employees"
          className="text-sm text-navy-500 hover:text-navy-700 mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Employees
        </Link>
        <h1 className="text-2xl font-bold text-navy-900">Edit Employee</h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <div className="text-center mb-6">
              <div className="relative inline-block">
                {employee.profile_picture_url ? (
                  <img
                    src={employee.profile_picture_url}
                    alt={employee.name}
                    className="w-24 h-24 rounded-full object-cover mx-auto"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gold-100 flex items-center justify-center mx-auto">
                    <span className="text-3xl font-bold text-gold-700">
                      {employee.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => profileInputRef.current?.click()}
                  disabled={uploadingProfile}
                  className="absolute bottom-0 right-0 bg-gold-500 text-navy-900 p-2 rounded-full hover:bg-gold-400 transition-colors"
                >
                  {uploadingProfile ? (
                    <div className="w-4 h-4 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleProfileUpload}
                  className="hidden"
                />
              </div>
              <h2 className="text-xl font-semibold text-navy-900 mt-4">{employee.name}</h2>
              <span
                className={`inline-block px-3 py-1 rounded-lg border text-sm font-medium mt-2 ${
                  ROLE_COLORS[employee.role] || "bg-gray-100"
                }`}
              >
                {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
              </span>
            </div>

            <div className="space-y-3 text-sm border-t border-navy-100 pt-4">
              <div className="flex justify-between">
                <span className="text-navy-500">Phone</span>
                <span className="font-medium text-navy-900 font-mono">{employee.phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Branch</span>
                <span className="font-medium text-navy-900">
                  {employee.branch_name || "All Branches"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-navy-500">Status</span>
                <span
                  className={`font-medium ${
                    employee.is_active ? "text-green-600" : "text-gray-500"
                  }`}
                >
                  {employee.is_active ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <h3 className="text-lg font-semibold text-navy-900 mb-4">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  ID Number (National ID / Passport)
                </label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="12345678"
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
                    onChange={(e) => setBranchId(parseInt(e.target.value) || null)}
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
            </div>
            <div className="mt-4 pt-4 border-t border-navy-100">
              <Button variant="primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>

          {/* Documents */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-navy-900">Documents</h3>
              <Button variant="secondary" size="sm" onClick={() => setShowDocUpload(true)}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Document
              </Button>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-navy-500">
                <svg
                  className="w-12 h-12 mx-auto text-navy-300 mb-3"
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
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 bg-navy-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-navy-200 flex items-center justify-center">
                        <svg className="w-5 h-5 text-navy-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-navy-900">{doc.name}</p>
                        <p className="text-sm text-navy-500">
                          {doc.document_type_label}
                          {doc.expires_at && (
                            <span className="ml-2">
                              · Expires: {new Date(doc.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.is_verified ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          Verified
                        </span>
                      ) : (
                        <button
                          onClick={() => handleVerifyDocument(doc.id)}
                          className="px-2 py-1 bg-gold-100 text-gold-700 text-xs font-medium rounded hover:bg-gold-200"
                        >
                          Verify
                        </button>
                      )}
                      <a
                        href={doc.view_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-navy-500 hover:text-navy-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Upload Modal */}
      {showDocUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-navy-900">Upload Document</h2>
              <button
                onClick={() => setShowDocUpload(false)}
                className="text-navy-400 hover:text-navy-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Document Type
                </label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentType)}
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Document Name
                </label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g., John's National ID"
                  required
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Expiry Date (optional)
                </label>
                <input
                  type="date"
                  value={docExpiresAt}
                  onChange={(e) => setDocExpiresAt(e.target.value)}
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Select File
                </label>
                <input
                  ref={docInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleDocumentUpload}
                  disabled={!docName || uploadingDoc}
                  className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                />
                <p className="text-xs text-navy-500 mt-1">
                  Accepts images (JPG, PNG) and PDF files
                </p>
              </div>

              {uploadingDoc && (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin w-6 h-6 border-4 border-gold-500 border-t-transparent rounded-full" />
                  <span className="ml-2 text-navy-600">Uploading...</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDocUpload(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
