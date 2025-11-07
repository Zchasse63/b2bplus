import { motion } from 'framer-motion';
"use client";

import { useState, useEffect } from "react";
import { Input, Button, Badge } from "@/components/b2b";
import { Search, Sparkles, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface SemanticSearchProps {
  onSearch?: (query: string, filters?: string[]) => void;
  placeholder?: string;
  className?: string;
  showSuggestions?: boolean;
}

interface SuggestedFilter {
  label: string;
  value: string;
}

export function SemanticSearch({
  onSearch,
  placeholder = "Search products naturally... (e.g., 'cups for hot drinks')",
  className = "",
  showSuggestions = true,
}: SemanticSearchProps) {
  const [query, setQuery] = useState("");
  const [isSemanticMode, setIsSemanticMode] = useState(true); // Default to AI mode
  const [suggestedFilters, setSuggestedFilters] = useState<SuggestedFilter[]>([]);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Fetch AI-suggested filters when query changes
  useEffect(() => {
    if (query.trim() && isSemanticMode && showSuggestions) {
      const timer = setTimeout(() => {
        fetchSuggestedFilters(query);
      }, 500); // Debounce

      return () => clearTimeout(timer);
    } else {
      setSuggestedFilters([]);
    }
  }, [query, isSemanticMode, showSuggestions]);

  const fetchSuggestedFilters = async (searchQuery: string) => {
    setLoading(true);
    try {
      // Mock AI-suggested filters based on query
      // In production, this would call an AI API
      const filters: SuggestedFilter[] = [];

      if (searchQuery.toLowerCase().includes('cup')) {
        filters.push(
          { label: 'Hot Cups', value: 'category:hot-cups' },
          { label: 'Cold Cups', value: 'category:cold-cups' },
          { label: 'Disposable', value: 'material:disposable' }
        );
      } else if (searchQuery.toLowerCase().includes('plate')) {
        filters.push(
          { label: 'Paper Plates', value: 'material:paper' },
          { label: 'Foam Plates', value: 'material:foam' },
          { label: '9 inch', value: 'size:9-inch' }
        );
      } else if (searchQuery.toLowerCase().includes('container')) {
        filters.push(
          { label: 'Food Containers', value: 'category:food-containers' },
          { label: 'Takeout', value: 'use:takeout' },
          { label: 'Microwavable', value: 'feature:microwavable' }
        );
      }

      setSuggestedFilters(filters);
    } catch (error) {
      console.error('Error fetching suggested filters:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFilter = (filterValue: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filterValue)
        ? prev.filter((f) => f !== filterValue)
        : [...prev, filterValue]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!query.trim()) return;

    if (onSearch) {
      onSearch(query, selectedFilters);
    } else {
      // Navigate to search results page
      const params = new URLSearchParams({
        q: query,
        mode: isSemanticMode ? "semantic" : "keyword",
      });

      if (selectedFilters.length > 0) {
        params.set('filters', selectedFilters.join(','));
      }

      router.push(`/products?${params.toString()}`);
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="pl-10"
          />
          {isSemanticMode && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Sparkles className="h-4 w-4 text-b2b-blue " />
            </div>
          )}
        </div>
        <Button type="submit" disabled={!query.trim()}>
          Search
        </Button>
      </form>

      {/* AI-Suggested Filters */}
      {showSuggestions && suggestedFilters.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-b2b-gray-500 mb-2">AI-suggested filters:</p>
          <div className="flex flex-wrap gap-2">
            {suggestedFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => toggleFilter(filter.value)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedFilters.includes(filter.value)
                    ? 'bg-b2b-blue text-white'
                    : 'bg-b2b-gray-100 text-b2b-gray-700 hover:bg-b2b-gray-200'
                }`}
              >
                {filter.label}
                {selectedFilters.includes(filter.value) && (
                  <X className="inline-block ml-1 h-3 w-3" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Selected Filters */}
      {selectedFilters.length > 0 && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-b2b-gray-500">Active filters:</span>
          <div className="flex flex-wrap gap-1">
            {selectedFilters.map((filter) => {
              const filterObj = suggestedFilters.find((f) => f.value === filter);
              return (
                <Badge key={filter} variant="default" className="text-xs">
                  {filterObj?.label || filter}
                </Badge>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setSelectedFilters([])}
            className="text-xs text-b2b-blue hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
