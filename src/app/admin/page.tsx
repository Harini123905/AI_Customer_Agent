"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { LogEvent, LogType } from "../../lib/logger";

const STYLE: Record<LogType, { label: string; badge: string; border: string }> = {
  customer: { label: "Customer", badge: "bg-blue-500/20 text-blue-300", border: "border-l-blue-400" },
  thinking: { label: "Thinking", badge: "bg-gray-500/30 text-gray-200", border: "border-l-gray-400" },
  tool_call: { label: "Tool call", badge: "bg-purple-500/20 text-purple-300", border: "border-l-purple-400" },
  tool_result: { label: "Tool result", badge: "bg-green-500/20 text-green-300", border: "border-l-green-400" },
  error: { label: "Error", badge: "bg-red-500/20 text-red-300", border: "border-l-red-400" },
  reply: { label: "Agent reply", badge: "bg-amber-300/20 text-amber-200", border: "border-l-amber-300" },
};

// Makes JSON easier to read; other text is shown as it is.
function pretty(message: string) {
  try {
    return JSON.stringify(JSON.parse(message), null, 2);
  } catch {
    return message;
  }
}

export default function AdminPage() {
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [session, setSession] = useState("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const source = new EventSource("/api/logs");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (e) => {
      const event: LogEvent = JSON.parse(e.data);
      setLogs((prev) => (prev.some((l) => l.id === event.id) ? prev : [...prev, event]));
    };
    return () => source.close();
  }, []);

  const sessions = Array.from(new Set(logs.map((l) => l.sessionId)));
  const visible = session === "all" ? logs : logs.filter((l) => l.sessionId === session);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visible.length]);

  return (
    <div className="h-screen flex flex-col bg-[#1f1f1f] text-gray-100">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-black border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-300 text-black flex items-center justify-center text-lg">
            ✦
          </div>
          <div>
            <h1 className="text-lg font-semibold">Agent Reasoning Logs</h1>
            <p className="text-xs text-gray-400">Admin dashboard · live view of every agent step</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="text-sm rounded-lg border border-gray-600 px-3 py-1.5 hover:bg-gray-800"
          >
            ← Back to chat
          </Link>
          <span
            className={`text-xs px-3 py-1.5 rounded-full ${
              connected ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
            }`}
          >
            {connected ? "● Live" : "● Reconnecting…"}
          </span>
          <select
            value={session}
            onChange={(e) => setSession(e.target.value)}
            className="text-sm rounded-lg border border-gray-600 bg-[#2a2a2a] text-gray-100 px-3 py-1.5"
          >
            <option value="all">All sessions</option>
            {sessions.map((s) => (
              <option key={s} value={s}>
                Session {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => setLogs([])}
            className="text-sm rounded-lg border border-gray-600 px-3 py-1.5 hover:bg-gray-800"
          >
            Clear screen
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-3">
          {visible.length === 0 && (
            <div className="rounded-xl bg-[#2a2a2a] p-6 text-sm text-gray-400">
              No steps yet. Open the chat page in another tab and send a message. The steps will appear here.
            </div>
          )}

          {visible.map((l) => (
            <div
              key={l.id}
              className={`rounded-lg bg-[#2a2a2a] border-l-4 ${STYLE[l.type].border} px-4 py-3`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STYLE[l.type].badge}`}>
                  {STYLE[l.type].label}
                </span>
                <span className="text-xs text-gray-500">
                  {new Date(l.time).toLocaleTimeString()} · session {l.sessionId}
                </span>
              </div>
              <pre className="text-xs whitespace-pre-wrap break-words font-mono text-gray-200">
                {l.type === "tool_result" ? pretty(l.message) : l.message}
              </pre>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </main>
    </div>
  );
}