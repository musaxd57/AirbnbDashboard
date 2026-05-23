import { NextResponse } from "next/server";
import { getTomorrowCheckins, getApartmentByName } from "@/lib/airtable";
import { sendMessage } from "@/lib/telegram";

async function generateMessage(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY .env dosyasında eksik");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "AI mesaj üretemedi.";
}

export async function GET() {
  try {
    const checkins = await getTomorrowCheckins();
    const sent: string[] = [];

    for (const r of checkins) {
      const f = r.fields;
      const [apt] = await getApartmentByName(f.Apartment);
      const a = apt?.fields ?? {};

      const firstName = (f.Guest_Name ?? "Misafir").split(" ")[0];

      const prompt =
        `Sen Airbnb ev sahibisin. Aşağıdaki bilgilere göre misafire samimi, kişisel ve sıcak bir Türkçe karşılama mesajı yaz. ` +
        `Mesaj 150-200 kelime olsun. Emoji kullan. Airbnb'nin standart mesajlarından farklı, gerçekten özenli hissettirsin.\n\n` +
        `Misafir Adı: ${firstName}\n` +
        `Daire: ${f.Apartment}\n` +
        `Giriş: ${f.Check_In} saat ${a.CheckIn_Time ?? "14:00"}\n` +
        `Çıkış: ${f.Check_Out} saat ${a.CheckOut_Time ?? "11:00"}\n` +
        `Kalış: ${f.Nights ?? "?"} gece\n` +
        `WiFi: ${a.WiFi_Name ?? "EV-WIFI"} / ${a.WiFi_Password ?? "12345678"}\n` +
        `Kapı Şifresi: ${a.Door_Code ?? "Ayrıca iletilecek"}\n` +
        `Adres: ${a.Address ?? "Adres için mesaj atınız"}\n` +
        `Otopark: ${a.Parking ?? "Açık otopark mevcut"}\n` +
        (a.Nearby ? `Yakın noktalar: ${a.Nearby}\n` : "") +
        `\nMesaj şunları içersin: kişisel selamlama, giriş talimatları, WiFi, önemli notlar, "keyifli bir konaklama" dileği. Airbnb mesajlaşmasına kopyalanmaya hazır olsun.`;

      const aiMessage = await generateMessage(prompt);

      const telegramMsg =
        `🤖 *AI Check-in Mesajı Hazır*\n\n` +
        `👤 Misafir: ${f.Guest_Name ?? "—"}\n` +
        `🏠 Daire: ${f.Apartment}\n` +
        `📅 Giriş: ${f.Check_In} (${f.Nights ?? "?"} gece)\n\n` +
        `📋 *Airbnb'ye Kopyala:*\n\n${aiMessage}\n\n` +
        `_Bu mesajı Airbnb mesajlaşmasına yapıştırabilirsin._`;

      await sendMessage(telegramMsg);
      sent.push(f.Rezervasyon_Kodu);
    }

    return NextResponse.json({ ok: true, sent, count: sent.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
