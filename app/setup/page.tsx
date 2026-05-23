"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SetupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    AIRTABLE_TOKEN: "",
    TELEGRAM_BOT_TOKEN: "",
    OPENAI_API_KEY: "",
  });
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "err">("idle");
  const [error, setError] = useState("");

  async function save() {
    setStatus("saving");
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          AIRTABLE_BASE_ID: "appc7SZojZt50Hv7v",
          TELEGRAM_CHAT_ID: "6248901684",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus("ok");
        setTimeout(() => router.push("/"), 1500);
      } else {
        setStatus("err");
        setError(data.error ?? "Hata oluştu");
      }
    } catch (e: unknown) {
      setStatus("err");
      setError(String(e));
    }
  }

  return (
    <main className="max-w-lg mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">🔧 Daire Ops Kurulum</h1>
        <p className="text-sm text-gray-500 mt-1">Token'larını gir, kaydet — bitti.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">
            Airtable Token <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="patm6BDPh5T4cRKsy..."
            value={form.AIRTABLE_TOKEN}
            onChange={e => setForm(f => ({ ...f, AIRTABLE_TOKEN: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">airtable.com/create/tokens adresinden al</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Telegram Bot Token <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="123456789:AAH..."
            value={form.TELEGRAM_BOT_TOKEN}
            onChange={e => setForm(f => ({ ...f, TELEGRAM_BOT_TOKEN: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">@BotFather'dan al</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">OpenAI API Key (opsiyonel)</label>
          <input
            type="text"
            placeholder="sk-proj-..."
            value={form.OPENAI_API_KEY}
            onChange={e => setForm(f => ({ ...f, OPENAI_API_KEY: e.target.value }))}
            className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-gray-400 mt-1">AI check-in mesajı için — yoksa boş bırak</p>
        </div>
      </div>

      {status === "err" && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-3">{error}</p>
      )}
      {status === "ok" && (
        <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded p-3">
          ✓ Kaydedildi! Ana sayfaya yönlendiriliyorsun...
        </p>
      )}

      <button
        onClick={save}
        disabled={!form.AIRTABLE_TOKEN || !form.TELEGRAM_BOT_TOKEN || status === "saving"}
        className="w-full bg-black text-white rounded-lg py-3 font-medium disabled:opacity-40 hover:bg-gray-800 transition"
      >
        {status === "saving" ? "Kaydediliyor..." : "Kaydet ve Başlat"}
      </button>
    </main>
  );
}
