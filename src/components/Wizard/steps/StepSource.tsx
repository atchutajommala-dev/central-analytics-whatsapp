"use client";

import React, { useState, useEffect } from "react";
import { Link, CheckCircle2, AlertCircle, RefreshCw, Copy, Check, ShieldCheck, Database, History } from "lucide-react";
import { WizardFormState } from "@/types/workflow";
import { extractSpreadsheetId } from "@/lib/range-validator";

interface StepSourceProps {
  state: WizardFormState;
  onChange: (updates: Partial<WizardFormState>) => void;
}

interface RecentSheet {
  id: string;
  title: string;
}

const SERVICE_ACCOUNT_EMAIL = "analytics-whatsapp-automation@lofty-hearth-477406-p6.iam.gserviceaccount.com";

export default function StepSource({ state, onChange }: StepSourceProps) {
  const [copied, setCopied] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);
  const [recentlyUsed, setRecentlyUsed] = useState<RecentSheet[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("last_used_spreadsheets");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentlyUsed(parsed);
          return;
        }
      }
    } catch {
      // fallback
    }
    setRecentlyUsed([
      { id: "1_j_3io64v1xmLg0LFE2HeM5TpmMezx1wW7OFSg1xUm4", title: "Analytics Spreadsheet (1_j_3io64v1xmL...)" }
    ]);
  }, []);

  const saveToRecent = (id: string, title: string) => {
    setRecentlyUsed((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      const updated = [{ id, title }, ...filtered].slice(0, 5);
      try {
        localStorage.setItem("last_used_spreadsheets", JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleUrlChange = (urlOrId: string) => {
    const extracted = extractSpreadsheetId(urlOrId);
    setVerificationError(null);
    setVerificationSuccess(null);

    onChange({
      source: {
        ...state.source,
        spreadsheet_url: urlOrId,
        spreadsheet_id: extracted,
      },
    });
  };

  const copyEmail = () => {
    navigator.clipboard.writeText(SERVICE_ACCOUNT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const verifyAndFetchTabs = async () => {
    const sheetId = state.source.spreadsheet_id || extractSpreadsheetId(state.source.spreadsheet_url || "");
    if (!sheetId) {
      setVerificationError("Please enter a valid Google Spreadsheet URL or Spreadsheet ID");
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);
    setVerificationSuccess(null);

    try {
      const res = await fetch(`/api/sheets/metadata?sheet_id=${encodeURIComponent(sheetId)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setVerificationError(data.error || "Failed to verify connection to Google Sheet.");
      } else {
        const fetched = data.sheets || [];
        const sheetTitle = data.title || "Google Sheet";
        setVerificationSuccess(`Successfully verified! Connected to "${sheetTitle}" (${fetched.length} tabs found).`);

        saveToRecent(sheetId, `${sheetTitle} (${sheetId.slice(0, 12)}...)`);

        onChange({
          fetchedSheets: fetched,
          source: {
            ...state.source,
            spreadsheet_id: sheetId,
            selected_worksheets: state.source.selected_worksheets.length > 0 ? state.source.selected_worksheets : fetched,
          },
        });
      }
    } catch (err: any) {
      setVerificationError(err?.message || "Network error verifying Google Sheet permission");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Required Permission Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <h4 className="text-xs font-bold text-amber-700 dark:text-amber-300">
              Share Google Sheet with Service Account
            </h4>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-700 dark:text-amber-300">
            Required
          </span>
        </div>

        <p className="text-xs text-secondary-theme leading-relaxed">
          Before verifying, share your target Google Sheet with <strong>Viewer</strong> access to this official service account email:
        </p>

        <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-app border border-theme font-mono text-xs">
          <span className="truncate text-primary-theme select-all">{SERVICE_ACCOUNT_EMAIL}</span>
          <button
            type="button"
            onClick={copyEmail}
            className="px-3 py-1 rounded-lg btn-secondary-theme font-sans text-xs font-bold flex items-center gap-1.5 shrink-0 transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Email</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Spreadsheet URL / ID */}
      <div>
        <label className="block text-xs font-bold text-secondary-theme mb-1.5">
          Google Spreadsheet Link or ID <span className="text-[#f06a55]">*</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-subtle-theme" />
            <input
              type="text"
              value={state.source.spreadsheet_url || state.source.spreadsheet_id}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/1_j_3io64v1xmLg0LFE2HeM5TpmMezx1wW7OFSg1xUm4/edit"
              className="w-full pl-9 pr-3 py-2.5 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs font-mono"
            />
          </div>

          <button
            type="button"
            onClick={verifyAndFetchTabs}
            disabled={isVerifying || (!state.source.spreadsheet_url && !state.source.spreadsheet_id)}
            className="btn-coral px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition shadow-md shadow-[#f06a55]/20 shrink-0"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                <span>Verify & Fetch Tabs</span>
              </>
            )}
          </button>
        </div>

        {/* Extracted ID Display */}
        {state.source.spreadsheet_id && (
          <p className="text-[11px] text-muted-theme mt-1.5 font-mono">
            Extracted ID: <span className="text-primary-theme font-bold">{state.source.spreadsheet_id}</span>
          </p>
        )}
      </div>

      {/* Verification Feedback */}
      {verificationSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-bold animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{verificationSuccess}</span>
        </div>
      )}

      {verificationError && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2 text-rose-500 text-xs font-bold animate-in fade-in duration-150">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{verificationError}</span>
        </div>
      )}

      {/* Recently Used Spreadsheets */}
      {recentlyUsed.length > 0 && (
        <div>
          <label className="block text-xs font-bold text-muted-theme mb-1.5 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-[#f06a55]" />
            Recently Used Spreadsheets
          </label>
          <div className="flex flex-wrap gap-1.5">
            {recentlyUsed.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleUrlChange(item.id)}
                className="px-3 py-1.5 rounded-xl text-xs font-mono text-muted-theme bg-app border border-theme hover:border-[#f06a55]/30 hover:text-[#f06a55] transition flex items-center gap-1.5"
              >
                <History className="w-3 h-3 text-[#f06a55]" />
                <span>{item.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
