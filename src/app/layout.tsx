import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { Sidebar } from "@/components/layout/Sidebar";
import { ScraperStatusProvider } from "@/components/scraper/ScraperStatusProvider";
import { ToastProvider } from "@/components/ui/Toast";

import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Emer Admin",
  description: "Panel local de administración de la base de datos de Emer",
  // Nombre al anadirla a la pantalla de inicio del iPhone (el icono es app/apple-icon.png).
  appleWebApp: { title: "Emer Admin", statusBarStyle: "default" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="bg-canvas text-ink min-h-screen antialiased">
        <ToastProvider>
          <ScraperStatusProvider>
            <Sidebar />
            <main className="min-h-screen px-4 py-6 lg:ml-60 lg:px-10 lg:py-8">
              <div className="mx-auto max-w-[1400px]">{children}</div>
            </main>
          </ScraperStatusProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
