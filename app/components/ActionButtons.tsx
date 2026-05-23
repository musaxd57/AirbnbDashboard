"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "ok" | "err";

function TriggerButton({
  label,
  endpoint,
  icon,
}: {
  label: string;
  endpoint: string;
  icon: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [detail, setDetail] = useState("");

  async function run() {
    setStatus("loading");
    setDetail("");
    try {
      const res = await fetch(endpoint);
      const data = await res.json();
      if (data.ok) {
        setStatus("ok");
        setDetail(
          data.count !== undefined
            ? `${data.count} görev oluşturuldu`
            : data.checkIns !== undefined
            ? `${data.checkIns} giriş · ${data.checkOuts} çıkış · ${data.active} dolu`
            : data.message ?? ""
        );
      } else {
        setStatus("err");
        setDetail(data.error ?? "Bilinmeyen hata");
      }
    } catch {
      setStatus("err");
      setDetail("Sunucuya bağlanılamadı");
    }
  }

  const colors: Record<Status, string> = {
    idle: "bg-white hover:bg-gray-50 border-gray-200 text-gray-700",
    loading: "bg-blue-50 border-blue-200 text-blue-700",
    ok: "bg-green-50 border-green-300 text-green-700",
    err: "bg-red-50 border-red-300 text-red-700",
  };

  return (
    <button
      onClick={run}
      disabled={status === "loading"}
      className={`w-full text-left border rounded-lg px-4 py-3 transition-colors ${colors[status]}`}
    >
      <div className="flex items-center gap-2 font-medium">
        <span>{icon}</span>
        <span>{label}</span>
        {status === "loading" && (
          <span className="ml-auto text-sm animate-pulse">Çalışıyor...</span>
        )}
        {status === "ok" && <span className="ml-auto text-sm">✓ Başarılı</span>}
        {status === "err" && <span className="ml-auto text-sm">✗ Hata</span>}
      </div>
      {detail && <p className="mt-1 text-xs opacity-75">{detail}</p>}
    </button>
  );
}

export default function ActionButtons() {
  return (
    <div className="space-y-3">
      <TriggerButton
        icon="📊"
        label="Sabah Raporu Gönder"
        endpoint="/api/cron/morning"
      />
      <TriggerButton
        icon="🧹"
        label="Temizlik Görevlerini Kontrol Et"
        endpoint="/api/cron/cleaning"
      />
      <TriggerButton
        icon="📡"
        label="Telegram Bağlantı Testi"
        endpoint="/api/telegram/test"
      />
    </div>
  );
}
