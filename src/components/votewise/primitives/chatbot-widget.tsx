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

const BOT_RESPONSES: Record<string, string> = {
  "how does voting work":
    "Voting is simple: 1) Verify your identity with your voter ID. 2) Receive a one-time OTP via email or SMS. 3) Enter the code to access your ballot. 4) Select your candidates. 5) Confirm and cast — your vote is encrypted with AES-256-GCM. 6) Keep your receipt code to verify your vote was recorded.",
  "is my vote anonymous":
    "Yes. Your vote is encrypted with AES-256-GCM and stored with a one-way voterHash (SHA-256 of voterId + electionId + pepper). The receipt code is unlinkable — it proves you voted without revealing who you voted for. Even database administrators cannot link a receipt to a choice.",
  "how do i verify a receipt":
    "Go to your organization's portal at /o/:subdomain/verify and enter your receipt code (format: VW-2025-XXXXXXXX). The system confirms the vote exists on the ledger without revealing the candidate chosen. You can also verify via the public API.",
  "what security do you use":
    "VoteWise uses 5 layers of security: 1) AES-256-GCM vote encryption. 2) HMAC-SHA256 ballot signatures. 3) Hash-chained audit log (SHA-256). 4) scrypt password hashing. 5) JWT + HttpOnly cookies for admin auth. Plus rate limiting, 2FA, and tenant isolation.",
};

function getBotResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const [key, response] of Object.entries(BOT_RESPONSES)) {
    if (lower.includes(key)) return response;
  }
  if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
    return "Hello! I'm VoteWise AI. I can help you understand how secure voting works, how to verify receipts, or answer security questions. What would you like to know?";
  }
  if (lower.includes("price") || lower.includes("cost") || lower.includes("plan")) {
    return "VoteWise offers 3 plans: Free (100 voters, $0/mo), Pay-as-you-go (1,000 voters, $25/mo), and Enterprise (50,000 voters, $200/mo). Visit the billing page in your dashboard to upgrade.";
  }
  if (lower.includes("register") || lower.includes("sign up") || lower.includes("create")) {
    return "To create an organization, click 'Get started' on the homepage. You'll provide your organization name, subdomain, and owner credentials. It takes less than a minute!";
  }
  return "I can help with questions about voting, security, receipts, and pricing. Try asking 'How does voting work?' or 'Is my vote anonymous?'";
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", content: "Hi! I'm VoteWise AI. Ask me about voting, security, or how to verify your receipt." },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const send = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;

    setMessages((prev) => [...prev, { role: "user", content }]);
    setInput("");
    setIsTyping(true);

    // Simulate AI response with typing delay
    setTimeout(() => {
      const response = getBotResponse(content);
      setMessages((prev) => [...prev, { role: "bot", content: response }]);
      setIsTyping(false);
    }, 800 + Math.random() * 600);
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
          <span className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground">
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
                    Online
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
            <div ref={scrollRef} className="flex-1 overflow-y-auto votewise-scroll p-4 flex flex-col gap-3" style={{ minHeight: "200px" }}>
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
                      "rounded-2xl px-3.5 py-2.5 text-sm",
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
                disabled={!input.trim()}
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
