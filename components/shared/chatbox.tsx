"use client";

import { useEffect, useRef, useState } from "react";
import { Loader, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ChatMessage } from "@/types";

interface ChatBoxProps {
  onClose?: () => void;
}

export function ChatBox({ onClose }: ChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load any existing conversation from localStorage on mount
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("vibeguide-chat") : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{
          id: string;
          content: string;
          sender: "user" | "ai" | "agent";
          timestamp: string;
          senderName?: string;
          isTyping?: boolean;
        }>;

        const restored: ChatMessage[] = parsed.map((m) => ({
          ...m,
          timestamp: new Date(m.timestamp),
        }));

        if (restored.length > 0) {
          setMessages(restored);
          return;
        }
      }
    } catch {
      // ignore parse/storage errors and fall back to default welcome
    }

    const initial: ChatMessage[] = [
      {
        id: "welcome",
        content:
          "Hey there! I'm VibeGuide, your RockEnMyVibe assistant. Tell me what you're looking for – a vibe, a product, or help with your account or order – and I'll point you in the right direction.",
        sender: "ai",
        timestamp: new Date(),
        senderName: "VibeGuide",
      },
    ];
    setMessages(initial);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Persist conversation to localStorage whenever messages change
  useEffect(() => {
    try {
      if (typeof window === "undefined") return;
      const serializable = messages.map((m) => ({
        ...m,
        timestamp: m.timestamp.toISOString(),
      }));
      window.localStorage.setItem("vibeguide-chat", JSON.stringify(serializable));
    } catch {
      // ignore storage errors
    }
  }, [messages]);

  const startFreshConversation = () => {
    const initial: ChatMessage[] = [
      {
        id: "welcome",
        content:
          "Hey there! I'm VibeGuide, your RockEnMyVibe assistant. Tell me what you're looking for – a vibe, a product, or help with your account or order – and I'll point you in the right direction.",
        sender: "ai",
        timestamp: new Date(),
        senderName: "VibeGuide",
      },
    ];
    setMessages(initial);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: trimmed,
      sender: "user",
      timestamp: new Date(),
      senderName: "You",
    };

    setInput("");
    setMessages((prev) => [...prev, userMessage]);
    setIsSending(true);

    try {
      const typingMessage: ChatMessage = {
        id: `typing-${Date.now()}`,
        content: "Typing...",
        sender: "ai",
        timestamp: new Date(),
        senderName: "VibeGuide",
        isTyping: true,
      };

      setMessages((prev) => [...prev, typingMessage]);

      setTimeout(() => {
        setMessages((prev) => {
          const withoutTyping = prev.filter((m) => !m.isTyping);

          const lower = trimmed.toLowerCase();
          const now = new Date();
          const day = now.getDay();
          const hour = now.getHours();

          const isWeekday = day >= 1 && day <= 5;
          const isBusinessHours = hour >= 9 && hour < 18; // match ChatWidget hours

          const replyTextPrefix = "I'm sorry you're having trouble with that. ";
          let replyBody =
            "Soon I'll be fully connected to a live agent and a deeper AI brain so I can walk you step-by-step through products, orders, and account issues.";

          const isPasswordIssue =
            lower.includes("password") ||
            lower.includes("log in") ||
            lower.includes("login") ||
            lower.includes("sign in") ||
            lower.includes("reset");

          const isOrderIssue =
            lower.includes("order") ||
            lower.includes("tracking") ||
            lower.includes("track my") ||
            lower.includes("where is my") ||
            lower.includes("package") ||
            lower.includes("shipped") ||
            lower.includes("delivery") ||
            lower.includes("usps") ||
            lower.includes("fedex") ||
            lower.includes("ups");

          const isTrackingBug =
            lower.includes("tracking number") ||
            lower.includes("tracking code") ||
            lower.includes("not working") ||
            lower.includes("wrong number");

          const isSizing =
            lower.includes("size") ||
            lower.includes("fit") ||
            lower.includes("sizing");

          const isColor =
            lower.includes("color") || lower.includes("colour") || lower.includes("colors");

          const isShipping =
            lower.includes("shipping") ||
            lower.includes("ship to") ||
            lower.includes("ship here") ||
            lower.includes("international");

          const isReturns =
            lower.includes("return") ||
            lower.includes("refund") ||
            lower.includes("exchange") ||
            lower.includes("wrong item");

          if (isPasswordIssue) {
            replyBody =
              "For password and login issues, go to the sign-in page and click **Forgot password?**. Use the same email you used at checkout. If you don't see the reset email after a few minutes, check spam and promotions. If it still doesn't arrive, open your **Account / Profile** page and use the support/contact option there so a human can manually help you get back in.";
          } else if (isOrderIssue) {
            if (isBusinessHours && isWeekday) {
              replyBody =
                "For order help, grab your **order number** and the **email** you used at checkout. You can review your orders from your **Account / Profile** area under *Orders* and use the tracking link in your confirmation email. If something looks off, you can start a support request from your account page and a live agent will jump in as soon as possible.";
            } else {
              replyBody =
                "It looks like it's currently **outside our normal live agent hours** (Mon–Fri, 9:00am–6:00pm). You can still:\n\n- View your orders from your **Account / Profile** page.\n- Use the tracking link in your confirmation email.\n- Leave us a detailed message from your account or contact page and we'll respond as soon as our team is back online.";
            }

            if (isTrackingBug) {
              replyBody +=
                "\n\nIf your tracking number looks wrong or isn't updating, sometimes carriers take 24–48 hours to scan packages. If it's been longer than that, include your order number and tracking code in a support message so we can check directly with the carrier.";
            }
          } else if (isSizing) {
            replyBody =
              "For sizing, start with the **size chart** on the product page. If you're between sizes or not sure, tell me your usual tee/hoodie size and how you like it to fit (snug, true to size, or oversized) and I'll point you toward the safest choice when I'm fully online.";
          } else if (isColor) {
            replyBody =
              "Color options depend on the specific design and size. Check the color swatches or dropdown on the product page. If a color you want isn't selectable, it's either sold out or not available for that size right now.";
          } else if (isShipping) {
            replyBody =
              "Shipping rates and locations are calculated at checkout based on your address and the items in your cart. Add your items, go to the cart, and start checkout to see live shipping options and prices. If you have a specific country or region in mind, mention it and I can tell you whether we typically ship there.";
          } else if (isReturns) {
            replyBody =
              "For returns, refunds, or exchanges, keep your order number handy and make sure items are unworn and in original condition. Start a return from your **Account / Profile** page or by using the link in your order confirmation email. If something arrived damaged or totally wrong, include photos when you contact support so we can fix it fast.";
          }

          const reply: ChatMessage = {
            id: `ai-${Date.now()}`,
            content: replyTextPrefix + replyBody,
            sender: "ai",
            timestamp: new Date(),
            senderName: "VibeGuide",
          };
          return [...withoutTyping, reply];
        });
        setIsSending(false);
      }, 800);
    } catch {
      setIsSending(false);
    }
  };

  const handleEndConversation = async () => {
    if (!messages.length) {
      startFreshConversation();
      return;
    }

    setIsEnding(true);
    try {
      // Send the current conversation to an API route so it can be stored in the DB for logging
      void (await fetch("/api/support/chat-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      }));
    } catch {
      // If this fails, we still clear locally so the customer experience is consistent
    } finally {
      try {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("vibeguide-chat");
        }
      } catch {
        // ignore
      }
      startFreshConversation();
      setIsEnding(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-50 rounded-lg shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 flex items-center justify-between text-xs sm:text-sm">
        <div className="flex flex-col">
          <span className="font-semibold tracking-wide">Need help shopping?</span>
          <span className="text-[11px] text-violet-100/90">
            Chat with a RockEnMyVibe assistant about products, sizing, or orders.
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/15 transition-colors"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 bg-slate-950/95">
        {messages.map((m) => {
          const mine = m.sender === "user";
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-[11px] sm:text-[13px] shadow border border-white/5 ${
                  mine
                    ? "ml-auto bg-violet-600 text-slate-50"
                    : "mr-auto bg-slate-800 text-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-100/80">
                    {mine ? "You" : m.senderName || "Assistant"}
                  </span>
                  {!m.isTyping && (
                    <span className="text-[9px] text-slate-300/80">
                      {m.timestamp.toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">
                  {m.isTyping ? "Typing…" : m.content}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-slate-800 bg-slate-950 px-3 py-2">
        <form onSubmit={handleSend} className="flex items-end gap-2">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about a product, order, or sizing..."
            className="flex-1 rounded-lg bg-slate-900 border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            disabled={isSending || isEnding}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isSending || isEnding}
            className="bg-violet-600 hover:bg-violet-700 text-white rounded-lg px-3 py-2 flex items-center gap-1 text-xs sm:text-sm"
          >
            {isSending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Send</span>
          </Button>
        </form>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-[10px] text-slate-500">
            Soon this will connect you directly with a live agent or AI shopping guide.
          </p>
          <button
            type="button"
            onClick={handleEndConversation}
            disabled={isEnding}
            className="text-[10px] text-violet-300 hover:text-violet-100 underline-offset-2 hover:underline disabled:opacity-60"
          >
            {isEnding ? "Ending..." : "End Conversation"}
          </button>
        </div>
      </div>
    </div>
  );
}
