import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { connectToDatabase, JobDocument } from "@/lib/mongodb";
import { executeSinglePayload } from "@/controllers/cronController";

// POST: Trigger manual execution of a job
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { overrides, dry_run } = body as {
      triggered_by?: string;
      overrides?: Record<string, unknown>;
      dry_run?: boolean;
    };

    const { db } = await connectToDatabase();
    let query: any = {};
    if (ObjectId.isValid(id)) {
      query.$or = [{ _id: new ObjectId(id) }, { _id: id }];
    } else {
      query._id = id;
    }

    let job = await db.collection<JobDocument>("jobs").findOne(query);
    if (!job) {
      job = await db.collection<JobDocument>("jobs").findOne({ name: id });
    }

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === "archived") {
      return NextResponse.json({ error: "Cannot execute an archived job" }, { status: 400 });
    }

    const payload = {
      job_id: String(id),
      job_name: job.name,
      sheet_id: job.source?.spreadsheet_id,
      sheet_name: job.source?.selected_worksheets?.[0]?.title || "Sheet1",
      custom_range: job.ranges?.map((r: { value: string }) => r.value).join(",") || "",
      destinations: job.destinations
        ?.filter((d: { enabled: boolean }) => d.enabled)
        .flatMap((d: { config: { phone_numbers?: string[] } }) => d.config?.phone_numbers || []) || [],
      destination_configs: job.destinations?.filter((d: { enabled: boolean }) => d.enabled) || [],
      aisensy_campaign_name: job.destinations
        ?.find((d: { type: string }) => d.type === "whatsapp")
        ?.config?.campaign_name || process.env.AISENSY_CAMPAIGN_NAME || "",
      force_run: true,
      dry_run: Boolean(dry_run),
      ...overrides,
    };

    const result = await executeSinglePayload(payload);
    return NextResponse.json(result, { status: result.status === "error" ? 500 : 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
