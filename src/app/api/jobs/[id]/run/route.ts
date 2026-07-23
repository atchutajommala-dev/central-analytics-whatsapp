import { NextResponse } from "next/server";
import { connectToDatabase, JobDocument } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { db } = await connectToDatabase();

    let query: any = {};
    if (ObjectId.isValid(id)) {
      query._id = new ObjectId(id);
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
      job_id: id,
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

    // Forward request to internal cron endpoint
    const cronUrl = new URL("/api/cron", req.url);
    const cronRes = await fetch(cronUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers.get("Authorization") || (process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : ""),
        "x-cron-secret": req.headers.get("x-cron-secret") || process.env.CRON_SECRET || "",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await cronRes.text();
    let result: any = {};
    try {
      result = JSON.parse(responseText);
    } catch {
      result = {
        status: cronRes.ok ? "success" : "error",
        error: `Unexpected response format (${cronRes.status})`,
        raw_response: responseText.slice(0, 300),
      };
    }

    return NextResponse.json(result, { status: cronRes.status });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Job execution failed" }, { status: 500 });
  }
}
