"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, Button } from "@/components/b2b";
import { fadeIn, fast } from "@/lib/animations";

export type EmbeddedAIMode = "products" | "cart" | "analytics" | "dashboard" | "admin";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface EmbeddedAIAssistantPanelProps {
  mode: EmbeddedAIMode;
}

const MODE_CONFIG: Record<
  EmbeddedAIMode,
  { title: string; subtitle: string; placeholder: string; quickPrompts: string[] }
> = {
  products: {
    title: "AI Assistant",
    subtitle: "Ask about products, pack sizes, and alternatives.",
    placeholder: "Ask for product recommendations or comparisons...",
    quickPrompts: [
      "Recommend alternatives to what I'm buying now",
      "Suggest products that pair well with my usual orders",
      "Help me compare price per case across similar items",
    ],
  },
  cart: {
    title: "AI Assistant",
    subtitle: "Optimize this order, catch mistakes, and plan ahead.",
    placeholder: "Ask for help optimizing your cart or order...",
    quickPrompts: [
      "Is there anything I'm missing in this order?",
      "Help me reduce costs without hurting quality",
      "Check my order against my recent buying patterns",
    ],
  },
  analytics: {
    title: "AI Assistant",
    subtitle: "Ask questions about your spend and trends.",
    placeholder: "Ask about your spending trends or opportunities...",
    quickPrompts: [
      "Where did my spend increase most this month?",
      "Which products are driving most of my costs?",
      "Show me categories where I could consolidate SKUs",
    ],
  },
  dashboard: {
    title: "AI Assistant",
    subtitle: "High-level questions about your account and activity.",
    placeholder: "Ask about your account, orders, or next best actions...",
    quickPrompts: [
      "What should I pay attention to this week?",
      "Summarize my recent orders and spend",
      "Where are my biggest savings opportunities?",
    ],
  },
  admin: {
    title: "AI Assistant",
    subtitle: "Use AI for customer and operations decisions.",
    placeholder: "Ask about customers, churn risk, or opportunities...",
    quickPrompts: [
      "Which customers look at risk of churning?",
      "Which accounts have the biggest upsell potential?",
      "Show me opportunities based on recent behavior",
    ],
  },
};

export function EmbeddedAIAssistantPanel({ mode }: EmbeddedAIAssistantPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const { title, subtitle, placeholder, quickPrompts } = MODE_CONFIG[mode];

  useEffect(() => {
    const el = messagesEndRef.current;
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;

    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chatbot/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content, conversationId }),
      });

      if (!res.ok) {
        const errorText =
          res.status === 403
            ? "Please sign in and ensure your account is approved before using the assistant."
            : "Sorry, I couldn't process that request. Please try again.";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errorText },
        ]);
        return;
      }

      const data = await res.json();
      if (data.conversationId) {
        setConversationId(data.conversationId as string);
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message as string },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Card className="flex h-full flex-col" padding="lg">
      <motion.div
        className="mb-3 flex items-start justify-between gap-2"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        transition={fast}
      >
        <div>
          <h2 className="text-lg font-bold text-b2b-dark">{title}</h2>
          <p className="text-xs text-b2b-gray-500">{subtitle}</p>
        </div>
      </motion.div>

      <div className="mb-3 flex flex-wrap gap-2">
        {quickPrompts.map((q) => (
          <button
            key={q}
            type="button"
            className="rounded-full bg-b2b-gray-50 px-3 py-1 text-xs text-b2b-gray-700 hover:bg-b2b-gray-100"
            onClick={() => sendMessage(q)}
            disabled={loading}
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mb-3 flex-1 space-y-2 overflow-y-auto rounded-md border border-b2b-gray-100 bg-b2b-gray-50 p-3 text-sm">
        {messages.length === 0 && (
          <p className="text-xs text-b2b-gray-500">
            Start typing below, or tap one of the suggested prompts to get help.
          </p>
        )}
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-lg bg-b2b-blue px-3 py-2 text-xs text-white"
                : "max-w-[85%] rounded-lg bg-white px-3 py-2 text-xs text-b2b-dark shadow-b2b-sm"
            }
          >
            {m.content}
          </div>
        ))}
        <div ref={messagesEndRef} />
        {loading && (
          <p className="text-xs text-b2b-gray-400">Thinking...</p>
        )}
      </div>

      <div className="mt-1 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-b2b-gray-300 px-3 py-2 text-xs focus:border-b2b-blue focus:outline-none focus:ring-1 focus:ring-b2b-blue"
          disabled={loading}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
        >
          Send
        </Button>
      </div>
    </Card>
  );
}

