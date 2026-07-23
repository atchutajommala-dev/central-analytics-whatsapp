// ============================================================================
// Enterprise Workflow Scheduler — Core Type System
// ============================================================================

// ---------------------------------------------------------------------------
// Dashboard Tab Navigation
// ---------------------------------------------------------------------------
export type DashboardTab =
  | "overview"
  | "workflows"
  | "create-workflow"
  | "dag-detail"
  | "executions"
  | "log-viewer"
  | "monitoring"
  | "users"
  | "settings";

// ---------------------------------------------------------------------------
// Authentication Method
// ---------------------------------------------------------------------------
export type AuthMethod = "service_account" | "oauth" | "api_key";

// ---------------------------------------------------------------------------
// Google Sheets Source Configuration
// ---------------------------------------------------------------------------
export interface SheetSource {
  spreadsheet_id: string;
  spreadsheet_url?: string;
  auth_method: AuthMethod;
  service_account_key_env?: string; // env var name holding the key
  selected_worksheets: WorksheetInfo[];
}

export interface WorksheetInfo {
  sheet_id: number; // GID
  title: string;
  index: number;
  row_count?: number;
  column_count?: number;
  is_favorite?: boolean;
}

// ---------------------------------------------------------------------------
// Range Definitions
// ---------------------------------------------------------------------------
export type RangeType = "a1" | "named" | "entire_sheet" | "dynamic" | "union";

export interface RangeDefinition {
  id: string;
  type: RangeType;
  value: string; // e.g. "A1:Z100", "SalesData", "{{dynamic_range}}"
  worksheet?: string; // e.g. "Sheet1"
  label?: string; // User-friendly label
  variables?: string[]; // Referenced variables
}

// ---------------------------------------------------------------------------
// Dynamic Variables
// ---------------------------------------------------------------------------
export interface DynamicVariable {
  name: string; // e.g. "today"
  template: string; // e.g. "{{today}}"
  description: string;
  category: "date" | "sheet" | "system" | "custom";
  example_value?: string;
}

// ---------------------------------------------------------------------------
// Export Configuration
// ---------------------------------------------------------------------------
export type ExportFormat =
  | "png"
  | "jpeg"
  | "pdf"
  | "csv"
  | "excel"
  | "svg"
  | "webp"
  | "zip";

export type PageOrientation = "portrait" | "landscape";
export type PageSize = "A0" | "A1" | "A2" | "A3" | "A4" | "A5" | "letter" | "legal" | "tabloid";

export interface ExportConfig {
  format: ExportFormat;
  quality?: number; // 1-100
  resolution?: number; // pixels
  scale?: number; // multiplier
  dpi?: number;
  zoom?: number;
  transparent_background?: boolean;
  dark_theme?: boolean;
  crop_whitespace?: boolean;
  margins?: { top: number; right: number; bottom: number; left: number };
  padding?: number;
  orientation?: PageOrientation;
  page_size?: PageSize;
  fit_width?: boolean;
  fit_height?: boolean;
  compression?: "none" | "low" | "medium" | "high";
  anti_aliasing?: boolean;
  watermark?: string;
  filename_pattern?: string; // supports variables
  include_timestamp?: boolean;
  gridlines?: boolean;
}

// ---------------------------------------------------------------------------
// Schedule Configuration
// ---------------------------------------------------------------------------
export type ScheduleType =
  | "cron"
  | "interval"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "once"
  | "manual";

export type IntervalUnit = "minutes" | "hours" | "days";
export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type RetryStrategy = "fixed" | "exponential" | "linear";

export interface ScheduleConfig {
  type: ScheduleType;
  cron_expression?: string;
  interval_value?: number;
  interval_unit?: IntervalUnit;
  time_of_day?: string; // HH:mm
  days_of_week?: DayOfWeek[];
  day_of_month?: number;
  month_of_year?: number;
  timezone: string;
  execution_window?: { start: string; end: string }; // HH:mm
  skip_holidays?: boolean;
  run_on_weekdays_only?: boolean;
}

export interface RetryConfig {
  max_retries: number;
  retry_delay_seconds: number;
  retry_strategy: RetryStrategy;
  timeout_seconds: number;
  backoff_multiplier?: number;
}

// ---------------------------------------------------------------------------
// Destination Configuration
// ---------------------------------------------------------------------------
export type DestinationType =
  | "whatsapp"
  | "email"
  | "google_drive"
  | "slack"
  | "teams"
  | "discord"
  | "telegram"
  | "s3"
  | "ftp"
  | "webhook"
  | "rest_api"
  | "local_storage";

export interface DestinationConfig {
  id: string;
  type: DestinationType;
  name: string;
  enabled: boolean;
  config: Record<string, unknown>;
  // Type-specific fields stored in config:
  // WhatsApp: { phone_numbers: string[], campaign_name: string }
  // Email: { to: string[], cc?: string[], subject: string }
  // Google Drive: { folder_id: string, shared_drive?: boolean }
  // Slack: { channel: string, webhook_url: string }
  // Teams: { webhook_url: string }
  // Discord: { webhook_url: string }
  // Telegram: { chat_id: string, bot_token_env: string }
  // S3: { bucket: string, path: string, region: string }
  // FTP: { host: string, port: number, path: string }
  // Webhook: { url: string, method: string, headers: Record<string, string> }
  // REST API: { url: string, method: string, headers: Record<string, string>, body_template: string }
}

// ---------------------------------------------------------------------------
// Notification Configuration
// ---------------------------------------------------------------------------
export type NotificationEvent =
  | "on_success"
  | "on_failure"
  | "on_retry"
  | "on_timeout"
  | "on_partial_success";

export interface NotificationConfig {
  enabled: boolean;
  events: NotificationEvent[];
  channels: NotificationChannel[];
  include_logs?: boolean;
  include_attachments?: boolean;
  include_execution_time?: boolean;
  include_error_messages?: boolean;
  include_screenshots?: boolean;
}

export interface NotificationChannel {
  type: "email" | "slack" | "webhook";
  target: string; // email address, slack channel, webhook url
}

// ---------------------------------------------------------------------------
// Job Status & Execution
// ---------------------------------------------------------------------------
export type JobStatus =
  | "active"
  | "paused"
  | "disabled"
  | "draft"
  | "archived";

export type ExecutionStatus =
  | "running"
  | "queued"
  | "scheduled"
  | "success"
  | "failed"
  | "retrying"
  | "cancelled"
  | "timeout"
  | "partial_success";

export type TriggerType = "scheduled" | "manual" | "api" | "webhook" | "dependency";

// ---------------------------------------------------------------------------
// Core WorkflowJob — The central entity
// ---------------------------------------------------------------------------
export interface WorkflowJob {
  _id: string;

  // Identity
  name: string;
  description?: string;
  owner: string; // email
  tags: string[];
  priority: "low" | "medium" | "high" | "critical";
  environment: "production" | "staging" | "development";

  // Status
  status: JobStatus;
  enabled: boolean;

  // Source
  source: SheetSource;

  // Ranges
  ranges: RangeDefinition[];

  // Export
  export_config: ExportConfig;

  // Schedule
  schedule: ScheduleConfig;
  retry: RetryConfig;

  // Destinations
  destinations: DestinationConfig[];

  // Notifications
  notifications: NotificationConfig;

  // Execution Metadata
  last_run_at?: string;
  last_status?: ExecutionStatus;
  last_error?: string;
  next_run_at?: string;
  total_runs: number;
  success_count: number;
  failure_count: number;
  avg_duration_ms?: number;

  // Versioning
  version: number;
  published: boolean;

  // Audit
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
}

// ---------------------------------------------------------------------------
// Execution Record — Per-run history
// ---------------------------------------------------------------------------
export interface ExecutionRecord {
  _id: string;
  job_id: string;
  job_name: string;
  run_number: number;

  // Timing
  start_time: string;
  end_time?: string;
  duration_ms?: number;
  queue_time_ms?: number;

  // Status
  status: ExecutionStatus;
  exit_code?: number;
  retry_count: number;

  // Trigger
  trigger_type: TriggerType;
  triggered_by?: string;

  // Results
  artifacts: ExecutionArtifact[];
  destinations_reached: number;
  destinations_failed: number;

  // Logs
  logs: string[];
  error?: string;
  error_stack?: string;

  // Resources
  worker?: string;
  memory_mb?: number;
  cpu_percent?: number;

  // Metadata
  config_snapshot?: Partial<WorkflowJob>;
}

export interface ExecutionArtifact {
  type: "image" | "pdf" | "csv" | "excel" | "other";
  url: string;
  filename: string;
  size_bytes?: number;
  format?: string;
}

// ---------------------------------------------------------------------------
// DAG Visualization
// ---------------------------------------------------------------------------
export interface DagNode {
  id: string;
  type: "source" | "transform" | "export" | "destination" | "notification";
  label: string;
  status?: ExecutionStatus;
  duration_ms?: number;
  dependencies: string[];
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Job Versioning
// ---------------------------------------------------------------------------
export interface JobVersion {
  _id: string;
  job_id: string;
  version_number: number;
  config_snapshot: Partial<WorkflowJob>;
  created_by: string;
  created_at: string;
  published: boolean;
  change_notes?: string;
}

// ---------------------------------------------------------------------------
// Audit Trail
// ---------------------------------------------------------------------------
export interface AuditEntry {
  _id: string;
  actor: string; // email or "system"
  action: "create" | "update" | "delete" | "execute" | "pause" | "resume" | "clone" | "publish" | "rollback";
  target_type: "job" | "user" | "execution" | "version";
  target_id: string;
  timestamp: string;
  details?: Record<string, unknown>;
  ip_address?: string;
}

// ---------------------------------------------------------------------------
// Users & Permissions
// ---------------------------------------------------------------------------
export type UserRole = "admin" | "editor" | "viewer" | "executor" | "dev";

export interface DbUser {
  _id?: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  role: UserRole;
  createdAt?: string;
  lastLoginAt?: string;
}

// ---------------------------------------------------------------------------
// System Status
// ---------------------------------------------------------------------------
export interface SystemStatus {
  status: "ready" | "configuration_needed" | "degraded" | "error";
  ist_time: string;
  ist_hour: number;
  destinations_count: number;
  active_jobs_count: number;
  running_jobs_count: number;
  queued_jobs_count: number;
  mongo_connected: boolean;
  env_status?: Record<string, boolean>;
  vercel_env?: string;
  uptime_seconds?: number;
  last_execution_at?: string;
}

// ---------------------------------------------------------------------------
// Monitoring Metrics
// ---------------------------------------------------------------------------
export interface MonitoringMetrics {
  jobs_running: number;
  jobs_failed_today: number;
  jobs_succeeded_today: number;
  total_runs_today: number;
  avg_runtime_ms: number;
  longest_job_ms: number;
  retry_count_today: number;
  failure_rate_percent: number;
  queue_size: number;
  upcoming_jobs: UpcomingJob[];
  daily_trend: TrendPoint[];
  hourly_heatmap: HeatmapCell[];
}

export interface UpcomingJob {
  job_id: string;
  job_name: string;
  next_run: string;
  schedule_type: ScheduleType;
}

export interface TrendPoint {
  date: string;
  success: number;
  failed: number;
  total: number;
}

export interface HeatmapCell {
  day: number; // 0-6
  hour: number; // 0-23
  count: number;
  intensity: number; // 0-100
}

// ---------------------------------------------------------------------------
// KPI Display Metric
// ---------------------------------------------------------------------------
export interface KpiMetric {
  id: string;
  title: string;
  value: string | number;
  change: string;
  isPositive: boolean;
  subtext: string;
  sparkline: number[];
  icon: string;
  accentColor: string;
}

// ---------------------------------------------------------------------------
// Log Entry (for display)
// ---------------------------------------------------------------------------
export interface LogEntry {
  _id: string;
  job_id: string;
  job_name: string;
  sheet_id?: string;
  status: ExecutionStatus | string;
  timestamp: string;
  duration_ms?: number;
  uploaded_urls?: string[];
  sent_count?: number;
  logs?: string[];
  error?: string;
  error_stack?: string;
  trigger_type?: TriggerType;
  triggered_by?: string;
  retry_count?: number;
  artifacts?: ExecutionArtifact[];
}

// ---------------------------------------------------------------------------
// API Response Types
// ---------------------------------------------------------------------------
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, string[]>;
}
