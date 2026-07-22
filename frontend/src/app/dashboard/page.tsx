"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { TrustScore } from "@/components/TrustScore";
import { useAuth } from "@/hooks/useAuth";
import { fadeInUp } from "@/lib/animations";
import { api, TrustScoreResponse } from "@/lib/api";

interface DashboardStats {
  activeJobs: number;
  completedToday: number;
  pendingEstimates: number;
}

export default function DashboardOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeJobs: 0,
    completedToday: 0,
    pendingEstimates: 0,
  });
  const [trustScore, setTrustScore] = useState<TrustScoreResponse | null>(null);
  const [chainTrustScore, setChainTrustScore] = useState<TrustScoreResponse | null>(null);

  useEffect(() => {
    // Fetch trust scores
    api.trustScore.getMyScore()
      .then(setTrustScore)
      .catch(() => setTrustScore(null));

    api.trustScore.getChainScore()
      .then(setChainTrustScore)
      .catch(() => setChainTrustScore(null));
  }, []);

  if (!user) return null;

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-navy-900">
          Welcome back, {user.name}
        </h1>
        <p className="text-navy-600">Here's what's happening today</p>
      </div>

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-navy-500 mb-1">Active Jobs</p>
              <p className="text-3xl font-bold text-navy-900">{stats.activeJobs}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-navy-500 mb-1">Completed Today</p>
              <p className="text-3xl font-bold text-green-600">{stats.completedToday}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-navy-500 mb-1">Pending Estimates</p>
              <p className="text-3xl font-bold text-gold-600">{stats.pendingEstimates}</p>
            </div>
            <div className="w-12 h-12 bg-gold-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Score Cards */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Personal Trust Score */}
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Your Trust Score</h2>
          {trustScore ? (
            <TrustScore data={trustScore} size="lg" showSignals />
          ) : (
            <div className="text-center text-navy-400 py-8">
              Loading...
            </div>
          )}
        </div>

        {/* Chain Trust Score */}
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">
            {user.chain_display_name} Trust Score
          </h2>
          {chainTrustScore ? (
            <TrustScore data={chainTrustScore} size="lg" showSignals />
          ) : (
            <div className="text-center text-navy-400 py-8">
              Loading...
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm mb-8">
        <h2 className="text-lg font-semibold text-navy-900 mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/jobs/new">
            <Button variant="primary">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Job
            </Button>
          </Link>
          <Link href="/dashboard/jobs">
            <Button variant="secondary">View All Jobs</Button>
          </Link>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
          <p className="text-sm text-navy-500 mb-1">Your Role</p>
          <p className="text-xl font-semibold text-navy-900 capitalize">
            {user.role === "hq" ? "Headquarters" : user.role}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
          <p className="text-sm text-navy-500 mb-1">Garage Handle</p>
          <p className="text-xl font-semibold text-gold-600">@{user.chain_name}</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
          <p className="text-sm text-navy-500 mb-1">Phone</p>
          <p className="text-xl font-semibold text-navy-900">{user.phone}</p>
        </div>
      </div>
    </motion.div>
  );
}
