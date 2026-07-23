"use client";

import React, { useState } from "react";
import {
  Search,
  Bell,
  Database,
  CheckCircle2,
  ChevronRight,
  Clock,
  Sparkles,
  Command,
  RefreshCw
} from "lucide-react";
import { DashboardTab, SystemStatus } from "@/types/dashboard";
import { useRefresh } from "@/context/RefreshContext";

interface NavbarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  systemStatus: SystemStatus | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  unreadLogsCount: number;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  systemStatus,
  searchQuery,
  setSearchQuery,
  unreadLogsCount,
}: NavbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const { isRefreshing, autoRefreshInterval, triggerSilentRefresh } = useRefresh();

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case "overview":
        return "Operations Overview";
      case "workflows":
      case "dags" as any:
        return "Workflow DAG Orchestration";
      case "create-workflow":
        return "Workflow Builder Wizard";
      case "dag-detail":
        return "DAG Detail View";
      case "executions":
        return "Execution Trajectory";
      case "log-viewer":
      case "logs" as any:
        return "Realtime Log Viewer";
      case "monitoring":
      case "analytics" as any:
        return "System Monitoring";
      case "users":
        return "User Management & RBAC";
      case "settings":
        return "System Settings";
      default:
        return "Dashboard";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-theme bg-header-theme backdrop-blur-md transition-colors duration-250">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Left: Brand Breadcrumb */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-xs sm:text-sm text-muted-theme">
            <span className="font-bold text-primary-theme flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#f06a55] animate-pulse"></span>
              PW Scheduler Platform
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-subtle-theme" />
            <span className="font-semibold text-[#f06a55]">
              {getBreadcrumbTitle()}
            </span>
          </div>

          {/* Quick System Readiness Badge */}
          {systemStatus && (
            <div className="hidden lg:flex items-center space-x-2 pl-4 border-l border-theme">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-card-theme text-secondary-theme border border-theme">
                <Clock className="w-3 h-3 text-[#f06a55]" />
                {systemStatus.ist_time || "IST Ready"}
              </span>
            </div>
          )}
        </div>

        {/* Center: Search input */}
        <div className="hidden md:flex items-center flex-1 max-w-md mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-theme" />
            <input
              type="text"
              placeholder="Search workflows, ranges, destinations, logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-12 py-1.5 text-xs sm:text-sm bg-input-theme text-primary-theme placeholder-subtle-theme rounded-xl border border-theme focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 focus:border-[#f06a55] transition-all duration-250"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-theme bg-surface rounded border border-theme">
              <Command className="w-3 h-3" />K
            </kbd>
          </div>
        </div>

        {/* Right: Silent Refresh & Notifications Bell */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Silent Refresh Button */}
          <button
            onClick={triggerSilentRefresh}
            disabled={isRefreshing}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold btn-secondary-theme flex items-center gap-1.5 transition select-none"
            title="Trigger instant silent background refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#f06a55] ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline font-mono text-[11px]">
              {isRefreshing ? "Syncing..." : `Sync (${autoRefreshInterval}s)`}
            </span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 text-secondary-theme hover:text-[#f06a55] btn-secondary-theme rounded-xl transition-all"
            >
              <Bell className="h-4 w-4" />
              {unreadLogsCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f06a55] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f06a55]"></span>
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-theme bg-popover-theme shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-theme">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#f06a55]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-primary-theme">
                      Notifications
                    </span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#f06a55]/10 text-[#f06a55] font-semibold">
                    Realtime Engine
                  </span>
                </div>

                <div className="py-3 space-y-2.5 max-h-64 overflow-y-auto">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-primary-theme">
                        Engine Operational
                      </p>
                      <p className="text-[11px] text-muted-theme mt-0.5">
                        Connected to database and automation scheduler engine.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowNotifications(false);
                    setActiveTab("log-viewer");
                  }}
                  className="w-full mt-2 py-1.5 text-xs text-center text-[#f06a55] hover:underline font-bold"
                >
                  Inspect All Logs →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
