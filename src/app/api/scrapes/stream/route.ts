import type { RealtimeChannel } from "@supabase/supabase-js";

import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 25000;

export async function GET(request: Request) {
  let supabase: ReturnType<typeof getSupabase>;
  try {
    supabase = getSupabase();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se ha podido conectar con Supabase.";
    return Response.json({ ok: false, error: message }, { status: 500 });
  }

  const encoder = new TextEncoder();
  let channel: RealtimeChannel | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    if (heartbeat) clearInterval(heartbeat);
    if (channel) void supabase.removeChannel(channel);
    channel = null;
  };

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup();
        }
      };

      const send = (event: string, data: unknown) =>
        write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

      channel = supabase
        .channel(`scrape-runs-${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "scrape_runs" }, (payload) =>
          send("change", { type: payload.eventType }),
        )
        .subscribe((status) => send("status", { status }));

      heartbeat = setInterval(() => write(": ping\n\n"), HEARTBEAT_MS);

      request.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {}
      });
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
