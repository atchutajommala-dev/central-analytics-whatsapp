"use client";

import React, { useState } from "react";
import { X, UserPlus } from "lucide-react";

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (email: string, displayName: string, role: "admin" | "dev" | "viewer") => Promise<void>;
}

export default function AddUserModal({ isOpen, onClose, onAddUser }: AddUserModalProps) {
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"admin" | "dev" | "viewer">("dev");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    try {
      await onAddUser(email, displayName || email.split("@")[0], role);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md modal-content rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between p-5 border-b border-theme bg-app/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#f06a55] text-white font-black flex items-center justify-center shadow-md">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-primary-theme">
                Add Team Member
              </h3>
              <p className="text-xs text-muted-theme">
                Grant role-based privileges for PW Analytics
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-theme hover:text-primary-theme btn-secondary-theme transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div>
            <label className="block font-bold text-secondary-theme mb-1">
              Email Address *
            </label>
            <input
              type="email"
              required
              placeholder="colleague@pw.live"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50"
            />
          </div>

          <div>
            <label className="block font-bold text-secondary-theme mb-1">
              Display Name
            </label>
            <input
              type="text"
              placeholder="e.g. Aditi Sharma"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50"
            />
          </div>

          <div>
            <label className="block font-bold text-secondary-theme mb-1">
              Access Role Level
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "dev" | "viewer")}
              className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50"
            >
              <option value="admin">Admin - Full Control & Settings</option>
              <option value="dev">Developer - Manual Triggers & Logs</option>
              <option value="viewer">Viewer - Read Only Analytics</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-theme">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl btn-secondary-theme text-xs font-semibold transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-coral px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-[#f06a55]/20 transition"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Team Member</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
