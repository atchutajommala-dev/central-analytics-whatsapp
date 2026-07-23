import { NextResponse } from "next/server";
import { connectToDatabase, JobDocument } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { executeSinglePayload } from "@/controllers/cronController";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
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
      return NextResponse.json({ error: `Job not found for ID: ${id}` }, { status: 404 });
    }

    // Construct execution payload combining job config & runtime overrides
    const sheetId = body.sheet_id || (job as any).sheet_id || job.source?.spreadsheet_id;
    const sheetName = body.sheet_name || (job as any).sheet_name || job.source?.selected_worksheets?.[0]?.title || "Sheet1";
    const customRange = body.custom_range || (job as any).custom_range || job.ranges?.map((r) => r.value).join(",");
    const destinations = body.destinations || (job as any).destinations || job.destinations?.filter((d) => d.enabled).flatMap((d) => (d.config?.phone_numbers as string[]) || []);

    const payload = {
      job_id: String(id),
      job_name: job.name,
      sheet_id: sheetId,
      sheet_name: sheetName,
      custom_range: customRange,
      vd_report_sheet_name: body.vd_report_sheet_name || (job as any).vd_report_sheet_name,
      destinations: destinations,
      destination_configs: body.destination_configs || job?.destinations?.filter((d) => d.enabled) || [],
      aisensy_campaign_name: body.aisensy_campaign_name || (job as any).aisensy_campaign_name || job.destinations?.find((d) => d.type === "whatsapp")?.config?.campaign_name || "",
      custom_fields: { ...((job as any).custom_fields || {}), ...(body.custom_fields || {}) },
      force_run: body.force_run !== undefined ? body.force_run : true,
      dry_run: body.dry_run !== undefined ? body.dry_run : false,
      custom_date: body.custom_date || null,
      include_vd_report: body.include_vd_report,
    };

    // Execute directly via controller (guarantees execution + MongoDB insertion + stats update)
    const result = await executeSinglePayload(payload);
    return NextResponse.json(result, { status: result.status === "error" ? 500 : 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Job execution failed" }, { status: 500 });
  }
}
