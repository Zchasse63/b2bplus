'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/b2b/Button';
import { MdSend, MdRefresh } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import { fadeIn, fast } from '@/lib/animations';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      console.log('No user found, redirecting to login');
      router.push('/auth/login');
    }
  }, [user, authLoading, router]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setInput('');
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await fetch('/api/chatbot/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        suggestions: data.suggestions,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setInput('');
  };

  const quickActions = [
    {
      label: 'What did I order last month?',
      message: 'Show me my orders from last month',
    },
    {
      label: 'Check my recent orders',
      message: 'What are my recent orders?',
    },
    {
      label: 'Find products',
      message: "I'm looking for products",
    },
    {
      label: 'Show me what you can do',
      message: 'What can you help me with?',
    },
  ];

  if (authLoading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-b2b-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-b2b-gray-50" data-testid="chat-interface">
      {/* Header */}
      <div className="border-b border-b2b-gray-200 bg-white p-4 shadow-b2b-sm">
        <div className="container mx-auto flex max-w-4xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-b2b-dark">AI Assistant</h1>
            <p className="text-sm text-b2b-gray-500">
              Ask me about orders, products, or anything else!
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<MdRefresh />}
            onClick={startNewConversation}
            data-testid="new-conversation-button"
          >
            New Conversation
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto" data-testid="chat-messages">
        <div className="container mx-auto max-w-4xl p-4 space-y-4">
          {messages.length === 0 && (
            <motion.div
              className="text-center mt-16"
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              transition={fast}
            >
              <div className="mb-6">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-b2b-blue/10 mb-4">
                  <svg
                    className="h-8 w-8 text-b2b-blue"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-b2b-dark mb-2">
                  How can I help you today?
                </h2>
                <p className="text-b2b-gray-500 mb-6">
                  I can help you with orders, products, recommendations, and more.
                </p>

                {/* Quick Action Buttons */}
                <div className="flex flex-wrap justify-center gap-3 max-w-2xl mx-auto">
                  {quickActions.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => sendMessage(action.message)}
                      disabled={loading}
                      className="px-4 py-2 bg-white border border-b2b-gray-300 rounded-lg hover:bg-b2b-gray-50 hover:border-b2b-blue transition-colors shadow-b2b-sm disabled:opacity-50 text-sm font-medium text-b2b-dark"
                      data-testid="quick-action"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx}>
              <div
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-4 shadow-b2b-sm ${msg.role === 'user'
                    ? 'bg-b2b-blue text-white'
                    : 'bg-white text-b2b-dark border border-b2b-gray-200'
                    }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                  <div
                    className={`mt-2 text-xs ${msg.role === 'user'
                      ? 'text-b2b-blue-100'
                      : 'text-b2b-gray-400'
                      }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>

              {/* Suggestions */}
              {msg.role === 'assistant' && msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex justify-start mt-2">
                  <div className="max-w-[80%] flex flex-wrap gap-2">
                    {msg.suggestions.map((suggestion, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => sendMessage(suggestion)}
                        disabled={loading}
                        className="px-3 py-1 bg-b2b-blue/10 text-b2b-blue rounded-full text-sm hover:bg-b2b-blue/20 transition-colors disabled:opacity-50"
                        data-testid="suggestion-button"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-b2b-gray-200 rounded-lg p-4 shadow-b2b-sm" data-testid="loading-indicator">
                <div className="flex space-x-2">
                  <motion.div
                    className="w-2 h-2 bg-b2b-gray-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-b2b-gray-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
                  />
                  <motion.div
                    className="w-2 h-2 bg-b2b-gray-400 rounded-full"
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                  />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-b2b-gray-200 bg-white p-4 shadow-b2b-lg">
        <div className="container mx-auto max-w-4xl">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 border border-b2b-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-b2b-blue focus:border-transparent"
              disabled={loading}
              data-testid="chat-input"
            />
            <Button
              variant="primary"
              size="md"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              icon={<MdSend />}
              data-testid="send-button"
            >
              Send
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

