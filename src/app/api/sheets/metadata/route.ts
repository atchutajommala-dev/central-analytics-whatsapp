import { NextResponse } from "next/server";
import { fetchSpreadsheetMetadataController } from "@/controllers/sheetsController";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sheetId = searchParams.get("sheet_id");

    if (!sheetId) {
      return NextResponse.json({ error: "Missing sheet_id parameter" }, { status: 400 });
    }

    const metadata = await fetchSpreadsheetMetadataController(sheetId);
    return NextResponse.json(metadata);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Failed to fetch spreadsheet metadata" }, { status: 400 });
  }
}
