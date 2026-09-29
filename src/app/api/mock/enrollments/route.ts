import { NextResponse } from "next/server";
import { ENROLLMENTS } from "@/lib/mock/enrollments";

export async function GET() {
  return NextResponse.json(ENROLLMENTS);
}
