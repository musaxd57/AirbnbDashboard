import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const tokens = {
      AIRTABLE_TOKEN: body.AIRTABLE_TOKEN?.trim() ?? "",
      AIRTABLE_BASE_ID: body.AIRTABLE_BASE_ID?.trim() || "appc7SZojZt50Hv7v",
      TELEGRAM_BOT_TOKEN: body.TELEGRAM_BOT_TOKEN?.trim() ?? "",
      TELEGRAM_CHAT_ID: body.TELEGRAM_CHAT_ID?.trim() || "6248901684",
      OPENAI_API_KEY: body.OPENAI_API_KEY?.trim() ?? "",
    };

    const filePath = path.join(process.cwd(), "tokens.json");
    fs.writeFileSync(filePath, JSON.stringify(tokens, null, 2), "utf-8");

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
