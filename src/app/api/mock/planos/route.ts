import { NextResponse } from "next/server";
import { ENROLLMENT_PLANS } from "@/lib/mock/plans";

export async function GET() {
  return NextResponse.json(ENROLLMENT_PLANS);
}
