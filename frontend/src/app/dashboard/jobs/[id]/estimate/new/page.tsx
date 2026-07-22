"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { api, LineItemCreate, JobDetail, JobServiceDetail, QuotationTemplateItem } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp } from "@/lib/animations";

export default function NewEstimatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const jobId = parseInt(id);
  const router = useRouter();
  const { user } = useAuth();
  const currency = user?.chain_currency || "KES";

  const [job, setJob] = useState<JobDetail | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [lineItems, setLineItems] = useState<LineItemCreate[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadData();
  }, [jobId]);

  const loadData = async () => {
    try {
      const jobData = await api.jobs.get(jobId);
      setJob(jobData);

      // Try to load existing estimate first
      try {
        const estimate = await api.estimates.getLatest(jobId);
        if (estimate && estimate.line_items.length > 0) {
          // Load items from existing estimate for editing
          const existingItems: LineItemCreate[] = estimate.line_items.map((item) => ({
            kind: item.kind as "critical" | "optional",
            label: item.label,
            price: parseFloat(item.price),
          }));
          setLineItems(existingItems);
          setIsEditing(true);
          setLoadingTemplates(false);
          return;
        }
      } catch {
        // No existing estimate, fall through to template-based initialization
      }

      // Auto-populate line items from job's service templates (for new estimates)
      const initialItems: LineItemCreate[] = [];
      for (const svc of jobData.services) {
        const items = svc.quotation_items || [];
        for (const item of items) {
          initialItems.push({
            kind: "critical",
            label: item.name,
            price: item.price,
          });
        }
      }
      setLineItems(initialItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const addFromTemplate = (item: QuotationTemplateItem, serviceName: string) => {
    // Check if already added
    const exists = lineItems.some(
      (li) => li.label === item.name && li.price === item.price
    );
    if (exists) return;

    setLineItems([
      ...lineItems,
      {
        kind: "critical",
        label: item.name,
        price: item.price,
      },
    ]);
  };

  const addAllFromService = (service: JobServiceDetail) => {
    const newItems: LineItemCreate[] = [];
    for (const item of service.quotation_items || []) {
      const exists = lineItems.some(
        (li) => li.label === item.name && li.price === item.price
      );
      if (!exists) {
        newItems.push({
          kind: "critical",
          label: item.name,
          price: item.price,
        });
      }
    }
    setLineItems([...lineItems, ...newItems]);
  };

  const addLineItem = (kind: "critical" | "optional") => {
    setLineItems([...lineItems, { kind, label: "", price: 0 }]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.price || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validItems = lineItems.filter((item) => item.label.trim() && item.price > 0);
    if (validItems.length === 0) {
      setError("Please add at least one line item with a label and price");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await api.estimates.create(jobId, { line_items: validItems });
      router.push(`/dashboard/jobs/${jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create estimate");
      setCreating(false);
    }
  };

  const criticalItems = lineItems.filter((item) => item.kind === "critical");
  const optionalItems = lineItems.filter((item) => item.kind === "optional");
  const criticalTotal = criticalItems.reduce((sum, item) => sum + (item.price || 0), 0);
  const optionalTotal = optionalItems.reduce((sum, item) => sum + (item.price || 0), 0);

  // Get all template items for display
  const hasTemplates = job?.services.some((s) => (s.quotation_items?.length || 0) > 0) || false;

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="mb-6">
        <Link
          href={`/dashboard/jobs/${jobId}`}
          className="text-sm text-navy-500 hover:text-navy-700 mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Job
        </Link>
        <h1 className="text-2xl font-bold text-navy-900">
          {isEditing ? "Edit Quotation" : "Create Quotation"}
        </h1>
        <p className="text-navy-600">
          {job ? `${job.vehicle_make} ${job.vehicle_model} - ${job.plate}` : "Loading..."}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Line Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Templates Section */}
            <div className="bg-gold-50 rounded-xl p-6 border border-gold-200">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">Service Templates</h2>
                  <p className="text-sm text-navy-500">
                    {hasTemplates
                      ? "Items from service templates are pre-filled. Click to add more."
                      : "No templates configured for these services yet."}
                  </p>
                </div>
                {hasTemplates && (
                  <button
                    type="button"
                    onClick={() => setShowTemplates(!showTemplates)}
                    className="text-sm text-gold-700 hover:text-gold-800"
                  >
                    {showTemplates ? "Hide" : "Show"}
                  </button>
                )}
              </div>

              {!hasTemplates && !loadingTemplates && (
                <div className="text-sm text-navy-600 bg-white/50 rounded-lg p-4">
                  <p className="mb-2">To use templates, add quotation items to your services:</p>
                  <ol className="list-decimal list-inside space-y-1 text-navy-500">
                    <li>Go to Services page</li>
                    <li>Click on a service</li>
                    <li>Add pricing items (parts, labor, etc.)</li>
                  </ol>
                  <Link
                    href="/dashboard/services"
                    className="inline-block mt-3 text-gold-600 hover:text-gold-700 font-medium"
                  >
                    Go to Services →
                  </Link>
                </div>
              )}

              {hasTemplates && showTemplates && !loadingTemplates && (
                <div className="space-y-4">
                  {job?.services.map((service) => (
                    (service.quotation_items?.length || 0) > 0 && (
                      <div key={service.id}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium text-navy-700">{service.service_name}</h3>
                          <button
                            type="button"
                            onClick={() => addAllFromService(service)}
                            className="text-xs text-gold-600 hover:text-gold-700"
                          >
                            Add All
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {service.quotation_items?.map((item) => {
                            const isAdded = lineItems.some(
                              (li) => li.label === item.name && li.price === item.price
                            );
                            return (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => addFromTemplate(item, service.service_name)}
                                disabled={isAdded}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                  isAdded
                                    ? "bg-green-100 text-green-700 cursor-not-allowed"
                                    : "bg-white text-navy-700 hover:bg-gold-100 border border-gold-200"
                                }`}
                              >
                                {item.name}
                                <span className="ml-2 text-xs opacity-75">
                                  {currency} {item.price.toLocaleString()}
                                </span>
                                {isAdded && " ✓"}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>

            {/* Critical Items */}
            <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">Required Work</h2>
                  <p className="text-sm text-navy-500">Items that must be done</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addLineItem("critical")}
                >
                  + Add Custom
                </Button>
              </div>
              <div className="space-y-3">
                {lineItems.map((item, index) =>
                  item.kind === "critical" ? (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateLineItem(index, "label", e.target.value)}
                          placeholder="Description (e.g., Oil change, Brake pads)"
                          className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                        />
                      </div>
                      <div className="w-32">
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-navy-400">{currency}</span>
                          <input
                            type="number"
                            value={item.price || ""}
                            onChange={(e) =>
                              updateLineItem(index, "price", parseFloat(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="w-full pl-12 pr-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="p-2 text-navy-400 hover:text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : null
                )}
                {criticalItems.length === 0 && (
                  <p className="text-navy-400 text-sm py-4 text-center">
                    No required items yet. {hasTemplates ? "Items will be auto-filled from templates, or click \"+ Add Custom\"." : "Click \"+ Add Custom\" to add items."}
                  </p>
                )}
              </div>
            </div>

            {/* Optional Items */}
            <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">Recommended (Optional)</h2>
                  <p className="text-sm text-navy-500">Items the customer can choose</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addLineItem("optional")}
                >
                  + Add Item
                </Button>
              </div>
              <div className="space-y-3">
                {lineItems.map((item, index) =>
                  item.kind === "optional" ? (
                    <div key={index} className="flex gap-3 items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateLineItem(index, "label", e.target.value)}
                          placeholder="Description (e.g., Air filter, Coolant flush)"
                          className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                        />
                      </div>
                      <div className="w-32">
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-navy-400">{currency}</span>
                          <input
                            type="number"
                            value={item.price || ""}
                            onChange={(e) =>
                              updateLineItem(index, "price", parseFloat(e.target.value) || 0)
                            }
                            placeholder="0"
                            className="w-full pl-12 pr-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeLineItem(index)}
                        className="p-2 text-navy-400 hover:text-red-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : null
                )}
                {optionalItems.length === 0 && (
                  <p className="text-navy-400 text-sm py-4 text-center">No optional items yet</p>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm sticky top-6">
              <h2 className="text-lg font-semibold text-navy-900 mb-4">Summary</h2>

              {job && (
                <div className="mb-4 pb-4 border-b border-navy-100">
                  <p className="text-sm text-navy-500">Customer</p>
                  <p className="font-medium text-navy-900">
                    {job.customer_name || "Not specified"}
                  </p>
                  {job.customer_phone && (
                    <p className="text-sm text-navy-600">{job.customer_phone}</p>
                  )}
                </div>
              )}

              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-navy-500">Required Work ({criticalItems.length} items)</dt>
                  <dd className="font-medium text-navy-900">
                    {currency} {criticalTotal.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-navy-500">Optional Items ({optionalItems.length} items)</dt>
                  <dd className="font-medium text-navy-900">
                    {currency} {optionalTotal.toLocaleString()}
                  </dd>
                </div>
                <div className="border-t border-navy-100 pt-3 flex justify-between">
                  <dt className="font-medium text-navy-900">Total</dt>
                  <dd className="font-bold text-navy-900 text-lg">
                    {currency} {calculateTotal().toLocaleString()}
                  </dd>
                </div>
              </dl>

              {error && (
                <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
              )}

              <div className="mt-6 space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={creating || lineItems.length === 0}
                >
                  {creating ? "Saving..." : isEditing ? "Save Quotation" : "Create Quotation"}
                </Button>
                <Link href={`/dashboard/jobs/${jobId}`}>
                  <Button type="button" variant="outline" size="lg" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
