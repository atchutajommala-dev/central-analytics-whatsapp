"use client";

import React, { useState } from "react";
import { Tag, Plus, X } from "lucide-react";
import { WizardFormState } from "@/types/workflow";

interface StepBasicsProps {
  state: WizardFormState;
  onChange: (updates: Partial<WizardFormState>) => void;
}

export default function StepBasics({ state, onChange }: StepBasicsProps) {
  const [newTag, setNewTag] = useState("");

  const addTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !state.tags.includes(tag)) {
      onChange({ tags: [...state.tags, tag] });
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    onChange({ tags: state.tags.filter((t) => t !== tag) });
  };

  return (
    <div className="space-y-5">
      {/* Workflow Name */}
      <div>
        <label className="block text-xs font-bold text-secondary-theme mb-1.5">
          Workflow Name <span className="text-[#f06a55]">*</span>
        </label>
        <input
          type="text"
          value={state.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Daily Analytics Dashboard Export"
          className="w-full px-3 py-2.5 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-sm font-semibold"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-bold text-secondary-theme mb-1.5">
          Description
        </label>
        <textarea
          value={state.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Describe what this workflow does, which sheet tabs it exports, and target dispatches..."
          rows={3}
          className="w-full px-3 py-2.5 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-sm resize-none"
        />
      </div>

      {/* Owner Email */}
      <div>
        <label className="block text-xs font-bold text-secondary-theme mb-1.5">
          Owner Email
        </label>
        <input
          type="email"
          value={state.owner}
          onChange={(e) => onChange({ owner: e.target.value })}
          placeholder="user@company.com"
          className="w-full px-3 py-2.5 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-sm"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-bold text-secondary-theme mb-1.5">
          Tags
        </label>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {state.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#f06a55]/10 text-[#f06a55] text-xs font-bold border border-[#f06a55]/20"
            >
              <Tag className="w-3 h-3" />
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-rose-500 transition">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
            placeholder="Add tag..."
            className="flex-1 px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs"
          />
          <button
            type="button"
            onClick={addTag}
            className="px-3 py-2 rounded-xl btn-secondary-theme text-xs font-bold flex items-center gap-1 transition hover:border-[#f06a55]/30"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <div className="flex gap-1.5 mt-2">
          {["analytics", "dashboard", "report", "daily", "sales", "finance"].map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                if (!state.tags.includes(suggestion)) {
                  onChange({ tags: [...state.tags, suggestion] });
                }
              }}
              className="px-2 py-0.5 rounded-lg text-[10px] font-semibold text-muted-theme bg-app border border-theme hover:border-[#f06a55]/30 hover:text-[#f06a55] transition"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
