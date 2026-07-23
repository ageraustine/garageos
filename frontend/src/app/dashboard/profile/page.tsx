"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { api, ChainSettingsResponse } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp } from "@/lib/animations";

const CURRENCIES = [
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "TZS", name: "Tanzanian Shilling", symbol: "TSh" },
  { code: "UGX", name: "Ugandan Shilling", symbol: "USh" },
  { code: "RWF", name: "Rwandan Franc", symbol: "FRw" },
  { code: "ETB", name: "Ethiopian Birr", symbol: "Br" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
];

const ROLE_LABELS: Record<string, string> = {
  hq: "Headquarters",
  manager: "Branch Manager",
  advisor: "Service Advisor",
  mechanic: "Mechanic",
};

export default function ProfilePage() {
  const { user, refreshUser, logout } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Change PIN state
  const [showChangePinModal, setShowChangePinModal] = useState(false);

  const handleNameSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await api.auth.updateProfile({ name: name.trim() });
      await refreshUser();
      setEditingName(false);
      setSuccess("Name updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Profile</h1>
        <p className="text-navy-600">Manage your account settings</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Info */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Personal Information</h2>

            {(error || success) && (
              <div
                className={`mb-4 p-3 rounded-lg text-sm ${
                  error ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                }`}
              >
                {error || success}
              </div>
            )}

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm text-navy-500 mb-1">Name</label>
                {editingName ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1 px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleNameSave}
                      disabled={saving}
                    >
                      {saving ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingName(false);
                        setName(user.name);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-navy-900 font-medium">{user.name}</span>
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-sm text-gold-600 hover:text-gold-700"
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>

              {/* Phone (read-only) */}
              <div>
                <label className="block text-sm text-navy-500 mb-1">Phone</label>
                <span className="text-navy-900 font-mono">{user.phone}</span>
              </div>

              {/* Role (read-only) */}
              <div>
                <label className="block text-sm text-navy-500 mb-1">Role</label>
                <span className="text-navy-900">{ROLE_LABELS[user.role] || user.role}</span>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Security</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-navy-900">PIN</p>
                <p className="text-sm text-navy-500">Change your login PIN</p>
              </div>
              <Button variant="secondary" onClick={() => setShowChangePinModal(true)}>
                Change PIN
              </Button>
            </div>
          </div>

          {/* Chain Settings (HQ only) */}
          {(user.role === "hq" || user.role === "manager") && (
            <ChainSettingsSection isHQ={user.role === "hq"} onSuccess={() => setSuccess("Settings updated")} />
          )}

          {/* Danger Zone */}
          <div className="bg-white rounded-xl p-6 border border-red-200 shadow-sm">
            <h2 className="text-lg font-semibold text-red-700 mb-4">Danger Zone</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-navy-900">Sign Out</p>
                <p className="text-sm text-navy-500">Sign out of your account on this device</p>
              </div>
              <Button variant="outline" onClick={logout} className="text-red-600 border-red-300 hover:bg-red-50">
                Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Organization Info */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Organization</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-navy-500">Chain</dt>
                <dd className="font-medium text-navy-900">{user.chain_display_name}</dd>
              </div>
              <div>
                <dt className="text-navy-500">Chain ID</dt>
                <dd className="font-mono text-navy-600">{user.chain_name}</dd>
              </div>
              <div>
                <dt className="text-navy-500">Currency</dt>
                <dd className="font-medium text-navy-900">{user.chain_currency || "KES"}</dd>
              </div>
            </dl>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
            <h2 className="text-lg font-semibold text-navy-900 mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <a
                href="/dashboard/jobs/new"
                className="block w-full text-left px-4 py-2 rounded-lg bg-navy-50 text-navy-700 hover:bg-navy-100"
              >
                Create New Job
              </a>
              <a
                href="/dashboard/employees"
                className="block w-full text-left px-4 py-2 rounded-lg bg-navy-50 text-navy-700 hover:bg-navy-100"
              >
                Manage Employees
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Change PIN Modal */}
      {showChangePinModal && (
        <ChangePinModal
          onClose={() => setShowChangePinModal(false)}
          onSuccess={() => {
            setShowChangePinModal(false);
            setSuccess("PIN changed successfully");
          }}
        />
      )}
    </motion.div>
  );
}

function ChainSettingsSection({
  isHQ,
  onSuccess,
}: {
  isHQ: boolean;
  onSuccess: () => void;
}) {
  const { refreshUser } = useAuth();
  const [settings, setSettings] = useState<ChainSettingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCurrency, setEditingCurrency] = useState(false);
  const [currency, setCurrency] = useState("");

  useEffect(() => {
    api.auth.getChainSettings()
      .then((data) => {
        setSettings(data);
        setCurrency(data.currency);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load settings");
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCurrencySave = async () => {
    if (!currency) return;
    setSaving(true);
    setError(null);

    try {
      const updated = await api.auth.updateChainSettings({ currency });
      setSettings(updated);
      setCurrency(updated.currency);
      setEditingCurrency(false);
      await refreshUser();
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update currency");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB");
      return;
    }

    setUploadingLogo(true);
    setError(null);

    try {
      const updated = await api.auth.uploadLogo(file);
      setSettings(updated);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload logo");
    } finally {
      setUploadingLogo(false);
      // Reset input
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
        <h2 className="text-lg font-semibold text-navy-900 mb-4">Chain Settings</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-navy-100 rounded w-1/4"></div>
          <div className="h-8 bg-navy-100 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  const logoUrl = settings?.branding?.logo_url;

  return (
    <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
      <h2 className="text-lg font-semibold text-navy-900 mb-4">Chain Settings</h2>

      {error && (
        <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Logo */}
        <div>
          <label className="block text-sm text-navy-500 mb-2">Logo</label>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-navy-200 bg-navy-50 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Chain logo"
                  className="w-full h-full object-contain"
                />
              ) : (
                <svg className="w-8 h-8 text-navy-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </div>
            {isHQ && (
              <div>
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-white rounded-lg hover:bg-gold-600 transition-colors text-sm font-medium">
                    {uploadingLogo ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {logoUrl ? "Change Logo" : "Upload Logo"}
                      </>
                    )}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-navy-400 mt-1">PNG, JPG, or WebP. Max 2MB.</p>
                <p className="text-xs text-navy-500 mt-1">Logo appears on quotation PDFs.</p>
              </div>
            )}
          </div>
          {!isHQ && (
            <p className="text-xs text-navy-400 mt-2">Only HQ can change the logo</p>
          )}
        </div>

        {/* Display Name (read-only for now) */}
        <div>
          <label className="block text-sm text-navy-500 mb-1">Display Name</label>
          <span className="text-navy-900 font-medium">{settings?.display_name}</span>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm text-navy-500 mb-1">Currency</label>
          {editingCurrency && isHQ ? (
            <div className="flex gap-2">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex-1 px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCurrencySave}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingCurrency(false);
                  setCurrency(settings?.currency || "KES");
                }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-navy-900 font-medium">
                {settings?.currency} ({CURRENCIES.find((c) => c.code === settings?.currency)?.name || settings?.currency})
              </span>
              {isHQ && (
                <button
                  onClick={() => setEditingCurrency(true)}
                  className="text-sm text-gold-600 hover:text-gold-700"
                >
                  Edit
                </button>
              )}
            </div>
          )}
          {!isHQ && (
            <p className="text-xs text-navy-400 mt-1">Only HQ can change currency</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ChangePinModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPin !== confirmPin) {
      setError("New PINs don't match");
      return;
    }

    if (!/^[0-9]{4,6}$/.test(newPin)) {
      setError("PIN must be 4-6 digits");
      return;
    }

    setSaving(true);
    try {
      await api.auth.changePin({ current_pin: currentPin, new_pin: newPin });
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to change PIN");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-navy-900">Change PIN</h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Current PIN</label>
            <input
              type="password"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              placeholder="****"
              required
              minLength={4}
              maxLength={6}
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">New PIN</label>
            <input
              type="password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="****"
              required
              minLength={4}
              maxLength={6}
              pattern="[0-9]{4,6}"
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Confirm New PIN</label>
            <input
              type="password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="****"
              required
              minLength={4}
              maxLength={6}
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
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
              {saving ? "Saving..." : "Change PIN"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
