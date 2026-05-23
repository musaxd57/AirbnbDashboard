const BASE_URL = () =>
  `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;

const authHeaders = () => ({
  Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
  "Content-Type": "application/json",
});

export interface Reservation {
  id: string;
  fields: {
    Rezervasyon_Kodu: string;
    Apartment: string;
    Guest_Name?: string;
    Check_In: string;
    Check_Out: string;
    Source?: string;
    Nights?: number;
    Status?: string;
  };
}

export interface CleaningTask {
  id?: string;
  fields: {
    Task_ID: string;
    Apartment: string;
    Checkout_Date: string;
    Rezervasyon_Kodu: string;
    Status: string;
    Notes?: string;
    Completed_At?: string;
  };
}

async function listRecords(table: string, formula?: string): Promise<any[]> {
  const base = BASE_URL();
  const headers = authHeaders();
  const records: any[] = [];
  let offset: string | undefined;

  do {
    const url = new URL(`${base}/${encodeURIComponent(table)}`);
    url.searchParams.set("pageSize", "100");
    if (formula) url.searchParams.set("filterByFormula", formula);
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url.toString(), { headers, cache: "no-store" });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable ${table} GET ${res.status}: ${body}`);
    }
    const data = await res.json();
    records.push(...data.records);
    offset = data.offset;
  } while (offset);

  return records;
}

async function createRecord(
  table: string,
  fields: Record<string, unknown>
): Promise<any> {
  const res = await fetch(
    `${BASE_URL()}/${encodeURIComponent(table)}`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ records: [{ fields }] }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Airtable ${table} POST ${res.status}: ${body}`);
  }
  return res.json();
}

export async function getTodayReservations(): Promise<Reservation[]> {
  const today = new Date().toISOString().split("T")[0];
  const formula = `OR({Check_In}='${today}',{Check_Out}='${today}',AND(IS_BEFORE({Check_In},'${today}'),IS_AFTER({Check_Out},'${today}')))`;
  return listRecords("Reservations", formula);
}

export async function getTodayCheckouts(): Promise<Reservation[]> {
  const today = new Date().toISOString().split("T")[0];
  return listRecords("Reservations", `{Check_Out}='${today}'`);
}

export async function getPendingCleaningTasks(): Promise<CleaningTask[]> {
  return listRecords("Cleaning_Tasks", `{Status}='Bekliyor'`);
}

export async function getCleaningTaskByCode(
  kod: string,
  date: string
): Promise<CleaningTask[]> {
  const formula = `AND({Rezervasyon_Kodu}='${kod}',{Checkout_Date}='${date}')`;
  return listRecords("Cleaning_Tasks", formula);
}

export async function createCleaningTask(
  fields: CleaningTask["fields"]
): Promise<any> {
  return createRecord("Cleaning_Tasks", fields as Record<string, unknown>);
}

export interface Apartment {
  id: string;
  fields: {
    Apartment: string;
    "Calendar Name"?: string;
    Address?: string;
    Door_Code?: string;
    WiFi_Name?: string;
    WiFi_Password?: string;
    CheckIn_Time?: string;
    CheckOut_Time?: string;
    Parking?: string;
    Nearby?: string;
  };
}

export async function getApartments(): Promise<Apartment[]> {
  return listRecords("Apartments");
}

export async function getApartmentByName(name: string): Promise<Apartment[]> {
  return listRecords("Apartments", `{Apartment}='${name}'`);
}

export async function getTomorrowCheckins(): Promise<Reservation[]> {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const tomorrow = d.toISOString().split("T")[0];
  return listRecords("Reservations", `{Check_In}='${tomorrow}'`);
}

// Airtable upsert (PATCH ile performUpsert)
export async function upsertReservations(
  records: Reservation["fields"][]
): Promise<{ created: number; updated: number }> {
  // Airtable max 10 record per request
  const chunks: Reservation["fields"][][] = [];
  for (let i = 0; i < records.length; i += 10) {
    chunks.push(records.slice(i, i + 10));
  }

  let created = 0;
  let updated = 0;

  for (const chunk of chunks) {
    const res = await fetch(
      `${BASE_URL()}/${encodeURIComponent("Reservations")}`,
      {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({
          performUpsert: { fieldsToMergeOn: ["Rezervasyon_Kodu"] },
          records: chunk.map((f) => ({ fields: f })),
        }),
      }
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Airtable upsert ${res.status}: ${body}`);
    }
    const data = await res.json();
    created += data.createdRecords?.length ?? 0;
    updated += data.updatedRecords?.length ?? 0;
  }

  return { created, updated };
}
