import {
  getTodayReservations,
  getPendingCleaningTasks,
  type Reservation,
  type CleaningTask,
} from "@/lib/airtable";
import ActionButtons from "./components/ActionButtons";

function Badge({ n, color }: { n: number; color: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${color}`}
    >
      {n}
    </span>
  );
}

function ReservationRow({ r }: { r: Reservation }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="py-2 pr-4 font-medium">{r.fields.Apartment}</td>
      <td className="py-2 pr-4 text-sm text-gray-600">{r.fields.Guest_Name ?? "—"}</td>
      <td className="py-2 pr-4 text-sm">{r.fields.Check_In}</td>
      <td className="py-2 text-sm">{r.fields.Check_Out}</td>
    </tr>
  );
}

function CleaningRow({ t }: { t: CleaningTask }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="py-2 pr-4 font-medium">{t.fields.Apartment}</td>
      <td className="py-2 pr-4 text-sm text-gray-600">{t.fields.Checkout_Date}</td>
      <td className="py-2 text-sm">{t.fields.Rezervasyon_Kodu}</td>
    </tr>
  );
}

export default async function Dashboard() {
  const today = new Date().toISOString().split("T")[0];

  let reservations: Reservation[] = [];
  let cleaningTasks: CleaningTask[] = [];
  let fetchError = "";

  try {
    [reservations, cleaningTasks] = await Promise.all([
      getTodayReservations(),
      getPendingCleaningTasks(),
    ]);
  } catch (err: unknown) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  const checkIns = reservations.filter((r) => r.fields.Check_In === today);
  const checkOuts = reservations.filter((r) => r.fields.Check_Out === today);
  const active = reservations.filter(
    (r) => r.fields.Check_In < today && r.fields.Check_Out > today
  );

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">🏠 Daire Ops</h1>
          <p className="text-sm text-gray-500 mt-0.5">{today}</p>
        </div>
        <a
          href="https://airtable.com"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          Airtable →
        </a>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          <strong>Airtable bağlantı hatası:</strong> {fetchError}
        </div>
      )}

      {/* Today Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-500">Bugün Giriş</span>
            <Badge n={checkIns.length} color="bg-green-100 text-green-700" />
          </div>
          <p className="text-xs text-gray-400">Check-in</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-500">Bugün Çıkış</span>
            <Badge n={checkOuts.length} color="bg-yellow-100 text-yellow-700" />
          </div>
          <p className="text-xs text-gray-400">Check-out</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-500">Dolu Daire</span>
            <Badge n={active.length} color="bg-blue-100 text-blue-700" />
          </div>
          <p className="text-xs text-gray-400">Aktif misafir</p>
        </div>
      </div>

      {/* Reservations Table */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold mb-4">Bugünkü Rezervasyonlar</h2>
        {reservations.length === 0 ? (
          <p className="text-sm text-gray-400">Bugün aktif rezervasyon yok.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-400 uppercase">
                <th className="pb-2 pr-4">Daire</th>
                <th className="pb-2 pr-4">Misafir</th>
                <th className="pb-2 pr-4">Giriş</th>
                <th className="pb-2">Çıkış</th>
              </tr>
            </thead>
            <tbody>
              {checkIns.map((r) => (
                <ReservationRow key={r.id} r={r} />
              ))}
              {active.map((r) => (
                <ReservationRow key={r.id} r={r} />
              ))}
              {checkOuts.map((r) => (
                <ReservationRow key={r.id} r={r} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Cleaning Tasks */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Bekleyen Temizlikler</h2>
          {cleaningTasks.length > 0 && (
            <Badge
              n={cleaningTasks.length}
              color="bg-orange-100 text-orange-700"
            />
          )}
        </div>
        {cleaningTasks.length === 0 ? (
          <p className="text-sm text-gray-400">Bekleyen temizlik görevi yok.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-gray-400 uppercase">
                <th className="pb-2 pr-4">Daire</th>
                <th className="pb-2 pr-4">Çıkış Tarihi</th>
                <th className="pb-2">Rezervasyon Kodu</th>
              </tr>
            </thead>
            <tbody>
              {cleaningTasks.map((t, i) => (
                <CleaningRow key={t.id ?? i} t={t} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Manual Actions */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="font-semibold mb-4">Manuel İşlemler</h2>
        <ActionButtons />
        <p className="mt-3 text-xs text-gray-400">
          Sabah raporu her gün 08:00&apos;de Windows Görev Zamanlayıcı ile
          otomatik çalışır:{" "}
          <code className="bg-gray-100 px-1 rounded">
            http://127.0.0.1:3000/api/cron/morning
          </code>
        </p>
      </div>
    </main>
  );
}
