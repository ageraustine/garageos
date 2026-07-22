"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { api, Service, EmployeeListItem } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

export default function NewJobPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [plate, setPlate] = useState("");
  const [vehicleMake, setVehicleMake] = useState("");
  const [vehicleModel, setVehicleModel] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedServices, setSelectedServices] = useState<number[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<number[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo capture state
  const [photo, setPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.services
      .list()
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoadingServices(false));

    api.employees
      .list()
      .then((emps) => setEmployees(emps.filter(e => e.is_active)))
      .catch(() => setEmployees([]))
      .finally(() => setLoadingEmployees(false));
  }, []);

  if (!user) return null;

  const toggleService = (id: number) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleEmployee = (id: number) => {
    setSelectedEmployees((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  };

  const handlePhotoCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!plate.trim()) {
      setError("Please enter a plate number");
      return;
    }
    if (selectedServices.length === 0) {
      setError("Please select at least one service");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const job = await api.jobs.create({
        plate: plate.toUpperCase(),
        vehicle_make: vehicleMake.trim() || undefined,
        vehicle_model: vehicleModel.trim() || undefined,
        branch_id: user.branch_id || 1,
        advisor_id: user.id,
        service_ids: selectedServices,
        assigned_employee_ids: selectedEmployees,
        customer_name: customerName.trim() || undefined,
        customer_phone: customerPhone.trim() || undefined,
      });

      // TODO: Upload photo if captured

      router.push(`/dashboard/jobs/${job.job_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create job");
      setCreating(false);
    }
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/jobs"
          className="text-sm text-navy-500 hover:text-navy-700 mb-2 inline-flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Jobs
        </Link>
        <h1 className="text-2xl font-bold text-navy-900">New Job Intake</h1>
        <p className="text-navy-600">Create a new service job</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm space-y-6">
          {/* Vehicle Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Plate Number *
              </label>
              <input
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value.toUpperCase())}
                placeholder="e.g. KAA 123A"
                className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 text-lg font-mono"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Make
              </label>
              <input
                type="text"
                value={vehicleMake}
                onChange={(e) => setVehicleMake(e.target.value)}
                placeholder="e.g. Toyota"
                className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Model
              </label>
              <input
                type="text"
                value={vehicleModel}
                onChange={(e) => setVehicleModel(e.target.value)}
                placeholder="e.g. Land Cruiser"
                className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
          </div>

          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Customer Name
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-2">
                Customer Phone
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. 0712345678"
                className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              />
            </div>
          </div>

          {/* Photo Capture */}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">
              Vehicle Photo
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            {photo ? (
              <div className="relative w-48 h-36">
                <img
                  src={photo}
                  alt="Vehicle"
                  className="w-full h-full object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-sm"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handlePhotoCapture}
                className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-navy-300 rounded-lg text-navy-600 hover:border-gold-500 hover:text-gold-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Take Photo
              </button>
            )}
          </div>

          {/* Service Selection */}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">
              Select Services *
            </label>
            {loadingServices ? (
              <p className="text-navy-500">Loading services...</p>
            ) : services.length === 0 ? (
              <div className="p-4 bg-navy-50 rounded-lg">
                <p className="text-navy-600 mb-3">No services configured yet.</p>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={async () => {
                    try {
                      const seeded = await api.services.seedDefaults();
                      setServices(seeded);
                    } catch (err) {
                      setError(
                        err instanceof Error ? err.message : "Failed to seed services"
                      );
                    }
                  }}
                >
                  Load Default Services
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedServices.includes(service.id)
                        ? "border-gold-500 bg-gold-50 text-navy-900"
                        : "border-navy-200 hover:border-navy-300 text-navy-700"
                    }`}
                  >
                    <p className="font-medium text-sm">{service.name}</p>
                    <p className="text-xs text-navy-500 mt-1">
                      {service.stages.length} stages
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Employee Assignment */}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">
              Assign Employees
            </label>
            {loadingEmployees ? (
              <p className="text-navy-500">Loading employees...</p>
            ) : employees.length === 0 ? (
              <p className="text-navy-500">No employees found</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {employees.map((employee) => (
                  <button
                    key={employee.id}
                    type="button"
                    onClick={() => toggleEmployee(employee.id)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedEmployees.includes(employee.id)
                        ? "border-gold-500 bg-gold-50 text-navy-900"
                        : "border-navy-200 hover:border-navy-300 text-navy-700"
                    }`}
                  >
                    <p className="font-medium text-sm">{employee.name}</p>
                    <p className="text-xs text-navy-500 mt-1 capitalize">
                      {employee.role_label}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create Job"}
            </Button>
            <Link href="/dashboard/jobs">
              <Button type="button" variant="outline" size="lg">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </motion.div>
  );
}
