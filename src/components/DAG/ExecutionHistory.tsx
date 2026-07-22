"use client";

import React, { useState } from "react";
import { Clock, CheckCircle2, XCircle, RotateCcw, Play, User, Terminal, Timer } from "lucide-react";
import { ExecutionRecord } from "@/types/dashboard";

interface ExecutionHistoryProps {
  jobId: string;
  executions: ExecutionRecord[];
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  success: CheckCircle2,
  failed: XCircle,
  running: Play,
  retrying: RotateCcw,
  queued: Clock,
  cancelled: XCircle,
  timeout: Timer,
};

const STATUS_STYLES: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  failed: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  running: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  retrying: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  queued: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  cancelled: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  timeout: "bg-rose-500/10 text-rose-500 border-rose-500/20",
};

export default function ExecutionHistory({ jobId, executions }: ExecutionHistoryProps) {
  const [limit, setLimit] = useState(10);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);

  const visible = executions.slice(0, limit);

  return (
    <div className="pw-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-theme flex items-center justify-between">
        <h3 className="text-xs font-bold text-primary-theme uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#f06a55]" />
          Execution History ({executions.length} runs)
        </h3>
        <div className="flex gap-1.5">
          {[10, 25, 50, 100].map((n) => (
            <button
              key={n}
              onClick={() => setLimit(n)}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                limit === n ? "bg-[#f06a55] text-white" : "bg-input-theme text-muted-theme hover:text-primary-theme"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-theme uppercase tracking-wider text-[10px] font-extrabold">
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Run #</th>
              <th className="py-3 px-4">Start Time</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Trigger</th>
              <th className="py-3 px-4">Retries</th>
              <th className="py-3 px-4">Artifacts</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-theme">
            {visible.length > 0 ? (
              visible.map((exec) => {
                const StatusIcon = STATUS_ICONS[exec.status] || Clock;
                const style = STATUS_STYLES[exec.status] || STATUS_STYLES.queued;
                const isExpanded = expandedRun === exec._id;

                return (
                  <React.Fragment key={exec._id}>
                    <tr className="transition-colors duration-150">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${style}`}>
                          <StatusIcon className={`w-3 h-3 ${exec.status === "running" ? "animate-spin" : ""}`} />
                          {exec.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-primary-theme">
                        #{exec.run_number || "—"}
                      </td>
                      <td className="py-3 px-4 text-muted-theme">
                        {exec.start_time ? new Date(exec.start_time).toLocaleString() : "—"}
                      </td>
                      <td className="py-3 px-4 font-mono text-secondary-theme">
                        {exec.duration_ms ? `${(exec.duration_ms / 1000).toFixed(2)}s` : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-muted-theme">
                          {exec.trigger_type === "manual" ? <User className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {exec.trigger_type || "—"}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-muted-theme">
                        {exec.retry_count || 0}
                      </td>
                      <td className="py-3 px-4 text-muted-theme">
                        {exec.artifacts?.length || 0} files
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setExpandedRun(isExpanded ? null : exec._id)}
                          className="px-2 py-1 rounded-lg bg-input-theme hover:bg-card-hover text-secondary-theme font-bold text-[10px] flex items-center gap-1 border border-theme transition ml-auto"
                        >
                          <Terminal className="w-3 h-3 text-[#f06a55]" />
                          {isExpanded ? "Hide" : "Logs"}
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Logs */}
                    {isExpanded && (
                      <tr className="bg-app/60 border-b border-theme">
                        <td colSpan={8} className="p-4 space-y-3">
                          {/* Artifacts if present */}
                          {exec.artifacts && exec.artifacts.length > 0 && (
                            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
                              <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                                Export Artifacts ({exec.artifacts.length} files)
                              </span>
                              <div className="flex gap-2">
                                {exec.artifacts.map((art, idx) => (
                                  <a
                                    key={idx}
                                    href={art.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="px-2.5 py-1 rounded bg-[#f06a55] text-white text-[10px] font-bold hover:bg-[#d95642] transition"
                                  >
                                    View Image {idx + 1} ↗
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="rounded-xl bg-[#0d1117] p-4 overflow-x-auto max-h-60 overflow-y-auto font-mono text-[11px]">
                            {exec.logs && exec.logs.length > 0 ? (
                              <pre className="text-[11px] text-slate-300 whitespace-pre-wrap">
                                {exec.logs.map((line, i) => {
                                  const isErr = line.includes("ERROR") || line.includes("Error");
                                  const isWarn = line.includes("WARNING") || line.includes("Warning");
                                  const isSucc = line.includes("Sent to") || line.includes("completed") || line.includes("SUCCESS") || line.includes("Uploaded");
                                  return (
                                    <div key={i} className={`py-0.5 ${
                                      isErr ? "text-rose-400" :
                                      isWarn ? "text-amber-400" :
                                      isSucc ? "text-emerald-400 font-bold" :
                                      "text-slate-300"
                                    }`}>
                                      <span className="text-slate-600 select-none mr-2">{String(i + 1).padStart(3, " ")}</span>
                                      {line}
                                    </div>
                                  );
                                })}
                              </pre>
                            ) : (
                              <p className="text-xs text-slate-500">No logs available for this execution.</p>
                            )}
                            {exec.error && (
                              <div className="mt-3 p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[11px]">
                                <strong>Error:</strong> {exec.error}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted-theme">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50 text-subtle-theme" />
                  <p className="font-bold text-sm text-primary-theme">No Executions Found</p>
                  <p className="text-xs text-muted-theme mt-1">This workflow hasn&apos;t been run yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
