"use client";

import React, { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, X } from "lucide-react";

type Sender = "patient" | "dentist";

type Message = {
  id: string;
  content: string;
  sender: Sender;
  createdAt: string;
  pending?: boolean;
};

export default function MessageSidebar({ scanId }: { scanId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showPrompt, setShowPrompt] = useState(true);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function initThread() {
      try {
        const threadRes = await fetch("/api/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patientId: scanId }),
        });
        const { threadId: tid } = await threadRes.json();
        setThreadId(tid);

        const msgRes = await fetch(`/api/messaging?threadId=${tid}`);
        const { messages: msgs } = await msgRes.json();
        setMessages(msgs ?? []);
      } catch {
        setError("Could not load messages");
      } finally {
        setLoading(false);
      }
    }
    initThread();
  }, [scanId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !threadId) return;
    const content = input.trim();
    setInput("");
    setError(null);

    const optimisticId = `opt-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id: optimisticId, content, sender: "patient", createdAt: new Date().toISOString(), pending: true },
    ]);

    try {
      const res = await fetch("/api/messaging", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, content, sender: "patient" }),
      });
      if (!res.ok) throw new Error();
      const { message } = await res.json();
      setMessages((prev) =>
        prev.map((m) => (m.id === optimisticId ? { ...message, pending: false } : m))
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setError("Failed to send — please try again.");
      setInput(content);
    }
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
        {showPrompt && !isOpen && (
          <div className="relative bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-xl px-4 py-3 max-w-[200px] shadow-lg">
            Questions about your results? Message your provider here.
            <button
              onClick={() => setShowPrompt(false)}
              className="absolute -top-2 -right-2 bg-zinc-600 hover:bg-zinc-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
            <span className="absolute -right-2 bottom-4 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-l-[8px] border-l-zinc-700" />
          </div>
        )}
        <button
          onClick={() => { setIsOpen((o) => !o); setShowPrompt(false); }}
          aria-label="Toggle messaging"
          className="bg-teal-500 hover:bg-teal-400 text-white rounded-full p-4 shadow-lg transition-colors shrink-0"
        >
          <MessageCircle size={22} />
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-y-0 right-0 z-40 w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between p-4 border-b border-zinc-800">
            <h2 className="font-semibold text-white text-sm">Message Your Clinic</h2>
            <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading && (
              <div className="flex justify-center mt-6">
                <div className="w-5 h-5 rounded-full border-2 border-zinc-600 border-t-teal-400 animate-spin" />
              </div>
            )}
            {!loading && messages.length === 0 && !error && (
              <p className="text-zinc-500 text-xs text-center mt-6">
                Send a message to your clinic about your scan.
              </p>
            )}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "patient" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 text-sm leading-snug ${
                    m.sender === "patient"
                      ? `bg-teal-600 text-white ${m.pending ? "opacity-50" : ""}`
                      : "bg-zinc-700 text-zinc-100"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {error && (
              <p className="text-red-400 text-xs text-center">{error}</p>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 border-t border-zinc-800 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type a message…"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || !threadId}
              className="bg-teal-500 hover:bg-teal-400 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg p-2 transition-colors"
            >
                <Send size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
