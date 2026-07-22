"use client";

import React, { useState, useMemo } from "react";
import {
  Search, Download, Copy, Check, Filter, RefreshCw,
  Terminal, X, ChevronDown, ChevronRight
} from "lucide-react";

interface LogViewerProps {
  logs: string[];
  title?: string;
  error?: string;
  onClose?: () => void;
  onRefresh?: () => void;
}

type LogLevel = "all" | "error" | "warning" | "info" | "debug";

export default function LogViewer({ logs, title, error, onClose, onRefresh }: LogViewerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel>("all");
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const classifyLevel = (line: string): LogLevel => {
    const upper = line.toUpperCase();
    if (upper.includes("ERROR") || upper.includes("CRITICAL") || upper.includes("FATAL")) return "error";
    if (upper.includes("WARNING") || upper.includes("WARN")) return "warning";
    if (upper.includes("DEBUG") || upper.includes("TRACE")) return "debug";
    return "info";
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((line) => {
      if (searchQuery && !line.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (levelFilter !== "all" && classifyLevel(line) !== levelFilter) return false;
      return true;
    });
  }, [logs, searchQuery, levelFilter]);

  const levelColors: Record<LogLevel, string> = {
    all: "",
    error: "text-rose-400",
    warning: "text-amber-400",
    info: "text-slate-300",
    debug: "text-slate-500",
  };

  const levelBgColors: Record<string, string> = {
    error: "bg-rose-500/5 border-l-2 border-l-rose-500",
    warning: "bg-amber-500/5 border-l-2 border-l-amber-500",
    info: "",
    debug: "opacity-60",
  };

  const copyAll = () => {
    navigator.clipboard.writeText(filteredLogs.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadLogs = () => {
    const blob = new Blob([filteredLogs.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs_${new Date().toISOString().replace(/[:.]/g, "-")}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = {
    total: logs.length,
    errors: logs.filter((l) => classifyLevel(l) === "error").length,
    warnings: logs.filter((l) => classifyLevel(l) === "warning").length,
  };

  return (
    <div className="pw-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-theme">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#f06a55]" />
            <h3 className="text-xs font-bold text-primary-theme">{title || "Log Viewer"}</h3>
            <span className="text-[10px] font-mono text-muted-theme">{filteredLogs.length}/{logs.length} lines</span>
          </div>
          <div className="flex items-center gap-1.5">
            {stats.errors > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                {stats.errors} errors
              </span>
            )}
            {stats.warnings > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                {stats.warnings} warnings
              </span>
            )}
            {onClose && (
              <button onClick={onClose} className="p-1 rounded-lg text-muted-theme hover:text-primary-theme transition">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-theme" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search logs... (supports regex)"
              className="w-full pl-9 pr-3 py-1.5 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs font-mono"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {/* Level Filter */}
            <div className="flex items-center gap-0.5 bg-input-theme p-0.5 rounded-xl border border-theme">
              {(["all", "error", "warning", "info", "debug"] as LogLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setLevelFilter(level)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize transition ${
                    levelFilter === level ? "bg-[#f06a55] text-white" : "text-muted-theme hover:text-primary-theme"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>

            <button onClick={copyAll} className="p-1.5 rounded-lg btn-secondary-theme text-muted-theme hover:text-primary-theme transition" title="Copy logs">
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={downloadLogs} className="p-1.5 rounded-lg btn-secondary-theme text-muted-theme hover:text-primary-theme transition" title="Download logs">
              <Download className="w-3.5 h-3.5" />
            </button>
            {onRefresh && (
              <button onClick={onRefresh} className="p-1.5 rounded-lg btn-secondary-theme text-muted-theme hover:text-primary-theme transition" title="Refresh">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Log Content */}
      <div className="bg-[#0d1117] max-h-[500px] overflow-y-auto overflow-x-auto">
        {filteredLogs.length > 0 ? (
          <div className="p-4 font-mono text-[11px] leading-relaxed">
            {filteredLogs.map((line, i) => {
              const level = classifyLevel(line);
              return (
                <div
                  key={i}
                  className={`py-0.5 px-1 -mx-1 rounded-sm ${levelBgColors[level]} ${levelColors[level] || "text-slate-300"} hover:bg-white/5 transition-colors`}
                >
                  <span className="text-slate-600 select-none inline-block w-8 text-right mr-3">
                    {i + 1}
                  </span>
                  {line}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Terminal className="w-6 h-6 mx-auto text-slate-600 mb-2" />
            <p className="text-xs text-slate-500">
              {logs.length === 0 ? "No logs available." : "No logs match your filter."}
            </p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 border-t border-rose-500/30 bg-rose-500/5">
          <p className="text-xs font-bold text-rose-500 mb-1">Error</p>
          <pre className="text-[11px] font-mono text-rose-400 whitespace-pre-wrap">{error}</pre>
        </div>
      )}
    </div>
  );
}
