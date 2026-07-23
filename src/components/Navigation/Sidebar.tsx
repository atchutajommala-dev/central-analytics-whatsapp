"use client";

import React from "react";
import {
  LayoutDashboard,
  Workflow,
  BarChart3,
  ScrollText,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Shield,
  LogIn,
  PlusCircle,
  Activity,
  ListOrdered
} from "lucide-react";
import { DashboardTab, DbUser } from "@/types/dashboard";
import { User } from "firebase/auth";
import { useTheme } from "@/context/ThemeContext";
import PWLogo from "@/components/Common/PWLogo";

interface SidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  activeJobsCount: number;
  totalLogsCount: number;
  currentUser: User | null;
  dbUser: DbUser | null;
  onLogout: () => void;
  onLogin: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  activeJobsCount,
  totalLogsCount,
  currentUser,
  dbUser,
  onLogout,
  onLogin,
}: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    {
      id: "overview" as DashboardTab,
      label: "Overview",
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: "workflows" as DashboardTab,
      label: "Workflows",
      icon: Workflow,
      badge: activeJobsCount > 0 ? `${activeJobsCount} Active` : null,
      badgeColor: "bg-[#f06a55]/20 text-[#f06a55] border-[#f06a55]/30",
    },
    {
      id: "create-workflow" as DashboardTab,
      label: "Create Workflow",
      icon: PlusCircle,
      badge: "Wizard",
      badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
    {
      id: "monitoring" as DashboardTab,
      label: "Monitoring",
      icon: Activity,
      badge: "Live",
      badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    },
    {
      id: "users" as DashboardTab,
      label: "User Management",
      icon: Users,
      badge: "RBAC",
      badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    },
    {
      id: "settings" as DashboardTab,
      label: "System Settings",
      icon: Settings,
      badge: null,
    },
  ];

  return (
    <aside
      className={`relative flex flex-col h-[calc(100vh-4rem)] border-r border-theme bg-sidebar-theme transition-all duration-300 z-30 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-theme">
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <PWLogo size="md" />
            <div className="flex flex-col leading-none">
              <span className="text-xs font-extrabold uppercase tracking-wider text-primary-theme">Physics Wallah</span>
              <span className="text-[10px] text-[#f06a55] font-bold tracking-wider mt-0.5">SCHEDULER ENGINE</span>
            </div>
          </div>
        ) : (
          <div className="mx-auto">
            <PWLogo size="sm" />
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`p-1.5 rounded-lg text-muted-theme hover:text-primary-theme btn-secondary-theme transition ${
            collapsed ? "mx-auto mt-2" : ""
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Items List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id ||
            (activeTab === "dags" as any && item.id === "workflows") ||
            (activeTab === "logs" as any && item.id === "log-viewer") ||
            (activeTab === "analytics" as any && item.id === "monitoring");
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 group ${
                isActive
                  ? "bg-[#f06a55] text-white shadow-lg shadow-[#f06a55]/30 font-extrabold"
                  : "text-secondary-theme hover:bg-card-theme hover:text-primary-theme"
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${
                  isActive ? "text-white" : "text-subtle-theme group-hover:text-[#f06a55]"
                }`}
              />

              {!collapsed && (
                <div className="flex-1 text-left truncate flex items-center justify-between">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full border ${
                        isActive
                          ? "bg-white/20 text-white border-white/30"
                          : item.badgeColor || "bg-app text-muted-theme border-theme"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer: Profile Section & Theme Toggle */}
      <div className="p-3 border-t border-theme bg-app">
        {!collapsed ? (
          currentUser ? (
            <div className="p-2 rounded-2xl bg-card-theme border border-theme flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || "User"}
                    className="w-8 h-8 rounded-xl ring-2 ring-[#f06a55]/40 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-xl bg-[#f06a55] text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {currentUser.displayName?.[0] || currentUser.email?.[0] || "U"}
                  </div>
                )}
                <div className="min-w-0 text-left">
                  <p className="text-xs font-bold text-primary-theme truncate">
                    {currentUser.displayName || currentUser.email?.split("@")[0]}
                  </p>
                  <p className="text-[10px] text-muted-theme flex items-center gap-1 font-semibold">
                    <Shield className="w-2.5 h-2.5 text-[#f06a55]" />
                    {dbUser?.role ? dbUser.role.toUpperCase() : "ADMIN"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {/* Theme Toggle Button */}
                <button
                  onClick={toggleTheme}
                  className="p-1.5 text-secondary-theme hover:text-[#f06a55] btn-secondary-theme rounded-lg transition"
                  title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4 text-[#f06a55]" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-700" />
                  )}
                </button>

                {/* Sign Out Button */}
                <button
                  onClick={onLogout}
                  className="p-1.5 text-subtle-theme hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onLogin}
              className="w-full btn-coral py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Google</span>
            </button>
          )
        ) : (
          /* Collapsed View */
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 btn-secondary-theme rounded-xl transition"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-[#f06a55]" /> : <Moon className="w-4 h-4" />}
            </button>

            {currentUser && (
              <button
                onClick={onLogout}
                className="p-2 text-subtle-theme hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
