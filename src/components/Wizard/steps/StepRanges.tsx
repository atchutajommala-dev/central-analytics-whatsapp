"use client";

import React from "react";
import StepSheetsRanges from "./StepSheetsRanges";
import { WizardFormState } from "@/types/workflow";

interface StepRangesProps {
  state: WizardFormState;
  onChange: (updates: Partial<WizardFormState>) => void;
}

export default function StepRanges({ state, onChange }: StepRangesProps) {
  return <StepSheetsRanges state={state} onChange={onChange} />;
}
