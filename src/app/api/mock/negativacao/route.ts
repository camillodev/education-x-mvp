import { NextResponse } from "next/server";
import { DUNNING_RECORDS } from "@/lib/mock/dunning";

export async function GET() {
  return NextResponse.json(DUNNING_RECORDS);
}
