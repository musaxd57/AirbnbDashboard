import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Daire Ops",
  description: "Airbnb Daire Yönetim Paneli",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
