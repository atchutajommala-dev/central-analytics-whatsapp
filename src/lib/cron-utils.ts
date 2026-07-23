// ============================================================================
// Cron Expression Utilities
// Parser, Validator, Human-Readable, Next Run Calculator
// ============================================================================

const CRON_FIELDS = ["minute", "hour", "day_of_month", "month", "day_of_week"] as const;

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const SHORT_DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
interface CronValidation {
  valid: boolean;
  error?: string;
  parts?: string[];
}

export function validateCron(expression: string): CronValidation {
  if (!expression || typeof expression !== "string") {
    return { valid: false, error: "Cron expression is required" };
  }

  const trimmed = expression.trim();
  const parts = trimmed.split(/\s+/);

  if (parts.length !== 5) {
    return { valid: false, error: `Expected 5 fields, got ${parts.length}` };
  }

  const ranges: [number, number][] = [
    [0, 59],   // minute
    [0, 23],   // hour
    [1, 31],   // day of month
    [1, 12],   // month
    [0, 7],    // day of week (0 and 7 = Sunday)
  ];

  for (let i = 0; i < 5; i++) {
    const field = parts[i];
    if (!validateCronField(field, ranges[i][0], ranges[i][1])) {
      return {
        valid: false,
        error: `Invalid ${CRON_FIELDS[i]} field: "${field}" (valid range: ${ranges[i][0]}-${ranges[i][1]})`,
      };
    }
  }

  return { valid: true, parts };
}

function validateCronField(field: string, min: number, max: number): boolean {
  if (field === "*") return true;

  // Handle lists: 1,2,3
  const listParts = field.split(",");
  for (const part of listParts) {
    // Handle step: */5 or 1-10/2
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    if (stepMatch) {
      const base = stepMatch[1];
      const step = parseInt(stepMatch[2], 10);
      if (isNaN(step) || step < 1) return false;
      if (base === "*") continue;
      if (!validateCronRange(base, min, max)) return false;
      continue;
    }

    // Handle range: 1-5
    if (!validateCronRange(part, min, max)) return false;
  }

  return true;
}

function validateCronRange(field: string, min: number, max: number): boolean {
  const rangeMatch = field.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    return start >= min && start <= max && end >= min && end <= max && start <= end;
  }

  const num = parseInt(field, 10);
  return !isNaN(num) && num >= min && num <= max;
}

// ---------------------------------------------------------------------------
// Human-Readable Description
// ---------------------------------------------------------------------------
export function cronToHuman(expression: string): string {
  const validation = validateCron(expression);
  if (!validation.valid) return "Invalid cron expression";

  const parts = expression.trim().split(/\s+/);
  const [minute, hour, dom, month, dow] = parts;

  // Common patterns
  if (expression === "* * * * *") return "Every minute";
  if (minute.startsWith("*/") && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    const interval = minute.split("/")[1];
    return `Every ${interval} minutes`;
  }
  if (minute === "0" && hour === "*" && dom === "*" && month === "*" && dow === "*") {
    return "Every hour, on the hour";
  }
  if (minute === "0" && hour.startsWith("*/") && dom === "*" && month === "*" && dow === "*") {
    const interval = hour.split("/")[1];
    return `Every ${interval} hours`;
  }

  const pieces: string[] = [];

  // Time
  if (minute !== "*" && hour !== "*" && !minute.includes("/") && !hour.includes("/")) {
    const hourList = hour.split(",");
    const minuteVal = minute.padStart(2, "0");
    if (hourList.length > 1) {
      const times = hourList.map((h) => `${parseInt(h, 10) > 12 ? parseInt(h, 10) - 12 : h}:${minuteVal} ${parseInt(h, 10) >= 12 ? "PM" : "AM"}`);
      pieces.push(`At ${times.join(" and ")}`);
    } else {
      const h = parseInt(hour, 10);
      const suffix = h >= 12 ? "PM" : "AM";
      const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
      pieces.push(`At ${displayHour}:${minuteVal} ${suffix}`);
    }
  } else if (minute !== "*" && !minute.includes("/")) {
    pieces.push(`At minute ${minute}`);
  }

  // Day of week
  if (dow !== "*") {
    const dayList = dow.split(",").map((d) => {
      const num = parseInt(d, 10);
      return DAY_NAMES[num % 7] || d;
    });
    if (dayList.length === 5 && !dow.includes("0") && !dow.includes("6") && !dow.includes("7")) {
      pieces.push("on weekdays");
    } else if (dayList.length === 2 && (dow === "0,6" || dow === "6,0" || dow === "6,7")) {
      pieces.push("on weekends");
    } else {
      pieces.push(`on ${dayList.join(", ")}`);
    }
  }

  // Day of month
  if (dom !== "*") {
    pieces.push(`on day ${dom} of the month`);
  }

  // Month
  if (month !== "*") {
    const monthList = month.split(",").map((m) => MONTH_NAMES[parseInt(m, 10)] || m);
    pieces.push(`in ${monthList.join(", ")}`);
  }

  return pieces.join(" ") || "Custom schedule";
}

// ---------------------------------------------------------------------------
// Next Run Calculator
// ---------------------------------------------------------------------------
export function getNextRun(expression: string, timezone: string = "Asia/Kolkata"): Date | null {
  const validation = validateCron(expression);
  if (!validation.valid) return null;

  const parts = expression.trim().split(/\s+/);
  const [minPart, hourPart, domPart, monthPart, dowPart] = parts;

  // Simple forward search (check next 1440 minutes = 24 hours)
  const now = new Date();
  const candidate = new Date(now.getTime() + 60000); // start from next minute
  candidate.setSeconds(0, 0);

  for (let i = 0; i < 1440 * 7; i++) {
    const min = candidate.getMinutes();
    const hr = candidate.getHours();
    const dom = candidate.getDate();
    const mon = candidate.getMonth() + 1;
    const dow = candidate.getDay();

    if (
      matchesCronField(minPart, min) &&
      matchesCronField(hourPart, hr) &&
      matchesCronField(domPart, dom) &&
      matchesCronField(monthPart, mon) &&
      matchesCronField(dowPart, dow)
    ) {
      return candidate;
    }

    candidate.setMinutes(candidate.getMinutes() + 1);
  }

  return null;
}

export function isCronDue(expression?: string, timezone: string = "Asia/Kolkata"): boolean {
  if (!expression || expression.trim() === "") return true;
  const validation = validateCron(expression);
  if (!validation.valid) return true;

  const now = new Date();
  const min = now.getMinutes();
  const hr = now.getHours();
  const dom = now.getDate();
  const mon = now.getMonth() + 1;
  const dow = now.getDay();

  const parts = expression.trim().split(/\s+/);
  const [minPart, hourPart, domPart, monthPart, dowPart] = parts;

  return (
    matchesCronField(minPart, min) &&
    matchesCronField(hourPart, hr) &&
    matchesCronField(domPart, dom) &&
    matchesCronField(monthPart, mon) &&
    matchesCronField(dowPart, dow)
  );
}

function matchesCronField(field: string, value: number): boolean {
  if (field === "*") return true;

  const parts = field.split(",");
  for (const part of parts) {
    // Step
    const stepMatch = part.match(/^(.+)\/(\d+)$/);
    if (stepMatch) {
      const step = parseInt(stepMatch[2], 10);
      const base = stepMatch[1];
      if (base === "*") {
        if (value % step === 0) return true;
      } else {
        const rangeMatch = base.match(/^(\d+)-(\d+)$/);
        if (rangeMatch) {
          const start = parseInt(rangeMatch[1], 10);
          const end = parseInt(rangeMatch[2], 10);
          if (value >= start && value <= end && (value - start) % step === 0) return true;
        }
      }
      continue;
    }

    // Range
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = parseInt(rangeMatch[1], 10);
      const end = parseInt(rangeMatch[2], 10);
      if (value >= start && value <= end) return true;
      continue;
    }

    // Exact value
    if (parseInt(part, 10) === value) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Common Presets
// ---------------------------------------------------------------------------
export interface CronPreset {
  label: string;
  expression: string;
  description: string;
  category: "hourly" | "business" | "interval" | "high_frequency";
}

export const CRON_PRESETS: CronPreset[] = [
  // Hourly & Multi-Hour Presets (Primary)
  { label: "Hourly", expression: "0 * * * *", description: "Runs at the start of every hour", category: "hourly" },
  { label: "Every 2 hours", expression: "0 */2 * * *", description: "Runs every 2 hours", category: "hourly" },
  { label: "Every 3 hours", expression: "0 */3 * * *", description: "Runs every 3 hours", category: "hourly" },
  { label: "Every 4 hours", expression: "0 */4 * * *", description: "Runs every 4 hours", category: "hourly" },
  { label: "Every 6 hours", expression: "0 */6 * * *", description: "Runs every 6 hours", category: "hourly" },
  { label: "Every 12 hours", expression: "0 */12 * * *", description: "Runs twice daily (every 12h)", category: "hourly" },

  // Daily & Business Hours
  { label: "Daily at 8:00 AM", expression: "0 8 * * *", description: "Runs at 8:00 AM every day", category: "business" },
  { label: "Daily at 8:30 AM", expression: "30 8 * * *", description: "Runs at 8:30 AM every day", category: "business" },
  { label: "Daily at 9:00 AM", expression: "0 9 * * *", description: "Runs at 9:00 AM every day", category: "business" },
  { label: "Daily at 6:00 PM", expression: "0 18 * * *", description: "Runs at 6:00 PM every day", category: "business" },
  { label: "Twice daily (9 AM & 6 PM)", expression: "0 9,18 * * *", description: "Runs at 9 AM and 6 PM", category: "business" },
  { label: "Weekdays at 8:30 AM", expression: "30 8 * * 1-5", description: "Mon-Fri at 8:30 AM", category: "business" },
  { label: "Midnight", expression: "0 0 * * *", description: "Every day at midnight", category: "business" },
  { label: "Every Monday 9 AM", expression: "0 9 * * 1", description: "Every Monday at 9 AM", category: "business" },

  // High Frequency Presets
  { label: "Every 15 minutes", expression: "*/15 * * * *", description: "Runs every 15 minutes", category: "high_frequency" },
  { label: "Every 30 minutes", expression: "*/30 * * * *", description: "Runs every 30 minutes", category: "high_frequency" },
  { label: "Every 5 minutes", expression: "*/5 * * * *", description: "Runs every 5 minutes", category: "high_frequency" },
  { label: "Every minute", expression: "* * * * *", description: "Runs every single minute", category: "high_frequency" },
];

// ---------------------------------------------------------------------------
// Format next run as relative time
// ---------------------------------------------------------------------------
export function formatRelativeTime(date: Date | null): string {
  if (!date) return "—";

  const now = new Date();
  const diffMs = date.getTime() - now.getTime();

  if (diffMs < 0) return "overdue";

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "in less than a minute";
  if (diffMins < 60) return `in ${diffMins}m`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `in ${diffHours}h ${diffMins % 60}m`;

  const diffDays = Math.floor(diffHours / 24);
  return `in ${diffDays}d ${diffHours % 24}h`;
}
