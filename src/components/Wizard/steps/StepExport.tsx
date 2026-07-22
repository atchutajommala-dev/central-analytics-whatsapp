"use client";

import React from "react";
import { Image, FileText, FileSpreadsheet, Code, Archive } from "lucide-react";
import { WizardFormState } from "@/types/workflow";
import { ExportFormat, PageOrientation, PageSize } from "@/types/dashboard";

interface StepExportProps {
  state: WizardFormState;
  onChange: (updates: Partial<WizardFormState>) => void;
}

const FORMAT_OPTIONS: { value: ExportFormat; label: string; desc: string; icon: React.ElementType }[] = [
  { value: "jpeg", label: "JPEG", desc: "Compressed image, ideal for WhatsApp", icon: Image },
  { value: "png", label: "PNG", desc: "Lossless image with transparency support", icon: Image },
  { value: "pdf", label: "PDF", desc: "Document format, great for email", icon: FileText },
  { value: "webp", label: "WebP", desc: "Modern format, smaller file size", icon: Image },
  { value: "svg", label: "SVG", desc: "Vector graphics, scalable", icon: Code },
  { value: "csv", label: "CSV", desc: "Raw data export", icon: FileSpreadsheet },
  { value: "excel", label: "Excel", desc: "Spreadsheet format (.xlsx)", icon: FileSpreadsheet },
  { value: "zip", label: "ZIP", desc: "Compressed archive of outputs", icon: Archive },
];

export default function StepExport({ state, onChange }: StepExportProps) {
  const ec = state.export_config;

  const updateExport = (updates: Partial<WizardFormState["export_config"]>) => {
    onChange({ export_config: { ...ec, ...updates } });
  };

  const isImageFormat = ["jpeg", "png", "webp"].includes(ec.format);
  const isPdfFormat = ec.format === "pdf";

  return (
    <div className="space-y-5">
      {/* Format Selection */}
      <div>
        <label className="block text-xs font-bold text-secondary-theme mb-2">Export Format</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FORMAT_OPTIONS.map((fmt) => {
            const Icon = fmt.icon;
            const isSelected = ec.format === fmt.value;
            return (
              <button
                key={fmt.value}
                type="button"
                onClick={() => updateExport({ format: fmt.value })}
                className={`p-3 rounded-xl text-left transition border ${
                  isSelected
                    ? "border-[#f06a55] bg-[#f06a55]/5 ring-1 ring-[#f06a55]/20"
                    : "border-theme bg-app hover:border-[#f06a55]/30"
                }`}
              >
                <Icon className={`w-4 h-4 mb-1 ${isSelected ? "text-[#f06a55]" : "text-muted-theme"}`} />
                <p className={`text-xs font-bold ${isSelected ? "text-[#f06a55]" : "text-primary-theme"}`}>{fmt.label}</p>
                <p className="text-[10px] text-muted-theme">{fmt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Image Quality & DPI */}
      {isImageFormat && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-secondary-theme mb-1.5">
              Quality: {ec.quality || 85}%
            </label>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={ec.quality || 85}
              onChange={(e) => updateExport({ quality: parseInt(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none bg-input-theme accent-[#f06a55]"
            />
            <div className="flex justify-between text-[10px] text-muted-theme mt-1">
              <span>Small file</span>
              <span>Best quality</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary-theme mb-1.5">
              DPI: {ec.dpi || 300}
            </label>
            <input
              type="range"
              min={72}
              max={600}
              step={72}
              value={ec.dpi || 300}
              onChange={(e) => updateExport({ dpi: parseInt(e.target.value) })}
              className="w-full h-1.5 rounded-full appearance-none bg-input-theme accent-[#f06a55]"
            />
            <div className="flex justify-between text-[10px] text-muted-theme mt-1">
              <span>72 (Screen)</span>
              <span>600 (Print)</span>
            </div>
          </div>
        </div>
      )}

      {/* Page Settings (PDF & Image) */}
      {(isImageFormat || isPdfFormat) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-secondary-theme mb-1.5">Orientation</label>
            <div className="flex gap-1.5">
              {(["landscape", "portrait"] as PageOrientation[]).map((orient) => (
                <button
                  key={orient}
                  type="button"
                  onClick={() => updateExport({ orientation: orient })}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold capitalize transition ${
                    ec.orientation === orient
                      ? "bg-[#f06a55] text-white"
                      : "btn-secondary-theme text-muted-theme"
                  }`}
                >
                  {orient}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary-theme mb-1.5">Page Size</label>
            <select
              value={ec.page_size || "A2"}
              onChange={(e) => updateExport({ page_size: e.target.value as PageSize })}
              className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs"
            >
              {(["A0", "A1", "A2", "A3", "A4", "A5", "letter", "legal", "tabloid"] as PageSize[]).map((size) => (
                <option key={size} value={size}>{size.toUpperCase()}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Image Processing Options */}
      {isImageFormat && (
        <div>
          <label className="block text-xs font-bold text-secondary-theme mb-2">Processing Options</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {([
              { key: "crop_whitespace", label: "Crop Whitespace" },
              { key: "transparent_background", label: "Transparent BG" },
              { key: "dark_theme", label: "Dark Theme" },
              { key: "anti_aliasing", label: "Anti-aliasing" },
              { key: "fit_width", label: "Fit Width" },
              { key: "include_timestamp", label: "Add Timestamp" },
            ] as const).map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 p-2 rounded-xl border border-theme bg-app cursor-pointer select-none hover:border-[#f06a55]/30 transition">
                <input
                  type="checkbox"
                  checked={!!ec[opt.key]}
                  onChange={(e) => updateExport({ [opt.key]: e.target.checked })}
                  className="w-3.5 h-3.5 rounded text-[#f06a55] accent-[#f06a55]"
                />
                <span className="text-[11px] font-semibold text-primary-theme">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Compression */}
      <div>
        <label className="block text-xs font-bold text-secondary-theme mb-1.5">Compression</label>
        <div className="flex gap-1.5">
          {(["none", "low", "medium", "high"] as const).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => updateExport({ compression: level })}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold capitalize transition ${
                ec.compression === level
                  ? "bg-[#f06a55] text-white"
                  : "btn-secondary-theme text-muted-theme"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
