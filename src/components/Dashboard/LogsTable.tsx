"use client";

import React, { useState } from "react";
import {
  Search,
  ScrollText,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  Filter
} from "lucide-react";
import { LogEntry } from "@/types/dashboard";

interface LogsTableProps {
  logs: LogEntry[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onRefreshLogs: () => void;
  onSelectLogDetail: (log: LogEntry) => void;
}

export default function LogsTable({
  logs,
  searchQuery,
  setSearchQuery,
  onRefreshLogs,
  onSelectLogDetail,
}: LogsTableProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failed" | "running">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const itemsPerPage = 10;

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.job_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log._id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.error && log.error.toLowerCase().includes(searchQuery.toLowerCase()));

    if (statusFilter === "success") return matchesSearch && log.status === "success";
    if (statusFilter === "failed") return matchesSearch && log.status === "failed";
    if (statusFilter === "running") return matchesSearch && (log.status === "running" || log.status === "pending");
    return matchesSearch;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage) || 1;
  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const copyLogSummary = (log: LogEntry) => {
    const text = `Log ID: ${log._id}\nJob: ${log.job_name}\nStatus: ${log.status}\nTimestamp: ${log.timestamp}\nSent Count: ${log.sent_count || 0}\nError: ${log.error || "None"}`;
    navigator.clipboard.writeText(text);
    setCopiedLogId(log._id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary-theme flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-[#f06a55]" />
            Realtime Audit Logs & Execution Traces
          </h2>
          <p className="text-xs text-muted-theme mt-0.5">
            Realtime execution history and PDF audit report links.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-theme" />
            <input
              type="text"
              placeholder="Search audit logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-input-theme text-primary-theme placeholder-subtle-theme rounded-xl border border-theme focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50"
            />
          </div>

          <div className="flex items-center gap-1 bg-input-theme p-1 rounded-xl border border-theme text-xs">
            <Filter className="w-3.5 h-3.5 text-muted-theme ml-1" />
            {(["all", "success", "failed", "running"] as const).map((filter) => (
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
            onClick={onRefreshLogs}
            className="btn-coral px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#f06a55]/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Logs</span>
          </button>
        </div>
      </div>

      {/* Main Logs Table Container */}
      <div className="pw-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-theme uppercase tracking-wider text-[11px] font-extrabold">
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Log ID / Timestamp</th>
                <th className="py-3.5 px-4">Workflow DAG</th>
                <th className="py-3.5 px-4">Dispatched Count</th>
                <th className="py-3.5 px-4">Execution Latency</th>
                <th className="py-3.5 px-4">Cloudinary PDF Audit Link</th>
                <th className="py-3.5 px-4 text-right">Trace Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => (
                  <tr key={log._id} className="transition-colors duration-150">
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase border ${
                          log.status === "success"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : log.status === "failed"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {log.status === "success" && <CheckCircle2 className="w-3 h-3" />}
                        {log.status === "failed" && <XCircle className="w-3 h-3" />}
                        {(log.status === "running" || log.status === "pending") && (
                          <Clock className="w-3 h-3 animate-spin" />
                        )}
                        {log.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <p className="font-mono text-primary-theme font-bold">{log._id}</p>
                        <p className="text-[10px] text-muted-theme">{log.timestamp || "IST Timestamp"}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-primary-theme">
                      {log.job_name}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-secondary-theme">
                      {log.sent_count ? `${log.sent_count} Messages` : "0"}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-muted-theme">
                      {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(2)}s` : "0.5s"}
                    </td>

                    <td className="py-3.5 px-4">
                      {log.uploaded_urls && log.uploaded_urls.length > 0 ? (
                        <a
                          href={log.uploaded_urls[0]}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[11px] transition"
                        >
                          <span>View PDF Audit</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        <span className="text-subtle-theme font-mono text-[11px]">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => copyLogSummary(log)}
                          className="p-1.5 rounded-lg btn-secondary-theme text-muted-theme hover:text-primary-theme transition"
                          title="Copy Log Summary"
                        >
                          {copiedLogId === log._id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => onSelectLogDetail(log)}
                          className="px-2.5 py-1 rounded-lg bg-input-theme hover:bg-card-theme text-secondary-theme font-bold text-[11px] flex items-center gap-1 border border-theme transition"
                        >
                          <Terminal className="w-3 h-3 text-[#f06a55]" />
                          <span>Inspect Trace</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-theme">
                    <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-50 text-subtle-theme" />
                    <p className="font-bold text-sm text-primary-theme">No Audit Logs Found</p>
                    <p className="text-xs text-muted-theme mt-1">
                      No matching log traces found for your current search filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-theme flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-theme">
          <div>
            Showing <span className="font-bold text-primary-theme">{filteredLogs.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to{" "}
            <span className="font-bold text-primary-theme">{Math.min(currentPage * itemsPerPage, filteredLogs.length)}</span> of{" "}
            <span className="font-bold text-primary-theme">{filteredLogs.length}</span> Logs
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
