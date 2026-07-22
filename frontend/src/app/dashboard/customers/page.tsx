"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { api, CustomerListItem } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

function formatCurrency(amount: string, currency: string = "KES"): string {
  return `${currency} ${parseFloat(amount).toLocaleString()}`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  return new Date(dateStr).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CustomersPage() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setLoading(true);
    api.customers
      .list({ search: debouncedSearch || undefined })
      .then(setCustomers)
      .catch(() => setCustomers([]))
      .finally(() => setLoading(false));
  }, [debouncedSearch]);

  if (!user) return null;

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Customers</h1>
          <p className="text-navy-600">Manage customer relationships</p>
        </div>
        <Link href="/dashboard/customers/new">
          <Button variant="primary">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Customer
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm mb-6">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-navy-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, or license plate..."
            className="w-full pl-10 pr-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-gold-500 border-t-transparent rounded-full mx-auto" />
          </div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-navy-500">
            {search ? "No customers found matching your search" : "No customers yet"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-navy-50 border-b border-navy-100">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-navy-600">Customer</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-navy-600">Contact</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-navy-600">Vehicles</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-navy-600">Jobs</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-navy-600">Total Spent</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-navy-600">Last Visit</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-navy-50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-navy-900">{customer.name}</p>
                        {customer.tags && customer.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {customer.tags.map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 bg-gold-100 text-gold-700 text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-navy-900">{customer.phone}</p>
                      {customer.email && (
                        <p className="text-sm text-navy-500">{customer.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-medium">
                        {customer.vehicle_count}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 text-green-700 rounded-full font-medium">
                        {customer.job_count}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="font-medium text-navy-900">
                        {formatCurrency(customer.total_spent, user.chain_currency)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-navy-600">
                      {formatDate(customer.last_visit)}
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        href={`/dashboard/customers/${customer.id}`}
                        className="text-gold-600 hover:text-gold-700 font-medium text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
