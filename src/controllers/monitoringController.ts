import { connectToDatabase, JobDocument, ExecutionDocument } from "@/lib/mongodb";

export async function getMonitoringMetricsController() {
  const { db } = await connectToDatabase();

  const [totalJobs, activeJobs, executions] = await Promise.all([
    db.collection<JobDocument>("jobs").countDocuments(),
    db.collection<JobDocument>("jobs").countDocuments({ status: "active" }),
    db.collection<ExecutionDocument>("executions").find({}).toArray(),
  ]);

  const totalRuns = executions.length;
  const successRuns = executions.filter((e) => e.status === "success" || e.status === "completed").length;
  const failureRuns = executions.filter((e) => e.status === "error" || e.status === "failed").length;
  const successRate = totalRuns > 0 ? (successRuns / totalRuns) * 100 : 100;

  let totalDispatches = 0;
  for (const e of executions) {
    if (typeof (e as any).sent_count === "number") {
      totalDispatches += (e as any).sent_count;
    }
  }

  return {
    total_jobs: totalJobs,
    active_jobs: activeJobs,
    total_runs: totalRuns,
    success_runs: successRuns,
    failure_runs: failureRuns,
    success_rate: Math.round(successRate * 10) / 10,
    total_dispatches: totalDispatches,
    system_readiness: "healthy",
  };
}

export async function getSystemStatusController() {
  let mongoConnected = false;
  try {
    const { db } = await connectToDatabase();
    await db.command({ ping: 1 });
    mongoConnected = true;
  } catch {
    mongoConnected = false;
  }

  const nowIST = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });

  return {
    mongo_connected: mongoConnected,
    has_google_creds: Boolean(process.env.GOOGLE_CREDENTIALS_JSON),
    has_cloudinary: Boolean(process.env.CLOUD_NAME && process.env.UPLOAD_PRESET),
    has_aisensy: Boolean(process.env.AISENSY_API_KEY),
    ist_time: nowIST,
    status: mongoConnected ? "online" : "degraded",
  };
}
