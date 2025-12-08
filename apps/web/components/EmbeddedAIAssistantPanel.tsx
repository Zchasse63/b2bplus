"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

/**
 * Typing Indicator Component
 * Uses Design System animation pattern
 */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <span className="text-xs text-b2b-gray-500">AI is thinking</span>
      <div className="flex gap-1 ml-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-b2b-blue-400"
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}

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
      {/* Header */}
      <motion.div
        className="mb-4 pb-4 border-b border-b2b-gray-100"
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        transition={fast}
      >
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-b2b-blue-400 to-b2b-blue-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-b2b-text">{title}</h2>
            <p className="text-xs text-b2b-gray-500">{subtitle}</p>
          </div>
        </div>
      </motion.div>

      {/* Quick Prompts */}
      <div className="mb-4 flex flex-wrap gap-2">
        {quickPrompts.map((q) => (
          <button
            key={q}
            type="button"
            className="rounded-full bg-b2b-blue-50 px-3 py-1.5 text-xs font-medium text-b2b-blue-600 hover:bg-b2b-blue-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-b2b-blue-300"
            onClick={() => sendMessage(q)}
            disabled={loading}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Area */}
      <div className="mb-4 flex-1 space-y-3 overflow-y-auto rounded-xl border border-b2b-gray-100 bg-b2b-gray-50 p-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-full bg-b2b-blue-50 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-b2b-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-b2b-gray-500 max-w-[200px]">
              Start a conversation or tap a suggested prompt above
            </p>
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {messages.map((m, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%]"
                  : "max-w-[85%]"
              }
            >
              <div
                className={
                  m.role === "user"
                    ? "rounded-2xl rounded-br-md bg-b2b-blue px-4 py-2.5 text-sm text-white shadow-sm"
                    : "rounded-2xl rounded-bl-md bg-white px-4 py-2.5 text-sm text-b2b-text shadow-b2b-sm"
                }
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={messagesEndRef} />

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="max-w-[85%]"
            >
              <div className="rounded-2xl rounded-bl-md bg-white shadow-b2b-sm">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Input Area */}
      <div className="flex gap-2 pt-2 border-t border-b2b-gray-100">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-b2b-gray-200 bg-white px-4 py-2.5 text-sm focus:border-b2b-blue focus:outline-none focus:ring-2 focus:ring-b2b-blue-100 transition-all duration-150"
          disabled={loading}
        />
        <Button
          variant="primary"
          size="sm"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="rounded-xl"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </Button>
      </div>
    </Card>
  );
}


