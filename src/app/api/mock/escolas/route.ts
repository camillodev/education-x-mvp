import { NextResponse } from "next/server";
import { SCHOOLS } from "@/lib/mock/schools";

export async function GET() {
  return NextResponse.json(SCHOOLS);
}
