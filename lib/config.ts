import fs from "fs";
import path from "path";

interface Tokens {
  AIRTABLE_TOKEN: string;
  AIRTABLE_BASE_ID: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  OPENAI_API_KEY?: string;
}

function loadTokens(): Tokens {
  // 1. Önce process.env dene
  if (process.env.AIRTABLE_TOKEN) {
    return {
      AIRTABLE_TOKEN: process.env.AIRTABLE_TOKEN,
      AIRTABLE_BASE_ID: process.env.AIRTABLE_BASE_ID ?? "",
      TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ?? "",
      TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID ?? "",
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    };
  }

  // 2. tokens.json dosyasından oku (her istekte taze okur)
  const tokenFile = path.join(process.cwd(), "tokens.json");
  if (fs.existsSync(tokenFile)) {
    const raw = fs.readFileSync(tokenFile, "utf-8");
    return JSON.parse(raw);
  }

  return {
    AIRTABLE_TOKEN: "",
    AIRTABLE_BASE_ID: "appc7SZojZt50Hv7v",
    TELEGRAM_BOT_TOKEN: "",
    TELEGRAM_CHAT_ID: "6248901684",
  };
}

export function getConfig(): Tokens {
  return loadTokens();
}
