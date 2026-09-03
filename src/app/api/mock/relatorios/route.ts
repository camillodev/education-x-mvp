import { NextResponse } from "next/server";
import { CHURN_6M, DELINQUENCY_6M, REVENUE_6M, STUDENTS_6M } from "@/lib/mock/reports";

export async function GET() {
  return NextResponse.json({
    faturamento: REVENUE_6M,
    inadimplencia: DELINQUENCY_6M,
    alunos: STUDENTS_6M,
    churn: CHURN_6M,
  });
}
