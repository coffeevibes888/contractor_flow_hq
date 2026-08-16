"use client";

import { useEffect, useRef, useState } from "react";
import { Loader, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "agent";
  timestamp: Date;
  senderName?: string;
  isTyping?: boolean;
}

interface TeamChatBoxProps {
  onClose?: () => void;
}

export function TeamChatBox({ onClose }: TeamChatBoxProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load any existing conversation from localStorage on mount
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem("property-management-chat") : null;
      if (raw) {
        const parsed = JSON.parse(raw) as Array<{
          id: string;
          content: string;
          sender: "user" | "agent";
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
          "Hello! I'm here to help with your property management needs. Whether you have questions about rent payments, maintenance requests, lease information, or need to schedule a tour, I'm here to assist you.",
        sender: "agent",
        timestamp: new Date(),
        senderName: "Property Manager",
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
      window.localStorage.setItem("property-management-chat", JSON.stringify(serializable));
    } catch {
      // ignore storage errors
    }
  }, [messages]);

  const startFreshConversation = () => {
    const initial: ChatMessage[] = [
      {
        id: "welcome",
        content:
          "Hello! I'm here to help with your property management needs. Whether you have questions about rent payments, maintenance requests, lease information, or need to schedule a tour, I'm here to assist you.",
        sender: "agent",
        timestamp: new Date(),
        senderName: "Property Manager",
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
        sender: "agent",
        timestamp: new Date(),
        senderName: "Property Manager",
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
          const isBusinessHours = hour >= 9 && hour < 18;

          let replyBody = "Thank you for reaching out. Our team will get back to you shortly with assistance.";

          const isRentPayment =
            lower.includes("rent") ||
            lower.includes("payment") ||
            lower.includes("pay") ||
            lower.includes("bill");

          const isMaintenance =
            lower.includes("maintenance") ||
            lower.includes("repair") ||
            lower.includes("broken") ||
            lower.includes("fix") ||
            lower.includes("issue");

          const isLeaseInfo =
            lower.includes("lease") ||
            lower.includes("contract") ||
            lower.includes("agreement") ||
            lower.includes("terms");

          const isTour =
            lower.includes("tour") ||
            lower.includes("visit") ||
            lower.includes("see") ||
            lower.includes("viewing");

          const isApplication =
            lower.includes("apply") ||
            lower.includes("application") ||
            lower.includes("rent");

          if (isRentPayment) {
            replyBody = "For rent payments, you can log into your tenant portal to make secure online payments via Stripe. If you need help accessing your account or have payment questions, our team can assist you during business hours (Mon-Fri, 9AM-6PM).";
          } else if (isMaintenance) {
            replyBody = "For maintenance requests, please log into your tenant portal and submit a work ticket with details about the issue. For emergencies outside business hours, please call our emergency maintenance line. Our team will respond to non-emergency requests within 24-48 hours.";
          } else if (isLeaseInfo) {
            replyBody = "For lease information and contract details, you can access your documents through the tenant portal. If you need specific clarification about lease terms or have questions about your agreement, our management team can help during business hours.";
          } else if (isTour) {
            replyBody = "We'd be happy to schedule a property tour! You can book online through our website or contact our leasing team directly. Tours are available Monday through Friday, 9AM-6PM, and weekends by appointment.";
          } else if (isApplication) {
            replyBody = "New tenant applications can be submitted online in just minutes! Visit our application page to get started. Our team reviews applications within 24-48 hours and will contact you with next steps.";
          }

          if (!isBusinessHours || !isWeekday) {
            replyBody += " Please note: It's currently outside our normal business hours (Mon-Fri, 9AM-6PM). We'll respond to your message as soon as our team is back online.";
          }

          const reply: ChatMessage = {
            id: `agent-${Date.now()}`,
            content: replyBody,
            sender: "agent",
            timestamp: new Date(),
            senderName: "Property Manager",
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
      // Clear local storage
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("property-management-chat");
      }
      startFreshConversation();
    } finally {
      setIsEnding(false);
    }
  };

  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-50 rounded-lg shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between text-xs sm:text-sm flex-shrink-0">
        <div className="flex flex-col min-w-0">
          <span className="font-semibold tracking-wide truncate">Property Management Support</span>
          <span className="text-[10px] sm:text-[11px] text-blue-100/90 truncate">
            Chat with our team about rent, maintenance, tours, and more.
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/15 transition-colors flex-shrink-0 ml-2"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 sm:px-3 py-2 sm:py-3 space-y-2 sm:space-y-3 bg-slate-950/95">
        {messages.map((m) => {
          const mine = m.sender === "user";
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-[13px] shadow border border-white/5 ${
                  mine
                    ? "ml-auto bg-blue-600 text-slate-50"
                    : "mr-auto bg-slate-800 text-slate-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-100/80">
                    {mine ? "You" : m.senderName || "Property Manager"}
                  </span>
                  {!m.isTyping && (
                    <span className="text-[8px] sm:text-[9px] text-slate-300/80">
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

      <div className="border-t border-slate-800 bg-slate-950 px-2 sm:px-3 py-2 flex-shrink-0">
        <form onSubmit={handleSend} className="flex items-end gap-1.5 sm:gap-2">
          <Input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about rent, maintenance..."
            className="flex-1 rounded-lg bg-slate-900 border-slate-700 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 h-9 sm:h-10"
            disabled={isSending || isEnding}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isSending || isEnding}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-2.5 sm:px-3 py-2 flex items-center gap-1 text-xs sm:text-sm h-9 sm:h-10"
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
          <p className="text-[9px] sm:text-[10px] text-slate-500 hidden sm:block">
            Our team is here to help with all your property management needs.
          </p>
          <button
            type="button"
            onClick={handleEndConversation}
            disabled={isEnding}
            className="text-[9px] sm:text-[10px] text-blue-300 hover:text-blue-100 underline-offset-2 hover:underline disabled:opacity-60 ml-auto"
          >
            {isEnding ? "Ending..." : "End Chat"}
          </button>
        </div>
      </div>
    </div>
  );
}