"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

interface SemanticSearchProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  className?: string;
}

export function SemanticSearch({
  onSearch,
  placeholder = "Search products naturally... (e.g., 'cups for hot drinks')",
  className = "",
}: SemanticSearchProps) {
  const [query, setQuery] = useState("");
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!query.trim()) return;

    if (onSearch) {
      onSearch(query);
    } else {
      // Navigate to search results page
      const params = new URLSearchParams({
        q: query,
        mode: isSemanticMode ? "semantic" : "keyword",
      });
      router.push(`/products?${params.toString()}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={`flex gap-2 ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>
      <Button
        type="button"
        variant={isSemanticMode ? "default" : "outline"}
        size="icon"
        onClick={() => setIsSemanticMode(!isSemanticMode)}
        title={isSemanticMode ? "AI Search Enabled" : "Enable AI Search"}
      >
        <Sparkles className={`h-4 w-4 ${isSemanticMode ? "animate-pulse" : ""}`} />
      </Button>
      <Button type="submit">Search</Button>
    </form>
  );
}
