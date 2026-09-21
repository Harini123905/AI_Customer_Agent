import { getLogs, subscribe } from "../../../lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Sends the agent logs to the browser as they happen (Server-Sent Events).
export async function GET(req: Request) {
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let heartbeat: ReturnType<typeof setInterval> | null = null;

  const cleanup = () => {
    if (unsubscribe) unsubscribe();
    if (heartbeat) clearInterval(heartbeat);
    unsubscribe = null;
    heartbeat = null;
  };

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          cleanup();
        }
      };

      // First send everything that already happened, then every new step.
      getLogs().forEach(send);
      unsubscribe = subscribe(send);

      // A small ping every 15 seconds keeps the connection open.
      heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": ping\n\n"));
        } catch {
          cleanup();
        }
      }, 15000);

      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}