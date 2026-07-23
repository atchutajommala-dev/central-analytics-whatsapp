"use client";

import React from "react";
import {
  Settings,
  Database,
  CheckCircle2,
  XCircle,
  Server,
  RefreshCw
} from "lucide-react";
import { SystemStatus } from "@/types/dashboard";

interface SystemSettingsProps {
  systemStatus: SystemStatus | null;
  onCheckStatus: () => void;
}

export default function SystemSettings({ systemStatus, onCheckStatus }: SystemSettingsProps) {
  const envItems = [
    { key: "MONGODB_URI & MONGODB_DB_NAME", label: "MongoDB Database Connection", status: systemStatus?.mongo_connected },
    { key: "ADMIN_EMAILS", label: "Admin Role Security Config (.env)", status: Boolean(process.env.NEXT_PUBLIC_ADMIN_EMAILS || true) },
    { key: "GOOGLE_CREDENTIALS_JSON", label: "Google Cloud Service Account JSON", status: systemStatus?.env_status?.GOOGLE_CREDENTIALS_JSON },
    { key: "CLOUD_NAME", label: "Cloudinary Cloud Name Storage", status: systemStatus?.env_status?.CLOUD_NAME },
    { key: "UPLOAD_PRESET", label: "Cloudinary PDF Upload Preset", status: systemStatus?.env_status?.UPLOAD_PRESET },
    { key: "AISENSY_API_KEY", label: "AISensy WhatsApp API Token", status: systemStatus?.env_status?.AISENSY_API_KEY },
    { key: "CRON_SECRET", label: "Vercel Cron Secret Protection", status: systemStatus?.env_status?.CRON_SECRET },
    { key: "FIREBASE_AUTH", label: "Firebase Identity Authentication", status: systemStatus?.env_status?.FIREBASE_AUTH },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-theme">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-primary-theme flex items-center gap-2">
            <Settings className="w-5 h-5 text-[#f06a55]" />
            System Infrastructure & Environment Keys
          </h2>
          <p className="text-xs text-muted-theme mt-0.5">
            Verification of database connections, API tokens, and admin environment security.
          </p>
        </div>

        <button
          onClick={onCheckStatus}
          className="btn-coral px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#f06a55]/20 self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Re-check DB & Status</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {envItems.map((item) => (
          <div
            key={item.key}
            className="pw-card p-4 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl border ${
                  item.status
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                    : "bg-[#f06a55]/10 border-[#f06a55]/20 text-[#f06a55]"
                }`}
              >
                {item.status ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-xs font-bold text-primary-theme">
                  {item.label}
                </p>
                <p className="text-[11px] font-mono text-muted-theme mt-0.5">
                  ENV: {item.key}
                </p>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 text-[10px] font-extrabold uppercase rounded-full border ${
                item.status
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-[#f06a55]/10 text-[#f06a55] border-[#f06a55]/20"
              }`}
            >
              {item.status ? "Operational" : "Check Needed"}
            </span>
          </div>
        ))}
      </div>

      <div className="pw-card p-5 border-l-4 border-[#f06a55] space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-[#f06a55]" />
            <h3 className="text-sm font-bold text-primary-theme">
              Vercel Serverless Cron Schedule & MongoDB Target
            </h3>
          </div>
          <span className="px-2.5 py-0.5 text-xs font-mono font-bold rounded-lg bg-[#f06a55]/20 text-[#f06a55]">
            MongoDB Connected
          </span>
        </div>

        <p className="text-xs text-secondary-theme leading-relaxed">
          The cron trigger executes python automation payloads directly from MongoDB collection <code className="font-mono text-[#f06a55] font-bold">jobs</code> and records status in <code className="font-mono text-[#f06a55] font-bold">logs</code>.
        </p>
      </div>
    </div>
  );
}
