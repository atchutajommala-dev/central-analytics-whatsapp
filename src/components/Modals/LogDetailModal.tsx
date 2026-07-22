"use client";

import React from "react";
import { X, ExternalLink, Terminal, Clock, CheckCircle2, XCircle } from "lucide-react";
import { LogEntry } from "@/types/dashboard";
import LogViewer from "@/components/Logs/LogViewer";

interface LogDetailModalProps {
  log: LogEntry | null;
  onClose: () => void;
}

export default function LogDetailModal({ log, onClose }: LogDetailModalProps) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl modal-content rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col border border-theme max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-theme">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f06a55] text-white flex items-center justify-center shadow-sm">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary-theme">Execution Log Trace</h3>
              <p className="text-[11px] font-mono text-muted-theme">ID: {log._id}</p>
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
        <div className="p-5 space-y-4 text-xs overflow-y-auto">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-app border border-theme">
              <span className="text-[10px] font-bold text-muted-theme uppercase block">Workflow Name</span>
              <span className="text-xs font-bold text-primary-theme truncate block">{log.job_name}</span>
            </div>

            <div className="p-3 rounded-xl bg-app border border-theme">
              <span className="text-[10px] font-bold text-muted-theme uppercase block">Status</span>
              <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase ${
                log.status === "success" ? "text-emerald-500" : log.status === "failed" ? "text-rose-500" : "text-amber-500"
              }`}>
                {log.status === "success" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                {log.status}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-app border border-theme">
              <span className="text-[10px] font-bold text-muted-theme uppercase block">Duration</span>
              <span className="text-xs font-mono font-bold text-primary-theme">
                {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(2)}s` : "—"}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-app border border-theme">
              <span className="text-[10px] font-bold text-muted-theme uppercase block">Dispatched Count</span>
              <span className="text-xs font-bold text-primary-theme">{log.sent_count || 0} Messages</span>
            </div>
          </div>

          {/* Audit Link if available */}
          {log.uploaded_urls && log.uploaded_urls.length > 0 && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Export Artifact Generated ({log.uploaded_urls.length} media URLs)</span>
              </div>
              <a
                href={log.uploaded_urls[0]}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 hover:bg-emerald-600 transition shadow-sm"
              >
                <span>View Export</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Log Viewer Component */}
          <LogViewer
            logs={log.logs || []}
            title={`Logs for ${log.job_name}`}
            error={log.error}
          />
        </div>
      </div>
    </div>
  );
}
