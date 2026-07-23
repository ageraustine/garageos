"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { api, AnalyticsDashboard, BranchListItem, ExpenseAnalytics } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui";
import { fadeInUp } from "@/lib/animations";

// Date range presets
const DATE_PRESETS = [
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This year", days: 365 },
];

const STATUS_COLORS: Record<string, string> = {
  intake: "bg-blue-500",
  diagnosis: "bg-yellow-500",
  working: "bg-orange-500",
  washing: "bg-purple-500",
  ready: "bg-green-500",
  paid: "bg-navy-500",
};

function formatCurrency(value: string | number, currency = "KES"): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${currency} ${num.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [branches, setBranches] = useState<BranchListItem[]>([]);

  // Filters
  const [selectedDays, setSelectedDays] = useState(30);
  const [selectedBranch, setSelectedBranch] = useState<number | undefined>(undefined);

  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - selectedDays + 1);
    return {
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
    };
  }, [selectedDays]);

  useEffect(() => {
    // Load branches for HQ
    if (user?.role === "hq") {
      api.employees.listBranches().then(setBranches).catch(console.error);
    }
  }, [user?.role]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    api.analytics
      .getDashboard({
        ...dateRange,
        branch_id: selectedBranch,
      })
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load analytics"))
      .finally(() => setLoading(false));
  }, [dateRange, selectedBranch]);

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">Analytics</h1>
          <p className="text-navy-600">
            {data ? `${data.period_start} to ${data.period_end}` : "Job performance insights"}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {/* Date Range */}
          <div className="flex bg-white border border-navy-200 rounded-lg overflow-hidden">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.days}
                onClick={() => setSelectedDays(preset.days)}
                className={`px-3 py-2 text-sm font-medium transition-colors ${
                  selectedDays === preset.days
                    ? "bg-gold-500 text-white"
                    : "text-navy-600 hover:bg-navy-50"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Branch Filter (HQ only) */}
          {user.role === "hq" && branches.length > 0 && (
            <select
              value={selectedBranch || ""}
              onChange={(e) => setSelectedBranch(e.target.value ? Number(e.target.value) : undefined)}
              className="px-3 py-2 border border-navy-200 rounded-lg text-sm focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            >
              <option value="">All Branches</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
      ) : data ? (
        <div className="space-y-6">
          {/* KPI Cards - Financial Overview */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Gross Income"
              value={formatCurrency(data.kpis.gross_income || data.kpis.total_revenue, user.chain_currency)}
              change={data.kpis.revenue_change_pct}
              subtitle="Labor + Parts"
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <KPICard
              label="Labor Income"
              value={formatCurrency(data.kpis.labor_income || "0", user.chain_currency)}
              subtitle="100% profit"
              positive
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <KPICard
              label="Parts Revenue"
              value={formatCurrency(data.kpis.parts_revenue || "0", user.chain_currency)}
              subtitle={`Cost: ${formatCurrency(data.kpis.parts_cost || "0", user.chain_currency)}`}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            />
            <KPICard
              label="Net Income"
              value={formatCurrency(data.kpis.net_income || data.kpis.gross_profit, user.chain_currency)}
              subtitle={`${data.kpis.profit_margin}% margin`}
              positive={parseFloat(data.kpis.net_income || data.kpis.gross_profit) >= 0}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              }
            />
          </div>

          {/* KPI Cards - Operations */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              label="Total Expenses"
              value={formatCurrency(data.kpis.total_expenses, user.chain_currency)}
              change={data.kpis.expenses_change_pct}
              changeInverted
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
            />
            <KPICard
              label="Total Jobs"
              value={data.kpis.total_jobs.toString()}
              change={data.kpis.jobs_change_pct}
              subtitle={`${data.kpis.completed_jobs} completed`}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              }
            />
            <KPICard
              label="Avg Job Value"
              value={formatCurrency(data.kpis.average_job_value, user.chain_currency)}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                </svg>
              }
            />
            <KPICard
              label="Completion Rate"
              value={`${data.kpis.completion_rate}%`}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Revenue Trend + Job Funnel */}
          <div className="grid lg:grid-cols-2 gap-6">
            <RevenueTrendChart data={data.revenue_trend} currency={user.chain_currency} />
            <JobFunnelChart data={data.job_funnel} />
          </div>

          {/* Services + Time Analytics */}
          <div className="grid lg:grid-cols-2 gap-6">
            <ServiceBreakdown data={data.service_analytics} currency={user.chain_currency} />
            <TimeHeatmap data={data.time_analytics} />
          </div>

          {/* Customer Metrics + Estimate Accuracy */}
          <div className="grid lg:grid-cols-2 gap-6">
            <CustomerMetricsCard data={data.customer_metrics} />
            <EstimateAccuracyCard data={data.estimate_accuracy} currency={user.chain_currency} />
          </div>

          {/* Expense Breakdown */}
          {data.expense_analytics && (
            <ExpenseBreakdown data={data.expense_analytics} currency={user.chain_currency} />
          )}
        </div>
      ) : null}
    </motion.div>
  );
}

// KPI Card Component
function KPICard({
  label,
  value,
  change,
  subtitle,
  icon,
  changeInverted,
  positive,
}: {
  label: string;
  value: string;
  change?: number | null;
  subtitle?: string;
  icon: React.ReactNode;
  changeInverted?: boolean; // For expenses, lower is better
  positive?: boolean; // Explicit positive/negative for profit
}) {
  const getChangeColor = () => {
    if (change === null || change === undefined) return "";
    const isGood = changeInverted ? change <= 0 : change >= 0;
    return isGood ? "text-green-600" : "text-red-600";
  };

  const getIconBg = () => {
    if (positive === true) return "bg-green-50 text-green-600";
    if (positive === false) return "bg-red-50 text-red-600";
    return "bg-gold-50 text-gold-600";
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-navy-100 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${getIconBg()}`}>{icon}</div>
        {change !== null && change !== undefined && (
          <span className={`text-sm font-medium ${getChangeColor()}`}>
            {formatPercent(change)}
          </span>
        )}
      </div>
      <div className="mt-3">
        <p className={`text-2xl font-bold ${positive === false ? "text-red-600" : "text-navy-900"}`}>{value}</p>
        <p className="text-sm text-navy-500">{subtitle || label}</p>
      </div>
    </div>
  );
}

// Revenue Trend Chart
function RevenueTrendChart({
  data,
  currency,
}: {
  data: AnalyticsDashboard["revenue_trend"];
  currency: string;
}) {
  const maxRevenue = Math.max(...data.data_points.map((d) => parseFloat(d.revenue) || 0), 1);

  return (
    <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
      <h3 className="text-lg font-semibold text-navy-900 mb-4">Revenue Trend</h3>

      <div className="flex items-end gap-1 h-40">
        {data.data_points.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-navy-400">
            No data for this period
          </div>
        ) : (
          data.data_points.map((point, i) => {
            const height = (parseFloat(point.revenue) / maxRevenue) * 100;
            return (
              <div
                key={i}
                className="flex-1 group relative"
                style={{ minWidth: "8px" }}
              >
                <div
                  className="bg-gold-500 rounded-t hover:bg-gold-600 transition-colors"
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block bg-navy-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                  {point.date}: {formatCurrency(point.revenue, currency)}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 flex justify-between text-sm">
        <div>
          <span className="text-navy-500">Total: </span>
          <span className="font-semibold text-navy-900">
            {formatCurrency(data.total_revenue, currency)}
          </span>
        </div>
        <div>
          <span className="text-navy-500">Daily Avg: </span>
          <span className="font-semibold text-navy-900">
            {formatCurrency(data.average_daily_revenue, currency)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Job Funnel Chart
function JobFunnelChart({ data }: { data: AnalyticsDashboard["job_funnel"] }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
      <h3 className="text-lg font-semibold text-navy-900 mb-4">Job Status Distribution</h3>

      <div className="space-y-3">
        {data.statuses.map((status) => (
          <div key={status.status} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-navy-700">{status.status_label}</span>
              <span className="font-medium text-navy-900">
                {status.count} ({status.percentage}%)
              </span>
            </div>
            <div className="h-3 bg-navy-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${STATUS_COLORS[status.status] || "bg-navy-400"} rounded-full transition-all`}
                style={{ width: `${status.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-navy-100">
        <p className="text-sm text-navy-600 mb-2">Conversion Rates</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-navy-50 rounded px-2 py-1">
            <span className="text-navy-500">Intake → Diagnosis:</span>{" "}
            <span className="font-semibold text-navy-900">{data.intake_to_diagnosis_pct}%</span>
          </div>
          <div className="bg-navy-50 rounded px-2 py-1">
            <span className="text-navy-500">Diagnosis → Working:</span>{" "}
            <span className="font-semibold text-navy-900">{data.diagnosis_to_working_pct}%</span>
          </div>
          <div className="bg-navy-50 rounded px-2 py-1">
            <span className="text-navy-500">Working → Ready:</span>{" "}
            <span className="font-semibold text-navy-900">{data.working_to_ready_pct}%</span>
          </div>
          <div className="bg-navy-50 rounded px-2 py-1">
            <span className="text-navy-500">Ready → Paid:</span>{" "}
            <span className="font-semibold text-navy-900">{data.ready_to_paid_pct}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Service Breakdown
function ServiceBreakdown({
  data,
  currency,
}: {
  data: AnalyticsDashboard["service_analytics"];
  currency: string;
}) {
  const topServices = data.services.slice(0, 6);

  return (
    <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
      <h3 className="text-lg font-semibold text-navy-900 mb-4">Top Services</h3>

      {topServices.length === 0 ? (
        <div className="text-navy-400 text-center py-8">No service data</div>
      ) : (
        <div className="space-y-3">
          {topServices.map((service, i) => (
            <div key={service.service_id} className="flex items-center gap-3">
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === 0 ? "bg-gold-500 text-white" : "bg-navy-100 text-navy-600"
                }`}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center">
                  <span className="text-navy-900 font-medium truncate">
                    {service.service_name}
                  </span>
                  <span className="text-sm text-navy-500 ml-2">
                    {service.job_count} jobs
                  </span>
                </div>
                <div className="h-2 bg-navy-100 rounded-full mt-1 overflow-hidden">
                  <div
                    className="h-full bg-gold-500 rounded-full"
                    style={{ width: `${service.percentage_of_total}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-navy-100 text-sm text-navy-500">
        Total service instances: {data.total_service_instances}
      </div>
    </div>
  );
}

// Time Heatmap
function TimeHeatmap({ data }: { data: AnalyticsDashboard["time_analytics"] }) {
  const maxJobs = Math.max(...data.days_of_week.map((d) => d.job_count), 1);

  return (
    <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
      <h3 className="text-lg font-semibold text-navy-900 mb-4">Busiest Days</h3>

      <div className="grid grid-cols-7 gap-2">
        {data.days_of_week.map((day) => {
          const intensity = day.job_count / maxJobs;
          const bgColor =
            intensity > 0.75
              ? "bg-gold-600"
              : intensity > 0.5
              ? "bg-gold-500"
              : intensity > 0.25
              ? "bg-gold-400"
              : intensity > 0
              ? "bg-gold-200"
              : "bg-navy-100";

          return (
            <div key={day.day} className="text-center">
              <div
                className={`aspect-square rounded-lg ${bgColor} flex items-center justify-center mb-1`}
              >
                <span
                  className={`text-sm font-bold ${
                    intensity > 0.5 ? "text-white" : "text-navy-700"
                  }`}
                >
                  {day.job_count}
                </span>
              </div>
              <span className="text-xs text-navy-500">{day.day.slice(0, 3)}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-4 border-t border-navy-100 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-navy-500">Busiest: </span>
          <span className="font-semibold text-green-600">{data.busiest_day}</span>
        </div>
        <div>
          <span className="text-navy-500">Slowest: </span>
          <span className="font-semibold text-red-500">{data.slowest_day}</span>
        </div>
        <div className="col-span-2">
          <span className="text-navy-500">Avg jobs/day: </span>
          <span className="font-semibold text-navy-900">{data.average_jobs_per_day}</span>
        </div>
      </div>
    </div>
  );
}

// Customer Metrics Card
function CustomerMetricsCard({ data }: { data: AnalyticsDashboard["customer_metrics"] }) {
  return (
    <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
      <h3 className="text-lg font-semibold text-navy-900 mb-4">Customer Insights</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-navy-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-navy-900">{data.total_unique_customers}</p>
          <p className="text-sm text-navy-500">Unique Customers</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-green-600">{data.new_customers}</p>
          <p className="text-sm text-navy-500">New Customers</p>
        </div>
        <div className="bg-gold-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-gold-600">{data.returning_customers}</p>
          <p className="text-sm text-navy-500">Returning</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-2xl font-bold text-purple-600">{data.repeat_rate}%</p>
          <p className="text-sm text-navy-500">Repeat Rate</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-navy-100 text-sm">
        <span className="text-navy-500">Avg jobs per customer: </span>
        <span className="font-semibold text-navy-900">{data.average_jobs_per_customer}</span>
      </div>
    </div>
  );
}

// Estimate Accuracy Card
function EstimateAccuracyCard({
  data,
  currency,
}: {
  data: AnalyticsDashboard["estimate_accuracy"];
  currency: string;
}) {
  const accuracyColor =
    data.accuracy_percentage >= 90
      ? "text-green-600"
      : data.accuracy_percentage >= 75
      ? "text-gold-600"
      : "text-red-500";

  return (
    <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
      <h3 className="text-lg font-semibold text-navy-900 mb-4">Estimate Accuracy</h3>

      <div className="flex items-center justify-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-navy-100"
            />
            <circle
              cx="64"
              cy="64"
              r="56"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={`${data.accuracy_percentage * 3.52} 352`}
              className={accuracyColor}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${accuracyColor}`}>
              {data.accuracy_percentage}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-navy-500">Approval Rate</span>
          <p className="font-semibold text-navy-900">{data.approval_rate}%</p>
        </div>
        <div>
          <span className="text-navy-500">Total Estimates</span>
          <p className="font-semibold text-navy-900">{data.total_estimates}</p>
        </div>
        <div>
          <span className="text-navy-500">Avg Estimate</span>
          <p className="font-semibold text-navy-900">{formatCurrency(data.average_estimate, currency)}</p>
        </div>
        <div>
          <span className="text-navy-500">Avg Actual</span>
          <p className="font-semibold text-navy-900">{formatCurrency(data.average_actual, currency)}</p>
        </div>
      </div>

      {(data.underestimate_count > 0 || data.overestimate_count > 0) && (
        <div className="mt-4 pt-4 border-t border-navy-100 flex gap-4 text-xs">
          <span className="bg-red-50 text-red-600 px-2 py-1 rounded">
            {data.underestimate_count} underestimated
          </span>
          <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded">
            {data.overestimate_count} overestimated
          </span>
        </div>
      )}
    </div>
  );
}

// Expense Breakdown
function ExpenseBreakdown({
  data,
  currency,
}: {
  data: ExpenseAnalytics;
  currency: string;
}) {
  const CATEGORY_COLORS: Record<string, string> = {
    parts: "bg-blue-500",
    outsourced: "bg-green-500",
    utilities: "bg-yellow-500",
    rent: "bg-purple-500",
    equipment: "bg-orange-500",
    fuel: "bg-red-500",
    marketing: "bg-pink-500",
    salaries: "bg-indigo-500",
    maintenance: "bg-teal-500",
    insurance: "bg-cyan-500",
    taxes: "bg-gray-500",
    other: "bg-navy-400",
  };

  return (
    <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-navy-900">Expense Breakdown</h3>
        <span className="text-sm text-navy-500">{data.expense_count} expenses</span>
      </div>

      {data.by_category.length === 0 ? (
        <div className="text-navy-400 text-center py-8">No expenses recorded</div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Category breakdown */}
          <div>
            <h4 className="text-sm font-medium text-navy-700 mb-3">By Category</h4>
            <div className="space-y-3">
              {data.by_category.slice(0, 6).map((cat) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[cat.category] || "bg-navy-400"}`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-navy-900 font-medium truncate">
                        {cat.category_label}
                      </span>
                      <span className="text-sm text-navy-500 ml-2">
                        {formatCurrency(cat.amount, currency)}
                      </span>
                    </div>
                    <div className="h-2 bg-navy-100 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full ${CATEGORY_COLORS[cat.category] || "bg-navy-400"} rounded-full`}
                        style={{ width: `${cat.percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top vendors */}
          <div>
            <h4 className="text-sm font-medium text-navy-700 mb-3">Top Vendors</h4>
            {data.top_vendors.length === 0 ? (
              <div className="text-navy-400 text-sm">No vendor data</div>
            ) : (
              <div className="space-y-2">
                {data.top_vendors.map((vendor, i) => (
                  <div
                    key={vendor.vendor}
                    className="flex items-center justify-between p-3 bg-navy-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? "bg-gold-500 text-white" : "bg-navy-200 text-navy-600"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="text-navy-900 font-medium">{vendor.vendor}</span>
                    </div>
                    <span className="text-navy-600 font-semibold">
                      {formatCurrency(vendor.amount, currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-navy-100 flex items-center justify-between">
        <span className="text-sm text-navy-500">Total Expenses</span>
        <span className="text-lg font-bold text-red-600">
          {formatCurrency(data.total_expenses, currency)}
        </span>
      </div>
    </div>
  );
}
