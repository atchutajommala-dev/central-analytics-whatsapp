"use client";

import React, { useState, useEffect } from "react";
import { Clock, Send, Plus, X, MessageCircle, Mail, HardDrive, Hash, Globe, Bell, CheckCircle2 } from "lucide-react";
import { WizardFormState } from "@/types/workflow";
import { DestinationType, DestinationConfig } from "@/types/dashboard";
import { cronToHuman, getNextRun, CRON_PRESETS } from "@/lib/cron-utils";

interface StepScheduleDestinationsProps {
  state: WizardFormState;
  onChange: (updates: Partial<WizardFormState>) => void;
}

const DEST_OPTIONS: { value: DestinationType; label: string; desc: string; icon: React.ElementType }[] = [
  { value: "whatsapp", label: "WhatsApp", desc: "Send via AISensy API", icon: MessageCircle },
  { value: "email", label: "Email", desc: "SMTP or API delivery", icon: Mail },
  { value: "google_drive", label: "Google Drive", desc: "Upload to Drive folder", icon: HardDrive },
  { value: "slack", label: "Slack", desc: "Send to Slack channel", icon: Hash },
  { value: "webhook", label: "Webhook", desc: "POST to custom URL", icon: Globe },
];

export default function StepScheduleDestinations({ state, onChange }: StepScheduleDestinationsProps) {
  const [addingType, setAddingType] = useState<DestinationType | null>(null);

  // Auto-initialize default active WhatsApp destination if destinations array is empty
  useEffect(() => {
    if (state.destinations.length === 0) {
      const defaultWhatsapp: DestinationConfig = {
        id: `dest_whatsapp_default`,
        type: "whatsapp",
        name: "WhatsApp Dispatch (AISensy)",
        enabled: true,
        config: {
          phone_numbers: ["916303054457"],
          campaign_name: "Online Analytics Whatsapp Automation",
        },
      };
      onChange({ destinations: [defaultWhatsapp] });
    }
  }, []);

  const sched = state.schedule;
  const cronDescription = cronToHuman(sched.cron_expression || "0 * * * *");
  const nextRunDate = getNextRun(sched.cron_expression || "0 * * * *");

  const updateSchedule = (updates: Partial<WizardFormState["schedule"]>) => {
    onChange({ schedule: { ...sched, ...updates } });
  };

  const addDestination = (dest: DestinationConfig) => {
    onChange({ destinations: [...state.destinations, dest] });
    setAddingType(null);
  };

  const removeDestination = (id: string) => {
    onChange({ destinations: state.destinations.filter((d) => d.id !== id) });
  };

  const toggleDestination = (id: string) => {
    onChange({
      destinations: state.destinations.map((d) =>
        d.id === id ? { ...d, enabled: !d.enabled } : d
      ),
    });
  };

  const updateDestinationConfig = (id: string, updates: Partial<DestinationConfig["config"]>) => {
    onChange({
      destinations: state.destinations.map((d) =>
        d.id === id ? { ...d, config: { ...d.config, ...updates } } : d
      ),
    });
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* SECTION 1: SCHEDULE CONFIGURATION                                  */}
      {/* ------------------------------------------------------------------ */}
      <div className="p-4 rounded-2xl bg-app border border-theme space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#f06a55]" />
          <h3 className="text-xs font-bold text-primary-theme">Execution Schedule</h3>
        </div>

        {/* Preset Schedule Buttons */}
        <div>
          <label className="block text-[11px] font-bold text-muted-theme mb-1.5">Schedule Presets</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {CRON_PRESETS.slice(0, 4).map((preset) => {
              const isSelected = sched.cron_expression === preset.expression;
              return (
                <button
                  key={preset.expression}
                  type="button"
                  onClick={() => updateSchedule({ cron_expression: preset.expression })}
                  className={`p-2.5 rounded-xl text-left transition border ${
                    isSelected
                      ? "border-[#f06a55] bg-[#f06a55]/10 text-[#f06a55]"
                      : "border-theme bg-input-theme text-secondary-theme hover:border-[#f06a55]/30"
                  }`}
                >
                  <p className="text-xs font-bold">{preset.label}</p>
                  <p className="text-[10px] font-mono opacity-80 mt-0.5">{preset.expression}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Cron Input & Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-secondary-theme mb-1">
              Cron Expression (5 fields)
            </label>
            <input
              type="text"
              value={sched.cron_expression || "0 * * * *"}
              onChange={(e) => updateSchedule({ cron_expression: e.target.value })}
              placeholder="0 * * * *"
              className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs font-mono"
            />
            <p className="text-[11px] text-[#f06a55] font-semibold mt-1 flex items-center gap-1">
              <span>{cronDescription}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-secondary-theme mb-1">Timezone</label>
            <select
              value={sched.timezone || "Asia/Kolkata"}
              onChange={(e) => updateSchedule({ timezone: e.target.value })}
              className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs font-semibold"
            >
              <option value="Asia/Kolkata">Asia/Kolkata (IST +5:30)</option>
              <option value="UTC">UTC (+0:00)</option>
              <option value="America/New_York">America/New_York (EST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
            </select>
            {nextRunDate && (
              <p className="text-[10px] text-muted-theme mt-1 truncate">
                Next run: <span className="font-mono text-primary-theme font-bold">{nextRunDate.toLocaleString()}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 2: DESTINATIONS CONFIGURATION                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-[#f06a55]" />
          <h3 className="text-xs font-bold text-primary-theme">
            Target Dispatches & Destinations ({state.destinations.length})
          </h3>
        </div>

        {/* Active Destinations */}
        {state.destinations.length > 0 ? (
          <div className="space-y-3">
            {state.destinations.map((dest) => {
              const opt = DEST_OPTIONS.find((o) => o.value === dest.type);
              const Icon = opt?.icon || Send;
              const phoneNumbers = ((dest.config?.phone_numbers as string[]) || []).join(", ");
              const campaignName = (dest.config?.campaign_name as string) || "Online Analytics Whatsapp Automation";

              return (
                <div key={dest.id} className="p-4 rounded-xl bg-app border border-theme space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        dest.enabled ? "bg-[#f06a55]/10 text-[#f06a55]" : "bg-input-theme text-muted-theme"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-primary-theme flex items-center gap-1.5">
                          {dest.name}
                          {dest.type === "whatsapp" && (
                            <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                              Active
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] text-muted-theme capitalize">{dest.type.replace("_", " ")}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dest.enabled}
                          onChange={() => toggleDestination(dest.id)}
                          className="sr-only"
                        />
                        <div className={`w-8 h-4 rounded-full transition ${dest.enabled ? "bg-[#f06a55]" : "bg-input-theme border border-theme"}`}>
                          <div className={`w-3 h-3 rounded-full bg-white shadow-sm transition-transform mt-0.5 ${dest.enabled ? "translate-x-4.5 ml-[18px]" : "ml-0.5"}`} />
                        </div>
                      </label>
                      <button onClick={() => removeDestination(dest.id)} className="p-1 rounded-lg text-muted-theme hover:text-rose-500 transition">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Customizable Form for WhatsApp */}
                  {dest.type === "whatsapp" && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-theme text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-secondary-theme mb-1">
                          Phone Numbers (comma-separated) <span className="text-[#f06a55]">*</span>
                        </label>
                        <input
                          type="text"
                          value={phoneNumbers}
                          onChange={(e) => updateDestinationConfig(dest.id, {
                            phone_numbers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                          })}
                          placeholder="916303054457, 919876543210"
                          className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-secondary-theme mb-1">
                          AISensy Campaign Name
                        </label>
                        <input
                          type="text"
                          value={campaignName}
                          onChange={(e) => updateDestinationConfig(dest.id, { campaign_name: e.target.value })}
                          placeholder="Online Analytics Whatsapp Automation"
                          className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-5 text-center rounded-xl border border-dashed border-theme">
            <Send className="w-6 h-6 mx-auto text-muted-theme mb-1.5 opacity-50" />
            <p className="text-xs text-muted-theme">No destinations configured.</p>
          </div>
        )}

        {/* Add Destination Options */}
        {!addingType ? (
          <div>
            <label className="block text-xs font-bold text-secondary-theme mb-2">Add Additional Destination</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {DEST_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAddingType(opt.value)}
                    className="p-3 rounded-xl text-left transition border border-theme bg-app hover:border-[#f06a55]/30 hover:bg-[#f06a55]/5"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-muted-theme" />
                      <span className="text-xs font-bold text-primary-theme">{opt.label}</span>
                    </div>
                    <p className="text-[10px] text-muted-theme">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <DestinationForm
            type={addingType}
            onSave={addDestination}
            onCancel={() => setAddingType(null)}
          />
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SECTION 3: NOTIFICATIONS                                           */}
      {/* ------------------------------------------------------------------ */}
      <div className="pt-3 border-t border-theme">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-4 h-4 text-[#f06a55]" />
          <h3 className="text-xs font-bold text-primary-theme">Failure & Alert Notifications</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(["on_success", "on_failure", "on_retry", "on_timeout"] as const).map((event) => {
            const isActive = state.notifications.events.includes(event);
            return (
              <label key={event} className="flex items-center gap-2 p-2 rounded-xl border border-theme bg-app cursor-pointer select-none hover:border-[#f06a55]/30 transition">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={() => {
                    const events = isActive
                      ? state.notifications.events.filter((e) => e !== event)
                      : [...state.notifications.events, event];
                    onChange({ notifications: { ...state.notifications, events } });
                  }}
                  className="w-3.5 h-3.5 rounded text-[#f06a55] accent-[#f06a55]"
                />
                <span className="text-[11px] font-semibold text-primary-theme capitalize">
                  {event.replace("on_", "").replace("_", " ")}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Inline Destination Form for additional destinations
function DestinationForm({
  type,
  onSave,
  onCancel,
}: {
  type: DestinationType;
  onSave: (dest: DestinationConfig) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [config, setConfig] = useState<Record<string, unknown>>({
    campaign_name: "Online Analytics Whatsapp Automation",
  });

  const handleSave = () => {
    const id = `dest_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    onSave({
      id,
      type,
      name: name || (type === "whatsapp" ? "WhatsApp Dispatch" : type),
      enabled: true,
      config,
    });
  };

  return (
    <div className="p-4 rounded-xl border border-[#f06a55]/30 bg-[#f06a55]/5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-[#f06a55] capitalize">Configure {type.replace("_", " ")}</h4>
        <button onClick={onCancel} className="text-muted-theme hover:text-primary-theme"><X className="w-3.5 h-3.5" /></button>
      </div>

      <div>
        <label className="block text-[10px] font-bold text-secondary-theme mb-1">Destination Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`My ${type.replace("_", " ")} destination`}
          className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs"
        />
      </div>

      {type === "whatsapp" && (
        <>
          <div>
            <label className="block text-[10px] font-bold text-secondary-theme mb-1">
              Target Phone Numbers (comma-separated) <span className="text-[#f06a55]">*</span>
            </label>
            <input
              type="text"
              onChange={(e) => setConfig({ ...config, phone_numbers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="919876543210, 919998887776"
              className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs font-mono"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-secondary-theme mb-1">AISensy Campaign Name</label>
            <input
              type="text"
              value={(config.campaign_name as string) || "Online Analytics Whatsapp Automation"}
              onChange={(e) => setConfig({ ...config, campaign_name: e.target.value })}
              placeholder="Online Analytics Whatsapp Automation"
              className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs"
            />
          </div>
        </>
      )}

      {type === "email" && (
        <>
          <div>
            <label className="block text-[10px] font-bold text-secondary-theme mb-1">To Email Recipients (comma-separated)</label>
            <input
              type="text"
              onChange={(e) => setConfig({ ...config, to: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
              placeholder="team@company.com, manager@company.com"
              className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-secondary-theme mb-1">Subject</label>
            <input
              type="text"
              onChange={(e) => setConfig({ ...config, subject: e.target.value })}
              placeholder="Daily Analytics Report — {{today}}"
              className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs"
            />
          </div>
        </>
      )}

      {type === "google_drive" && (
        <div>
          <label className="block text-[10px] font-bold text-secondary-theme mb-1">Drive Folder ID</label>
          <input
            type="text"
            onChange={(e) => setConfig({ ...config, folder_id: e.target.value })}
            placeholder="1BxiMVs0XRA5nFMd..."
            className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs font-mono"
          />
        </div>
      )}

      {(type === "slack" || type === "webhook" || type === "rest_api") && (
        <div>
          <label className="block text-[10px] font-bold text-secondary-theme mb-1">Webhook URL</label>
          <input
            type="url"
            onChange={(e) => setConfig({ ...config, webhook_url: e.target.value, url: e.target.value })}
            placeholder="https://hooks.slack.com/services/..."
            className="w-full px-3 py-2 bg-input-theme text-primary-theme border border-theme rounded-xl focus:outline-none focus:ring-2 focus:ring-[#f06a55]/50 text-xs font-mono"
          />
        </div>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-xl btn-secondary-theme text-xs font-bold">Cancel</button>
        <button onClick={handleSave} className="btn-coral px-4 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1">
          <Plus className="w-3 h-3" /> Add Destination
        </button>
      </div>
    </div>
  );
}
