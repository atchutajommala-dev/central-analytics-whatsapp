// ============================================================================
// Dynamic Variable Registry & Resolver
// ============================================================================

import { DynamicVariable } from "@/types/dashboard";

// ---------------------------------------------------------------------------
// Built-in Variable Definitions
// ---------------------------------------------------------------------------
export const BUILT_IN_VARIABLES: DynamicVariable[] = [
  // Date variables
  {
    name: "today",
    template: "{{today}}",
    description: "Current date in YYYY-MM-DD format",
    category: "date",
    example_value: "2026-07-22",
  },
  {
    name: "yesterday",
    template: "{{yesterday}}",
    description: "Yesterday's date in YYYY-MM-DD format",
    category: "date",
    example_value: "2026-07-21",
  },
  {
    name: "tomorrow",
    template: "{{tomorrow}}",
    description: "Tomorrow's date in YYYY-MM-DD format",
    category: "date",
    example_value: "2026-07-23",
  },
  {
    name: "current_week",
    template: "{{current_week}}",
    description: "ISO week number (1-52)",
    category: "date",
    example_value: "30",
  },
  {
    name: "current_month",
    template: "{{current_month}}",
    description: "Current month name",
    category: "date",
    example_value: "July",
  },
  {
    name: "current_month_num",
    template: "{{current_month_num}}",
    description: "Current month number (01-12)",
    category: "date",
    example_value: "07",
  },
  {
    name: "current_year",
    template: "{{current_year}}",
    description: "Current four-digit year",
    category: "date",
    example_value: "2026",
  },
  {
    name: "current_quarter",
    template: "{{current_quarter}}",
    description: "Current quarter (Q1-Q4)",
    category: "date",
    example_value: "Q3",
  },
  {
    name: "last_business_day",
    template: "{{last_business_day}}",
    description: "Most recent weekday (Mon-Fri)",
    category: "date",
    example_value: "2026-07-21",
  },
  {
    name: "day_of_week",
    template: "{{day_of_week}}",
    description: "Current day name (Monday, Tuesday, etc.)",
    category: "date",
    example_value: "Wednesday",
  },

  // Timestamp variables
  {
    name: "timestamp",
    template: "{{timestamp}}",
    description: "Current timestamp (YYYY-MM-DD_HH-mm-ss)",
    category: "system",
    example_value: "2026-07-22_14-30-00",
  },
  {
    name: "timestamp_iso",
    template: "{{timestamp_iso}}",
    description: "ISO 8601 timestamp",
    category: "system",
    example_value: "2026-07-22T14:30:00+05:30",
  },
  {
    name: "unix_timestamp",
    template: "{{unix_timestamp}}",
    description: "Unix epoch timestamp in seconds",
    category: "system",
    example_value: "1784883000",
  },

  // Sheet variables
  {
    name: "sheet_name",
    template: "{{sheet_name}}",
    description: "Name of the current worksheet being exported",
    category: "sheet",
    example_value: "Dashboard",
  },
  {
    name: "spreadsheet_name",
    template: "{{spreadsheet_name}}",
    description: "Name of the Google Sheets spreadsheet",
    category: "sheet",
    example_value: "Sales Report 2026",
  },
  {
    name: "current_row",
    template: "{{current_row}}",
    description: "Current row number (for dynamic ranges)",
    category: "sheet",
    example_value: "42",
  },

  // System variables
  {
    name: "job_name",
    template: "{{job_name}}",
    description: "Name of the current automation job",
    category: "system",
    example_value: "Daily Sales Export",
  },
  {
    name: "job_id",
    template: "{{job_id}}",
    description: "Unique identifier of the current job",
    category: "system",
    example_value: "abc123def456",
  },
  {
    name: "run_number",
    template: "{{run_number}}",
    description: "Sequential run number for this job",
    category: "system",
    example_value: "47",
  },
  {
    name: "environment",
    template: "{{environment}}",
    description: "Current environment (production/staging/development)",
    category: "system",
    example_value: "production",
  },
];

// ---------------------------------------------------------------------------
// Variable Resolver
// ---------------------------------------------------------------------------
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getLastBusinessDay(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

export interface ResolverContext {
  job_name?: string;
  job_id?: string;
  run_number?: number;
  sheet_name?: string;
  spreadsheet_name?: string;
  current_row?: number;
  environment?: string;
  custom_variables?: Record<string, string>;
}

export function resolveVariables(
  template: string,
  context: ResolverContext = {}
): string {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const quarter = Math.ceil((now.getMonth() + 1) / 3);

  const resolvers: Record<string, string> = {
    today: formatDate(now),
    yesterday: formatDate(yesterday),
    tomorrow: formatDate(tomorrow),
    current_week: getISOWeek(now).toString(),
    current_month: MONTH_NAMES[now.getMonth()],
    current_month_num: pad(now.getMonth() + 1),
    current_year: now.getFullYear().toString(),
    current_quarter: `Q${quarter}`,
    last_business_day: formatDate(getLastBusinessDay(now)),
    day_of_week: DAY_NAMES[now.getDay()],
    timestamp: `${formatDate(now)}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`,
    timestamp_iso: now.toISOString(),
    unix_timestamp: Math.floor(now.getTime() / 1000).toString(),
    sheet_name: context.sheet_name || "",
    spreadsheet_name: context.spreadsheet_name || "",
    current_row: context.current_row?.toString() || "",
    job_name: context.job_name || "",
    job_id: context.job_id || "",
    run_number: context.run_number?.toString() || "",
    environment: context.environment || "production",
    ...(context.custom_variables || {}),
  };

  return template.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
    return resolvers[varName] ?? match;
  });
}

// ---------------------------------------------------------------------------
// Extract variables from a template string
// ---------------------------------------------------------------------------
export function extractVariables(template: string): string[] {
  const matches = template.match(/\{\{(\w+)\}\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

// ---------------------------------------------------------------------------
// Get variables by category for UI display
// ---------------------------------------------------------------------------
export function getVariablesByCategory(): Record<string, DynamicVariable[]> {
  const grouped: Record<string, DynamicVariable[]> = {};
  for (const v of BUILT_IN_VARIABLES) {
    if (!grouped[v.category]) grouped[v.category] = [];
    grouped[v.category].push(v);
  }
  return grouped;
}
