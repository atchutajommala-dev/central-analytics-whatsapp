"use client";

import React from "react";
import StepScheduleDestinations from "./StepScheduleDestinations";
import { WizardFormState } from "@/types/workflow";

interface StepScheduleProps {
  state: WizardFormState;
  onChange: (updates: Partial<WizardFormState>) => void;
}

export default function StepSchedule({ state, onChange }: StepScheduleProps) {
  return <StepScheduleDestinations state={state} onChange={onChange} />;
}
