import { NextRequest, NextResponse } from "next/server";
import { runAgent, ChatMessage } from "../../../lib/agent";
import { logEvent } from "../../../lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let sessionId = "unknown";

  try {
    const body = await req.json();
    sessionId = String(body.sessionId ?? "unknown");
    const messages = body.messages as ChatMessage[];

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "No messages were sent." }, { status: 400 });
    }

    const reply = await runAgent(sessionId, messages);
    return NextResponse.json({ reply });
 } catch (err) {
    const text = err instanceof Error ? err.message : String(err);
    console.error("CHAT ROUTE ERROR:", err);
    logEvent(sessionId, "error", `Request failed: ${text}`);
    return NextResponse.json(
      { error: "Sorry, something went wrong. Please try again." },
      { status: 500 }
    );
  }
}