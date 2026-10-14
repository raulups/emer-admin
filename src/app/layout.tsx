import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

import { Sidebar } from "@/components/layout/Sidebar";
import { ScraperStatusProvider } from "@/components/scraper/ScraperStatusProvider";
import { ToastProvider } from "@/components/ui/Toast";

import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Emer Admin",
  description: "Panel local de administración de la base de datos de Emer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={spaceGrotesk.variable}>
      <body className="bg-paper text-ink min-h-screen antialiased">
        <ToastProvider>
          <ScraperStatusProvider>
            <Sidebar />
            <main className="min-h-screen px-4 py-6 lg:ml-60 lg:px-8 lg:py-8">{children}</main>
          </ScraperStatusProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
