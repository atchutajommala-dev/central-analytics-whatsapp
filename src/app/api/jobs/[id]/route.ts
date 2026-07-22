import { NextResponse } from "next/server";
import { getJobByIdController, updateJobController, deleteJobController } from "@/controllers/jobsController";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await getJobByIdController(id);
    if (!result) {
      return NextResponse.json({ error: `Job not found for ID: ${id}` }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch job" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await updateJobController(id, body, body.updated_by || "user");
    if (!updated) {
      return NextResponse.json({ error: `Job not found for ID: ${id}` }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to update job" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const success = await deleteJobController(id);
    if (!success) {
      return NextResponse.json({ error: `Job not found for ID: ${id}` }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: `Job ${id} deleted` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to delete job" }, { status: 500 });
  }
}
