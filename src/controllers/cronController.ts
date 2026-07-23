import { execFile } from "child_process";
import path from "path";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { executeAutomationPayloadJS } from "@/lib/automationEngine";

export async function executeSinglePayload(payload: any) {
  const projectRoot = process.cwd();
  const pythonExec = process.env.PYTHON_PATH || "python3";

  const pythonRunner = `
import sys, json, vd_automation
try:
    payload = json.load(sys.stdin)
    res = vd_automation.run_automation_payload(payload)
    print(json.dumps(res))
except Exception as e:
    print(json.dumps({"status": "error", "error": str(e), "logs": [str(e)]}))
`;

  const jsonPayloadString = JSON.stringify(payload);
  const startTime = new Date().toISOString();

  let childResult: any;
  try {
    childResult = await new Promise<any>((resolve, reject) => {
      const proc = execFile(
        pythonExec,
        ["-c", pythonRunner],
        { cwd: projectRoot, env: { ...process.env }, timeout: 120000 },
        (err, stdout, stderr) => {
          if (err && !stdout) {
            reject(new Error(stderr || err.message));
            return;
          }
          try {
            resolve(JSON.parse(stdout.trim()));
          } catch {
            reject(new Error(stderr || stdout || "Failed to parse Python automation output"));
          }
        }
      );

      if (proc.stdin) {
        proc.stdin.write(jsonPayloadString);
        proc.stdin.end();
      }
    });
  } catch (err: any) {
    console.warn("Python execution unavailable/failed, executing Native JS Engine:", err?.message);
    try {
      childResult = await executeAutomationPayloadJS(payload);
    } catch (jsErr: any) {
      childResult = {
        status: "error",
        message: "Automation execution failed on both Python & Native JS Engine.",
        error: jsErr?.message || err?.message,
        logs: [`Trigger received at ${startTime} for job: ${payload.job_name || payload.job_id || "manual"}`],
      };
    }
  }

  const endTime = new Date().toISOString();

  // Save Execution Document into MongoDB only if not already saved by JS engine
  if (childResult?.engine !== "native_serverless_js") {
    try {
      const { db } = await connectToDatabase();
      const isSuccess = childResult.status === "success";

    const executionDoc = {
      job_id: String(payload.job_id || "manual"),
      job_name: String(payload.job_name || "Automation Job"),
      run_number: 1,
      start_time: new Date(startTime),
      started_at: startTime,
      end_time: new Date(endTime),
      completed_at: endTime,
      duration_ms: new Date(endTime).getTime() - new Date(startTime).getTime(),
      status: isSuccess ? "success" : "error",
      exit_code: isSuccess ? 0 : 1,
      retry_count: 0,
      trigger_type: payload.force_run ? "manual" : "scheduled",
      logs: childResult.logs || [],
      artifacts: (childResult.uploaded_urls || []).map((url: string, i: number) => ({
        id: `art_${i}`,
        type: "image",
        name: `export_${i + 1}.jpg`,
        url,
        size_bytes: 0,
        content_type: "image/jpeg",
        created_at: endTime,
      })),
      error: childResult.error || undefined,
    };

    await db.collection("executions").insertOne(executionDoc as any);

    // Update stats on job
    if (payload.job_id) {
      const incUpdate = isSuccess
        ? { total_runs: 1, success_count: 1 }
        : { total_runs: 1, failure_count: 1 };
      await db.collection("jobs").updateOne(
        { _id: payload.job_id as any },
        { $inc: incUpdate, $set: { last_run: endTime, last_status: isSuccess ? "success" : "error" } }
      );
    }
    } catch (dbErr) {
      console.error("Failed to save execution record to MongoDB:", dbErr);
    }
  }

  return childResult;
}

import { isCronDue, getNextRun } from "@/lib/cron-utils";

export async function executeAutomationController(payload: any) {
  if (payload?.job_id || payload?.sheet_id) {
    return await executeSinglePayload(payload);
  }

  // Multi-job / active jobs lookup from MongoDB
  try {
    const { db } = await connectToDatabase();
    const activeJobs = await db
      .collection("jobs")
      .find({
        status: "active",
        enabled: { $ne: false },
      })
      .toArray();

    if (activeJobs && activeJobs.length > 0) {
      let executedCount = 0;
      const results: any[] = [];

      for (const job of activeJobs) {
        if (job.status === "paused" || job.status === "inactive" || job.enabled === false) {
          continue;
        }
        const cronExpr = job.schedule?.cron_expression || (job as any).cron_expression || "0 * * * *";
        const tz = job.schedule?.timezone || "Asia/Kolkata";
        const lastRunAt = (job as any).last_run || (job as any).last_run_at;

        const isDue = payload?.force_run || payload?.run || isCronDue(cronExpr, tz, lastRunAt);

        if (isDue) {
          // STRICT DEDUPLICATION LOCK:
          // For scheduled runs, verify this workflow has NOT already executed within the last 2 minutes
          if (!payload?.force_run) {
            const strId = String(job._id);
            const lockWindow = new Date(Date.now() - 2 * 60 * 1000).toISOString();
            const existingRun = await db.collection("executions").findOne({
              $or: [
                { job_id: strId },
                { job_name: job.name },
                ...(ObjectId.isValid(strId) ? [{ job_id: new ObjectId(strId) }] : []),
              ],
              started_at: { $gte: lockWindow },
            });

            if (existingRun) {
              console.log(`[CronLock] Skipping duplicate run for '${job.name}': Already executed at ${existingRun.started_at}`);
              continue;
            }
          }
          const rawDests = job.destinations || (job as any).destinations || [];
          const destinations = Array.isArray(rawDests)
            ? rawDests
                .filter((d: any) => d && d.enabled !== false)
                .flatMap((d: any) => {
                  if (typeof d === "string") return [d];
                  if (typeof d === "object" && d !== null) {
                    if (Array.isArray(d.config?.phone_numbers)) return d.config.phone_numbers;
                    if (Array.isArray(d.phone_numbers)) return d.phone_numbers;
                    if (typeof d.phone_number === "string") return [d.phone_number];
                  }
                  return [];
                })
            : [];

          const customRange = (job as any).custom_range || job.ranges?.map((r: { value: string }) => r.value).join(",");

          const jobPayload = {
            job_id: String(job._id),
            job_name: job.name,
            sheet_id: job.source?.spreadsheet_id || (job as any).sheet_id,
            sheet_name: job.source?.selected_worksheets?.[0]?.title || (job as any).sheet_name || "Sheet1",
            custom_range: customRange,
            vd_report_sheet_name: (job as any).vd_report_sheet_name,
            destinations: destinations,
            destination_configs: (job as any).destination_configs || job.destinations?.filter((d: { enabled: boolean }) => d.enabled) || [],
            aisensy_campaign_name: (job as any).aisensy_campaign_name || job.destinations?.find((d: { type: string }) => d.type === "whatsapp")?.config?.campaign_name || "",
            custom_fields: (job as any).custom_fields || {},
            export_config: job.export_config || (job as any).export_config,
            force_run: payload?.force_run || false,
            dry_run: payload?.dry_run || false,
          };
          const res = await executeSinglePayload(jobPayload);
          results.push(res);

          // Update next_run calculation
          if (cronExpr) {
            const nextRunDate = getNextRun(cronExpr, tz);
            if (nextRunDate) {
              await db.collection("jobs").updateOne(
                { _id: job._id },
                { $set: { next_run: nextRunDate.toISOString() } }
              );
            }
          }
        }
      }
      return {
        status: "completed_multi_jobs",
        jobs_evaluated: activeJobs.length,
        jobs_executed: results.length,
        results,
      };
    }
  } catch (err) {
    console.error("Multi-job lookup error:", err);
  }

  // Fallback to standard default payload run
  return await executeSinglePayload(payload);
}

