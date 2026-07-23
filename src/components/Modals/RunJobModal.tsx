"use client";

import React, { useState } from "react";
import {
  X,
  Play,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Terminal,
  ExternalLink,
  Send,
  Image as ImageIcon
} from "lucide-react";
import { WorkflowJob } from "@/types/dashboard";

interface RunJobModalProps {
  job: WorkflowJob | null;
  onClose: () => void;
  onExecute: (payload: any) => Promise<void>;
  isExecuting: boolean;
  executionResult: any;
}

export default function RunJobModal({
  job,
  onClose,
  onExecute,
  isExecuting,
  executionResult,
}: RunJobModalProps) {
  const [dryRun, setDryRun] = useState(false);
  const [forceRun, setForceRun] = useState(true);

  if (!job) return null;

  const handleRun = () => {
    const payload = {
      job_id: job._id,
      job_name: job.name,
      sheet_id: job.source?.spreadsheet_id,
      sheet_name: job.source?.selected_worksheets?.[0]?.title || "Sheet1",
      custom_range: job.ranges?.map((r) => r.value).join(","),
      destinations: job.destinations
        ?.filter((d) => d.enabled)
        .flatMap((d) => (d.config?.phone_numbers as string[]) || []),
      aisensy_campaign_name: job.destinations?.find((d) => d.type === "whatsapp")?.config?.campaign_name || "",
      force_run: forceRun,
      dry_run: dryRun,
    };
    onExecute(payload);
  };

  const isSuccess = executionResult && (executionResult.success || executionResult.status === "success");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl modal-content rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col border border-theme">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-theme">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f06a55] text-white flex items-center justify-center shadow-sm">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary-theme">Manual Workflow Execution</h3>
              <p className="text-[11px] text-muted-theme">Trigger pipeline run on demand & inspect live output</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-muted-theme hover:text-primary-theme btn-secondary-theme transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
          {/* Job Overview */}
          <div className="p-3.5 rounded-xl bg-app border border-theme space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-primary-theme text-sm">{job.name}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-input-theme text-secondary-theme">v{job.version || 1}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-theme pt-1">
              <div>
                <span className="font-semibold block">Spreadsheet ID:</span>
                <span className="font-mono text-primary-theme truncate block">{job.source?.spreadsheet_id || "Default"}</span>
              </div>
              <div>
                <span className="font-semibold block">Export Format:</span>
                <span className="font-mono text-primary-theme uppercase">{job.export_config?.format || "JPEG"}</span>
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-1">
            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-theme bg-app cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forceRun}
                onChange={(e) => setForceRun(e.target.checked)}
                className="w-4 h-4 rounded text-[#f06a55] accent-[#f06a55]"
              />
              <div>
                <span className="font-bold text-primary-theme text-xs block">Force Execution Window</span>
                <span className="text-[10px] text-muted-theme">Bypass scheduled time restrictions and execute immediately</span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-2.5 rounded-xl border border-theme bg-app cursor-pointer select-none">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="w-4 h-4 rounded text-[#f06a55] accent-[#f06a55]"
              />
              <div>
                <span className="font-bold text-primary-theme text-xs block">Dry Run Mode</span>
                <span className="text-[10px] text-muted-theme">Generate exported media without dispatching messages to target destinations</span>
              </div>
            </label>
          </div>

          {/* Execution Result Output */}
          {executionResult && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-app border border-theme">
                <div className="flex items-center gap-2">
                  {isSuccess ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-500" />
                  )}
                  <div>
                    <span className="font-bold text-primary-theme text-xs block">
                      Execution {isSuccess ? "Succeeded" : "Failed"}
                    </span>
                    <span className="text-[10px] text-muted-theme">
                      {executionResult.sent_count !== undefined
                        ? `Dispatched to ${executionResult.sent_count} destination(s)`
                        : executionResult.status}
                    </span>
                  </div>
                </div>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                  isSuccess
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                }`}>
                  {executionResult.status || (isSuccess ? "SUCCESS" : "FAILED")}
                </span>
              </div>

              {/* Uploaded Cloudinary Artifacts */}
              {executionResult.uploaded_urls && executionResult.uploaded_urls.length > 0 && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      Generated Media Exports ({executionResult.uploaded_urls.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {executionResult.uploaded_urls.map((url: string, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-card-theme p-2 rounded-lg border border-theme">
                        <span className="font-mono text-[11px] truncate text-secondary-theme flex-1 mr-2">{url}</span>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-[#f06a55] text-white text-[10px] font-bold flex items-center gap-1 hover:bg-[#d95642] transition shrink-0"
                        >
                          <span>View Image</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Log Console Output */}
              <div className="p-3.5 rounded-xl bg-[#0d1117] text-slate-200 font-mono text-[11px] space-y-2 border border-theme">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <span className="font-bold flex items-center gap-1.5 text-xs text-[#f06a55]">
                    <Terminal className="w-3.5 h-3.5" />
                    Live Output Stream ({executionResult.logs?.length || 0} lines)
                  </span>
                </div>

                {executionResult.logs && executionResult.logs.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto space-y-1 text-[11px]">
                    {executionResult.logs.map((logLine: string, idx: number) => {
                      const isErr = logLine.includes("ERROR") || logLine.includes("Error");
                      const isWarn = logLine.includes("WARNING") || logLine.includes("Warning");
                      const isSucc = logLine.includes("Sent to") || logLine.includes("completed") || logLine.includes("SUCCESS") || logLine.includes("Uploaded");
                      return (
                        <div
                          key={idx}
                          className={`py-0.5 px-1 rounded transition-colors ${
                            isErr ? "text-rose-400 bg-rose-500/10" :
                            isWarn ? "text-amber-400 bg-amber-500/10" :
                            isSucc ? "text-emerald-400 font-bold" :
                            "text-slate-300"
                          }`}
                        >
                          <span className="text-slate-600 select-none mr-2">{String(idx + 1).padStart(2, "0")}</span>
                          {logLine}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No output logs received.</p>
                )}

                {executionResult.error && (
                  <div className="mt-2 p-2 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-xs">
                    {executionResult.error}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-theme">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl btn-secondary-theme text-xs font-bold transition"
          >
            Close
          </button>

          <button
            type="button"
            onClick={handleRun}
            disabled={isExecuting}
            className="btn-coral px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-[#f06a55]/20 disabled:opacity-50 transition"
          >
            {isExecuting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Executing Pipeline...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{executionResult ? "Re-run Execution" : "Start Execution"}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
