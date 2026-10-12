"use client";

import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: ReactNode;
  content: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  /** Pestaña activa inicial (modo no controlado). */
  defaultTabId?: string;
  /** Pestaña activa (modo controlado). */
  activeTabId?: string;
  onTabChange?: (id: string) => void;
  className?: string;
}

export function Tabs({ items, defaultTabId, activeTabId, onTabChange, className }: TabsProps) {
  const firstId = items[0]?.id ?? "";
  const [internalId, setInternalId] = useState(defaultTabId ?? firstId);
  const currentId = activeTabId ?? internalId;

  function selectTab(id: string) {
    if (activeTabId === undefined) setInternalId(id);
    onTabChange?.(id);
  }

  const active = items.find((item) => item.id === currentId) ?? items[0];

  return (
    <div className={cn("flex flex-col", className)}>
      <div role="tablist" className="border-ink flex flex-wrap gap-0 border-b-2">
        {items.map((item) => {
          const isActive = item.id === active?.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={item.disabled}
              onClick={() => selectTab(item.id)}
              className={cn(
                "border-ink -mb-0.5 cursor-pointer border-2 border-b-0 px-4 py-2 text-xs font-bold tracking-widest uppercase transition-colors duration-[120ms]",
                "disabled:cursor-not-allowed disabled:opacity-45",
                isActive ? "bg-ink text-cream" : "bg-paper text-ink hover:bg-cream",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="border-ink bg-paper shadow-hard border-2 border-t-0 p-4">
        {active?.content}
      </div>
    </div>
  );
}
