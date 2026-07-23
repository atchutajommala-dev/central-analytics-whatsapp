import { NextResponse } from "next/server";
import { getJobsController, createJobController, updateJobController, deleteJobController } from "@/controllers/jobsController";

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const result = await getJobsController({ search, status, tag, page, limit });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch jobs" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Job name is required" }, { status: 400 });
    }

    const created = await createJobController(body, body.created_by || "user");
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to create job" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { searchParams } = new URL(req.url);
    const id = body._id || body.id || searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Job ID (_id) is required for update" }, { status: 400 });
    }

    const updated = await updateJobController(String(id), body, body.updated_by || "user");
    if (!updated) {
      return NextResponse.json({ error: `Job not found for ID: ${id}` }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id") || searchParams.get("job_id");

    if (!id) {
      return NextResponse.json({ error: "Job ID (id) query parameter is required" }, { status: 400 });
    }

    const success = await deleteJobController(id);
    if (!success) {
      return NextResponse.json({ error: `Job not found for ID: ${id}` }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Job ${id} deleted` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete job" }, { status: 500 });
  }
}
