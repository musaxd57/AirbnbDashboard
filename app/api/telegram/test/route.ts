import { NextResponse } from "next/server";
import { sendMessage } from "@/lib/telegram";

export async function GET() {
  try {
    await sendMessage(
      "✅ *Daire Ops* bağlantı testi başarılı\\!\n\nTelegram entegrasyonu çalışıyor 🎉"
    );
    return NextResponse.json({ ok: true, message: "Test mesajı gönderildi" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
