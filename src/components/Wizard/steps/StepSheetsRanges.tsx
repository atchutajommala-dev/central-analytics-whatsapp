"use client";

import React, { useState } from "react";
import { Grid3X3, Plus, X, AlertCircle, Variable, Wand2, CheckCircle2, ChevronDown, Table } from "lucide-react";
import { WizardFormState } from "@/types/workflow";
import { RangeDefinition, RangeType, WorksheetInfo } from "@/types/dashboard";
import { validateRange, formatRangeLabel, COMMON_RANGES } from "@/lib/range-validator";

interface StepSheetsRangesProps {
  state: WizardFormState;
  onChange: (updates: Partial<WizardFormState>) => void;
}

export default function StepSheetsRanges({ state, onChange }: StepSheetsRangesProps) {
  // Use fetched sheets from Step 2 if available, or fallback to selected worksheets
  const availableSheets = state.fetchedSheets.length > 0
    ? state.fetchedSheets
    : state.source.selected_worksheets.length > 0
    ? state.source.selected_worksheets
    : [
        { sheet_id: 0, title: "Location Specifc", index: 0 },
        { sheet_id: 1, title: "Studio Specific", index: 1 },
        { sheet_id: 2, title: "Studio Unit Specific", index: 2 },
        { sheet_id: 3, title: "Reference for Bulk Booking", index: 3 },
      ];

  const [selectedSheetTitle, setSelectedSheetTitle] = useState<string>(
    availableSheets[0]?.title || "Location Specifc"
  );
  const [rangeInput, setRangeInput] = useState<string>("A1:L15");
  const [rangeType, setRangeType] = useState<RangeType>("a1");
  const [validationError, setValidationError] = useState<string | null>(null);

  const addCombinedRange = () => {
    const val = rangeInput.trim();
    if (!val) return;

    if (rangeType === "a1") {
      const validation = validateRange(val);
      if (!validation.valid) {
        setValidationError(validation.error || "Invalid cell range format");
        return;
      }
    }

    const rangeId = `range_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const fullValue = selectedSheetTitle ? `${selectedSheetTitle}!${val}` : val;

    const newRange: RangeDefinition = {
      id: rangeId,
      type: rangeType,
      value: fullValue,
      worksheet: selectedSheetTitle,
      label: `${selectedSheetTitle}: ${val}`,
    };

    // Ensure selected worksheet is registered in source.selected_worksheets
    const worksheetExists = state.source.selected_worksheets.some((s) => s.title === selectedSheetTitle);
    let updatedWorksheets = state.source.selected_worksheets;
    if (!worksheetExists) {
      const match = availableSheets.find((s) => s.title === selectedSheetTitle);
      const sheetToAdd: WorksheetInfo = match || { sheet_id: 0, title: selectedSheetTitle, index: updatedWorksheets.length };
      updatedWorksheets = [...updatedWorksheets, sheetToAdd];
    }

    onChange({
      ranges: [...state.ranges, newRange],
      source: {
        ...state.source,
        selected_worksheets: updatedWorksheets,
      },
    });

    setValidationError(null);
  };

  const removeRange = (id: string) => {
    onChange({ ranges: state.ranges.filter((r) => r.id !== id) });
  };

  return (
    <div className="space-y-5">
      {/* Defined Tab Ranges List */}
      <div>
        <label className="block text-xs font-bold text-secondary-theme mb-2">
          Configured Export Ranges ({state.ranges.length})
        </label>

        {state.ranges.length > 0 ? (
          <div className="space-y-2">
            {state.ranges.map((r, i) => (
              <div
                key={r.id}
                className="flex items-center justify-between p-3 rounded-xl bg-app border border-theme hover:border-[#f06a55]/30 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-lg bg-[#f06a55]/10 text-[#f06a55] flex items-center justify-center text-[10px] font-bold shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-primary-theme font-mono truncate">{r.value}</p>
                    <span className="text-[10px] text-muted-theme font-semibold">
                      Tab: {r.worksheet || "Default"} | Type: {r.type.toUpperCase()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeRange(r.id)}
                  className="p-1.5 rounded-lg text-muted-theme hover:text-rose-500 hover:bg-rose-500/10 transition shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-6 text-center rounded-xl border border-dashed border-theme">
            <Grid3X3 className="w-6 h-6 mx-auto text-muted-theme mb-2 opacity-50" />
            <p className="text-xs text-muted-theme">No ranges configured yet.</p>
            <p className="text-[10px] text-subtle-theme mt-0.5">Select a worksheet tab and cell range below to add to export pipeline.</p>
          </div>
        )}
      </div>

      {/* Sheet Tab Dropdown */}
      <div className="p-4 rounded-2xl bg-app border border-theme space-y-4">
        <h4 className="text-xs font-bold text-primary-theme flex items-center gap-2">
          <Table className="w-4 h-4 text-[#f06a55]" />
          Add Worksheet & Range Pair
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Worksheet Tab Dropdown */}
          <div>
            <label className="block text-xs font-bold text-secondary-theme mb-1.5">
              Select Worksheet Tab <span className="text-[#f06a55]">*</span>
            </label>
            <div className="relative">
              <select
                value={selectedSheetTitle}
                onChange={(e) => setSelectedSheetTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs font-semibold appearance-none pr-8"
              >
                {availableSheets.map((sheet) => (
                  <option key={sheet.title} value={sheet.title}>
                    {sheet.title} {sheet.row_count ? `(${sheet.row_count} rows × ${sheet.column_count} cols)` : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-theme pointer-events-none" />
            </div>
          </div>

          {/* Range Notation Input */}
          <div>
            <label className="block text-xs font-bold text-secondary-theme mb-1.5">
              Cell Range (A1 Notation) <span className="text-[#f06a55]">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={rangeInput}
                onChange={(e) => {
                  setRangeInput(e.target.value);
                  setValidationError(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCombinedRange())}
                placeholder="e.g. A1:L15, A:Z, 1:100"
                className="flex-1 px-3 py-2.5 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs font-mono"
              />
              <button
                type="button"
                onClick={addCombinedRange}
                disabled={!rangeInput.trim()}
                className="btn-coral px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 disabled:opacity-40 transition shadow-md shadow-[#f06a55]/20"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>
          </div>
        </div>

        {validationError && (
          <div className="flex items-center gap-1.5 text-rose-500 text-[11px] font-semibold">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Quick Range Presets */}
        <div>
          <label className="block text-[11px] font-bold text-muted-theme mb-1.5">Quick Range Presets</label>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "A1:L15 (Location View)", val: "A1:L15" },
              { label: "A:Z (Entire Sheet Columns)", val: "A:Z" },
              { label: "1:100 (Full First 100 Rows)", val: "1:100" },
              { label: "AN23:AR42 (VD Morning Window)", val: "AN23:AR42" },
              { label: "W22:AF39 (VD Standard Window)", val: "W22:AF39" },
            ].map((preset) => (
              <button
                key={preset.val}
                type="button"
                onClick={() => setRangeInput(preset.val)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition border ${
                  rangeInput === preset.val
                    ? "bg-[#f06a55] text-white border-[#f06a55]"
                    : "bg-app border-theme text-muted-theme hover:border-[#f06a55]/30 hover:text-[#f06a55]"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
