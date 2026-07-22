"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";

export default function NewCustomerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [tags, setTags] = useState("");

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !phone.trim()) {
      setError("Name and phone are required");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const customer = await api.customers.create({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        tags: tags.trim() ? tags.split(",").map((t) => t.trim()) : undefined,
      });

      router.push(`/dashboard/customers/${customer.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create customer");
      setCreating(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-navy-900">Add Customer</h1>
        <p className="text-navy-600">Create a new customer record</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm space-y-6 max-w-2xl">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. John Doe"
              className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
              autoFocus
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">
              Phone *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0712345678"
              className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. john@example.com"
              className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">
              Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Main Street, Nairobi"
              rows={2}
              className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500 resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-2">
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. VIP, Fleet (comma-separated)"
              className="w-full px-4 py-3 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
            <p className="text-xs text-navy-500 mt-1">Separate multiple tags with commas</p>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</p>
          )}

          <div className="flex gap-3">
            <Button type="submit" variant="primary" size="lg" disabled={creating}>
              {creating ? "Creating..." : "Create Customer"}
            </Button>
            <Link href="/dashboard/customers">
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
