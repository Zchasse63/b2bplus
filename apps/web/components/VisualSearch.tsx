'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/b2b/Button';
import { Card } from '@/components/b2b/Card';
import { MdUpload, MdClose, MdSearch } from 'react-icons/md';
import Image from 'next/image';

interface VisualSearchProps {
  onSearch?: (imageUrl: string, results: any[]) => void;
  className?: string;
}

export function VisualSearch({ onSearch, className = '' }: VisualSearchProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSearch = async () => {
    if (!selectedImage) return;

    setLoading(true);
    try {
      // Call visual search API
      const response = await fetch('/api/search/visual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedImage,
        }),
      });

      if (!response.ok) {
        throw new Error('Visual search failed');
      }

      const data = await response.json();
      setResults(data.results || []);

      if (onSearch) {
        onSearch(selectedImage, data.results || []);
      }
    } catch (error) {
      console.error('Visual search error:', error);
      alert('Failed to search. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setResults([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-b2b-dark mb-2">Visual Search</h3>
          <p className="text-sm text-b2b-gray-500">
            Upload an image to find similar products
          </p>
        </div>

        {/* Image Upload Area */}
        {!selectedImage ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-b2b-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-b2b-blue hover:bg-b2b-blue/5 transition-colors"
          >
            <MdUpload className="mx-auto text-4xl text-b2b-gray-400 mb-3" />
            <p className="text-b2b-gray-600 mb-2">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-b2b-gray-400">
              PNG, JPG, GIF up to 5MB
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Image Preview */}
            <div className="relative">
              <img
                src={selectedImage}
                alt="Search image"
                className="w-full h-64 object-contain bg-b2b-gray-50 rounded-lg"
              />
              <button
                onClick={clearImage}
                className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-b2b-md hover:bg-b2b-gray-100"
              >
                <MdClose className="text-b2b-gray-600" />
              </button>
            </div>

            {/* Search Button */}
            <Button
              variant="primary"
              size="md"
              icon={<MdSearch />}
              onClick={handleSearch}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Searching...' : 'Find Similar Products'}
            </Button>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="mt-6">
            <h4 className="font-bold text-b2b-dark mb-3">Similar Products</h4>
            <div className="grid grid-cols-2 gap-4">
              {results.map((product, index) => (
                <a
                  key={index}
                  href={`/products/${product.id}`}
                  className="border border-b2b-gray-200 rounded-lg p-3 hover:border-b2b-blue hover:shadow-b2b-md transition-all"
                >
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-32 object-cover rounded mb-2"
                    />
                  )}
                  <p className="text-sm font-medium text-b2b-dark line-clamp-2">
                    {product.name}
                  </p>
                  <p className="text-lg font-bold text-b2b-blue mt-1">
                    ${product.price.toFixed(2)}
                  </p>
                  {product.similarity_score && (
                    <p className="text-xs text-b2b-gray-500 mt-1">
                      {Math.round(product.similarity_score * 100)}% match
                    </p>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

