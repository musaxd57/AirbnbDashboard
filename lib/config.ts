import fs from "fs";
import path from "path";

interface Tokens {
  AIRTABLE_TOKEN: string;
  AIRTABLE_BASE_ID: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  OPENAI_API_KEY?: string;
}

// Sabit değerler — bunları değiştirme
const DEFAULTS = {
  AIRTABLE_BASE_ID: "appc7SZojZt50Hv7v",
  TELEGRAM_CHAT_ID: "6248901684",
};

function readFile(filename: string): string {
  try {
    const p = path.join(process.cwd(), filename);
    if (fs.existsSync(p)) return fs.readFileSync(p, "utf-8").trim();
  } catch {}
  return "";
}

export function getConfig(): Tokens {
  // 1. tokens.json varsa oku
  try {
    const p = path.join(process.cwd(), "tokens.json");
    if (fs.existsSync(p)) {
      const t = JSON.parse(fs.readFileSync(p, "utf-8"));
      if (t.AIRTABLE_TOKEN) return { ...DEFAULTS, ...t };
    }
  } catch {}

  // 2. Tek satırlık dosyalar
  const airtableToken = readFile("airtable-token.txt") || process.env.AIRTABLE_TOKEN || "";
  const telegramToken = readFile("telegram-token.txt") || process.env.TELEGRAM_BOT_TOKEN || "";
  const openaiKey = readFile("openai-key.txt") || process.env.OPENAI_API_KEY || "";

  return {
    AIRTABLE_TOKEN: airtableToken,
    AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID || DEFAULTS.AIRTABLE_BASE_ID,
    TELEGRAM_BOT_TOKEN: telegramToken,
    TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || DEFAULTS.TELEGRAM_CHAT_ID,
    OPENAI_API_KEY: openaiKey,
  };
}
