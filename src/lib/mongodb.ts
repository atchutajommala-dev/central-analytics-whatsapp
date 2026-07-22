import { MongoClient, Db, Collection, ObjectId } from "mongodb";

const uri = process.env.MONGODB_URI || "";
const dbName = process.env.MONGODB_DB_NAME || "central-analytics-whatsapp";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!uri) {
    throw new Error("Please define the MONGODB_URI environment variable in .env.local or Vercel Environment Variables");
  }

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 3000,
    connectTimeoutMS: 3000,
  });
  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// ============================================================================
// Document Interfaces (MongoDB Schema)
// ============================================================================

export type JobDocument = WorkflowJobDocument;

export interface WorkflowJobDocument {
  _id?: ObjectId;

  // Identity
  name: string;
  description?: string;
  owner: string;
  tags: string[];
  priority: "low" | "medium" | "high" | "critical";
  environment: "production" | "staging" | "development";

  // Status
  status: "active" | "paused" | "disabled" | "draft" | "archived";
  enabled: boolean;

  // Source
  source: {
    spreadsheet_id: string;
    spreadsheet_url?: string;
    auth_method: "service_account" | "oauth" | "api_key";
    service_account_key_env?: string;
    selected_worksheets: {
      sheet_id: number;
      title: string;
      index: number;
      row_count?: number;
      column_count?: number;
      is_favorite?: boolean;
    }[];
  };

  // Ranges
  ranges: {
    id: string;
    type: "a1" | "named" | "entire_sheet" | "dynamic" | "union";
    value: string;
    worksheet?: string;
    label?: string;
    variables?: string[];
  }[];

  // Export
  export_config: {
    format: string;
    quality?: number;
    resolution?: number;
    scale?: number;
    dpi?: number;
    zoom?: number;
    transparent_background?: boolean;
    dark_theme?: boolean;
    crop_whitespace?: boolean;
    margins?: { top: number; right: number; bottom: number; left: number };
    padding?: number;
    orientation?: string;
    page_size?: string;
    fit_width?: boolean;
    fit_height?: boolean;
    compression?: string;
    anti_aliasing?: boolean;
    watermark?: string;
    filename_pattern?: string;
    include_timestamp?: boolean;
  };

  // Schedule
  schedule: {
    type: string;
    cron_expression?: string;
    interval_value?: number;
    interval_unit?: string;
    time_of_day?: string;
    days_of_week?: string[];
    day_of_month?: number;
    month_of_year?: number;
    timezone: string;
    execution_window?: { start: string; end: string };
    skip_holidays?: boolean;
    run_on_weekdays_only?: boolean;
  };

  retry: {
    max_retries: number;
    retry_delay_seconds: number;
    retry_strategy: string;
    timeout_seconds: number;
    backoff_multiplier?: number;
  };

  // Destinations
  destinations: {
    id: string;
    type: string;
    name: string;
    enabled: boolean;
    config: Record<string, unknown>;
  }[];

  // Notifications
  notifications: {
    enabled: boolean;
    events: string[];
    channels: { type: string; target: string }[];
    include_logs?: boolean;
    include_attachments?: boolean;
    include_execution_time?: boolean;
    include_error_messages?: boolean;
    include_screenshots?: boolean;
  };

  // Execution Metadata
  last_run_at?: Date;
  last_status?: string;
  last_error?: string;
  next_run_at?: Date;
  total_runs: number;
  success_count: number;
  failure_count: number;
  avg_duration_ms?: number;

  // Versioning
  version: number;
  published: boolean;

  // Audit
  created_by: string;
  created_at: Date;
  updated_by?: string;
  updated_at: Date;
}

export interface ExecutionDocument {
  _id?: ObjectId;
  job_id: string;
  job_name: string;
  run_number: number;

  start_time: Date;
  end_time?: Date;
  duration_ms?: number;
  queue_time_ms?: number;

  status: string;
  exit_code?: number;
  retry_count: number;

  trigger_type: string;
  triggered_by?: string;

  artifacts: {
    type: string;
    url: string;
    filename: string;
    size_bytes?: number;
    format?: string;
  }[];
  destinations_reached: number;
  destinations_failed: number;

  logs: string[];
  error?: string;
  error_stack?: string;

  worker?: string;
  memory_mb?: number;
  cpu_percent?: number;

  config_snapshot?: Record<string, unknown>;
}

export interface UserDocument {
  _id?: ObjectId;
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: "admin" | "editor" | "viewer" | "executor" | "dev";
  createdAt: Date;
  lastLoginAt: Date;
}

export interface AuditDocument {
  _id?: ObjectId;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  timestamp: Date;
  details?: Record<string, unknown>;
  ip_address?: string;
}

export interface VersionDocument {
  _id?: ObjectId;
  job_id: string;
  version_number: number;
  config_snapshot: Record<string, unknown>;
  created_by: string;
  created_at: Date;
  published: boolean;
  change_notes?: string;
}

// ============================================================================
// Collection Helpers
// ============================================================================

export async function getJobsCollection(): Promise<Collection<WorkflowJobDocument>> {
  const { db } = await connectToDatabase();
  return db.collection<WorkflowJobDocument>("jobs");
}

export async function getExecutionsCollection(): Promise<Collection<ExecutionDocument>> {
  const { db } = await connectToDatabase();
  return db.collection<ExecutionDocument>("executions");
}

export async function getUsersCollection(): Promise<Collection<UserDocument>> {
  const { db } = await connectToDatabase();
  return db.collection<UserDocument>("users");
}

export async function getAuditCollection(): Promise<Collection<AuditDocument>> {
  const { db } = await connectToDatabase();
  return db.collection<AuditDocument>("audit_trail");
}

export async function getVersionsCollection(): Promise<Collection<VersionDocument>> {
  const { db } = await connectToDatabase();
  return db.collection<VersionDocument>("job_versions");
}

// Keep backward compatibility for execution_logs collection name
export async function getLogsCollection(): Promise<Collection<ExecutionDocument>> {
  const { db } = await connectToDatabase();
  return db.collection<ExecutionDocument>("execution_logs");
}
