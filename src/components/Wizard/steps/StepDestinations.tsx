"use client";

import React from "react";
import StepScheduleDestinations from "./StepScheduleDestinations";
import { WizardFormState } from "@/types/workflow";

interface StepDestinationsProps {
  state: WizardFormState;
  onChange: (updates: Partial<WizardFormState>) => void;
}

export default function StepDestinations({ state, onChange }: StepDestinationsProps) {
  return <StepScheduleDestinations state={state} onChange={onChange} />;
}
