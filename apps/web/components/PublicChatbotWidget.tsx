'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { FiMessageCircle, FiX, FiSend } from 'react-icons/fi';
import { Card, Button, Input } from '@/components/b2b';
import { fadeIn, slideUp, fast } from '@/lib/animations';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface LeadInfo {
  name: string;
  email: string;
  company?: string;
}

export default function PublicChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I\'m your B2B+ AI assistant. How can I help you today?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [leadInfo, setLeadInfo] = useState<LeadInfo>({
    name: '',
    email: '',
    company: '',
  });

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await fetch('/api/chatbot/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          conversation_history: messages.map(m => ({
            role: m.role,
            content: m.content,
          })),
          lead_info: leadCaptured ? leadInfo : undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);

      // After 3 messages, prompt for lead info if not captured
      if (messages.filter(m => m.role === 'user').length >= 2 && !leadCaptured) {
        setShowLeadForm(true);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const submitLeadInfo = async () => {
    if (!leadInfo.name || !leadInfo.email) return;

    try {
      const response = await fetch('/api/chatbot/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Lead information submitted',
          lead_info: leadInfo,
          capture_lead: true,
        }),
      });

      if (!response.ok) throw new Error('Failed to submit lead info');

      setLeadCaptured(true);
      setShowLeadForm(false);

      const confirmMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Thanks ${leadInfo.name}! I've saved your information. How else can I help you today?`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, confirmMessage]);
    } catch (error) {
      console.error('Error submitting lead info:', error);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={fast}
            className="fixed bottom-6 right-6 z-50"
          >
            <button
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 bg-b2b-yellow hover:bg-b2b-yellow/90 text-b2b-dark rounded-full px-6 py-4 shadow-lg hover:shadow-xl transition-all"
              data-testid="chatbot-button"
            >
              <FiMessageCircle className="h-6 w-6" />
              <span className="font-medium">Chat with us</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={fast}
            className="fixed bottom-6 right-6 z-50 w-96 h-[600px] flex flex-col"
            data-testid="chatbot-window"
          >
            <Card padding="none" className="h-full flex flex-col shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-b2b-gray-200 bg-b2b-yellow">
                <div className="flex items-center gap-2">
                  <FiMessageCircle className="h-5 w-5 text-b2b-dark" />
                  <h3 className="font-semibold text-b2b-dark">B2B+ Assistant</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-b2b-dark hover:text-b2b-dark/70 transition-colors"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    {...slideUp}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-b2b-yellow text-b2b-dark'
                          : 'bg-b2b-gray-100 text-b2b-dark'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs mt-1 opacity-70">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </motion.div>
                ))}
                {loading && (
                  <motion.div {...slideUp} className="flex justify-start">
                    <div className="bg-b2b-gray-100 rounded-lg px-4 py-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-b2b-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-b2b-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-b2b-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Lead Capture Form */}
              {showLeadForm && !leadCaptured && (
                <motion.div {...slideUp} className="p-4 border-t border-b2b-gray-200 bg-b2b-gray-50">
                  <p className="text-sm text-b2b-dark mb-3">
                    To better assist you, please share your contact information:
                  </p>
                  <div className="space-y-2">
                    <Input
                      placeholder="Your name"
                      value={leadInfo.name}
                      onChange={(e) => setLeadInfo({ ...leadInfo, name: e.target.value })}
                      data-testid="lead-name"
                    />
                    <Input
                      type="email"
                      placeholder="Your email"
                      value={leadInfo.email}
                      onChange={(e) => setLeadInfo({ ...leadInfo, email: e.target.value })}
                      data-testid="lead-email"
                    />
                    <Input
                      placeholder="Company (optional)"
                      value={leadInfo.company}
                      onChange={(e) => setLeadInfo({ ...leadInfo, company: e.target.value })}
                      data-testid="lead-company"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        onClick={submitLeadInfo}
                        disabled={!leadInfo.name || !leadInfo.email}
                      >
                        Submit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowLeadForm(false)}
                      >
                        Skip
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-b2b-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Type your message..."
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    className="flex-1 px-4 py-2 border border-b2b-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-b2b-yellow"
                    disabled={loading}
                    data-testid="chatbot-input"
                  />
                  <Button
                    variant="primary"
                    icon={<FiSend />}
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || loading}
                    data-testid="chatbot-send"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

