import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    AIRTABLE_TOKEN: process.env.AIRTABLE_TOKEN ? `${process.env.AIRTABLE_TOKEN.slice(0, 6)}...` : "YOK",
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID ?? "YOK",
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? "VAR" : "YOK",
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID ?? "YOK",
  });
}
