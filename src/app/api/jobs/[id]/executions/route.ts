import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getExecutionsCollection, getLogsCollection } from "@/lib/mongodb";

// GET: Execution history for a specific job with pagination
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") || "25", 10)));
    const status = searchParams.get("status") || "";

    const query: Record<string, unknown> = { job_id: id };
    if (status) query.status = status;

    let executions: unknown[] = [];
    let total = 0;

    try {
      const execCol = await getExecutionsCollection();
      total = await execCol.countDocuments(query);
      executions = await execCol
        .find(query)
        .sort({ start_time: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .toArray();
    } catch {
      // Fallback to legacy execution_logs
      const logsCol = await getLogsCollection();
      total = await logsCol.countDocuments(query);
      executions = await logsCol
        .find(query)
        .sort({ timestamp: -1 })
        .skip((page - 1) * perPage)
        .limit(perPage)
        .toArray();
    }

    const totalPages = Math.ceil(total / perPage);

    return NextResponse.json({
      data: executions,
      total,
      page,
      per_page: perPage,
      total_pages: totalPages,
      has_next: page < totalPages,
      has_prev: page > 1,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to fetch executions";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
