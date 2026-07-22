"use client";

import React from "react";
import StepSheetsRanges from "./StepSheetsRanges";
import { WizardFormState } from "@/types/workflow";

interface StepSheetsProps {
  state: WizardFormState;
  onChange: (updates: Partial<WizardFormState>) => void;
}

export default function StepSheets({ state, onChange }: StepSheetsProps) {
  return <StepSheetsRanges state={state} onChange={onChange} />;
}
