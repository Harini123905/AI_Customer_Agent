"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Chat = { id: string; title: string; messages: Message[] };

const makeChat = (): Chat => ({
  id: crypto.randomUUID().slice(0, 8),
  title: "New chat",
  messages: [],
});

const GROUPS = [
  {
    title: "Approve",
    icon: "✅",
    items: [
      {
        title: "Change of mind",
        hint: "Unused speaker, delivered 5 days ago.",
        message:
          "Hi, my email is priya.nair@example.com. I want a refund for order ORD-1001. I changed my mind, and the speaker is unused.",
      },
      {
        title: "Defective item",
        hint: "Running shoes that arrived defective.",
        message:
          "Hi, I am arjun.mehta@example.com. The running shoes from order ORD-1002 arrived defective. They are unused. I want a refund.",
      },
      {
        title: "Defective, 40 days",
        hint: "Charger that stopped working.",
        message:
          "Hello, my email is aditya.verma@example.com. The charger from order ORD-1012 is defective and I want a refund.",
      },
    ],
  },
  {
    title: "Deny",
    icon: "⛔",
    items: [
      {
        title: "Past 30 days",
        hint: "Change of mind after 45 days.",
        message:
          "Hi, I am kavya.reddy@example.com. I want to return my jacket, order ORD-1003. I changed my mind, and it is unused.",
      },
      {
        title: "Digital product",
        hint: "Software licence refund.",
        message:
          "Hello, my email is rohan.das@example.com. I want a refund for my software licence, order ORD-1004. I changed my mind.",
      },
      {
        title: "Clearance item",
        hint: "Final sale laptop bag.",
        message:
          "Hi, this is karthik.raj@example.com. Please refund order ORD-1008. I changed my mind, and it is unused.",
      },
    ],
  },
  {
    title: "Escalate & more",
    icon: "🧑‍💼",
    items: [
      {
        title: "High-value refund",
        hint: "Defective TV above ₹10,000.",
        message:
          "Hi, this is vikram.singh@example.com. My TV from order ORD-1006 is defective and I want a refund.",
      },
      {
        title: "Not delivered yet",
        hint: "Office chair still on the way.",
        message:
          "Hello, my email is meera.pillai@example.com. I want a refund for order ORD-1009. I changed my mind.",
      },
      {
        title: "Refund limit reached",
        hint: "Customer with 3 refunds already.",
        message:
          "Hi, I am divya.menon@example.com. The mixer grinder from order ORD-1011 is defective. I want a refund.",
      },
    ],
  },
];

export default function ChatPage() {
  const [first] = useState(makeChat);
  const [chats, setChats] = useState<Chat[]>([first]);
  const [activeId, setActiveId] = useState(first.id);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const active = chats.find((c) => c.id === activeId) ?? chats[0];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [active.messages.length, loading]);

  function newChat() {
    const chat = makeChat();
    setChats((prev) => [chat, ...prev]);
    setActiveId(chat.id);
    setInput("");
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const chatId = active.id;
    const history: Message[] = [...active.messages, { role: "user", content }];

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId
          ? { ...c, title: c.messages.length === 0 ? content.slice(0, 30) : c.title, messages: history }
          : c
      )
    );
    setInput("");
    setLoading(true);

    let reply = "Sorry, something went wrong. Please try again.";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: chatId, messages: history }),
      });
      const data = await res.json();
      reply = data.reply ?? data.error ?? reply;
    } catch {
      reply = "Sorry, I could not reach the server. Please try again.";
    }

    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, messages: [...c.messages, { role: "assistant", content: reply }] } : c
      )
    );
    setLoading(false);
  }

  return (
    <div className="h-screen flex bg-[#1f1f1f] text-gray-100">
      {/* Sidebar */}
      {sidebarOpen && (
        <aside className="w-64 shrink-0 bg-black flex flex-col">
          <div className="flex items-center gap-2 p-4">
            <div className="h-10 w-10 rounded-xl bg-amber-300 text-black flex items-center justify-center text-lg">
              ✦
            </div>
            <button
              onClick={newChat}
              className="flex-1 h-10 rounded-xl border border-gray-600 text-sm hover:bg-gray-900"
            >
              + New chat
            </button>
          </div>

          <p className="px-4 pb-2 text-xs font-semibold text-gray-500">Your chats</p>
          <nav className="flex-1 overflow-y-auto px-2 space-y-1">
            {chats.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left truncate rounded-lg px-3 py-2 text-sm ${
                  c.id === active.id ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-900"
                }`}
              >
                💬 {c.title}
              </button>
            ))}
          </nav>

          <div className="border-t border-gray-800 p-3 space-y-2">
            <Link
              href="/admin"
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-gray-900"
            >
              <span>🛠 Admin dashboard</span>
              <span className="text-[10px] font-semibold bg-amber-300 text-black rounded px-1.5 py-0.5">
                LIVE
              </span>
            </Link>
            <div className="flex items-center gap-3 px-3 py-2 text-sm text-gray-300">
              <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center">H</div>
              Customer
            </div>
          </div>
        </aside>
      )}

      {/* Main area */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center justify-center gap-3 pt-4 px-4">
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="h-10 w-10 rounded-xl border border-gray-600 hover:bg-gray-800"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? "‹" : "›"}
          </button>
          <div className="flex rounded-full border border-gray-700 bg-black/60 p-1 text-sm">
            <span className="rounded-full bg-gray-700 px-5 py-2">💬 Chat</span>
            <Link href="/admin" className="rounded-full px-5 py-2 text-gray-300 hover:text-white">
              🛠 Admin Dashboard
            </Link>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {active.messages.length === 0 ? (
            <div className="max-w-5xl mx-auto">
              <h1 className="text-center text-4xl md:text-5xl font-bold mt-4 mb-2">ShopEasy Support</h1>
              <p className="text-center text-gray-400 mb-10">
                Hello! Share your email address and order ID, and tell me how I can help with your refund.
              </p>

              <div className="grid gap-6 md:grid-cols-3">
                {GROUPS.map((g) => (
                  <section key={g.title}>
                    <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
                      <span>{g.icon}</span>
                      {g.title}
                    </h2>
                    <div className="space-y-3">
                      {g.items.map((item) => (
                        <button
                          key={item.title}
                          onClick={() => send(item.message)}
                          className="block w-full text-left rounded-lg border-l-4 border-amber-300/70 bg-[#2a2a2a] hover:bg-[#333] px-4 py-3"
                        >
                          <span className="block text-sm font-semibold">{item.title}</span>
                          <span className="block text-sm text-gray-400">{item.hint}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {active.messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-amber-300 text-black rounded-br-sm"
                        : "bg-[#2a2a2a] text-gray-100 rounded-bl-sm"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-[#2a2a2a] rounded-2xl px-4 py-3 text-sm text-gray-400">
                    Agent is checking the policy…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className="px-4 pb-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="max-w-5xl mx-auto flex items-center gap-3 rounded-2xl bg-[#333] px-4 py-3"
          >
            <span className="text-gray-400">✦</span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="How can I help you?"
              className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="text-gray-300 hover:text-white disabled:opacity-40 text-lg"
              aria-label="Send"
            >
              ➤
            </button>
          </form>
          <p className="max-w-5xl mx-auto text-center text-xs text-gray-500 mt-3">
            ShopEasy AI Support may produce inaccurate information. Refund decisions follow the official refund
            policy.
          </p>
        </div>
      </main>
    </div>
  );
}