"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ConnectionState = "connecting" | "live" | "error";

const REFRESH_DEBOUNCE_MS = 400;
const RUNNING_REFRESH_MS = 60000;

const LABELS: Record<ConnectionState, string> = {
  connecting: "Conectando…",
  live: "En directo",
  error: "Sin conexión en directo",
};

export function ScrapesRealtime({ hasRunning }: { hasRunning: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<ConnectionState>("connecting");
  const lostRef = useRef(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const source = new EventSource("/api/scrapes/stream");

    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
    };

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
  }, [router]);

  useEffect(() => {
    if (!hasRunning) return;
    const interval = setInterval(() => router.refresh(), RUNNING_REFRESH_MS);
    return () => clearInterval(interval);
  }, [hasRunning, router]);

  return (
    <span
      className={cn(
        "border-ink inline-flex items-center gap-2 border-2 px-2 py-1 text-[10px] font-bold tracking-widest uppercase",
        state === "live" && "bg-paper",
        state === "connecting" && "bg-progress",
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
          state === "connecting" && "bg-paper",
          state === "error" && "bg-paper",
        )}
      />
      {LABELS[state]}
    </span>
  );
}
