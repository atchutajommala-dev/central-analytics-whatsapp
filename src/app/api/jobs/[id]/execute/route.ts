import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getJobsCollection, getExecutionsCollection } from "@/lib/mongodb";

// POST: Trigger manual execution of a job
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { triggered_by, overrides, dry_run } = body as {
      triggered_by?: string;
      overrides?: Record<string, unknown>;
      dry_run?: boolean;
    };

    const jobsCol = await getJobsCollection();
    const job = await jobsCol.findOne({ _id: new ObjectId(id) });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === "archived") {
      return NextResponse.json({ error: "Cannot execute an archived job" }, { status: 400 });
    }

    // Create execution record
    const execCol = await getExecutionsCollection();
    const runNumber = (job.total_runs || 0) + 1;

    const execution = {
      job_id: id,
      job_name: job.name,
      run_number: runNumber,
      start_time: new Date(),
      status: dry_run ? "success" : "running",
      retry_count: 0,
      trigger_type: "manual",
      triggered_by: triggered_by || "system",
      artifacts: [],
      destinations_reached: 0,
      destinations_failed: 0,
      logs: [
        `[${new Date().toISOString()}] INFO | Manual execution triggered by ${triggered_by || "system"}`,
        `[${new Date().toISOString()}] INFO | Job: ${job.name} (v${job.version})`,
        `[${new Date().toISOString()}] INFO | Source: ${job.source?.spreadsheet_id}`,
        `[${new Date().toISOString()}] INFO | Ranges: ${job.ranges?.map((r: { value: string }) => r.value).join(", ")}`,
        `[${new Date().toISOString()}] INFO | Export format: ${job.export_config?.format}`,
        `[${new Date().toISOString()}] INFO | Destinations: ${job.destinations?.length || 0}`,
      ],
      config_snapshot: {
        source: job.source,
        ranges: job.ranges,
        export_config: job.export_config,
        destinations: job.destinations,
      },
    };

    if (dry_run) {
      execution.logs.push(`[${new Date().toISOString()}] INFO | DRY RUN — No actual execution performed`);
      execution.status = "success";
      return NextResponse.json({
        success: true,
        dry_run: true,
        execution,
        message: "Dry run completed. No changes made.",
      });
    }

    const result = await execCol.insertOne(execution);

    // Update job metadata
    await jobsCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          last_run_at: new Date(),
          last_status: "running",
          updated_at: new Date(),
        },
        $inc: { total_runs: 1 },
      }
    );

    // Build payload for the Python automation engine
    const automationPayload = {
      job_id: id,
      job_name: job.name,
      sheet_id: job.source?.spreadsheet_id,
      sheet_name: job.source?.selected_worksheets?.[0]?.title || "Sheet1",
      custom_range: job.ranges?.map((r: { value: string }) => r.value).join(",") || "",
      destinations: job.destinations
        ?.filter((d: { type: string; enabled: boolean }) => d.type === "whatsapp" && d.enabled)
        .flatMap((d: { config: { phone_numbers?: string[] } }) => d.config?.phone_numbers || []) || [],
      aisensy_campaign_name: job.destinations
        ?.find((d: { type: string }) => d.type === "whatsapp")
        ?.config?.campaign_name || process.env.AISENSY_CAMPAIGN_NAME || "",
      force_run: true,
      dry_run: false,
      ...overrides,
    };

    // Simulate execution completion for now
    // In production, this would call the Python engine and update the execution record
    const endTime = new Date();
    const durationMs = endTime.getTime() - execution.start_time.getTime();

    await execCol.updateOne(
      { _id: result.insertedId },
      {
        $set: {
          end_time: endTime,
          duration_ms: durationMs,
          status: "success",
        },
        $push: {
          logs: {
            $each: [
              `[${endTime.toISOString()}] INFO | Execution completed successfully`,
              `[${endTime.toISOString()}] INFO | Duration: ${durationMs}ms`,
            ],
          },
        } as Record<string, unknown>,
      }
    );

    // Update job status
    await jobsCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          last_status: "success",
          last_error: "",
          updated_at: new Date(),
        },
        $inc: { success_count: 1 },
      }
    );

    return NextResponse.json({
      success: true,
      execution_id: result.insertedId,
      run_number: runNumber,
      payload: automationPayload,
      message: "Execution triggered successfully",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Execution failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
