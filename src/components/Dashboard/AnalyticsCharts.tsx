"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";
import { WorkflowJob, LogEntry } from "@/types/dashboard";
import { useTheme } from "@/context/ThemeContext";

interface AnalyticsChartsProps {
  jobs: WorkflowJob[];
  logs: LogEntry[];
  theme?: "dark" | "light";
}

export default function AnalyticsCharts({ jobs, logs }: AnalyticsChartsProps) {
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("7d");
  const { isDark } = useTheme();

  const gridColor = isDark ? "#2e3541" : "#e2e8f0";
  const textColor = isDark ? "#94a3b8" : "#64748b";
  const tooltipBg = isDark ? "#1e232a" : "#ffffff";
  const tooltipBorder = isDark ? "#384252" : "#cbd5e1";

  // Throughput calculation from logs
  const timeSlots = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "23:59"];
  const throughputData = timeSlots.map((timeSlot) => {
    let successCount = 0;
    let failedCount = 0;

    logs.forEach((log) => {
      if (!log.timestamp) return;
      const date = new Date(log.timestamp);
      const hour = date.getHours();
      const slotHour = parseInt(timeSlot.split(":")[0], 10);
      if (Math.abs(hour - slotHour) <= 2) {
        if (log.status === "success") successCount += log.sent_count || 1;
        else if (log.status === "failed") failedCount += 1;
      }
    });

    return {
      time: timeSlot,
      success: successCount,
      failed: failedCount,
    };
  });

  // Bar Chart calculation from jobs & logs
  const jobVolumeData = jobs.map((job) => {
    const jobLogs = logs.filter((l) => l.job_id === job._id || l.job_name === job.name);
    const dispatches = jobLogs.reduce((acc, l) => acc + (l.sent_count || 0), 0);
    return {
      name: job.name.length > 16 ? job.name.substring(0, 15) + "..." : job.name,
      dispatches: dispatches || job.total_runs || 0,
      destinations: job.destinations?.length || 1,
    };
  });

  // Status Donut Chart calculation
  const totalLogs = logs.length;
  const successCount = logs.filter((l) => l.status === "success").length;
  const runningCount = logs.filter((l) => l.status === "running" || l.status === "pending" || l.status === "retrying").length;
  const failedCount = logs.filter((l) => l.status === "failed" || l.status === "error").length;

  const successPct = totalLogs > 0 ? Math.round((successCount / totalLogs) * 100) : 0;
  const runningPct = totalLogs > 0 ? Math.round((runningCount / totalLogs) * 100) : 0;
  const failedPct = totalLogs > 0 ? Math.round((failedCount / totalLogs) * 100) : 0;

  const statusPieData = totalLogs > 0 ? [
    { name: "Successful", value: successPct, color: "#f06a55" },
    { name: "Queued / Running", value: runningPct, color: "#3b82f6" },
    { name: "Failed / Error", value: failedPct, color: "#ef4444" },
  ] : [
    { name: "No Logs Recorded", value: 100, color: isDark ? "#2e3541" : "#e2e8f0" }
  ];

  const hoursOfDay = ["08:00", "11:00", "14:00", "17:00", "20:00"];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary-theme flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#f06a55]" />
            Workflow Performance & Metrics
          </h2>
          <p className="text-xs text-muted-theme mt-0.5">
            Realtime dispatch volume, status distribution, and execution load heatmap.
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-input-theme border border-theme self-start sm:self-auto">
          {(["24h", "7d", "30d"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                timeRange === range
                  ? "bg-[#f06a55] text-white shadow-sm"
                  : "text-muted-theme hover:text-primary-theme"
              }`}
            >
              {range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Row 1: Throughput Area Chart & Status Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart - 2 Cols */}
        <div className="pw-card p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-primary-theme flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#f06a55]" />
                Execution Throughput (Dispatches / Hour)
              </h3>
              <p className="text-xs text-muted-theme">
                Volume breakdown of success vs failed workflow dispatches.
              </p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={throughputData}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f06a55" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f06a55" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="time" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis stroke={textColor} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: isDark ? "#ffffff" : "#000000",
                    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="success"
                  stroke="#f06a55"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorSuccess)"
                  name="Successful Dispatches"
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  stroke="#ef4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorFailed)"
                  name="Failed Dispatches"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart - 1 Col */}
        <div className="pw-card p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-primary-theme flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#f06a55]" />
              Status Distribution
            </h3>
            <p className="text-xs text-muted-theme">
              Success vs pending queue vs errors.
            </p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: "12px",
                    fontSize: "12px",
                    color: isDark ? "#ffffff" : "#000000",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-primary-theme">{successPct}%</span>
              <span className="text-[10px] text-muted-theme font-bold uppercase tracking-wider">Success</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-1.5 pt-2 border-t border-theme">
            {statusPieData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-secondary-theme truncate">{item.name}</span>
                <span className="text-xs font-bold text-primary-theme ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grid Row 2: Bar Chart & Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar Chart - 2 Cols */}
        <div className="pw-card p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-primary-theme flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#f06a55]" />
                Top Automation Workflows by Volume
              </h3>
              <p className="text-xs text-muted-theme">
                Configured workflows sorted by run volume and output dispatches.
              </p>
            </div>
            <Sparkles className="w-4 h-4 text-[#f06a55]" />
          </div>

          <div className="h-64 w-full pt-2">
            {jobVolumeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jobVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="name" stroke={textColor} fontSize={11} tickLine={false} />
                  <YAxis stroke={textColor} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: tooltipBg,
                      borderColor: tooltipBorder,
                      borderRadius: "12px",
                      fontSize: "12px",
                      color: isDark ? "#ffffff" : "#000000",
                    }}
                  />
                  <Bar dataKey="dispatches" fill="#f06a55" radius={[6, 6, 0, 0]} name="Total Dispatches / Runs" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-theme">
                No workflows configured in database.
              </div>
            )}
          </div>
        </div>

        {/* Heatmap Widget - 1 Col */}
        <div className="pw-card p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-primary-theme flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#f06a55]" />
              Execution Heatmap
            </h3>
            <p className="text-xs text-muted-theme">
              Peak traffic load distribution.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-6 text-[10px] font-bold text-muted-theme text-center">
              <span>Time</span>
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {hoursOfDay.map((hour) => (
              <div key={hour} className="grid grid-cols-6 gap-1.5 items-center text-center">
                <span className="text-[10px] font-mono text-muted-theme">{hour}</span>
                {[0, 0, 0, 0, 0].map((_, dIdx) => (
                  <div
                    key={dIdx}
                    className="h-7 rounded-lg text-[10px] flex items-center justify-center bg-app text-muted-theme"
                  >
                    0
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-[11px] text-muted-theme pt-2 border-t border-theme">
            <span>Low Intensity</span>
            <div className="flex gap-1">
              <span className="w-3 h-3 rounded bg-app" />
              <span className="w-3 h-3 rounded bg-[#f06a55]/30" />
              <span className="w-3 h-3 rounded bg-[#f06a55]" />
            </div>
            <span>High Load</span>
          </div>
        </div>
      </div>
    </div>
  );
}
