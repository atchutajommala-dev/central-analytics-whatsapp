import { connectToDatabase, JobDocument, ExecutionDocument, AuditDocument } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { WorkflowJob } from "@/types/dashboard";

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

  const [jobs, total] = await Promise.all([
    db.collection<JobDocument>("jobs").find(query).sort({ updated_at: -1 }).skip(skip).limit(limit).toArray(),
    db.collection<JobDocument>("jobs").countDocuments(query),
  ]);

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
  let query: any = {};

  if (ObjectId.isValid(id)) {
    query._id = new ObjectId(id);
  } else {
    query._id = id;
  }

  const existing = await db.collection<JobDocument>("jobs").findOne(query);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updateDoc = {
    ...updates,
    updated_at: now,
    updated_by: user,
    version: (existing.version || 1) + 1,
  };

  await db.collection("jobs").updateOne(query, { $set: updateDoc } as any);
  const updatedJob = await db.collection<JobDocument>("jobs").findOne(query);

  // Audit record
  await db.collection<AuditDocument>("audits").insertOne({
    actor: user,
    action: "update",
    target_type: "job",
    target_id: String(existing._id),
    timestamp: new Date(),
    details: { updates },
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
