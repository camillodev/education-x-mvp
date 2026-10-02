import { NextResponse } from "next/server";
import { NOTIFICATION_CHANNELS, PLATFORM_INVOICES, PLATFORM_PLANS } from "@/lib/mock/platform-billing";

export async function GET() {
  return NextResponse.json({
    planos: PLATFORM_PLANS,
    faturas: PLATFORM_INVOICES,
    canaisNotificacao: NOTIFICATION_CHANNELS,
  });
}
