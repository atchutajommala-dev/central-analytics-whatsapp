"use client";

import React from "react";
import { Database, FileSpreadsheet, Grid3X3, Download, Send, Bell, CheckCircle2, ArrowRight } from "lucide-react";
import { WorkflowJob } from "@/types/dashboard";

interface DagGraphProps {
  job: WorkflowJob;
}

export default function DagGraph({ job }: DagGraphProps) {
  const nodes = [
    {
      id: "source",
      label: "Source",
      sublabel: job.source?.spreadsheet_id ? `...${job.source.spreadsheet_id.slice(-8)}` : "Not configured",
      icon: Database,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10 border-blue-500/20",
    },
    {
      id: "sheets",
      label: "Sheets",
      sublabel: `${job.source?.selected_worksheets?.length || 0} selected`,
      icon: FileSpreadsheet,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
    },
    {
      id: "ranges",
      label: "Ranges",
      sublabel: `${job.ranges?.length || 0} ranges`,
      icon: Grid3X3,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10 border-purple-500/20",
    },
    {
      id: "export",
      label: "Export",
      sublabel: job.export_config?.format?.toUpperCase() || "JPEG",
      icon: Download,
      color: "text-[#f06a55]",
      bgColor: "bg-[#f06a55]/10 border-[#f06a55]/20",
    },
    ...(job.destinations || []).map((dest, i) => ({
      id: `dest_${i}`,
      label: dest.name || dest.type,
      sublabel: dest.type.replace("_", " "),
      icon: Send,
      color: dest.enabled ? "text-sky-500" : "text-slate-400",
      bgColor: dest.enabled ? "bg-sky-500/10 border-sky-500/20" : "bg-slate-500/10 border-slate-500/20",
    })),
    ...(job.notifications?.enabled ? [{
      id: "notify",
      label: "Notifications",
      sublabel: `${job.notifications.events?.length || 0} events`,
      icon: Bell,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10 border-amber-500/20",
    }] : []),
  ];

  return (
    <div className="pw-card p-6">
      <h3 className="text-xs font-bold text-primary-theme uppercase tracking-wider mb-4 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-[#f06a55]" />
        Workflow Pipeline
      </h3>

      {/* Pipeline Visualization */}
      <div className="flex flex-wrap items-center gap-2">
        {nodes.map((node, i) => {
          const Icon = node.icon;
          return (
            <React.Fragment key={node.id}>
              <div className={`flex items-center gap-2.5 p-3 rounded-xl border ${node.bgColor} transition hover:scale-[1.02] min-w-[140px]`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-white/50 dark:bg-white/10`}>
                  <Icon className={`w-4 h-4 ${node.color}`} />
                </div>
                <div>
                  <p className="text-xs font-bold text-primary-theme">{node.label}</p>
                  <p className="text-[10px] text-muted-theme font-mono">{node.sublabel}</p>
                </div>
              </div>
              {i < nodes.length - 1 && (
                <ArrowRight className="w-4 h-4 text-muted-theme shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Stats Row */}
      <div className="mt-4 pt-3 border-t border-theme grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
        {[
          { label: "Source", value: job.source?.spreadsheet_id ? "Connected" : "—" },
          { label: "Sheets", value: (job.source?.selected_worksheets?.length || 0).toString() },
          { label: "Ranges", value: (job.ranges?.length || 0).toString() },
          { label: "Format", value: job.export_config?.format?.toUpperCase() || "—" },
          { label: "Destinations", value: (job.destinations?.length || 0).toString() },
        ].map((stat) => (
          <div key={stat.label}>
            <p className="text-[10px] text-muted-theme font-bold uppercase">{stat.label}</p>
            <p className="text-sm font-bold text-primary-theme">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
