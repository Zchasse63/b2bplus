'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface SKUMapping {
  old_sku: string;
  suggested_product_id: string;
  suggested_product_name: string;
  confidence_score: number;
  match_reasoning: string;
}

export default function SKUMappingPage() {
  const { toast } = useToast();
  const [skuInput, setSkuInput] = useState('');
  const [mappings, setMappings] = useState<SKUMapping[]>([]);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!skuInput.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter SKU data',
        variant: 'destructive',
      });
      return;
    }

    try {
      setAnalyzing(true);
      
      // Parse SKU input (comma-separated or newline-separated)
      const skus = skuInput
        .split(/[,\n]/)
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const response = await fetch('/api/admin/sku-mapping/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skus }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      setMappings(result.mappings || []);

      toast({
        title: 'Success',
        description: `Analyzed ${skus.length} SKUs`,
      });
    } catch (error) {
      console.error('Error analyzing SKUs:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze SKUs',
        variant: 'destructive',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/sku-mapping/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      toast({
        title: 'Success',
        description: 'SKU mappings saved successfully',
      });

      setMappings([]);
      setSkuInput('');
    } catch (error) {
      console.error('Error saving mappings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save mappings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">SKU Mapping</h1>
        <p className="text-gray-600 mt-2">Map old SKUs to current products using AI</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload SKU Data</CardTitle>
          <CardDescription>
            Enter old SKUs (comma or newline separated)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={skuInput}
            onChange={(e) => setSkuInput(e.target.value)}
            placeholder="BAI-PLT-9-WHT-500, BAI-NAP-WHT-1000, BAI-CUP-12-HOT-500"
            className="w-full h-32 p-3 border rounded-lg font-mono text-sm"
          />
          <Button
            onClick={handleAnalyze}
            disabled={analyzing}
            size="lg"
          >
            {analyzing ? 'Analyzing...' : 'Analyze SKUs'}
          </Button>
        </CardContent>
      </Card>

      {mappings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mapping Results</CardTitle>
            <CardDescription>
              Review and confirm SKU mappings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mappings.map((mapping, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-semibold">{mapping.old_sku}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      → {mapping.suggested_product_name}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {mapping.match_reasoning}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {(mapping.confidence_score * 100).toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-600">confidence</p>
                  </div>
                </div>
              </div>
            ))}
            <Button
              onClick={handleSave}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? 'Saving...' : 'Save Mappings'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

