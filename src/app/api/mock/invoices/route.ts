import { NextResponse } from "next/server";
import { INVOICES, UPCOMING_DUES } from "@/lib/mock/invoices";

export async function GET() {
  return NextResponse.json({ invoices: INVOICES, upcomingDues: UPCOMING_DUES });
}
