'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category?: string;
  icon?: React.ReactNode;
  onSelect: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  items: CommandItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * CommandPalette component - provides quick access to actions and navigation
 * Triggered with ⌘K (Mac) or Ctrl+K (Windows/Linux)
 */
export const CommandPalette = React.forwardRef<HTMLDivElement, CommandPaletteProps>(
  ({ items, open: controlledOpen, onOpenChange }, ref) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const router = useRouter();

    const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
    const setOpen = useCallback(
      (value: boolean) => {
        if (controlledOpen === undefined) {
          setInternalOpen(value);
        }
        onOpenChange?.(value);
      },
      [controlledOpen, onOpenChange]
    );

    // Filter items based on search
    const filteredItems = items.filter((item) => {
      const searchLower = search.toLowerCase();
      return (
        item.label.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.keywords?.some((k) => k.toLowerCase().includes(searchLower))
      );
    });

    // Group items by category
    const groupedItems = filteredItems.reduce(
      (acc, item) => {
        const category = item.category || 'General';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(item);
        return acc;
      },
      {} as Record<string, CommandItem[]>
    );

    // Handle keyboard shortcuts
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          setOpen(!isOpen);
          setSearch('');
          setSelectedIndex(0);
        }

        if (!isOpen) return;

        switch (e.key) {
          case 'Escape':
            setOpen(false);
            break;
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % filteredItems.length);
            break;
          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length);
            break;
          case 'Enter':
            e.preventDefault();
            if (filteredItems[selectedIndex]) {
              filteredItems[selectedIndex].onSelect();
              setOpen(false);
              setSearch('');
            }
            break;
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredItems, selectedIndex, setOpen]);

    return (
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              ref={ref}
              className="fixed left-1/2 top-1/4 z-50 w-full max-w-2xl -translate-x-1/2 rounded-lg bg-white shadow-2xl"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="flex items-center border-b border-b2b-gray-200 px-4 py-3">
                <Search className="h-5 w-5 text-b2b-gray-400" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search commands..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setSelectedIndex(0);
                  }}
                  className="ml-3 flex-1 bg-transparent text-b2b-dark placeholder:text-b2b-gray-400 focus:outline-none"
                />
                <button
                  onClick={() => setOpen(false)}
                  className="text-b2b-gray-400 hover:text-b2b-dark"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto p-2">
                {filteredItems.length === 0 ? (
                  <div className="px-4 py-8 text-center text-b2b-gray-500">
                    No commands found
                  </div>
                ) : (
                  Object.entries(groupedItems).map(([category, categoryItems]) => (
                    <div key={category}>
                      <div className="px-4 py-2 text-xs font-semibold text-b2b-gray-500 uppercase">
                        {category}
                      </div>
                      {categoryItems.map((item, idx) => {
                        const globalIndex = filteredItems.indexOf(item);
                        return (
                          <motion.button
                            key={item.id}
                            onClick={() => {
                              item.onSelect();
                              setOpen(false);
                              setSearch('');
                            }}
                            className={cn(
                              'w-full px-4 py-2 text-left rounded-md transition-colors',
                              globalIndex === selectedIndex
                                ? 'bg-b2b-blue text-white'
                                : 'text-b2b-dark hover:bg-b2b-gray-50'
                            )}
                            whileHover={{ x: 4 }}
                          >
                            <div className="flex items-center gap-3">
                              {item.icon && <div className="flex-shrink-0">{item.icon}</div>}
                              <div className="flex-1">
                                <div className="font-medium">{item.label}</div>
                                {item.description && (
                                  <div className="text-xs opacity-75">{item.description}</div>
                                )}
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }
);

CommandPalette.displayName = 'CommandPalette';

