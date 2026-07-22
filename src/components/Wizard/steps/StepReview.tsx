"use client";

import React from "react";
import {
  CheckCircle2, FileText, Database, Table, Grid3X3, Download, Clock, Send,
  Tag, Globe, RotateCcw, Bell, Layers
} from "lucide-react";
import { WizardFormState } from "@/types/workflow";
import { cronToHuman } from "@/lib/cron-utils";

interface StepReviewProps {
  state: WizardFormState;
  onChange: (updates: Partial<WizardFormState>) => void;
}

export default function StepReview({ state }: StepReviewProps) {
  const sections = [
    {
      icon: FileText,
      title: "Basics",
      items: [
        { label: "Name", value: state.name || "—" },
        { label: "Description", value: state.description || "—" },
        { label: "Owner", value: state.owner || "—" },
        { label: "Priority", value: state.priority },
        { label: "Environment", value: state.environment },
        { label: "Tags", value: state.tags.length > 0 ? state.tags.join(", ") : "None" },
      ],
    },
    {
      icon: Database,
      title: "Source",
      items: [
        { label: "Spreadsheet ID", value: state.source.spreadsheet_id || "—" },
        { label: "Auth Method", value: state.source.auth_method.replace("_", " ") },
        { label: "Worksheets", value: state.source.selected_worksheets.length > 0 ? state.source.selected_worksheets.map((s) => s.title).join(", ") : "None selected" },
      ],
    },
    {
      icon: Grid3X3,
      title: "Ranges",
      items: state.ranges.length > 0
        ? state.ranges.map((r, i) => ({ label: `Range ${i + 1}`, value: `${r.value} (${r.type})` }))
        : [{ label: "Ranges", value: "None defined" }],
    },
    {
      icon: Download,
      title: "Export",
      items: [
        { label: "Format", value: state.export_config.format.toUpperCase() },
        { label: "Quality", value: state.export_config.quality ? `${state.export_config.quality}%` : "—" },
        { label: "DPI", value: state.export_config.dpi?.toString() || "—" },
        { label: "Orientation", value: state.export_config.orientation || "—" },
        { label: "Page Size", value: state.export_config.page_size || "—" },
        { label: "Compression", value: state.export_config.compression || "none" },
        { label: "Filename", value: state.export_config.filename_pattern || "default" },
      ],
    },
    {
      icon: Clock,
      title: "Schedule",
      items: [
        { label: "Type", value: state.schedule.type },
        ...(state.schedule.cron_expression
          ? [
              { label: "Cron", value: state.schedule.cron_expression },
              { label: "Human", value: cronToHuman(state.schedule.cron_expression) },
            ]
          : []),
        { label: "Timezone", value: state.schedule.timezone },
        { label: "Weekdays only", value: state.schedule.run_on_weekdays_only ? "Yes" : "No" },
      ],
    },
    {
      icon: RotateCcw,
      title: "Retry",
      items: [
        { label: "Max Retries", value: state.retry.max_retries.toString() },
        { label: "Delay", value: `${state.retry.retry_delay_seconds}s` },
        { label: "Strategy", value: state.retry.retry_strategy },
        { label: "Timeout", value: `${state.retry.timeout_seconds}s` },
      ],
    },
    {
      icon: Send,
      title: "Destinations",
      items: state.destinations.length > 0
        ? state.destinations.map((d) => ({
            label: d.name,
            value: `${d.type.replace("_", " ")} — ${d.enabled ? "✓ Enabled" : "✗ Disabled"}`,
          }))
        : [{ label: "Destinations", value: "None configured" }],
    },
    {
      icon: Bell,
      title: "Notifications",
      items: [
        { label: "Enabled", value: state.notifications.enabled ? "Yes" : "No" },
        { label: "Events", value: state.notifications.events.length > 0 ? state.notifications.events.map((e) => e.replace("on_", "")).join(", ") : "None" },
      ],
    },
  ];

  const issues: string[] = [];
  if (!state.name) issues.push("Workflow name is required");
  if (!state.source.spreadsheet_id) issues.push("Spreadsheet ID is required");
  if (state.ranges.length === 0) issues.push("At least one range should be defined");
  if (state.destinations.length === 0) issues.push("At least one destination should be configured");

  return (
    <div className="space-y-4">
      {/* Validation */}
      {issues.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1.5">⚠ Configuration Warnings</p>
          <ul className="space-y-1">
            {issues.map((issue, i) => (
              <li key={i} className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-amber-500" />
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Success indicator */}
      {issues.length === 0 && (
        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">All configuration looks good. Ready to save!</p>
        </div>
      )}

      {/* Configuration Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="p-3 rounded-xl bg-app border border-theme">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-theme">
                <Icon className="w-3.5 h-3.5 text-[#f06a55]" />
                <h4 className="text-[11px] font-bold text-primary-theme uppercase tracking-wider">{section.title}</h4>
              </div>
              <div className="space-y-1">
                {section.items.map((item, i) => (
                  <div key={i} className="flex justify-between gap-2">
                    <span className="text-[10px] text-muted-theme font-semibold shrink-0">{item.label}</span>
                    <span className="text-[10px] text-primary-theme font-mono truncate text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
