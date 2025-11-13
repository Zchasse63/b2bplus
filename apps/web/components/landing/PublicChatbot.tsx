'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Button } from '@/components/b2b/Button';
import { MdSend, MdClose } from 'react-icons/md';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface LeadFormData {
  contact_name: string;
  email: string;
  company_name: string;
}

export function PublicChatbot() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadSubmitted, setLeadSubmitted] = useState(false);
  const [leadFormData, setLeadFormData] = useState<LeadFormData>({
    contact_name: '',
    email: '',
    company_name: '',
  });

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

    // Show lead form after 2-3 messages
    if (messages.length >= 4 && !leadSubmitted) {
      setShowLeadForm(true);
    }

    try {
      const response = await fetch('/api/chatbot/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: messages.slice(-5), // Last 5 messages for context
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
      };

      setMessages((prev) => [...prev, assistantMessage]);
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

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...leadFormData,
          source: 'public_chatbot',
          conversation_history: messages,
        }),
      });

      if (response.ok) {
        setLeadSubmitted(true);
        setShowLeadForm(false);

        // Add a thank you message
        const thankYouMessage: Message = {
          role: 'assistant',
          content: `Thank you, ${leadFormData.contact_name}! I've saved your information. How else can I help you today?`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, thankYouMessage]);
      }
    } catch (error) {
      console.error('Lead submission error:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white rounded-lg shadow-b2b-lg border border-b2b-gray-200">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-b2b-dark mb-2">Chat with us</h2>
        <p className="text-b2b-gray-500">
          Have questions? Our AI assistant can help! Ask about products, pricing, or anything else.
        </p>
      </div>

      {/* Messages */}
      <div className="mb-4 max-h-96 overflow-y-auto space-y-3 p-4 bg-b2b-gray-50 rounded-lg">
        {messages.length === 0 && (
          <div className="text-center text-b2b-gray-400 py-8">
            <p>Start a conversation by typing a message below</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-b2b-blue text-white'
                  : 'bg-white text-b2b-dark border border-b2b-gray-200'
              }`}
            >
              <div className="whitespace-pre-wrap break-words text-sm">
                {msg.content}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-b2b-gray-200 rounded-lg p-3">
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
      </div>

      {/* Lead Capture Form */}
      {showLeadForm && !leadSubmitted && (
        <div className="mb-4 p-4 bg-b2b-blue/10 border border-b2b-blue/30 rounded-lg">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-b2b-dark mb-1">Get personalized assistance</h3>
              <p className="text-sm text-b2b-gray-600">
                Share your details to unlock full features and get tailored recommendations
              </p>
            </div>
            <button
              onClick={() => setShowLeadForm(false)}
              className="text-b2b-gray-400 hover:text-b2b-gray-600"
            >
              <MdClose className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={handleLeadSubmit} className="space-y-3">
            <input
              type="text"
              name="contact_name"
              placeholder="Your Name"
              required
              value={leadFormData.contact_name}
              onChange={(e) =>
                setLeadFormData({ ...leadFormData, contact_name: e.target.value })
              }
              className="w-full border border-b2b-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-b2b-blue"
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              value={leadFormData.email}
              onChange={(e) =>
                setLeadFormData({ ...leadFormData, email: e.target.value })
              }
              className="w-full border border-b2b-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-b2b-blue"
            />
            <input
              type="text"
              name="company_name"
              placeholder="Company Name"
              required
              value={leadFormData.company_name}
              onChange={(e) =>
                setLeadFormData({ ...leadFormData, company_name: e.target.value })
              }
              className="w-full border border-b2b-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-b2b-blue"
            />
            <Button type="submit" variant="primary" size="sm" className="w-full">
              Continue
            </Button>
          </form>
        </div>
      )}

      {/* Sign-in CTA for advanced features */}
      {messages.length > 0 && !leadSubmitted && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 mb-2">
            Want to place orders, track shipments, and access your account?
          </p>
          <Link href="/auth/login" className="text-b2b-blue hover:underline text-sm font-medium">
            Sign in for full access →
          </Link>
        </div>
      )}

      {/* Input */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1 border border-b2b-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-b2b-blue"
          disabled={loading}
          data-testid="chatbot-input"
        />
        <Button
          variant="primary"
          size="sm"
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          icon={<MdSend />}
          data-testid="chatbot-send"
        >
          Send
        </Button>
      </div>
    </div>
  );
}

