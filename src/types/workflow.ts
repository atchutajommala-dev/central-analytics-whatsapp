// ============================================================================
// Workflow Wizard — State Types & Step Definitions
// ============================================================================

import {
  SheetSource,
  WorksheetInfo,
  RangeDefinition,
  ExportConfig,
  ScheduleConfig,
  RetryConfig,
  DestinationConfig,
  NotificationConfig,
  WorkflowJob,
} from "./dashboard";

// ---------------------------------------------------------------------------
// Wizard Step IDs
// ---------------------------------------------------------------------------
export type WizardStepId =
  | "basics"
  | "source"
  | "sheets-ranges"
  | "export"
  | "schedule-destinations"
  | "review";

// ---------------------------------------------------------------------------
// Step Definition (metadata for rendering)
// ---------------------------------------------------------------------------
export interface WizardStepDef {
  id: WizardStepId;
  label: string;
  description: string;
  icon: string; // lucide icon name
  required: boolean;
}

export const WIZARD_STEPS: WizardStepDef[] = [
  {
    id: "basics",
    label: "Basics",
    description: "Name, description, and tags",
    icon: "FileText",
    required: true,
  },
  {
    id: "source",
    label: "Source",
    description: "Google Sheet link & verification",
    icon: "Database",
    required: true,
  },
  {
    id: "sheets-ranges",
    label: "Sheets & Ranges",
    description: "Select tabs & cell ranges",
    icon: "Grid3x3",
    required: true,
  },
  {
    id: "export",
    label: "Export",
    description: "Format, quality, and options",
    icon: "Download",
    required: true,
  },
  {
    id: "schedule-destinations",
    label: "Schedule & Destinations",
    description: "Execution frequency & target dispatches",
    icon: "Clock",
    required: true,
  },
  {
    id: "review",
    label: "Review",
    description: "Review and save",
    icon: "CheckCircle",
    required: true,
  },
];

// ---------------------------------------------------------------------------
// Wizard Form State (accumulated across all steps)
// ---------------------------------------------------------------------------
export interface WizardFormState {
  // Step 1: Basics
  name: string;
  description: string;
  owner: string;
  tags: string[];
  priority: "low" | "medium" | "high" | "critical";
  environment: "production" | "staging" | "development";

  // Step 2: Source
  source: SheetSource;
  fetchedSheets: WorksheetInfo[];

  // Step 3: Sheets & Ranges
  ranges: RangeDefinition[];

  // Step 4: Export
  export_config: ExportConfig;

  // Step 5: Schedule & Destinations
  schedule: ScheduleConfig;
  retry: RetryConfig;
  destinations: DestinationConfig[];
  notifications: NotificationConfig;
}

// ---------------------------------------------------------------------------
// Default Values
// ---------------------------------------------------------------------------
export const DEFAULT_WIZARD_STATE: WizardFormState = {
  name: "",
  description: "",
  owner: "",
  tags: [],
  priority: "medium",
  environment: "production",

  source: {
    spreadsheet_id: "",
    spreadsheet_url: "",
    auth_method: "service_account",
    service_account_key_env: "GOOGLE_CREDENTIALS_JSON",
    selected_worksheets: [],
  },
  fetchedSheets: [],

  ranges: [],

  export_config: {
    format: "jpeg",
    quality: 85,
    dpi: 300,
    crop_whitespace: true,
    orientation: "landscape",
    page_size: "A2",
    compression: "medium",
    anti_aliasing: true,
    include_timestamp: true,
    filename_pattern: "{{job_name}}_{{timestamp}}",
  },

  schedule: {
    type: "cron",
    cron_expression: "0 * * * *",
    timezone: "Asia/Kolkata",
    run_on_weekdays_only: false,
    skip_holidays: false,
  },

  retry: {
    max_retries: 3,
    retry_delay_seconds: 30,
    retry_strategy: "exponential",
    timeout_seconds: 120,
    backoff_multiplier: 2,
  },

  destinations: [],

  notifications: {
    enabled: true,
    events: ["on_failure", "on_timeout"],
    channels: [],
    include_logs: true,
    include_error_messages: true,
  },
};

// ---------------------------------------------------------------------------
// Step Validation Result
// ---------------------------------------------------------------------------
export interface StepValidation {
  valid: boolean;
  errors: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Convert wizard state to WorkflowJob for API submission
// ---------------------------------------------------------------------------
export function wizardStateToJob(
  state: WizardFormState,
  existingJob?: Partial<WorkflowJob>
): Omit<WorkflowJob, "_id"> {
  const now = new Date().toISOString();
  return {
    name: state.name,
    description: state.description,
    owner: state.owner,
    tags: state.tags,
    priority: state.priority,
    environment: state.environment,
    status: "active",
    enabled: true,
    source: state.source,
    ranges: state.ranges,
    export_config: state.export_config,
    schedule: state.schedule,
    retry: state.retry,
    destinations: state.destinations,
    notifications: state.notifications,
    total_runs: existingJob?.total_runs ?? 0,
    success_count: existingJob?.success_count ?? 0,
    failure_count: existingJob?.failure_count ?? 0,
    version: (existingJob?.version ?? 0) + 1,
    published: true,
    created_by: state.owner,
    created_at: existingJob?.created_at ?? now,
    updated_by: state.owner,
    updated_at: now,
  };
}
