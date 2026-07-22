import { connectToDatabase, ExecutionDocument } from "@/lib/mongodb";

export async function getExecutionsController(params: {
  job_id?: string;
  status?: string;
  limit?: number;
  skip?: number;
}) {
  const { db } = await connectToDatabase();
  const limit = params.limit || 50;
  const skip = params.skip || 0;

  const query: any = {};
  if (params.job_id) {
    query.job_id = params.job_id;
  }
  if (params.status && params.status !== "all") {
    query.status = params.status;
  }

  const [executions, total] = await Promise.all([
    db
      .collection<ExecutionDocument>("executions")
      .find(query)
      .sort({ started_at: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    db.collection<ExecutionDocument>("executions").countDocuments(query),
  ]);

  return { executions, total, limit, skip };
}

export async function getLogsController(params: {
  job_id?: string;
  level?: string;
  search?: string;
  limit?: number;
}) {
  const { db } = await connectToDatabase();
  const limit = params.limit || 100;

  const query: any = {};
  if (params.job_id) {
    query.job_id = params.job_id;
  }

  const recentExecutions = await db
    .collection<ExecutionDocument>("executions")
    .find(query)
    .sort({ started_at: -1 })
    .limit(limit)
    .toArray();

  let allLogs: Array<{ timestamp: string; level: string; message: string; job_id: string; execution_id: string }> = [];

  for (const exec of recentExecutions) {
    if (Array.isArray(exec.logs)) {
      for (const rawLine of exec.logs) {
        let level = "INFO";
        if (rawLine.includes("ERROR") || rawLine.includes("Error")) level = "ERROR";
        else if (rawLine.includes("WARNING") || rawLine.includes("Warning")) level = "WARNING";
        else if (rawLine.includes("SUCCESS") || rawLine.includes("Sent to")) level = "SUCCESS";

        if (params.level && params.level !== "ALL" && level !== params.level) {
          continue;
        }

        if (params.search && !rawLine.toLowerCase().includes(params.search.toLowerCase())) {
          continue;
        }

        allLogs.push({
          timestamp: exec.start_time ? new Date(exec.start_time).toISOString() : (exec as any).started_at || new Date().toISOString(),
          level,
          message: rawLine,
          job_id: exec.job_id,
          execution_id: String(exec._id),
        });
      }
    }
  }

  return allLogs.slice(0, limit);
}
