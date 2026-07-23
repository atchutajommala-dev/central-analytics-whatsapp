"use client";

import React, { useState, useEffect } from "react";
import {
  ArrowLeft, Play, Pause, Edit3, Copy, Trash2, Clock, CheckCircle2,
  XCircle, RotateCcw, Globe, Tag, User, Layers, Calendar, Timer,
  Activity, Terminal, ChevronRight, RefreshCw
} from "lucide-react";
import { WorkflowJob, ExecutionRecord, DashboardTab } from "@/types/dashboard";
import { cronToHuman, getNextRun, formatRelativeTime } from "@/lib/cron-utils";
import DagGraph from "@/components/DAG/DagGraph";
import ExecutionHistory from "@/components/DAG/ExecutionHistory";

interface DagDetailViewProps {
  jobId: string;
  onBack: () => void;
  onEdit: (job: WorkflowJob) => void;
  onRun: (job: WorkflowJob) => void;
  onDelete: (jobId: string) => void;
  setActiveTab: (tab: DashboardTab) => void;
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  disabled: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  draft: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  archived: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

export default function DagDetailView({
  jobId,
  onBack,
  onEdit,
  onRun,
  onDelete,
  setActiveTab,
}: DagDetailViewProps) {
  const [job, setJob] = useState<WorkflowJob | null>(null);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<"graph" | "history" | "config">("graph");

  useEffect(() => {
    fetchJobDetail();
  }, [jobId]);

  const fetchJobDetail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`);
      if (res.ok) {
        const data = await res.json();
        setJob(data.job);
        setExecutions(data.executions || data.recent_executions || []);
      }
    } catch (err) {
      console.error("Failed to fetch job:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#f06a55]/30 border-t-[#f06a55] rounded-full animate-spin" />
          <p className="text-xs font-bold text-muted-theme">Loading workflow...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <XCircle className="w-8 h-8 mx-auto text-rose-500 mb-2" />
        <p className="text-sm font-bold text-primary-theme">Workflow not found</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 rounded-xl btn-secondary-theme text-xs font-bold">← Back</button>
      </div>
    );
  }

  const nextRun = job.schedule?.cron_expression ? getNextRun(job.schedule.cron_expression) : null;
  const statusStyle = STATUS_STYLES[job.status] || STATUS_STYLES.active;

  const metaCards = [
    { label: "Status", value: job.status.toUpperCase(), icon: Activity, accent: statusStyle },
    { label: "Last Run", value: job.last_run_at ? new Date(job.last_run_at).toLocaleString() : "Never", icon: Clock },
    { label: "Next Run", value: nextRun ? formatRelativeTime(nextRun) : "—", icon: Calendar },
    { label: "Total Runs", value: job.total_runs.toString(), icon: Layers },
    { label: "Success Rate", value: job.total_runs > 0 ? `${Math.round((job.success_count / job.total_runs) * 100)}%` : "—", icon: CheckCircle2 },
    { label: "Avg Duration", value: job.avg_duration_ms ? `${(job.avg_duration_ms / 1000).toFixed(1)}s` : "—", icon: Timer },
    { label: "Version", value: `v${job.version}`, icon: Tag },
    { label: "Owner", value: job.owner, icon: User },
  ];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-theme">
        <div>
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-[#f06a55] font-bold hover:underline mb-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Workflows
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-primary-theme">{job.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase border ${statusStyle}`}>
              {job.status}
            </span>
          </div>
          {job.description && <p className="text-xs text-muted-theme mt-1">{job.description}</p>}
          {job.tags.length > 0 && (
            <div className="flex gap-1 mt-2">
              {job.tags.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-[#f06a55]/10 text-[#f06a55] border border-[#f06a55]/20">{t}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchJobDetail} className="px-3 py-1.5 rounded-xl btn-secondary-theme text-xs font-bold flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-[#f06a55]" /> Refresh
          </button>
          <button onClick={() => onEdit(job)} className="px-3 py-1.5 rounded-xl btn-secondary-theme text-xs font-bold flex items-center gap-1.5">
            <Edit3 className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={() => onRun(job)} className="btn-coral px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#f06a55]/20">
            <Play className="w-3.5 h-3.5 fill-current" /> Run Now
          </button>
        </div>
      </div>

      {/* Meta Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {metaCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="pw-card p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3.5 h-3.5 text-[#f06a55]" />
                <span className="text-[10px] font-bold text-muted-theme uppercase tracking-wider">{card.label}</span>
              </div>
              <p className="text-sm font-bold text-primary-theme truncate">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Schedule Info */}
      <div className="pw-card p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#f06a55]" />
          <span className="text-xs font-bold text-primary-theme">Schedule:</span>
        </div>
        <code className="text-xs font-mono text-secondary-theme bg-input-theme px-2 py-1 rounded-lg">{job.schedule?.cron_expression || job.schedule?.type}</code>
        <span className="text-xs text-muted-theme">{job.schedule?.cron_expression ? cronToHuman(job.schedule.cron_expression) : ""}</span>
        <div className="flex items-center gap-1 ml-auto">
          <Globe className="w-3 h-3 text-muted-theme" />
          <span className="text-[10px] text-muted-theme">{job.schedule?.timezone}</span>
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-input-theme border border-theme">
        {(["graph", "history", "config"] as const).map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`flex-1 px-4 py-2 rounded-lg text-xs font-bold capitalize transition ${
              activeSection === section ? "bg-[#f06a55] text-white shadow-sm" : "text-muted-theme hover:text-primary-theme"
            }`}
          >
            {section === "graph" ? "DAG Graph" : section === "history" ? "Execution History" : "Configuration"}
          </button>
        ))}
      </div>

      {/* Section Content */}
      {activeSection === "graph" && <DagGraph job={job} />}
      {activeSection === "history" && <ExecutionHistory jobId={jobId} executions={executions} />}
      {activeSection === "config" && (
        <div className="pw-card p-4">
          <pre className="text-xs font-mono text-secondary-theme overflow-x-auto max-h-[500px] overflow-y-auto whitespace-pre-wrap">
            {JSON.stringify(job, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
