import { NextResponse } from "next/server";
import { getExecutionsController } from "@/controllers/executionsController";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("job_id") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = parseInt(searchParams.get("skip") || "0", 10);

    const result = await getExecutionsController({ job_id: jobId, status, limit, skip });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch executions" }, { status: 500 });
  }
}
