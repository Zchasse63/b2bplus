'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/b2b/Button';
import { usePathname } from 'next/navigation';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';

interface AICompanionProps {
  className?: string;
  initialMessage?: string;
  position?: 'bottom-right' | 'bottom-left';
  minimized?: boolean;
  onMinimize?: () => void;
}

/**
 * AI Companion Chat Component
 *
 * A floating chat interface that provides AI-assisted help.
 * Uses streaming for real-time responses with tool calling support.
 */
export function AICompanion({
  className,
  initialMessage,
  position = 'bottom-right',
  minimized: initialMinimized = true,
  onMinimize,
}: AICompanionProps) {
  const [isOpen, setIsOpen] = useState(!initialMinimized);
  const [useReasoning, setUseReasoning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const [inputValue, setInputValue] = useState('');

  // Initialize chat with Vercel AI SDK
  const {
    messages,
    status,
    error,
    setMessages,
    sendMessage,
  } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/ai/companion',
      body: {
        context: {
          currentPath: pathname,
        },
        useReasoning,
      },
    }),
    onError: (err) => {
      console.error('Chat error:', err);
    },
  });

  const isLoading = status === 'streaming' || status === 'submitted';

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Send initial message if provided
  useEffect(() => {
    if (initialMessage && messages.length === 0) {
      sendMessage({ text: initialMessage });
    }
  }, [initialMessage, messages.length, sendMessage]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    onMinimize?.();
  }, [onMinimize]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (inputValue.trim()) {
          sendMessage({ text: inputValue });
          setInputValue('');
        }
      }
    },
    [inputValue, sendMessage]
  );

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (inputValue.trim()) {
        sendMessage({ text: inputValue });
        setInputValue('');
      }
    },
    [inputValue, sendMessage]
  );

  const clearChat = useCallback(() => {
    setMessages([]);
  }, [setMessages]);

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  return (
    <div
      className={cn(
        'fixed z-50',
        positionClasses[position],
        className
      )}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-4 w-96 max-w-[calc(100vw-2rem)] rounded-xl bg-white shadow-2xl border border-b2b-gray-200 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-b2b-blue px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="text-white text-lg">🤖</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">AI Assistant</h3>
                  <p className="text-white/70 text-xs">
                    {isLoading ? 'Thinking...' : 'Online'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearChat}
                  className="text-white/70 hover:text-white p-1"
                  title="Clear chat"
                >
                  🗑️
                </button>
                <button
                  onClick={handleToggle}
                  className="text-white/70 hover:text-white p-1"
                  title="Minimize"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="h-80 overflow-y-auto p-4 space-y-4 bg-b2b-gray-50">
              {messages.length === 0 && (
                <div className="text-center text-b2b-text-light py-8">
                  <p className="text-lg mb-2">👋 Hello!</p>
                  <p className="text-sm">
                    I can help you with products, orders, and more.
                    What would you like to do?
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    {[
                      'Search products',
                      'View my orders',
                      'Check cart',
                      'Get help',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => sendMessage({ text: suggestion })}
                        className="px-3 py-1 text-xs bg-white rounded-full border border-b2b-gray-200 hover:border-b2b-blue hover:text-b2b-blue transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message) => {
                const textContent = message.parts
                  .filter((part) => part.type === 'text')
                  .map((part: any) => part.text)
                  .join('');
                const toolParts = message.parts.filter((part) => part.type === 'tool-call');

                return (
                  <MessageBubble
                    key={message.id}
                    role={message.role}
                    content={textContent}
                    toolInvocations={toolParts as any[]}
                  />
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 text-b2b-text-light">
                  <motion.div
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="flex gap-1"
                  >
                    <span className="w-2 h-2 bg-b2b-blue rounded-full" />
                    <span className="w-2 h-2 bg-b2b-blue rounded-full" style={{ animationDelay: '0.2s' }} />
                    <span className="w-2 h-2 bg-b2b-blue rounded-full" style={{ animationDelay: '0.4s' }} />
                  </motion.div>
                  <span className="text-sm">Thinking...</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                  Something went wrong. Please try again.
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={onSubmit} className="p-4 border-t border-b2b-gray-200 bg-white">
              <div className="flex gap-2">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask me anything..."
                  className="flex-1 resize-none rounded-lg border border-b2b-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-b2b-blue-300 min-h-[40px] max-h-[120px]"
                  rows={1}
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={isLoading || !inputValue.trim()}
                  className="self-end"
                >
                  {isLoading ? '...' : '→'}
                </Button>
              </div>

              {/* Reasoning toggle */}
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useReasoning"
                  checked={useReasoning}
                  onChange={(e) => setUseReasoning(e.target.checked)}
                  className="rounded border-b2b-gray-300"
                />
                <label htmlFor="useReasoning" className="text-xs text-b2b-text-light">
                  Use deep reasoning (for complex questions)
                </label>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={handleToggle}
        className={cn(
          'w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors',
          isOpen
            ? 'bg-b2b-gray-600 hover:bg-b2b-gray-700'
            : 'bg-b2b-blue hover:bg-b2b-blue-600'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <span className="text-white text-2xl">
          {isOpen ? '✕' : '💬'}
        </span>
      </motion.button>
    </div>
  );
}

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolInvocations?: any[];
}

function MessageBubble({ role, content, toolInvocations }: MessageBubbleProps) {
  const isUser = role === 'user';

  // Sanitize content
  const sanitizedContent = DOMPurify.sanitize(content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex', isUser ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-4 py-2 text-sm',
          isUser
            ? 'bg-b2b-blue text-white rounded-br-none'
            : 'bg-white border border-b2b-gray-200 rounded-bl-none'
        )}
      >
        {/* Message content with markdown support */}
        <div className={cn('prose prose-sm max-w-none', isUser && 'prose-invert')}>
          <ReactMarkdown>{sanitizedContent}</ReactMarkdown>
        </div>

        {/* Tool invocation results */}
        {toolInvocations && toolInvocations.length > 0 && (
          <div className="mt-2 space-y-2">
            {toolInvocations.map((invocation, index) => (
              <ToolResult key={index} invocation={invocation} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface ToolResultProps {
  invocation: any;
}

function ToolResult({ invocation }: ToolResultProps) {
  const { toolName, state, result } = invocation;

  if (state === 'pending' || state === 'partial-call') {
    return (
      <div className="text-xs text-b2b-text-light flex items-center gap-1">
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          ⏳
        </motion.span>
        Running {formatToolName(toolName)}...
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="text-xs text-red-500 flex items-center gap-1">
        ❌ {formatToolName(toolName)} failed
      </div>
    );
  }

  // Format result based on tool type
  return (
    <div className="text-xs bg-b2b-gray-50 rounded p-2 mt-1">
      <div className="font-medium text-b2b-text-light mb-1">
        ✓ {formatToolName(toolName)}
      </div>
      <ToolResultContent toolName={toolName} result={result} />
    </div>
  );
}

function ToolResultContent({ toolName, result }: { toolName: string; result: any }) {
  if (!result) return null;

  // Format different tool results nicely
  switch (toolName) {
    case 'searchProducts':
      return (
        <div>
          Found {result.products?.length || 0} products
          {result.products?.slice(0, 3).map((p: any) => (
            <div key={p.id} className="mt-1">
              • {p.name} - ${p.price}
            </div>
          ))}
        </div>
      );

    case 'getCart':
    case 'getCartSummary':
      return (
        <div>
          {result.itemCount} items - ${result.subtotal?.toFixed(2) || result.estimatedTotal?.toFixed(2)}
        </div>
      );

    case 'getOrderDetails':
      return (
        <div>
          Order #{result.order?.orderNumber} - {result.order?.status}
        </div>
      );

    case 'addToCart':
      return (
        <div>
          {result.action === 'added' ? 'Added to cart' : 'Updated quantity'}
        </div>
      );

    default:
      // Generic result display
      if (typeof result === 'object') {
        if (result.success) {
          return <div>✓ Completed successfully</div>;
        }
        if (result.error) {
          return <div className="text-red-500">{result.error}</div>;
        }
      }
      return <div className="text-b2b-text-light">{JSON.stringify(result).slice(0, 100)}...</div>;
  }
}

function formatToolName(name: string): string {
  // Convert camelCase to Title Case with spaces
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export default AICompanion;
