import { NextResponse } from "next/server";
import { CHURN_6M, DELINQUENCY_6M, REVENUE_6M, STUDENTS_6M } from "@/lib/mock/reports";
import { REPORT_SUMMARIES } from "@/lib/mock/report-summaries";

export async function GET() {
  return NextResponse.json({
    faturamento: REVENUE_6M,
    inadimplencia: DELINQUENCY_6M,
    alunos: STUDENTS_6M,
    churn: CHURN_6M,
    resumos: REPORT_SUMMARIES,
  });
}
