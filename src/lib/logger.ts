export type LogType =
  | "customer"
  | "thinking"
  | "tool_call"
  | "tool_result"
  | "error"
  | "reply";

export type LogEvent = {
  id: number;
  time: string;
  sessionId: string;
  type: LogType;
  message: string;
};

type Listener = (event: LogEvent) => void;

type LogState = { events: LogEvent[]; listeners: Set<Listener>; counter: number };

// Stored on globalThis so the data survives Next.js hot reloads.
const store = globalThis as unknown as { agentLogState?: LogState };
const state = (store.agentLogState ??= { events: [], listeners: new Set(), counter: 0 });

export function logEvent(sessionId: string, type: LogType, message: string) {
  const event: LogEvent = {
    id: ++state.counter,
    time: new Date().toISOString(),
    sessionId,
    type,
    message,
  };
   state.events.push(event);
  console.log(`[${type}] ${message}`);
  state.listeners.forEach((listener) => listener(event));
}

export function getLogs(): LogEvent[] {
  return state.events;
}

export function subscribe(listener: Listener) {
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
}