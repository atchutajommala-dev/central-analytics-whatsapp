// ============================================================================
// A1 Range Notation Validator & Utilities
// ============================================================================

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
export function extractSpreadsheetId(urlOrId: string): string {
  if (!urlOrId || typeof urlOrId !== "string") return "";
  const trimmed = urlOrId.trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]{15,})/);
  if (match && match[1]) return match[1];
  if (!trimmed.includes("/") && trimmed.length >= 15) return trimmed;
  return trimmed;
}

interface RangeValidation {
  valid: boolean;
  error?: string;
  parsed?: ParsedRange;
}

interface ParsedRange {
  sheet?: string;
  start_col: string;
  start_row: number | null;
  end_col?: string;
  end_row?: number | null;
  is_full_column: boolean;
  is_full_row: boolean;
}

// Match patterns:
// A1:B5, Sheet1!A1:B5, A:Z, 1:200, A1, Sheet1!A1
const RANGE_REGEX = /^(?:(.+)!)?([A-Z]{1,3})(\d+)?(?::([A-Z]{1,3})(\d+)?)?$/i;
const FULL_ROW_REGEX = /^(?:(.+)!)?(\d+):(\d+)$/;

export function validateRange(range: string): RangeValidation {
  if (!range || typeof range !== "string") {
    return { valid: false, error: "Range is required" };
  }

  const trimmed = range.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: "Range is empty" };
  }

  // Check for full row range: 1:200, Sheet1!1:200
  const fullRowMatch = trimmed.match(FULL_ROW_REGEX);
  if (fullRowMatch) {
    const startRow = parseInt(fullRowMatch[2], 10);
    const endRow = parseInt(fullRowMatch[3], 10);
    if (startRow < 1 || endRow < 1) {
      return { valid: false, error: "Row numbers must be positive" };
    }
    if (startRow > endRow) {
      return { valid: false, error: `Start row ${startRow} is after end row ${endRow}` };
    }
    return {
      valid: true,
      parsed: {
        sheet: fullRowMatch[1],
        start_col: "",
        start_row: startRow,
        end_col: "",
        end_row: endRow,
        is_full_column: false,
        is_full_row: true,
      },
    };
  }

  // Standard A1 notation
  const match = trimmed.match(RANGE_REGEX);
  if (!match) {
    return { valid: false, error: "Invalid A1 notation. Use format like A1:Z100, Sheet1!B2:H20, or A:Z" };
  }

  const [, sheet, startCol, startRowStr, endCol, endRowStr] = match;
  const startRow = startRowStr ? parseInt(startRowStr, 10) : null;
  const endRow = endRowStr ? parseInt(endRowStr, 10) : null;

  // Validate column letters
  const startColNum = columnToNumber(startCol.toUpperCase());
  if (startColNum > 18278) { // Max Excel column = ZZZ
    return { valid: false, error: `Column "${startCol}" exceeds maximum` };
  }

  if (endCol) {
    const endColNum = columnToNumber(endCol.toUpperCase());
    if (endColNum > 18278) {
      return { valid: false, error: `Column "${endCol}" exceeds maximum` };
    }

    // Check column order (A before B)
    if (endColNum < startColNum) {
      return { valid: false, error: `Start column "${startCol}" is after end column "${endCol}"` };
    }
  }

  // Check row order
  if (startRow !== null && endRow !== null && endRow < startRow) {
    return { valid: false, error: `Start row ${startRow} is after end row ${endRow}` };
  }

  // Check for valid row numbers
  if (startRow !== null && startRow < 1) {
    return { valid: false, error: "Row numbers must be positive" };
  }

  const isFullColumn = startRow === null && endRow === null && endCol !== undefined;

  return {
    valid: true,
    parsed: {
      sheet: sheet || undefined,
      start_col: startCol.toUpperCase(),
      start_row: startRow,
      end_col: endCol?.toUpperCase(),
      end_row: endRow,
      is_full_column: isFullColumn,
      is_full_row: false,
    },
  };
}

// ---------------------------------------------------------------------------
// Validate multiple ranges (comma-separated or array)
// ---------------------------------------------------------------------------
export function validateRanges(input: string | string[]): {
  valid: boolean;
  errors: { range: string; error: string }[];
  validRanges: string[];
} {
  const ranges = Array.isArray(input)
    ? input
    : input.split(",").map((r) => r.trim()).filter(Boolean);

  const errors: { range: string; error: string }[] = [];
  const validRanges: string[] = [];

  for (const range of ranges) {
    // Skip variable templates
    if (range.includes("{{")) {
      validRanges.push(range);
      continue;
    }

    const result = validateRange(range);
    if (result.valid) {
      validRanges.push(range);
    } else {
      errors.push({ range, error: result.error || "Invalid range" });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    validRanges,
  };
}

// ---------------------------------------------------------------------------
// Helper: Column letter to number (A=1, B=2, ..., Z=26, AA=27, ...)
// ---------------------------------------------------------------------------
function columnToNumber(col: string): number {
  let num = 0;
  for (let i = 0; i < col.length; i++) {
    num = num * 26 + (col.charCodeAt(i) - 64);
  }
  return num;
}

// ---------------------------------------------------------------------------
// Helper: Number to column letter
// ---------------------------------------------------------------------------
export function numberToColumn(num: number): string {
  let result = "";
  while (num > 0) {
    num--;
    result = String.fromCharCode(65 + (num % 26)) + result;
    num = Math.floor(num / 26);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Estimate range dimensions
// ---------------------------------------------------------------------------
export function estimateRangeDimensions(range: string): {
  rows: number | null;
  cols: number | null;
  cells: number | null;
} {
  const result = validateRange(range);
  if (!result.valid || !result.parsed) {
    return { rows: null, cols: null, cells: null };
  }

  const p = result.parsed;

  if (p.is_full_column || p.is_full_row) {
    return { rows: null, cols: null, cells: null }; // Unbounded
  }

  const rows = p.start_row !== null && p.end_row !== null && p.end_row !== undefined
    ? p.end_row - p.start_row + 1
    : null;

  const cols = p.end_col
    ? columnToNumber(p.end_col) - columnToNumber(p.start_col) + 1
    : 1;

  return {
    rows,
    cols,
    cells: rows !== null ? rows * cols : null,
  };
}

// ---------------------------------------------------------------------------
// Format range for display
// ---------------------------------------------------------------------------
export function formatRangeLabel(range: string): string {
  const dims = estimateRangeDimensions(range);
  if (dims.rows && dims.cols) {
    return `${range} (${dims.cols}×${dims.rows}, ${dims.cells?.toLocaleString()} cells)`;
  }
  return range;
}

// ---------------------------------------------------------------------------
// Suggested common ranges
// ---------------------------------------------------------------------------
export const COMMON_RANGES = [
  { label: "Entire Sheet", value: "A:Z", description: "All columns, all rows" },
  { label: "First 100 Rows", value: "A1:Z100", description: "Columns A–Z, rows 1–100" },
  { label: "First 50 Rows", value: "A1:Z50", description: "Columns A–Z, rows 1–50" },
  { label: "Dashboard Area", value: "A1:M30", description: "Common dashboard layout" },
  { label: "Summary Table", value: "A1:H20", description: "Compact summary table" },
];
