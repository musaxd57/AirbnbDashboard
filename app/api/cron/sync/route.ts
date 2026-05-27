import { NextResponse } from "next/server";
import { getApartments, upsertReservations } from "@/lib/airtable";

function parseIcal(icalData: string, apartmentName: string) {
  // RFC 5545 satır katlama çöz
  const rawLines = icalData.split(/\r?\n/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && lines.length > 0) {
      lines[lines.length - 1] += line.substring(1);
    } else {
      lines.push(line);
    }
  }

  const results: ReturnType<typeof makeRecord>[] = [];
  let evt: Record<string, string> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      evt = {};
    } else if (line === "END:VEVENT") {
      if (evt?.start && evt?.end) {
        const fmt = (raw: string) => {
          const d = raw.replace(/T.*$/, "").replace("Z", "");
          return d.length >= 8
            ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
            : d;
        };
        const uid = (evt.uid ?? "").trim();
        const kod = uid.includes("@") ? uid.split("@")[0] : uid || "MANUAL";
        results.push(
          makeRecord(kod, apartmentName, evt.summary ?? "Reserved", fmt(evt.start), fmt(evt.end))
        );
      }
      evt = null;
    } else if (evt !== null) {
      if (line.startsWith("DTSTART")) evt.start = line.split(":").slice(1).join(":").trim();
      else if (line.startsWith("DTEND")) evt.end = line.split(":").slice(1).join(":").trim();
      else if (line.startsWith("SUMMARY:")) evt.summary = line.substring(8).trim();
      else if (line.startsWith("UID:")) evt.uid = line.substring(4).trim();
    }
  }

  return results;
}

function makeRecord(kod: string, apartment: string, guest: string, checkIn: string, checkOut: string) {
  return {
    Rezervasyon_Kodu: kod,
    Apartment: apartment,
    Guest_Name: guest,
    Check_In: checkIn,
    Check_Out: checkOut,
    Source: "Airbnb",
    Synced_At: new Date().toISOString().split("T")[0],
  };
}

export async function GET() {
  try {
    const apartments = await getApartments();
    const allRecords: ReturnType<typeof makeRecord>[] = [];
    const errors: string[] = [];

    for (const apt of apartments) {
      const url = apt.fields["Calendar Name"];
      if (!url) continue;

      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const icalData = await res.text();
        const parsed = parseIcal(icalData, apt.fields.Apartment);
        allRecords.push(...parsed);
      } catch (err) {
        errors.push(`${apt.fields.Apartment}: ${err instanceof Error ? err.message : err}`);
      }
    }

    const { created, updated } = await upsertReservations(allRecords);

    return NextResponse.json({
      ok: true,
      apartments: apartments.length,
      parsed: allRecords.length,
      created,
      updated,
      errors,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
