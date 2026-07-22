"use client";

import React, { useState } from "react";
import {
  Search,
  Play,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileSpreadsheet,
  Layers,
  Plus,
  Filter,
  ArrowUpDown,
  ExternalLink,
  Eye,
  Tag,
  CheckCircle2,
  XCircle,
  Pause,
  AlertCircle
} from "lucide-react";
import { WorkflowJob } from "@/types/dashboard";
import { cronToHuman, getNextRun, formatRelativeTime } from "@/lib/cron-utils";

interface JobsTableProps {
  jobs: WorkflowJob[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onRunJob: (job: WorkflowJob) => void;
  onEditJob: (job: WorkflowJob) => void;
  onDeleteJob: (jobId: string) => void;
  onOpenNewJobModal: () => void;
  onViewJobLogs: (jobId: string) => void;
  onSelectJob?: (jobId: string) => void;
}

export default function JobsTable({
  jobs,
  searchQuery,
  setSearchQuery,
  onRunJob,
  onEditJob,
  onDeleteJob,
  onOpenNewJobModal,
  onViewJobLogs,
  onSelectJob,
}: JobsTableProps) {
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "disabled">("all");
  const [sortField, setSortField] = useState<keyof WorkflowJob>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.description && job.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (job.source?.spreadsheet_id && job.source.spreadsheet_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      job.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      job.owner?.toLowerCase().includes(searchQuery.toLowerCase());

    if (statusFilter === "active") return matchesSearch && job.status === "active" && job.enabled;
    if (statusFilter === "paused") return matchesSearch && job.status === "paused";
    if (statusFilter === "disabled") return matchesSearch && (!job.enabled || job.status === "disabled");
    return matchesSearch;
  });

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const valA = (a[sortField] as any) || "";
    const valB = (b[sortField] as any) || "";
    if (valA < valB) return sortOrder === "asc" ? -1 : 1;
    if (valA > valB) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedJobs.length / itemsPerPage) || 1;
  const paginatedJobs = sortedJobs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const toggleSort = (field: keyof WorkflowJob) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary-theme flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#f06a55]" />
            Workflow DAG Orchestration
          </h2>
          <p className="text-xs text-muted-theme mt-0.5">
            Manage, schedule, and execute automated Google Sheet report pipelines.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-theme" />
            <input
              type="text"
              placeholder="Search workflows, tags, owner..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-input-theme text-primary-theme placeholder-subtle-theme rounded-xl border border-theme focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-input-theme p-1 rounded-xl border border-theme text-xs">
            <Filter className="w-3.5 h-3.5 text-muted-theme ml-1" />
            {(["all", "active", "paused", "disabled"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2.5 py-1 rounded-lg font-bold capitalize transition ${
                  statusFilter === filter
                    ? "bg-[#f06a55] text-white shadow-xs"
                    : "text-muted-theme hover:text-primary-theme"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenNewJobModal}
            className="btn-coral px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#f06a55]/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workflow</span>
          </button>
        </div>
      </div>

      {/* Main Jobs Table Container */}
      <div className="pw-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-theme uppercase tracking-wider text-[11px] font-extrabold">
                <th className="py-3.5 px-4 cursor-pointer hover:text-primary-theme" onClick={() => toggleSort("name")}>
                  <div className="flex items-center gap-1.5">
                    <span>Workflow DAG Name</span>
                    <ArrowUpDown className="w-3 h-3 text-subtle-theme" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Source & Ranges</th>
                <th className="py-3.5 px-4">Destinations</th>
                <th className="py-3.5 px-4 cursor-pointer hover:text-primary-theme" onClick={() => toggleSort("schedule")}>
                  <div className="flex items-center gap-1.5">
                    <span>Schedule / Next Run</span>
                    <ArrowUpDown className="w-3 h-3 text-subtle-theme" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Last Run Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {paginatedJobs.length > 0 ? (
                paginatedJobs.map((job) => {
                  const isExpanded = expandedJobId === job._id;
                  const nextRun = job.schedule?.cron_expression ? getNextRun(job.schedule.cron_expression) : null;
                  return (
                    <React.Fragment key={job._id}>
                      <tr className="transition-colors duration-150 hover:bg-card-hover">
                        <td className="py-3.5 px-4 font-bold text-primary-theme">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setExpandedJobId(isExpanded ? null : job._id)}
                              className="p-1 rounded hover:bg-input-theme text-muted-theme transition"
                            >
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                            <div className="flex flex-col">
                              <button
                                onClick={() => onSelectJob && onSelectJob(job._id)}
                                className="text-left font-bold text-primary-theme hover:text-[#f06a55] transition flex items-center gap-1.5"
                              >
                                <span>{job.name}</span>
                                <span className="text-[10px] font-normal text-muted-theme">v{job.version || 1}</span>
                              </button>
                              {job.tags && job.tags.length > 0 && (
                                <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                  {job.tags.slice(0, 3).map((t) => (
                                    <span key={t} className="text-[9px] px-1.5 py-0.2 rounded bg-input-theme text-muted-theme font-semibold">
                                      #{t}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-0.5">
                            {job.source?.spreadsheet_id ? (
                              <a
                                href={`https://docs.google.com/spreadsheets/d/${job.source.spreadsheet_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-muted-theme hover:text-[#f06a55] flex items-center gap-1 truncate max-w-[180px]"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="truncate">{job.source.spreadsheet_id}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-subtle-theme shrink-0" />
                              </a>
                            ) : (
                              <span className="text-subtle-theme text-[11px]">No Spreadsheet ID</span>
                            )}
                            <p className="text-[10px] text-muted-theme font-medium">
                              Ranges: <span className="font-semibold font-mono">{job.ranges?.length ? job.ranges.map(r => r.value).join(", ") : "Entire Sheet"}</span>
                            </p>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-input-theme text-secondary-theme border border-theme">
                            {job.destinations?.length || 0} Destination{job.destinations?.length === 1 ? "" : "s"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-secondary-theme">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1 text-xs font-bold text-primary-theme">
                              <Clock className="w-3.5 h-3.5 text-[#f06a55]" />
                              <span>{job.schedule?.cron_expression || job.schedule?.type || "Manual"}</span>
                            </div>
                            {nextRun && (
                              <span className="text-[10px] text-muted-theme">Next: {formatRelativeTime(nextRun)}</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase border ${
                              job.last_status === "success"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : job.last_status === "failed"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                : job.last_status === "running"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                : "bg-input-theme text-muted-theme border-theme"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              job.last_status === "success" ? "bg-emerald-500" : job.last_status === "failed" ? "bg-rose-500" : "bg-slate-400"
                            }`} />
                            {job.last_status || "Never Run"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {onSelectJob && (
                              <button
                                onClick={() => onSelectJob(job._id)}
                                className="p-1.5 rounded-lg btn-secondary-theme text-muted-theme hover:text-primary-theme transition"
                                title="View DAG Graph & Details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={() => onRunJob(job)}
                              className="px-2.5 py-1 rounded-lg bg-[#f06a55]/10 hover:bg-[#f06a55] text-[#f06a55] hover:text-white font-bold text-[11px] flex items-center gap-1 transition"
                              title="Run Job Now"
                            >
                              <Play className="w-3 h-3 fill-current" />
                              <span>Execute</span>
                            </button>

                            <button
                              onClick={() => onEditJob(job)}
                              className="p-1.5 rounded-lg btn-secondary-theme text-muted-theme hover:text-primary-theme transition"
                              title="Edit Workflow Configuration"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onDeleteJob(job._id)}
                              className="p-1.5 rounded-lg text-subtle-theme hover:text-rose-500 hover:bg-rose-500/10 transition"
                              title="Delete DAG"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Accordion Details */}
                      {isExpanded && (
                        <tr className="bg-app/60 border-b border-theme">
                          <td colSpan={6} className="p-4">
                            <div className="p-4 rounded-xl border border-theme bg-card-theme space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-primary-theme uppercase tracking-wider flex items-center gap-2">
                                  <span>Workflow Details & Output Configuration</span>
                                </h4>
                                <button
                                  onClick={() => onViewJobLogs(job._id)}
                                  className="text-xs text-[#f06a55] font-bold hover:underline"
                                >
                                  View Audit Logs →
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                                <div>
                                  <p className="font-semibold text-muted-theme mb-1">Export Options:</p>
                                  <p className="font-mono text-[11px]">Format: {job.export_config?.format?.toUpperCase() || "JPEG"}</p>
                                  <p className="font-mono text-[11px]">Quality: {job.export_config?.quality || 85}% | DPI: {job.export_config?.dpi || 300}</p>
                                </div>

                                <div>
                                  <p className="font-semibold text-muted-theme mb-1">Destinations Configured:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {job.destinations?.map((d) => (
                                      <span
                                        key={d.id}
                                        className="px-2 py-0.5 rounded bg-input-theme text-secondary-theme font-mono text-[10px]"
                                      >
                                        {d.name} ({d.type})
                                      </span>
                                    )) || <span className="text-muted-theme font-mono text-[10px]">None</span>}
                                  </div>
                                </div>

                                <div>
                                  <p className="font-semibold text-muted-theme mb-1">Owner & Environment:</p>
                                  <p className="font-mono text-[11px]">{job.owner || "Unassigned"} ({job.environment || "production"})</p>
                                  <p className="font-mono text-[11px]">Total Runs: {job.total_runs || 0}</p>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-theme">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-50 text-subtle-theme" />
                    <p className="font-bold text-sm text-primary-theme">No Automation Workflows Found</p>
                    <p className="text-xs text-muted-theme mt-1">Try adjusting your search filter or create a new job.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-theme flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-theme">
          <div>
            Showing <span className="font-bold text-primary-theme">{sortedJobs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{" "}
            <span className="font-bold text-primary-theme">{Math.min(currentPage * itemsPerPage, sortedJobs.length)}</span> of{" "}
            <span className="font-bold text-primary-theme">{sortedJobs.length}</span> Workflows
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded-lg btn-secondary-theme text-xs font-semibold disabled:opacity-40 transition"
            >
              Previous
            </button>
            <span className="px-3 py-1 font-bold text-primary-theme">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded-lg btn-secondary-theme text-xs font-semibold disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
