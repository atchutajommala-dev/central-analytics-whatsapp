"use client";

import React, { useState, useCallback } from "react";
import {
  FileText, Database, Grid3X3, Download, Clock, Send, CheckCircle,
  ChevronLeft, ChevronRight, X, Save, Rocket
} from "lucide-react";
import { WizardStepId, WizardFormState, DEFAULT_WIZARD_STATE, WIZARD_STEPS, wizardStateToJob } from "@/types/workflow";
import { WorkflowJob } from "@/types/dashboard";
import StepBasics from "@/components/Wizard/steps/StepBasics";
import StepSource from "@/components/Wizard/steps/StepSource";
import StepSheetsRanges from "@/components/Wizard/steps/StepSheetsRanges";
import StepExport from "@/components/Wizard/steps/StepExport";
import StepScheduleDestinations from "@/components/Wizard/steps/StepScheduleDestinations";
import StepReview from "@/components/Wizard/steps/StepReview";

const STEP_ICONS: Record<string, React.ElementType> = {
  FileText, Database, Grid3X3, Grid3x3: Grid3X3, Download, Clock, Send, CheckCircle,
};

interface WorkflowWizardProps {
  editingJob?: WorkflowJob | null;
  userEmail?: string;
  onSave: (jobData: ReturnType<typeof wizardStateToJob>) => Promise<void>;
  onCancel: () => void;
}

export default function WorkflowWizard({ editingJob, userEmail, onSave, onCancel }: WorkflowWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formState, setFormState] = useState<WizardFormState>(() => {
    if (editingJob) {
      return {
        name: editingJob.name,
        description: editingJob.description || "",
        owner: editingJob.owner || userEmail || "",
        tags: editingJob.tags || [],
        priority: editingJob.priority || "medium",
        environment: editingJob.environment || "production",
        source: editingJob.source || DEFAULT_WIZARD_STATE.source,
        fetchedSheets: editingJob.source?.selected_worksheets || [],
        ranges: editingJob.ranges || [],
        export_config: editingJob.export_config || DEFAULT_WIZARD_STATE.export_config,
        schedule: editingJob.schedule || DEFAULT_WIZARD_STATE.schedule,
        retry: editingJob.retry || DEFAULT_WIZARD_STATE.retry,
        destinations: editingJob.destinations || [],
        notifications: editingJob.notifications || DEFAULT_WIZARD_STATE.notifications,
      };
    }
    return { ...DEFAULT_WIZARD_STATE, owner: userEmail || "" };
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateForm = useCallback((updates: Partial<WizardFormState>) => {
    setFormState((prev) => ({ ...prev, ...updates }));
  }, []);

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  const goPrev = () => setCurrentStep((s) => Math.max(s - 1, 0));
  const goToStep = (i: number) => setCurrentStep(i);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const jobData = wizardStateToJob(formState, editingJob || undefined);
      await onSave(jobData);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const stepDef = WIZARD_STEPS[currentStep];
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const renderStep = () => {
    switch (stepDef.id) {
      case "basics": return <StepBasics state={formState} onChange={updateForm} />;
      case "source": return <StepSource state={formState} onChange={updateForm} />;
      case "sheets-ranges": return <StepSheetsRanges state={formState} onChange={updateForm} />;
      case "export": return <StepExport state={formState} onChange={updateForm} />;
      case "schedule-destinations": return <StepScheduleDestinations state={formState} onChange={updateForm} />;
      case "review": return <StepReview state={formState} onChange={updateForm} />;
      default: return null;
    }
  };

  return (
    <div className="space-y-0 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-5 border-b border-theme">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary-theme flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#f06a55] text-white flex items-center justify-center shadow-sm shadow-[#f06a55]/30">
              <Rocket className="w-4 h-4" />
            </div>
            {editingJob ? "Edit Workflow" : "Create Workflow"}
          </h1>
          <p className="text-xs text-muted-theme mt-1">
            {editingJob
              ? `Editing "${editingJob.name}" (v${editingJob.version})`
              : "Configure a new automation workflow step by step."}
          </p>
        </div>
        <button onClick={onCancel} className="p-2 rounded-xl text-muted-theme hover:text-primary-theme btn-secondary-theme transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Stepper */}
      <div className="py-6">
        <div className="flex items-center justify-between gap-1">
          {WIZARD_STEPS.map((step, i) => {
            const StepIcon = STEP_ICONS[step.icon] || FileText;
            const isActive = i === currentStep;
            const isCompleted = i < currentStep;
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => goToStep(i)}
                  className={`flex flex-col items-center gap-1.5 min-w-0 group transition-all ${
                    isActive ? "scale-105" : ""
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                      isActive
                        ? "bg-[#f06a55] text-white shadow-lg shadow-[#f06a55]/30 ring-2 ring-[#f06a55]/20"
                        : isCompleted
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : "bg-input-theme text-muted-theme border border-theme group-hover:border-[#f06a55]/30"
                    }`}
                  >
                    {isCompleted ? <CheckCircle className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <span
                    className={`text-[10px] font-bold truncate max-w-[90px] ${
                      isActive ? "text-[#f06a55]" : isCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-muted-theme"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
                {i < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 rounded-full mx-1 transition-all ${
                      i < currentStep ? "bg-emerald-500/40" : "bg-input-theme"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="pw-card p-6 min-h-[420px]">
        <div className="mb-4">
          <h2 className="text-base font-bold text-primary-theme">{stepDef.label}</h2>
          <p className="text-xs text-muted-theme mt-0.5">{stepDef.description}</p>
        </div>

        <div className="mt-4">
          {renderStep()}
        </div>
      </div>

      {/* Error */}
      {saveError && (
        <div className="px-4 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
          {saveError}
        </div>
      )}

      {/* Footer Navigation */}
      <div className="flex items-center justify-between pt-5 border-t border-theme">
        <button
          onClick={isFirstStep ? onCancel : goPrev}
          className="px-4 py-2 rounded-xl btn-secondary-theme text-xs font-bold flex items-center gap-1.5 transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          {isFirstStep ? "Cancel" : "Previous"}
        </button>

        <div className="flex items-center gap-2.5">
          {/* Save as Draft */}
          {!isLastStep && (
            <button
              onClick={handleSave}
              disabled={isSaving || !formState.name}
              className="px-3 py-2 rounded-xl btn-secondary-theme text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 transition"
            >
              <Save className="w-3.5 h-3.5" />
              Save Draft
            </button>
          )}

          {isLastStep ? (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-coral px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-md shadow-[#f06a55]/20 disabled:opacity-50 transition"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  {editingJob ? "Update Workflow" : "Create Workflow"}
                </>
              )}
            </button>
          ) : (
            <button
              onClick={goNext}
              className="btn-coral px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#f06a55]/20 transition"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
