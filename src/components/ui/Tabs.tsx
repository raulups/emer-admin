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
    <div className={cn("flex flex-col gap-3", className)}>
      <div role="tablist" className="bg-subtle flex flex-wrap gap-1 self-start rounded-lg p-1">
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
                "cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-[background-color,color,box-shadow] duration-150 sm:text-sm",
                "disabled:cursor-not-allowed disabled:opacity-45",
                isActive ? "bg-paper text-ink shadow-sm" : "text-ink/60 hover:text-ink",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className="bg-paper rounded-xl border p-4 shadow-xs">
        {active?.content}
      </div>
    </div>
  );
}
