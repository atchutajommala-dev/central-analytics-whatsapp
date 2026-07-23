import { connectToDatabase, JobDocument, ExecutionDocument, AuditDocument } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { WorkflowJob } from "@/types/dashboard";
import { getNextRun } from "@/lib/cron-utils";

export async function getJobsController(params: {
  search?: string;
  status?: string;
  tag?: string;
  page?: number;
  limit?: number;
}) {
  const { db } = await connectToDatabase();
  const page = params.page || 1;
  const limit = params.limit || 20;
  const skip = (page - 1) * limit;

  const query: any = {};
  if (params.search) {
    query.$or = [
      { name: { $regex: params.search, $options: "i" } },
      { description: { $regex: params.search, $options: "i" } },
      { tags: { $regex: params.search, $options: "i" } },
    ];
  }
  if (params.status && params.status !== "all") {
    query.status = params.status;
  }
  if (params.tag) {
    query.tags = params.tag;
  }

  const [rawJobs, total] = await Promise.all([
    db.collection<JobDocument>("jobs").find(query).sort({ updated_at: -1 }).skip(skip).limit(limit).toArray(),
    db.collection<JobDocument>("jobs").countDocuments(query),
  ]);

  // Compute live execution metrics fallback for each job
  const jobs = await Promise.all(
    rawJobs.map(async (job) => {
      const strId = String(job._id);
      const execs = await db
        .collection<ExecutionDocument>("executions")
        .find({
          $or: [
            { job_id: strId },
            { job_name: job.name },
            ...(ObjectId.isValid(strId) ? [{ job_id: new ObjectId(strId) }] : []),
          ],
        } as any)
        .sort({ started_at: -1 })
        .limit(50)
        .toArray();

      if (execs.length > 0) {
        const lastExec = execs[0];
        const succCount = execs.filter((e) => e.status === "success").length;
        const totalRuns = execs.length;
        const avgDur = Math.round(
          execs.reduce((acc, e) => acc + (e.duration_ms || 0), 0) / totalRuns
        );

        return {
          ...job,
          total_runs: Math.max(job.total_runs || 0, totalRuns),
          success_count: Math.max(job.success_count || 0, succCount),
          failure_count: totalRuns - succCount,
          last_run_at: job.last_run_at || (job as any).last_run || (lastExec as any).started_at || lastExec.start_time,
          last_status: lastExec.status || "success",
          avg_duration_ms: job.avg_duration_ms || avgDur,
        };
      }

      return job;
    })
  );

  return {
    jobs,
    pagination: {
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit),
    },
  };
}

export async function getJobByIdController(id: string) {
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

  if (!job) return null;

  const jobStrId = String(job._id);
  const execQuery: any = {
    $or: [
      { job_id: jobStrId },
      { job_id: id },
      { job_name: job.name },
      ...(ObjectId.isValid(jobStrId) ? [{ job_id: new ObjectId(jobStrId) }] : []),
      ...(ObjectId.isValid(id) ? [{ job_id: new ObjectId(id) }] : []),
    ],
  };

  const recentExecutions = await db
    .collection<ExecutionDocument>("executions")
    .find(execQuery)
    .sort({ started_at: -1 })
    .limit(50)
    .toArray();

  if (recentExecutions.length > 0) {
    const lastExec = recentExecutions[0];
    const succCount = recentExecutions.filter((e) => e.status === "success").length;
    const totalRuns = recentExecutions.length;
    const avgDur = Math.round(
      recentExecutions.reduce((acc, e) => acc + (e.duration_ms || 0), 0) / totalRuns
    );

    job = {
      ...job,
      total_runs: Math.max(job.total_runs || 0, totalRuns),
      success_count: Math.max(job.success_count || 0, succCount),
      failure_count: totalRuns - succCount,
      last_run_at: job.last_run_at || (job as any).last_run || (lastExec as any).started_at || lastExec.start_time,
      last_status: lastExec.status || "success",
      avg_duration_ms: job.avg_duration_ms || avgDur,
    };
  }

  return { job, executions: recentExecutions, recent_executions: recentExecutions };
}

export async function createJobController(jobData: Omit<WorkflowJob, "_id">, user: string = "system") {
  const { db } = await connectToDatabase();
  const now = new Date().toISOString();

  const docToInsert = {
    ...jobData,
    created_at: now,
    updated_at: now,
    created_by: user,
    updated_by: user,
    total_runs: 0,
    success_count: 0,
    failure_count: 0,
    version: 1,
    published: true,
  };

  const result = await db.collection("jobs").insertOne(docToInsert);
  const createdJob = { ...docToInsert, _id: result.insertedId };

  // Audit record
  await db.collection<AuditDocument>("audits").insertOne({
    actor: user,
    action: "create",
    target_type: "job",
    target_id: String(result.insertedId),
    timestamp: new Date(),
    details: { name: jobData.name },
  });

  return createdJob;
}

export async function updateJobController(id: string, updates: Partial<WorkflowJob>, user: string = "system") {
  const { db } = await connectToDatabase();
  const cleanId = String(id || (updates as any)?._id || (updates as any)?.id || "");
  let query: any = {};

  if (ObjectId.isValid(cleanId)) {
    query.$or = [{ _id: new ObjectId(cleanId) }, { _id: cleanId }];
  } else {
    query._id = cleanId;
  }

  const existing = await db.collection<JobDocument>("jobs").findOne(query);
  if (!existing) return null;

  // EXCLUDE _id FROM UPDATES TO PREVENT MONGODB IMMUTABLE FIELD ERROR
  const { _id, ...safeUpdates } = updates as any;

  const now = new Date().toISOString();
  const updateDoc: any = {
    ...safeUpdates,
    updated_at: now,
    updated_by: user,
    version: (existing.version || 1) + 1,
  };

  // Recalculate next_run if schedule cron expression is updated
  const newCronExpr = safeUpdates.schedule?.cron_expression;
  const newTz = safeUpdates.schedule?.timezone || existing.schedule?.timezone || "Asia/Kolkata";
  if (newCronExpr) {
    const nextRunDate = getNextRun(newCronExpr, newTz);
    if (nextRunDate) {
      updateDoc.next_run = nextRunDate.toISOString();
    }
  }

  await db.collection("jobs").updateOne(query, { $set: updateDoc } as any);
  const updatedJob = await db.collection<JobDocument>("jobs").findOne(query);

  // Audit record
  await db.collection<AuditDocument>("audits").insertOne({
    actor: user,
    action: "update",
    target_type: "job",
    target_id: String(existing._id),
    timestamp: new Date(),
    details: { updates: safeUpdates },
  });

  return updatedJob;
}

export async function deleteJobController(id: string, user: string = "system") {
  const { db } = await connectToDatabase();
  let query: any = {};

  if (ObjectId.isValid(id)) {
    query._id = new ObjectId(id);
  } else {
    query._id = id;
  }

  const job = await db.collection<JobDocument>("jobs").findOne(query);
  if (!job) return false;

  await db.collection<JobDocument>("jobs").deleteOne(query);

  await db.collection<AuditDocument>("audits").insertOne({
    actor: user,
    action: "delete",
    target_type: "job",
    target_id: String(job._id),
    timestamp: new Date(),
    details: { name: job.name },
  });

  return true;
}
