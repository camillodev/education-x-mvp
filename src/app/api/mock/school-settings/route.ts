import { NextResponse } from "next/server";
import { SCHOOL_SETTINGS } from "@/lib/mock/school-settings";

export async function GET() {
  return NextResponse.json(SCHOOL_SETTINGS);
}
