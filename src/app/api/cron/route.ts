import { NextResponse } from "next/server";
import { executeAutomationController } from "@/controllers/cronController";

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // If no secret configured, allow execution

  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const customHeader = req.headers.get("x-cron-secret") || "";

  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret") || "";

  return token === cronSecret || customHeader === cronSecret || querySecret === cronSecret;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-cron-secret",
    },
  });
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing CRON_SECRET" }, { status: 401 });
  }

  try {
    const url = new URL(req.url);
    const force_run = url.searchParams.get("force_run") === "true";
    const dry_run = url.searchParams.get("dry_run") === "true";
    const job_id = url.searchParams.get("job_id") || undefined;

    const result = await executeAutomationController({ force_run, dry_run, job_id });
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Automation execution failed" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized: Invalid or missing CRON_SECRET" }, { status: 401 });
  }

  try {
    const payload = await req.json().catch(() => ({}));
    const result = await executeAutomationController(payload);

    if (result.status === "error") {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Automation execution failed" }, { status: 500 });
  }
}

