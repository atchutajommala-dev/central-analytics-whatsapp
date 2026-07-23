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

function cleanEnvVal(val?: string): string {
  if (!val) return "";
  let s = val.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
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

  const envStatus: Record<string, boolean> = {
    GOOGLE_CREDENTIALS_JSON: Boolean(cleanEnvVal(process.env.GOOGLE_CREDENTIALS_JSON)),
    CLOUD_NAME: Boolean(cleanEnvVal(process.env.CLOUD_NAME)),
    UPLOAD_PRESET: Boolean(cleanEnvVal(process.env.UPLOAD_PRESET)),
    AISENSY_API_KEY: Boolean(cleanEnvVal(process.env.AISENSY_API_KEY)),
    DESTINATIONS: Boolean(cleanEnvVal(process.env.DESTINATIONS || process.env.TEST_RECIPIENT_PHONE)),
    CRON_SECRET: Boolean(cleanEnvVal(process.env.CRON_SECRET)),
    FIREBASE_AUTH: Boolean(cleanEnvVal(process.env.NEXT_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)),
    ADMIN_EMAILS: Boolean(cleanEnvVal(process.env.ADMIN_EMAILS || process.env.NEXT_PUBLIC_ADMIN_EMAILS)),
    MONGODB_URI: Boolean(cleanEnvVal(process.env.MONGODB_URI)),
  };

  return {
    mongo_connected: mongoConnected,
    has_google_creds: envStatus.GOOGLE_CREDENTIALS_JSON,
    has_cloudinary: envStatus.CLOUD_NAME && envStatus.UPLOAD_PRESET,
    has_aisensy: envStatus.AISENSY_API_KEY,
    env_status: envStatus,
    ist_time: nowIST,
    status: mongoConnected ? "online" : "degraded",
  };
}
