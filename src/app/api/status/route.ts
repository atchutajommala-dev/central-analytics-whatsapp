import { NextResponse } from "next/server";
import { getSystemStatusController } from "@/controllers/monitoringController";

export async function GET() {
  try {
    const status = await getSystemStatusController();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to check system status" }, { status: 500 });
  }
}
