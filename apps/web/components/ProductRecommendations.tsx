"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  sku: string;
  name: string;
  price: number;
  image_url?: string;
  category?: string;
}

interface Recommendation {
  product: Product;
  score: number;
  reason: string;
}

interface ProductRecommendationsProps {
  productId?: string;
  type: "also_bought" | "similar" | "personalized";
  title?: string;
  limit?: number;
}

export function ProductRecommendations({
  productId,
  type,
  title,
  limit = 4,
}: ProductRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRecommendations();
  }, [productId, type]);

  const fetchRecommendations = async () => {
    try {
      const params = new URLSearchParams({
        type,
        limit: limit.toString(),
        ...(productId && { product_id: productId }),
      });

      const response = await fetch(`/api/recommendations?${params}`);
      if (!response.ok) throw new Error("Failed to fetch recommendations");

      const data = await response.json();
      setRecommendations(data.recommendations || []);
    } catch (error) {
      console.error("Failed to load recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async (productId: string) => {
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId, quantity: 1 }),
      });

      if (!response.ok) throw new Error("Failed to add to cart");

      toast({
        title: "Added to cart",
        description: "Product added to your cart successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add product to cart",
        variant: "destructive",
      });
    }
  };

  const getDefaultTitle = () => {
    switch (type) {
      case "also_bought":
        return "Customers Also Bought";
      case "similar":
        return "Similar Products";
      case "personalized":
        return "Recommended For You";
      default:
        return "Recommendations";
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-xl font-bold text-navy-700 dark:text-white">
            <Sparkles className="h-5 w-5" />
            {title || getDefaultTitle()}
          </h2>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Loading recommendations...</p>
        </div>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-xl font-bold text-navy-700 dark:text-white">
          <Sparkles className="h-5 w-5 text-purple-500" />
          {title || getDefaultTitle()}
        </h2>
      </div>
      <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {recommendations.map((rec) => (
            <div
              key={rec.product.id}
              className="border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
            >
              {rec.product.image_url && (
                <div className="aspect-square bg-gray-100 rounded-md overflow-hidden">
                  <img
                    src={rec.product.image_url}
                    alt={rec.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/products/${rec.product.id}`}
                    className="text-sm font-medium hover:underline line-clamp-2"
                  >
                    {rec.product.name}
                  </Link>
                  {rec.score > 0.8 && (
                    <Badge variant="info" className="text-xs shrink-0">
                      Top Pick
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">{rec.product.sku}</p>

                {rec.product.category && (
                  <Badge variant="info" className="text-xs">
                    {rec.product.category}
                  </Badge>
                )}

                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-bold">
                    ${rec.product.price.toFixed(2)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddToCart(rec.product.id)}
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>
                </div>

                {rec.reason && (
                  <p className="text-xs text-muted-foreground italic">
                    {rec.reason}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
