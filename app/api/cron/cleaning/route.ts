import { NextResponse } from "next/server";
import {
  getTodayCheckouts,
  getCleaningTaskByCode,
  createCleaningTask,
} from "@/lib/airtable";
import { sendMessage } from "@/lib/telegram";

export async function GET() {
  try {
    const checkouts = await getTodayCheckouts();
    const today = new Date().toISOString().split("T")[0];
    const created: string[] = [];

    for (const res of checkouts) {
      const kod = res.fields.Rezervasyon_Kodu;
      if (!kod) continue;

      const existing = await getCleaningTaskByCode(kod, today);
      if (existing.length > 0) continue;

      const fields = {
        Task_ID: `CLEAN-${kod}-${today}`,
        Apartment: res.fields.Apartment || "Bilinmeyen",
        Checkout_Date: res.fields.Check_Out,
        Rezervasyon_Kodu: kod,
        Status: "Bekliyor" as const,
      };

      await createCleaningTask(fields);

      const msg =
        `🧹 *Temizlik Görevi Oluşturuldu*\n\n` +
        `🏠 Daire: ${fields.Apartment}\n` +
        `📅 Çıkış: ${fields.Checkout_Date}\n` +
        `🔑 Kod: ${kod}\n\n` +
        `⚠️ Temizlik bekliyor! Airtable'dan durumu güncelleyin.`;

      await sendMessage(msg);
      created.push(kod);
    }

    return NextResponse.json({ ok: true, created, count: created.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
