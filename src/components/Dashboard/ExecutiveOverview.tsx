"use client";

import React from "react";
import {
  Send,
  CheckCircle2,
  Clock,
  TrendingUp,
  Plus,
  Play,
  RefreshCw,
  Workflow,
  ChevronRight,
  Layers,
  AlertTriangle,
  Zap,
  Activity
} from "lucide-react";
import { WorkflowJob, LogEntry, SystemStatus, DashboardTab } from "@/types/dashboard";

interface ExecutiveOverviewProps {
  jobs: WorkflowJob[];
  logs: LogEntry[];
  systemStatus: SystemStatus | null;
  onOpenNewJobModal: () => void;
  onRefreshData: () => void;
  setActiveTab: (tab: DashboardTab) => void;
  onSelectJob?: (jobId: string) => void;
}

export default function ExecutiveOverview({
  jobs,
  logs,
  systemStatus,
  onOpenNewJobModal,
  onRefreshData,
  setActiveTab,
  onSelectJob,
}: ExecutiveOverviewProps) {
  // Calculate operational stats dynamically from jobs & execution logs
  const totalJobsCount = jobs.length;
  const activeJobsCount = jobs.filter((j) => j.status === "active" && j.enabled !== false).length;

  const jobTotalRuns = jobs.reduce((sum, j) => sum + (j.total_runs || 0), 0);
  const jobSuccessRuns = jobs.reduce((sum, j) => sum + (j.success_count || j.total_runs || 0), 0);

  const totalRuns = logs.length > 0 ? logs.length : Math.max(jobTotalRuns, activeJobsCount > 0 ? 1 : 0);
  const successRuns = logs.length > 0 ? logs.filter((l) => l.status === "success").length : Math.max(jobSuccessRuns, totalRuns);
  const totalSentCount = logs.length > 0
    ? logs.reduce((sum, l) => sum + (l.sent_count || 1), 0)
    : Math.max(jobTotalRuns, activeJobsCount);

  const approvalRate = totalRuns > 0 ? ((successRuns / totalRuns) * 100).toFixed(1) : "100.0";

  // Recent execution traces (with fallback to job last runs)
  const recentLogs = logs.length > 0
    ? logs.slice(0, 5)
    : jobs
        .filter((j) => j.last_run_at || (j as any).last_run)
        .map((j) => ({
          _id: String(j._id),
          job_id: String(j._id),
          job_name: j.name,
          timestamp: new Date(j.last_run_at || (j as any).last_run).toLocaleString(),
          status: j.last_status || "success",
          sent_count: 1,
        }))
        .slice(0, 5);

  // Top active workflows
  const activeJobsList = jobs.filter((j) => j.enabled !== false && j.status !== "archived").slice(0, 5);

  const kpiCards = [
    {
      id: "total_requests",
      title: "Total Workflow Runs",
      value: totalRuns.toLocaleString(),
      change: totalRuns > 0 ? `${totalRuns} Runs` : "0 Runs",
      isPositive: true,
      icon: Send,
      accentColor: "bg-[#f06a55]/10 text-[#f06a55] border-[#f06a55]/20",
    },
    {
      id: "completed",
      title: "Successful Dispatches",
      value: successRuns.toLocaleString(),
      change: `${approvalRate}% Success`,
      isPositive: true,
      icon: CheckCircle2,
      accentColor: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    {
      id: "active_dags",
      title: "Active Automation DAGs",
      value: activeJobsCount,
      change: `${totalJobsCount} Total`,
      isPositive: true,
      icon: Workflow,
      accentColor: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    },
    {
      id: "messages_sent",
      title: "Dispatched Reports",
      value: totalSentCount.toLocaleString(),
      change: "Dispatches",
      isPositive: true,
      icon: TrendingUp,
      accentColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Sleek Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-primary-theme">
              Operations Control Center
            </h1>
          </div>
          <p className="text-xs text-muted-theme mt-1">
            Realtime execution metrics, active Google Sheets automation pipelines, and dispatch health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshData}
            className="px-3 py-1.5 rounded-xl btn-secondary-theme text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#f06a55]" />
            <span>Refresh</span>
          </button>

          <button
            onClick={onOpenNewJobModal}
            className="btn-coral px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#f06a55]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workflow</span>
          </button>
        </div>
      </div>

      {/* 4 Minimal KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="pw-card p-5 relative overflow-hidden group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-theme">
                  {card.title}
                </span>
                <div className={`p-2 rounded-xl border ${card.accentColor} transition-transform group-hover:scale-105`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <h3 className="text-2xl font-black text-primary-theme tracking-tight">
                  {card.value}
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-app text-secondary-theme border border-theme">
                  {card.change}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 2-Column Section: Execution Traces & Active Workflows */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Audit Executions */}
        <div className="pw-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-theme">
            <h3 className="text-sm font-bold text-primary-theme flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#f06a55]" />
              Recent Execution Traces
            </h3>
            <button
              onClick={() => setActiveTab("log-viewer")}
              className="text-xs text-[#f06a55] font-bold hover:underline flex items-center gap-1"
            >
              <span>Inspect All Logs</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div
                  key={log._id}
                  className="p-3 rounded-xl bg-app border border-theme flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        log.status === "success"
                          ? "bg-emerald-500"
                          : log.status === "failed"
                          ? "bg-rose-500"
                          : "bg-amber-500 animate-pulse"
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="font-bold text-primary-theme truncate">{log.job_name}</p>
                      <p className="text-[10px] text-muted-theme font-mono">{log.timestamp || "Recent"}</p>
                    </div>
                  </div>

                  <span className="font-bold text-secondary-theme text-[11px] shrink-0">
                    {log.sent_count ? `${log.sent_count} Dispatches` : log.status.toUpperCase()}
                  </span>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-theme text-xs">
                No recent execution traces recorded.
              </div>
            )}
          </div>
        </div>

        {/* Active Workflows Quick Launcher */}
        <div className="pw-card p-5 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-theme">
            <h3 className="text-sm font-bold text-primary-theme flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#f06a55]" />
              Active Workflow Orchestrations
            </h3>
            <button
              onClick={() => setActiveTab("workflows")}
              className="text-xs text-[#f06a55] font-bold hover:underline flex items-center gap-1"
            >
              <span>Manage All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
            {activeJobsList.length > 0 ? (
              activeJobsList.map((job) => (
                <div
                  key={job._id}
                  className="p-3 rounded-xl bg-app border border-theme flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 cursor-pointer" onClick={() => onSelectJob && onSelectJob(job._id)}>
                    <p className="font-bold text-primary-theme truncate hover:text-[#f06a55] transition">{job.name}</p>
                    <p className="text-[10px] text-muted-theme font-mono">
                      {job.destinations?.length || 0} Destinations | {job.schedule?.cron_expression || job.schedule?.type || "Manual"}
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab("workflows")}
                    className="px-2.5 py-1 rounded-lg bg-[#f06a55]/10 text-[#f06a55] hover:bg-[#f06a55] hover:text-white font-bold text-[11px] transition flex items-center gap-1 shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run</span>
                  </button>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-theme text-xs">
                No active workflows configured.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
