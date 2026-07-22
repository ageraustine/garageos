"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui";
import { api, BranchAttendanceSummary, AttendanceResponse, BranchListItem } from "@/lib/api";
import { fadeInUp } from "@/lib/animations";
import { useAuth } from "@/hooks/useAuth";

export default function AttendancePage() {
  const { user } = useAuth();
  const [branches, setBranches] = useState<BranchListItem[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [summary, setSummary] = useState<BranchAttendanceSummary | null>(null);
  const [myAttendance, setMyAttendance] = useState<AttendanceResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clockingIn, setClockingIn] = useState(false);
  const [clockingOut, setClockingOut] = useState(false);

  useEffect(() => {
    loadBranches();
    loadMyAttendance();
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      loadSummary();
    }
  }, [selectedBranch, selectedDate]);

  const loadBranches = async () => {
    try {
      const data = await api.employees.listBranches();
      setBranches(data);
      if (data.length > 0) {
        setSelectedBranch(data[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load branches");
    } finally {
      setLoading(false);
    }
  };

  const loadMyAttendance = async () => {
    try {
      const data = await api.hr.attendance.getMyToday();
      setMyAttendance(data);
    } catch (err) {
      // May not have attendance for today
    }
  };

  const loadSummary = async () => {
    if (!selectedBranch) return;
    try {
      setLoading(true);
      const data = await api.hr.attendance.getBranchSummary(selectedBranch, selectedDate);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance summary");
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    setClockingIn(true);
    setError(null);

    try {
      // Try to get geolocation
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: true,
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch {
          // Geolocation not available or denied
        }
      }

      const data = await api.hr.attendance.clockIn({
        latitude,
        longitude,
      });
      setMyAttendance(data);
      loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clock in");
    } finally {
      setClockingIn(false);
    }
  };

  const handleClockOut = async () => {
    setClockingOut(true);
    setError(null);

    try {
      // Try to get geolocation
      let latitude: number | undefined;
      let longitude: number | undefined;

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: true,
            });
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch {
          // Geolocation not available or denied
        }
      }

      const data = await api.hr.attendance.clockOut({ latitude, longitude });
      setMyAttendance(data);
      loadSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clock out");
    } finally {
      setClockingOut(false);
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return "-";
    return new Date(timeStr).toLocaleTimeString("en-KE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatMinutes = (minutes: number | null) => {
    if (minutes === null) return "-";
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];

  return (
    <motion.div initial="hidden" animate="visible" variants={fadeInUp}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy-900">Attendance</h1>
        <p className="text-navy-600">Track employee attendance</p>
      </div>

      {/* My Attendance Card */}
      {isToday && (
        <div className="bg-white rounded-xl p-6 border border-navy-100 shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">My Attendance Today</h2>

          {myAttendance ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm text-navy-500">Clock In</p>
                    <p className="text-lg font-medium text-navy-900">{formatTime(myAttendance.clock_in)}</p>
                  </div>
                  {myAttendance.clock_out && (
                    <>
                      <div className="text-navy-300">-</div>
                      <div>
                        <p className="text-sm text-navy-500">Clock Out</p>
                        <p className="text-lg font-medium text-navy-900">{formatTime(myAttendance.clock_out)}</p>
                      </div>
                      <div className="text-navy-300">|</div>
                      <div>
                        <p className="text-sm text-navy-500">Total Hours</p>
                        <p className="text-lg font-medium text-navy-900">{formatMinutes(myAttendance.total_minutes)}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              {!myAttendance.clock_out && (
                <Button
                  variant="primary"
                  onClick={handleClockOut}
                  disabled={clockingOut}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {clockingOut ? "Clocking Out..." : "Clock Out"}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-navy-500">You haven't clocked in yet today</p>
              <Button
                variant="primary"
                onClick={handleClockIn}
                disabled={clockingIn}
              >
                {clockingIn ? "Clocking In..." : "Clock In"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Branch Summary - Manager/HQ only */}
      {(user?.role === "hq" || user?.role === "manager") && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-sm text-navy-500 mb-1">Branch</label>
                <select
                  value={selectedBranch || ""}
                  onChange={(e) => setSelectedBranch(parseInt(e.target.value))}
                  className="px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
                >
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-navy-500 mb-1">Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-navy-200 rounded-lg focus:ring-2 focus:ring-gold-500"
                />
              </div>
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl p-4 border border-navy-100 shadow-sm">
                  <p className="text-sm text-navy-500">Total Employees</p>
                  <p className="text-2xl font-bold text-navy-900">{summary.total_employees}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm bg-green-50">
                  <p className="text-sm text-green-600">Present</p>
                  <p className="text-2xl font-bold text-green-700">{summary.present}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-red-200 shadow-sm bg-red-50">
                  <p className="text-sm text-red-600">Absent</p>
                  <p className="text-2xl font-bold text-red-700">{summary.absent}</p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-yellow-200 shadow-sm bg-yellow-50">
                  <p className="text-sm text-yellow-600">Late Arrivals</p>
                  <p className="text-2xl font-bold text-yellow-700">{summary.late_arrivals}</p>
                </div>
              </div>

              {/* Employees Table */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin w-8 h-8 border-4 border-gold-500 border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-navy-100 shadow-sm overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-navy-50 border-b border-navy-100">
                      <tr>
                        <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Employee</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Status</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Clock In</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Clock Out</th>
                        <th className="text-left px-6 py-3 text-sm font-medium text-navy-600">Total Hours</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-navy-100">
                      {(summary.records || []).map((record) => {
                        const status = record.clock_in ? "present" : "absent";
                        return (
                          <tr key={record.id} className="hover:bg-navy-50">
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-medium text-navy-900">{record.employee_name}</p>
                                <p className="text-sm text-navy-500">{record.employee_role}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2 py-1 rounded-lg text-xs font-medium ${
                                  status === "present"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-navy-600">{formatTime(record.clock_in)}</td>
                            <td className="px-6 py-4 text-navy-600">{formatTime(record.clock_out)}</td>
                            <td className="px-6 py-4 text-navy-600">{formatMinutes(record.total_minutes)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </>
      )}
    </motion.div>
  );
}
