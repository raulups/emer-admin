"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { useScraperStatus } from "@/components/scraper/ScraperStatusProvider";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  /** Si es `true`, muestra el indicador de scrape en curso. */
  showActivity?: boolean;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-[18px] shrink-0"
    >
      {children}
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/brands",
    label: "Marcas",
    icon: (
      <Icon>
        <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
        <circle cx="7.5" cy="7.5" r="1.5" />
      </Icon>
    ),
  },
  {
    href: "/products",
    label: "Productos",
    icon: (
      <Icon>
        <path d="M20.4 18.6 13 7.2V5a1.5 1.5 0 1 0-3 0" />
        <path d="M3.6 18.6 12 7.2" />
        <path d="M3 19h18" />
      </Icon>
    ),
  },
  {
    href: "/classification",
    label: "Clasificación",
    icon: (
      <Icon>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <path d="M14 17.5h7M17.5 14v7" />
      </Icon>
    ),
  },
  {
    href: "/tiendas",
    label: "Tiendas",
    icon: (
      <Icon>
        <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </Icon>
    ),
  },
  {
    href: "/scraper",
    label: "Scraper",
    showActivity: true,
    icon: (
      <Icon>
        <path d="M21 12a9 9 0 1 1-2.6-6.4" />
        <path d="M21 4v5h-5" />
      </Icon>
    ),
  },
  {
    href: "/outreach",
    label: "Contacto",
    icon: (
      <Icon>
        <path d="M4 5h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 3V6a1 1 0 0 1 1-1Z" />
      </Icon>
    ),
  },
];

function NavPending() {
  const { pending } = useLinkStatus();
  return pending ? <Spinner size="xs" label="Abriendo" /> : null;
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Logo() {
  return (
    <span className="bg-ink flex size-7 shrink-0 items-center justify-center rounded-lg text-[13px] font-semibold text-white">
      E
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { activeCount } = useScraperStatus();
  const [open, setOpen] = useState(false);

  const closePanel = () => setOpen(false);

  return (
    <>
      <header className="bg-paper/90 sticky top-0 z-40 flex h-[60px] items-center justify-between gap-3 border-b px-4 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <Logo />
          Emer Admin
        </Link>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="sidebar-nav"
          className="hover:bg-subtle flex h-9 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium"
        >
          {open ? "Cerrar" : "Menú"}
        </button>
      </header>

      {open ? (
        <div
          className="bg-ink/30 animate-fade fixed inset-0 z-40 backdrop-blur-[2px] lg:hidden"
          onClick={closePanel}
          aria-hidden
        />
      ) : null}

      <nav
        id="sidebar-nav"
        aria-label="Navegación principal"
        className={cn(
          "bg-paper fixed top-0 bottom-0 left-0 z-50 flex w-60 flex-col border-r transition-transform duration-200 ease-out",
          "lg:translate-x-0",
          open ? "translate-x-0 shadow-lg" : "-translate-x-full",
        )}
      >
        <Link
          href="/"
          onClick={closePanel}
          className="hover:bg-subtle/60 m-2 flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-colors"
        >
          <Logo />
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="text-sm font-semibold">Emer Admin</span>
            <span className="text-ink/45 text-[11px]">Panel local</span>
          </span>
        </Link>

        <p className="text-ink/40 px-5 pt-3 pb-1.5 text-[11px] font-medium">Gestión</p>

        <ul className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closePanel}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm transition-colors duration-150",
                    active
                      ? "bg-subtle text-ink font-medium"
                      : "text-ink/65 hover:bg-subtle/60 hover:text-ink",
                  )}
                >
                  <span className={active ? "text-accent" : "text-ink/45"}>{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                  <span className="ml-auto flex items-center gap-2">
                    <NavPending />
                    {item.showActivity && activeCount > 0 ? (
                      <span
                        className="bg-progress-soft flex items-center gap-1 rounded-full px-1.5 py-px text-[11px] font-medium text-[#8a5a00]"
                        title={`${activeCount} scrape(s) en curso`}
                      >
                        <span className="bg-progress size-1.5 animate-pulse rounded-full" />
                        {activeCount}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="text-ink/40 m-2 flex items-center gap-2 rounded-lg px-2.5 py-2 text-[11px]">
          <span className="bg-ok size-1.5 rounded-full" aria-hidden />
          localhost · sin autenticación
        </div>
      </nav>
    </>
  );
}
