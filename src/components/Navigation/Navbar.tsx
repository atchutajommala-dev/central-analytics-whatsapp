"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Bell,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Command,
  RefreshCw
} from "lucide-react";
import { DashboardTab, SystemStatus } from "@/types/dashboard";
import { useRefresh } from "@/context/RefreshContext";
import PWLogo from "@/components/Common/PWLogo";

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
  const { isRefreshing, triggerSilentRefresh } = useRefresh();

  // Keyboard shortcut listener for Cmd+K / Ctrl+K search focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("global-search-input");
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case "overview":
        return "Overview";
      case "workflows":
      case "dags" as any:
        return "Workflows";
      case "create-workflow":
        return "Workflow Wizard";
      case "dag-detail":
        return "DAG Detail View";
      case "monitoring":
      case "analytics" as any:
        return "Monitoring";
      case "users":
        return "User Management";
      case "settings":
        return "Settings";
      default:
        return "Dashboard";
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-theme bg-card-theme/90 backdrop-blur-xl shadow-xs transition-all duration-200">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        {/* Left: Clean Breadcrumb */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="font-extrabold text-xs tracking-wider text-muted-theme uppercase">
            PW Scheduler Engine
          </span>

          <ChevronRight className="h-3.5 w-3.5 text-subtle-theme" />

          {/* Breadcrumb Pill */}
          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-input-theme text-[#f06a55] border border-[#f06a55]/20 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f06a55]"></span>
            {getBreadcrumbTitle()}
          </span>
        </div>

        {/* Center: Sleek Search Bar */}
        <div className="hidden md:flex items-center flex-1 max-w-lg mx-6">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-theme" />
            <input
              id="global-search-input"
              type="text"
              placeholder="Search workflows, ranges, destinations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-12 py-1.5 text-xs bg-input-theme/80 text-primary-theme placeholder-subtle-theme rounded-xl border border-theme focus:outline-none focus:ring-2 focus:ring-[#f06a55]/40 focus:border-[#f06a55] transition-all"
            />
            <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-muted-theme bg-surface rounded-md border border-theme">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Operational Status Indicator */}
          <div className="hidden lg:flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Operational
            </span>
          </div>

          {/* Sync Button */}
          <button
            onClick={() => triggerSilentRefresh()}
            disabled={isRefreshing}
            className="px-3 py-1.5 rounded-xl text-xs font-bold btn-secondary-theme flex items-center gap-1.5 transition select-none"
            title="Refresh workspace data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#f06a55] ${isRefreshing ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Notifications Dropdown */}
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
                      System Status
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    Live Engine
                  </span>
                </div>

                <div className="py-3 space-y-2.5">
                  <div className="flex items-start gap-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-primary-theme">
                        All Systems Operational
                      </p>
                      <p className="text-[11px] text-muted-theme mt-0.5">
                        Connected to MongoDB & WhatsApp Automation Engine.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
