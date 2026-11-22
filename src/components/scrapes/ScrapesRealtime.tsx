"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { usePageVisible } from "@/lib/use-page-visible";

type ConnectionState = "connecting" | "live" | "error" | "paused";

const REFRESH_DEBOUNCE_MS = 2000;
const RUNNING_REFRESH_MS = 60000;

const LABELS: Record<ConnectionState, string> = {
  connecting: "Conectando…",
  live: "En directo",
  error: "Sin conexión en directo",
  paused: "En pausa",
};

export function ScrapesRealtime({ hasRunning }: { hasRunning: boolean }) {
  const router = useRouter();
  const visible = usePageVisible();
  const [connection, setState] = useState<Exclude<ConnectionState, "paused">>("connecting");
  const state: ConnectionState = visible ? connection : "paused";
  const lostRef = useRef(false);
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      wasHiddenRef.current = true;
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const source = new EventSource("/api/scrapes/stream");

    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
    };

    if (wasHiddenRef.current) {
      wasHiddenRef.current = false;
      scheduleRefresh();
    }

    source.addEventListener("status", (event) => {
      const { status } = JSON.parse((event as MessageEvent<string>).data) as { status: string };
      if (status === "SUBSCRIBED") {
        setState("live");
        if (lostRef.current) {
          lostRef.current = false;
          scheduleRefresh();
        }
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        lostRef.current = true;
        setState("error");
      }
    });

    source.addEventListener("change", scheduleRefresh);

    source.onerror = () => {
      lostRef.current = true;
      setState("error");
    };

    return () => {
      if (timer) clearTimeout(timer);
      source.close();
    };
  }, [router, visible]);

  useEffect(() => {
    if (!hasRunning || !visible) return;
    const interval = setInterval(() => router.refresh(), RUNNING_REFRESH_MS);
    return () => clearInterval(interval);
  }, [hasRunning, visible, router]);

  return (
    <span
      className={cn(
        "border-ink inline-flex items-center gap-2 border-2 px-2 py-1 text-[10px] font-bold tracking-widest uppercase",
        state === "live" && "bg-paper",
        state === "connecting" && "bg-progress",
        state === "paused" && "bg-cream",
        state === "error" && "bg-error text-paper",
      )}
      title={
        state === "error"
          ? "No llegan cambios en tiempo real. Recarga la página para ver datos nuevos."
          : undefined
      }
    >
      <span
        aria-hidden
        className={cn(
          "border-ink size-2.5 border-2",
          state === "live" && "bg-ok animate-pulse",
          (state === "connecting" || state === "paused") && "bg-paper",
          state === "error" && "bg-paper",
        )}
      />
      {LABELS[state]}
    </span>
  );
}
