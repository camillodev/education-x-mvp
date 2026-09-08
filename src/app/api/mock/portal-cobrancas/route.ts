import { NextResponse } from "next/server";
import { GUARDIAN_INVOICES } from "@/lib/mock/guardian-portal";

export async function GET() {
  return NextResponse.json(GUARDIAN_INVOICES);
}
