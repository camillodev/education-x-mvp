import { NextResponse } from "next/server";
import { LEDGER_ENTRIES, RECEIVABLES, SCHOOL_BALANCE } from "@/lib/mock/financials";

export async function GET() {
  return NextResponse.json({
    saldo: SCHOOL_BALANCE,
    recebiveis: RECEIVABLES,
    extrato: LEDGER_ENTRIES,
  });
}
