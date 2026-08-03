"use client";

import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "bot";
  content: string;
}

const SUGGESTIONS = [
  "How does voting work?",
  "Is my vote anonymous?",
  "How do I verify a receipt?",
  "What security do you use?",
];

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", content: "Hi! I'm VoteWise AI, powered by a real language model. Ask me about voting, security, receipts, or anything about VoteWise." },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isTyping) return;

    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role === "bot" ? "assistant" : "user",
            content: m.content,
          })),
        }),
      });
      const data = await res.json();

      if (data.ok) {
        setMessages((prev) => [...prev, { role: "bot", content: data.data.response }]);
      } else {
        setMessages((prev) => [...prev, { role: "bot", content: "Sorry, I had trouble processing that. Please try again." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "bot", content: "Network error. Please check your connection and try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-4 right-4 z-50 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 transition-transform"
          aria-label="Open chat assistant"
        >
          <MessageCircle className="size-6" />
          {/* Notification badge */}
          <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground vw-notif-enter">
            1
          </span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm">
          <div className="vw-notif-enter flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden" style={{ maxHeight: "70vh" }}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-background-subtle p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Bot className="size-5" />
                </span>
                <div>
                  <div className="text-sm font-medium">VoteWise AI</div>
                  <div className="flex items-center gap-1.5 text-xs text-success">
                    <span className="votewise-live-dot" style={{ width: 6, height: 6 }} />
                    Online · LLM-powered
                  </div>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close chat"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto votewise-scroll p-4 flex flex-col gap-3" style={{ minHeight: "200px", maxHeight: "calc(70vh - 140px)" }}>
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-2.5 max-w-[85%]",
                    msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full",
                      msg.role === "bot" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {msg.role === "bot" ? <Bot className="size-4" /> : <User className="size-4" />}
                  </span>
                  <div
                    className={cn(
                      "rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap",
                      msg.role === "bot"
                        ? "bg-muted rounded-tl-sm"
                        : "bg-primary text-primary-foreground rounded-tr-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex items-start gap-2.5 max-w-[85%]">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Bot className="size-4" />
                  </span>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
                    <div className="flex gap-1">
                      <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions */}
            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 px-4 pb-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border p-3 flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder="Ask a question…"
                className="flex-1 bg-background rounded-lg border border-input px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim() || isTyping}
                className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
                aria-label="Send message"
              >
                <Send className="size-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
