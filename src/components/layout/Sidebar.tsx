"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { useScraperStatus } from "@/components/scraper/ScraperStatusProvider";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  /** Numero que se pinta en el cuadradito del item. */
  index: string;
  /** Si es `true`, muestra el indicador de scrape en curso. */
  showActivity?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/brands", label: "Marcas", index: "01" },
  { href: "/products", label: "Productos", index: "02" },
  { href: "/classification", label: "Clasificación", index: "03" },
  { href: "/tiendas", label: "Tiendas", index: "04" },
  { href: "/scraper", label: "Scraper", index: "05", showActivity: true },
];

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar() {
  const pathname = usePathname();
  const { activeCount } = useScraperStatus();
  const [open, setOpen] = useState(false);

  // El panel movil se cierra al pulsar cualquier enlace.
  const closePanel = () => setOpen(false);

  return (
    <>
      {/* Barra superior: solo por debajo de 1024px */}
      <header className="border-ink bg-cream sticky top-0 z-40 flex items-center justify-between gap-3 border-b-2 px-4 py-3 lg:hidden">
        <Link href="/" className="text-base font-bold tracking-tighter uppercase">
          Emer Admin
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="sidebar-nav"
          className="press border-ink bg-paper cursor-pointer border-2 px-3 py-1.5 text-xs font-bold tracking-widest uppercase"
        >
          {open ? "Cerrar" : "Menú"}
        </button>
      </header>

      {/* Fondo oscuro del panel en movil */}
      {open ? (
        <div className="bg-ink/50 fixed inset-0 z-40 lg:hidden" onClick={closePanel} aria-hidden />
      ) : null}

      <nav
        id="sidebar-nav"
        aria-label="Navegación principal"
        className={cn(
          "border-ink bg-cream fixed top-0 bottom-0 left-0 z-50 flex w-60 flex-col border-r-2 transition-transform duration-[120ms] ease-out",
          "lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Link
          href="/"
          onClick={closePanel}
          className="border-ink bg-ink text-cream flex flex-col gap-0.5 border-b-2 px-4 py-5"
        >
          <span className="text-xl leading-none font-bold tracking-tighter uppercase">
            Emer Admin
          </span>
          <span className="text-[10px] tracking-[0.2em] uppercase opacity-70">Panel local</span>
        </Link>

        <ul className="flex flex-1 flex-col overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closePanel}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "border-ink flex items-center gap-3 border-b-2 px-4 py-3 text-sm font-bold tracking-wide uppercase transition-colors duration-[120ms]",
                    active ? "bg-ink text-cream" : "text-ink hover:bg-paper",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center border-2 text-[10px] font-bold",
                      active ? "border-cream text-cream" : "border-ink text-ink",
                    )}
                  >
                    {item.index}
                  </span>
                  {item.label}
                  {item.showActivity && activeCount > 0 ? (
                    <span
                      className="bg-progress border-ink ml-auto size-2.5 animate-pulse border-2"
                      title={`${activeCount} scrape(s) en curso`}
                      aria-label={`${activeCount} scrape(s) en curso`}
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="border-ink border-t-2 px-4 py-3">
          <p className="text-[10px] leading-relaxed tracking-widest uppercase opacity-60">
            Solo localhost
            <br />
            Sin autenticación
          </p>
        </div>
      </nav>
    </>
  );
}
