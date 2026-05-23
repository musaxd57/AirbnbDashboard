import { NextResponse } from "next/server";
import { getConfig } from "@/lib/config";

export async function GET() {
  const cfg = getConfig();
  return NextResponse.json({
    AIRTABLE_TOKEN: cfg.AIRTABLE_TOKEN ? `${cfg.AIRTABLE_TOKEN.slice(0, 6)}...` : "YOK",
    AIRTABLE_BASE_ID: cfg.AIRTABLE_BASE_ID || "YOK",
    TELEGRAM_BOT_TOKEN: cfg.TELEGRAM_BOT_TOKEN ? "VAR" : "YOK",
    TELEGRAM_CHAT_ID: cfg.TELEGRAM_CHAT_ID || "YOK",
  });
}
