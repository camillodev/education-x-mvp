import { NextResponse } from "next/server";
import { CSV_IMPORT_ROWS, VALID_PLANS } from "@/lib/mock/csv-import";

export async function GET() {
  return NextResponse.json({ rows: CSV_IMPORT_ROWS, planosValidos: VALID_PLANS });
}
