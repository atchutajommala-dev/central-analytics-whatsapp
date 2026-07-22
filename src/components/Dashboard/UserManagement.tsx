"use client";

import React from "react";
import {
  Users,
  UserPlus,
  Shield,
  Lock,
  Mail,
  Clock,
  Search
} from "lucide-react";
import { DbUser } from "@/types/dashboard";

interface UserManagementProps {
  users: DbUser[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  onOpenAddUserModal: () => void;
  onUpdateUserRole: (email: string, role: "admin" | "dev" | "viewer") => void;
  currentUserRole?: string;
}

export default function UserManagement({
  users,
  searchQuery,
  setSearchQuery,
  onOpenAddUserModal,
  onUpdateUserRole,
  currentUserRole = "admin",
}: UserManagementProps) {
  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.displayName && u.displayName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary-theme flex items-center gap-2">
            <Users className="w-5 h-5 text-[#f06a55]" />
            User Access & Role-Based Access Control (RBAC)
          </h2>
          <p className="text-xs text-muted-theme mt-0.5">
            Admin privileges are strictly governed via <code className="font-mono text-[#f06a55] font-bold">ADMIN_EMAILS</code> in environment configuration.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-subtle-theme" />
            <input
              type="text"
              placeholder="Search team member..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-input-theme text-primary-theme placeholder-subtle-theme rounded-xl border border-theme focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50"
            />
          </div>

          <button
            onClick={onOpenAddUserModal}
            className="btn-coral px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#f06a55]/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Team Member</span>
          </button>
        </div>
      </div>

      {/* Role Cards Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="pw-card p-4 border-l-4 border-[#f06a55]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#f06a55] flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> ADMIN ROLE
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f06a55]/10 text-[#f06a55]">
              .env Governed
            </span>
          </div>
          <p className="text-xs text-secondary-theme mt-2 leading-relaxed">
            Admin rights are configured strictly in <code className="font-mono text-[#f06a55]">.env</code> via <code className="font-mono text-[#f06a55]">ADMIN_EMAILS</code> for max security.
          </p>
        </div>

        <div className="pw-card p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> DEV ROLE
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
              Execution Access
            </span>
          </div>
          <p className="text-xs text-secondary-theme mt-2 leading-relaxed">
            Developers can trigger manual DAG executions and view live traces.
          </p>
        </div>

        <div className="pw-card p-4 border-l-4 border-emerald-500">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> VIEWER ROLE
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Read-only Analytics
            </span>
          </div>
          <p className="text-xs text-secondary-theme mt-2 leading-relaxed">
            Read-only users can inspect charts and performance dashboards without triggering edits.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="pw-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-theme uppercase tracking-wider text-[11px] font-extrabold">
                <th className="py-3.5 px-4">User Email & Identity</th>
                <th className="py-3.5 px-4">Display Name</th>
                <th className="py-3.5 px-4">Assigned Role</th>
                <th className="py-3.5 px-4">First Sync Timestamp</th>
                <th className="py-3.5 px-4 text-right">RBAC Role Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-theme">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.email} className="transition-colors duration-150">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#f06a55] text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-sm">
                          {user.displayName?.[0] || user.email[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-primary-theme">{user.email}</p>
                          <p className="text-[10px] text-muted-theme font-mono">UID: {user.uid || "Google-OAuth"}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-secondary-theme">
                      {user.displayName || user.email.split("@")[0]}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase border ${
                          user.role === "admin"
                            ? "bg-[#f06a55]/10 text-[#f06a55] border-[#f06a55]/20"
                            : user.role === "dev"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {user.role}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-muted-theme">
                      {user.createdAt || "Recent Sync"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <select
                        value={user.role}
                        onChange={(e) =>
                          onUpdateUserRole(user.email, e.target.value as "admin" | "dev" | "viewer")
                        }
                        disabled={currentUserRole !== "admin"}
                        className="px-2.5 py-1 text-xs bg-input-theme text-primary-theme border border-theme rounded-lg focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 disabled:opacity-50"
                      >
                        <option value="admin">Admin</option>
                        <option value="dev">Developer</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-theme">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50 text-subtle-theme" />
                    <p className="font-bold text-sm text-primary-theme">No Team Members Found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
