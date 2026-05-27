import { NextResponse } from "next/server";
import { getTodayReservations } from "@/lib/airtable";
import { sendMessage } from "@/lib/telegram";

export async function GET() {
  try {
    const reservations = await getTodayReservations();
    const today = new Date().toISOString().split("T")[0];

    const checkIns = reservations.filter((r) => r.fields.Check_In === today);
    const checkOuts = reservations.filter((r) => r.fields.Check_Out === today);
    const active = reservations.filter(
      (r) => r.fields.Check_In < today && r.fields.Check_Out > today
    );

    let msg = `🏠 *Airbnb Günlük Rapor — ${today}*\n\n`;

    if (checkIns.length > 0) {
      msg += `✅ *Bugün Giriş (${checkIns.length})*\n`;
      checkIns.forEach((r) => {
        const f = r.fields;
        msg += `  • ${f.Apartment} → ${f.Check_Out} çıkış (${f.Nights ?? "?"} gece)\n`;
      });
      msg += "\n";
    }

    if (checkOuts.length > 0) {
      msg += `🔑 *Bugün Çıkış (${checkOuts.length})*\n`;
      checkOuts.forEach((r) => {
        msg += `  • ${r.fields.Apartment} — temizlik gerekli\n`;
      });
      msg += "\n";
    }

    if (active.length > 0) {
      msg += `🛏️ *Dolu Daireler (${active.length})*\n`;
      active.forEach((r) => {
        msg += `  • ${r.fields.Apartment} → ${r.fields.Check_Out} çıkış\n`;
      });
      msg += "\n";
    }

    if (
      checkIns.length === 0 &&
      checkOuts.length === 0 &&
      active.length === 0
    ) {
      msg += "📭 Bugün aktif rezervasyon yok.\n";
    }

    msg += `\n_Toplam takipte: ${reservations.length} rezervasyon_`;

    await sendMessage(msg);

    return NextResponse.json({
      ok: true,
      today,
      checkIns: checkIns.length,
      checkOuts: checkOuts.length,
      active: active.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
