"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { api, Service, StageCreate, QuotationItem, QuotationItemCreate } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp } from "@/lib/animations";

export default function ServicesPage() {
  const { user } = useAuth();
  const currency = user?.chain_currency || "KES";
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [managingPricing, setManagingPricing] = useState<Service | null>(null);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const data = await api.services.list();
      setServices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load services");
    } finally {
      setLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      await api.services.seedDefaults();
      loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed default services");
    }
  };

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSeedTemplates = async () => {
    try {
      const result = await api.services.seedTemplates();
      const messages = [];
      if (result.items_added > 0) {
        messages.push(`Added ${result.items_added} template items`);
      }
      if (result.items_fixed > 0) {
        messages.push(`Fixed ${result.items_fixed} existing items`);
      }
      if (messages.length > 0) {
        setSuccessMessage(messages.join(", "));
        loadServices();
      } else {
        setSuccessMessage("All services already have template items");
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to seed templates");
    }
  };

  // Check if any service is missing templates
  const hasMissingTemplates = services.some((s) => !s.quotation_items || s.quotation_items.length === 0);

  const handleToggleActive = async (service: Service) => {
    try {
      await api.services.update(service.id, { is_active: !service.is_active });
      loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update service");
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`Are you sure you want to delete "${service.name}"?`)) return;
    try {
      await api.services.delete(service.id);
      loadServices();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete service");
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Services</h1>
          <p className="text-navy-600">Configure services, stages, and quotation templates</p>
        </div>
        <div className="flex gap-3">
          {services.length === 0 && !loading && (
            <Button variant="secondary" onClick={handleSeedDefaults}>
              Load Defaults
            </Button>
          )}
          {services.length > 0 && hasMissingTemplates && !loading && (
            <Button variant="secondary" onClick={handleSeedTemplates}>
              Load Default Templates
            </Button>
          )}
          <Button variant="primary" onClick={() => setShowAddModal(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Service
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6">{error}</div>
      )}
      {successMessage && (
        <div className="bg-green-50 text-green-700 p-4 rounded-lg mb-6">{successMessage}</div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
        </div>
      ) : services.length === 0 ? (
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
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-navy-900 mb-2">No services configured</h3>
          <p className="text-navy-500 mb-4">Load default services or create your own</p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={handleSeedDefaults}>
              Load Default Services
            </Button>
            <Button variant="primary" onClick={() => setShowAddModal(true)}>
              Create Custom Service
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className={`bg-white rounded-xl p-6 border shadow-sm ${
                service.is_active ? "border-navy-100" : "border-navy-200 opacity-60"
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-navy-900">{service.name}</h3>
                    {!service.is_active && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-sm text-navy-500 mt-1">{service.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setManagingPricing(service)}
                    className="text-sm text-gold-600 hover:text-gold-700"
                  >
                    Templates
                  </button>
                  <button
                    onClick={() => setEditingService(service)}
                    className="text-sm text-navy-500 hover:text-navy-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(service)}
                    className={`text-sm ${
                      service.is_active
                        ? "text-orange-600 hover:text-orange-700"
                        : "text-green-600 hover:text-green-700"
                    }`}
                  >
                    {service.is_active ? "Disable" : "Enable"}
                  </button>
                  <button
                    onClick={() => handleDelete(service)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Stages */}
              <div className="flex flex-wrap gap-2 mb-4">
                {service.stages
                  .sort((a, b) => a.order - b.order)
                  .map((stage, idx) => (
                    <div key={stage.id} className="flex items-center">
                      <span className="text-sm px-3 py-1 bg-navy-50 text-navy-700 rounded-full">
                        {stage.name}
                      </span>
                      {idx < service.stages.length - 1 && (
                        <svg
                          className="w-4 h-4 mx-1 text-navy-300"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      )}
                    </div>
                  ))}
                {service.stages.length === 0 && (
                  <span className="text-sm text-navy-400">No stages defined</span>
                )}
              </div>

              {/* Quotation Items */}
              {service.quotation_items && service.quotation_items.length > 0 && (
                <div className="border-t border-navy-100 pt-4">
                  <p className="text-xs text-navy-500 mb-2">Template Items</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {service.quotation_items.slice(0, 6).map((item) => (
                      <div key={item.id} className="text-xs bg-gold-50 text-gold-800 px-2 py-1 rounded">
                        {item.name}: <span className="font-medium">{currency} {item.price.toLocaleString()}</span>
                      </div>
                    ))}
                    {service.quotation_items.length > 6 && (
                      <div className="text-xs text-navy-500 px-2 py-1">
                        +{service.quotation_items.length - 6} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Service Modal */}
      {(showAddModal || editingService) && (
        <ServiceModal
          service={editingService}
          onClose={() => {
            setShowAddModal(false);
            setEditingService(null);
          }}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingService(null);
            loadServices();
          }}
        />
      )}

      {/* Pricing Modal */}
      {managingPricing && (
        <PricingModal
          service={managingPricing}
          onClose={() => setManagingPricing(null)}
          onSuccess={() => {
            setManagingPricing(null);
            loadServices();
          }}
        />
      )}
    </motion.div>
  );
}

function ServiceModal({
  service,
  onClose,
  onSuccess,
}: {
  service: Service | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEditing = service !== null;
  const [name, setName] = useState(service?.name || "");
  const [description, setDescription] = useState(service?.description || "");
  const [stages, setStages] = useState<StageCreate[]>(
    service?.stages.map((s) => ({ name: s.name, order: s.order })) || [{ name: "", order: 0 }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addStage = () => {
    setStages([...stages, { name: "", order: stages.length }]);
  };

  const removeStage = (index: number) => {
    if (stages.length > 1) {
      const newStages = stages.filter((_, i) => i !== index);
      // Reorder
      setStages(newStages.map((s, i) => ({ ...s, order: i })));
    }
  };

  const updateStage = (index: number, name: string) => {
    const newStages = [...stages];
    newStages[index] = { ...newStages[index], name };
    setStages(newStages);
  };

  const moveStage = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= stages.length) return;

    const newStages = [...stages];
    [newStages[index], newStages[newIndex]] = [newStages[newIndex], newStages[index]];
    // Reorder
    setStages(newStages.map((s, i) => ({ ...s, order: i })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validStages = stages.filter((s) => s.name.trim());
    if (validStages.length === 0) {
      setError("Please add at least one stage");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await api.services.update(service.id, {
          name,
          description: description || null,
          stages: validStages,
        });
      } else {
        await api.services.create({
          name,
          description: description || null,
          stages: validStages,
        });
      }
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save service");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 max-w-lg w-full shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-navy-900">
            {isEditing ? "Edit Service" : "Add Service"}
          </h2>
          <button onClick={onClose} className="text-navy-400 hover:text-navy-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Service Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Brake Service"
              required
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the service"
              className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-navy-700">Stages</label>
              <button
                type="button"
                onClick={addStage}
                className="text-sm text-gold-600 hover:text-gold-700"
              >
                + Add Stage
              </button>
            </div>
            <div className="space-y-2">
              {stages.map((stage, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm text-navy-400 w-6">{index + 1}.</span>
                  <input
                    type="text"
                    value={stage.name}
                    onChange={(e) => updateStage(index, e.target.value)}
                    placeholder={`Stage ${index + 1}`}
                    className="flex-1 px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
                  />
                  <button
                    type="button"
                    onClick={() => moveStage(index, "up")}
                    disabled={index === 0}
                    className="p-1 text-navy-400 hover:text-navy-600 disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStage(index, "down")}
                    disabled={index === stages.length - 1}
                    className="p-1 text-navy-400 hover:text-navy-600 disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeStage(index)}
                    disabled={stages.length === 1}
                    className="p-1 text-red-400 hover:text-red-600 disabled:opacity-30"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
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
              {saving ? "Saving..." : isEditing ? "Update Service" : "Create Service"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function PricingModal({
  service,
  onClose,
  onSuccess,
}: {
  service: Service;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const currency = user?.chain_currency || "KES";
  const [items, setItems] = useState<QuotationItem[]>(service.quotation_items || []);
  const [newItem, setNewItem] = useState<QuotationItemCreate>({ name: "", price: 0, is_labor: false });
  const [editingItem, setEditingItem] = useState<QuotationItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddItem = async () => {
    if (!newItem.name.trim() || newItem.price <= 0) {
      setError("Please enter a name and valid price");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const item = await api.services.createQuotationItem(service.id, newItem);
      setItems([...items, item]);
      setNewItem({ name: "", price: 0, is_labor: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add item");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    if (!editingItem.name.trim() || editingItem.price <= 0) {
      setError("Please enter a name and valid price");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const updated = await api.services.updateQuotationItem(editingItem.id, {
        name: editingItem.name,
        price: editingItem.price,
        is_labor: editingItem.is_labor,
      });
      setItems(items.map((i) => (i.id === updated.id ? updated : i)));
      setEditingItem(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update item");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await api.services.deleteQuotationItem(itemId);
      setItems(items.filter((i) => i.id !== itemId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
    }
  };

  const handleClose = () => {
    onSuccess();
    onClose();
  };

  const laborItems = items.filter((i) => i.is_labor && i.is_active);
  const partsItems = items.filter((i) => !i.is_labor && i.is_active);
  const totalLabor = laborItems.reduce((sum, i) => sum + i.price, 0);
  const totalParts = partsItems.reduce((sum, i) => sum + i.price, 0);

  const renderItem = (item: QuotationItem) => {
    const isEditing = editingItem?.id === item.id;

    if (isEditing) {
      return (
        <div key={item.id} className="p-3 bg-gold-50 border border-gold-200 rounded-lg space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <input
                type="text"
                value={editingItem.name}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                placeholder="Item name"
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
            <div>
              <input
                type="number"
                value={editingItem.price || ""}
                onChange={(e) => setEditingItem({ ...editingItem, price: parseFloat(e.target.value) || 0 })}
                placeholder="Price"
                min="0"
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={editingItem.is_labor}
                onChange={(e) => setEditingItem({ ...editingItem, is_labor: e.target.checked })}
                className="w-4 h-4 text-gold-600 rounded focus:ring-gold-500"
              />
              <span className="text-sm text-navy-600">Labor</span>
            </label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingItem(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleUpdateItem} disabled={saving}>
                {saving ? "..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        key={item.id}
        className="flex items-center justify-between p-3 bg-white border border-navy-100 rounded-lg group"
      >
        <span className="text-navy-800">{item.name}</span>
        <div className="flex items-center gap-3">
          <span className="font-medium text-navy-900">{currency} {item.price.toLocaleString()}</span>
          <button
            onClick={() => setEditingItem(item)}
            className="text-navy-400 hover:text-navy-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={() => handleDeleteItem(item.id)}
            className="text-red-500 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 max-w-2xl w-full shadow-xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-navy-900">Quotation Templates - {service.name}</h2>
            <p className="text-sm text-navy-500">These items will auto-fill when creating estimates for this service</p>
          </div>
          <button onClick={handleClose} className="text-navy-400 hover:text-navy-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add new item */}
        <div className="bg-navy-50 p-4 rounded-lg mb-6">
          <h3 className="text-sm font-medium text-navy-700 mb-3">Add Template Item</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <input
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="Item name (e.g., Brake Pads)"
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
            <div>
              <input
                type="number"
                value={newItem.price || ""}
                onChange={(e) => setNewItem({ ...newItem, price: parseFloat(e.target.value) || 0 })}
                placeholder={`Price (${currency})`}
                min="0"
                className="w-full px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newItem.is_labor}
                  onChange={(e) => setNewItem({ ...newItem, is_labor: e.target.checked })}
                  className="w-4 h-4 text-gold-600 rounded focus:ring-gold-500"
                />
                <span className="text-sm text-navy-600">Labor</span>
              </label>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddItem}
                disabled={saving}
              >
                {saving ? "..." : "Add"}
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg mb-4">{error}</p>
        )}

        {/* Labor Items */}
        {laborItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-navy-700 mb-2 flex justify-between">
              <span>Labor</span>
              <span className="text-gold-600">{currency} {totalLabor.toLocaleString()}</span>
            </h3>
            <div className="space-y-2">
              {laborItems.map(renderItem)}
            </div>
          </div>
        )}

        {/* Parts Items */}
        {partsItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-navy-700 mb-2 flex justify-between">
              <span>Parts</span>
              <span className="text-gold-600">{currency} {totalParts.toLocaleString()}</span>
            </h3>
            <div className="space-y-2">
              {partsItems.map(renderItem)}
            </div>
          </div>
        )}

        {items.length === 0 && (
          <div className="text-center py-8 text-navy-500">
            <p>No template items yet. Add items above.</p>
            <p className="text-sm mt-2">Items added here will auto-fill estimates for this service.</p>
          </div>
        )}

        {/* Total */}
        {items.length > 0 && (
          <div className="border-t border-navy-200 pt-4 flex justify-between items-center">
            <span className="font-medium text-navy-900">Template Total</span>
            <span className="text-xl font-bold text-navy-900">{currency} {(totalLabor + totalParts).toLocaleString()}</span>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <Button variant="primary" onClick={handleClose} className="flex-1">
            Done
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
