"use client";

import React, { useState } from "react";
import { Grid3X3, Plus, X, AlertCircle, Wand2, CheckCircle2, ChevronDown, Table, Calendar, Sparkles, Layers } from "lucide-react";
import { WizardFormState } from "@/types/workflow";
import { RangeDefinition, RangeType, WorksheetInfo } from "@/types/dashboard";
import { validateRange, generateIncrementalDayRanges, IncrementalSubRangeSpec } from "@/lib/range-validator";

interface StepSheetsRangesProps {
  state: WizardFormState;
  onChange: (updates: Partial<WizardFormState>) => void;
}

export default function StepSheetsRanges({ state, onChange }: StepSheetsRangesProps) {
  // Available worksheet tabs
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

  // Tab mode: "standard" or "incremental"
  const [rangeAddMode, setRangeAddMode] = useState<"standard" | "incremental">("incremental");

  // Standard Range state
  const [rangeInput, setRangeInput] = useState<string>("A1:L15");
  const [rangeType] = useState<RangeType>("a1");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Incremental Range Auto-Filler state
  const [baseRow, setBaseRow] = useState<number>(1927);
  const [rowStep, setRowStep] = useState<number>(30);
  const [daysCount, setDaysCount] = useState<number>(7);
  const [colBlocksInput, setColBlocksInput] = useState<string>("A:F, K:R");

  // Parse col blocks input into IncrementalSubRangeSpec[]
  const parseColBlocks = (input: string): IncrementalSubRangeSpec[] => {
    const parts = input.split(",").map((p) => p.trim()).filter(Boolean);
    const specs: IncrementalSubRangeSpec[] = [];

    for (const p of parts) {
      const match = p.match(/^([A-Za-z]{1,3}):([A-Za-z]{1,3})$/);
      if (match) {
        const colStart = match[1].toUpperCase();
        const colEnd = match[2].toUpperCase();
        if (colStart === "K" && colEnd === "R") {
          // Secondary block offset convention
          specs.push({ colStart, colEnd, rowOffset: 2, height: rowStep - 3 });
        } else {
          specs.push({ colStart, colEnd, rowOffset: 0, height: rowStep - 1 });
        }
      }
    }

    return specs.length > 0 ? specs : [{ colStart: "A", colEnd: "F", rowOffset: 0, height: rowStep - 1 }];
  };

  // Preview generated incremental day ranges
  const previewIncrementalRanges = generateIncrementalDayRanges({
    sheetTitle: selectedSheetTitle,
    baseRow: Math.max(1, baseRow || 1),
    rowStep: Math.max(1, rowStep || 1),
    daysCount: Math.min(31, Math.max(1, daysCount || 1)),
    subRanges: parseColBlocks(colBlocksInput),
  });

  const addSingleRange = () => {
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

    registerWorksheetIfNeeded(selectedSheetTitle);

    onChange({
      ranges: [...state.ranges, newRange],
    });

    setValidationError(null);
  };

  const addIncrementalRangesBatch = () => {
    if (previewIncrementalRanges.length === 0) return;

    const newRanges: RangeDefinition[] = previewIncrementalRanges.map((gen) => ({
      id: gen.id,
      type: "a1",
      value: gen.value,
      worksheet: selectedSheetTitle,
      label: gen.label,
    }));

    registerWorksheetIfNeeded(selectedSheetTitle);

    // Prevent exact duplicates
    const existingValues = new Set(state.ranges.map((r) => r.value));
    const uniqueNewRanges = newRanges.filter((r) => !existingValues.has(r.value));

    onChange({
      ranges: [...state.ranges, ...uniqueNewRanges],
    });
  };

  const registerWorksheetIfNeeded = (title: string) => {
    const worksheetExists = state.source.selected_worksheets.some((s) => s.title === title);
    if (!worksheetExists) {
      const match = availableSheets.find((s) => s.title === title);
      const sheetToAdd: WorksheetInfo = match || { sheet_id: 0, title: title, index: state.source.selected_worksheets.length };
      onChange({
        source: {
          ...state.source,
          selected_worksheets: [...state.source.selected_worksheets, sheetToAdd],
        },
      });
    }
  };

  const removeRange = (id: string) => {
    onChange({ ranges: state.ranges.filter((r) => r.id !== id) });
  };

  const clearAllRanges = () => {
    onChange({ ranges: [] });
  };

  return (
    <div className="space-y-5">
      {/* Configured Export Ranges Header & Summary */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs font-bold text-secondary-theme">
            Configured Export Ranges ({state.ranges.length})
          </label>

          {state.ranges.length > 0 && (
            <button
              type="button"
              onClick={clearAllRanges}
              className="text-[11px] text-rose-500 hover:underline font-semibold flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Clear All
            </button>
          )}
        </div>

        {state.ranges.length > 0 ? (
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
          <div className="py-6 text-center rounded-xl border border-dashed border-theme bg-app/50">
            <Grid3X3 className="w-6 h-6 mx-auto text-muted-theme mb-2 opacity-50" />
            <p className="text-xs text-muted-theme font-semibold">No ranges configured yet.</p>
            <p className="text-[10px] text-subtle-theme mt-0.5">Use the Date Incremental Generator or custom A1 notation below to auto-fill ranges.</p>
          </div>
        )}
      </div>

      {/* Mode Switcher Container */}
      <div className="p-4 rounded-2xl bg-app border border-theme space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-theme">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-[#f06a55]" />
            <h4 className="text-xs font-bold text-primary-theme">Add Worksheet Ranges</h4>
          </div>

          <div className="flex items-center gap-1 bg-input-theme p-1 rounded-xl border border-theme self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setRangeAddMode("incremental")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                rangeAddMode === "incremental"
                  ? "bg-[#f06a55] text-white shadow-sm"
                  : "text-muted-theme hover:text-primary-theme"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Date Incremental Auto-Fill</span>
            </button>

            <button
              type="button"
              onClick={() => setRangeAddMode("standard")}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                rangeAddMode === "standard"
                  ? "bg-[#f06a55] text-white shadow-sm"
                  : "text-muted-theme hover:text-primary-theme"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Single A1 Range</span>
            </button>
          </div>
        </div>

        {/* Worksheet Tab Selector (Common to both modes) */}
        <div>
          <label className="block text-xs font-bold text-secondary-theme mb-1.5">
            Select Target Worksheet Tab <span className="text-[#f06a55]">*</span>
          </label>
          <div className="relative">
            <select
              value={selectedSheetTitle}
              onChange={(e) => {
                const title = e.target.value;
                setSelectedSheetTitle(title);
                const match = availableSheets.find((s) => s.title === title);
                if (match) {
                  const exists = state.source.selected_worksheets.some((s) => s.title === title);
                  if (!exists) {
                    onChange({
                      source: {
                        ...state.source,
                        selected_worksheets: [...state.source.selected_worksheets, match],
                      },
                    });
                  }
                }
              }}
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

        {/* MODE 1: Date Incremental Generator */}
        {rangeAddMode === "incremental" && (
          <div className="space-y-4 pt-1 animate-in fade-in duration-150">
            <div className="p-3 rounded-xl bg-[#f06a55]/5 border border-[#f06a55]/20 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-[#f06a55] shrink-0 mt-0.5" />
              <div className="text-[11px] text-secondary-theme leading-relaxed">
                <span className="font-bold text-[#f06a55] block">Date Incremental Range Auto-Calculator</span>
                Input your starting row, daily row increment step, and number of days to auto-calculate and add all daily range blocks in bulk.
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Base Row */}
              <div>
                <label className="block text-[11px] font-bold text-secondary-theme mb-1">
                  Start Base Row <span className="text-[#f06a55]">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={baseRow}
                  onChange={(e) => setBaseRow(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50"
                  placeholder="e.g. 1927"
                />
              </div>

              {/* Rows Per Day / Step */}
              <div>
                <label className="block text-[11px] font-bold text-secondary-theme mb-1">
                  Rows Per Day (Step) <span className="text-[#f06a55]">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={rowStep}
                  onChange={(e) => setRowStep(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50"
                  placeholder="e.g. 30"
                />
              </div>

              {/* Days Count */}
              <div>
                <label className="block text-[11px] font-bold text-secondary-theme mb-1">
                  Days Count to Generate <span className="text-[#f06a55]">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={daysCount}
                  onChange={(e) => setDaysCount(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50"
                  placeholder="e.g. 7"
                />
              </div>

              {/* Column Blocks Spec */}
              <div>
                <label className="block text-[11px] font-bold text-secondary-theme mb-1">
                  Sub-Range Columns
                </label>
                <input
                  type="text"
                  value={colBlocksInput}
                  onChange={(e) => setColBlocksInput(e.target.value)}
                  className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50"
                  placeholder="e.g. A:F, K:R"
                />
              </div>
            </div>

            {/* Quick Days Count Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-muted-theme">Quick Day Options:</span>
              {[1, 3, 7, 14, 30].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDaysCount(d)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                    daysCount === d
                      ? "bg-[#f06a55] text-white border-[#f06a55]"
                      : "bg-input-theme border-theme text-muted-theme hover:text-[#f06a55]"
                  }`}
                >
                  {d} {d === 1 ? "Day" : "Days"}
                </button>
              ))}
            </div>

            {/* Auto-Calculated Live Preview Badge & Batch Add Button */}
            <div className="p-3.5 rounded-xl bg-input-theme border border-theme space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary-theme flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#f06a55]" />
                  Calculated Incremental Ranges Preview ({previewIncrementalRanges.length})
                </span>

                <button
                  type="button"
                  onClick={addIncrementalRangesBatch}
                  disabled={previewIncrementalRanges.length === 0}
                  className="btn-coral px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#f06a55]/20 disabled:opacity-40 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>Auto-Fill & Add All {previewIncrementalRanges.length} Day Ranges</span>
                </button>
              </div>

              {/* Sample Generated Items List */}
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1 font-mono text-[11px]">
                {previewIncrementalRanges.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-1.5 rounded bg-app border border-theme text-secondary-theme">
                    <span className="text-[#f06a55] font-bold">Day {item.dayIndex}:</span>
                    <span className="truncate flex-1 mx-2">{item.value}</span>
                    <span className="text-[10px] text-muted-theme">Row {baseRow + (item.dayIndex - 1) * rowStep}+</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: Standard Single A1 Range Input */}
        {rangeAddMode === "standard" && (
          <div className="space-y-3 pt-1 animate-in fade-in duration-150">
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
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSingleRange())}
                  placeholder="e.g. A1:L15, A:Z, 1:100"
                  className="flex-1 px-3 py-2.5 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs font-mono"
                />
                <button
                  type="button"
                  onClick={addSingleRange}
                  disabled={!rangeInput.trim()}
                  className="btn-coral px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 disabled:opacity-40 transition shadow-md shadow-[#f06a55]/20"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
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
        )}
      </div>
    </div>
  );
}
