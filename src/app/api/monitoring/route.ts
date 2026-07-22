import { NextResponse } from "next/server";
import { getMonitoringMetricsController } from "@/controllers/monitoringController";

export async function GET() {
  try {
    const metrics = await getMonitoringMetricsController();
    return NextResponse.json(metrics);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch monitoring metrics" }, { status: 500 });
  }
}
