import { NextResponse } from "next/server";
import { getLogsController } from "@/controllers/executionsController";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("job_id") || undefined;
    const level = searchParams.get("level") || undefined;
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "100", 10);

    const logs = await getLogsController({ job_id: jobId, level, search, limit });
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch logs" }, { status: 500 });
  }
}
