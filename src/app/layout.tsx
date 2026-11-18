import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduSokh — So'x ta'lim platformasi",
  description: "So'x tumani va Farg'ona viloyati maktablari uchun uch tilli raqamli ta'lim platformasi",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased dark:bg-slate-900 dark:text-slate-100">{children}</body>
    </html>
  );
}
