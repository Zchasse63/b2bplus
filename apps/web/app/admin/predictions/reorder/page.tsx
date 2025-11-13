'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ReorderPrediction {
  id: string;
  product_id: string;
  product_name: string;
  predicted_quantity: number;
  confidence_score: number;
  reasoning: string;
  created_at: string;
}

export default function ReorderPredictionsPage() {
  const { toast } = useToast();
  const [predictions, setPredictions] = useState<ReorderPrediction[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    loadPredictions();
  }, []);

  const loadPredictions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('product_usage_forecasts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setPredictions(data || []);
    } catch (error) {
      console.error('Error loading predictions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load predictions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generatePredictions = async () => {
    try {
      setGenerating(true);
      const response = await fetch('/api/admin/predictions/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      toast({
        title: 'Success',
        description: 'Predictions generated successfully',
      });

      setSuccessMessage('Predictions generated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      await loadPredictions();
    } catch (error) {
      console.error('Error generating predictions:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate predictions',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reorder Predictions</h1>
        <p className="text-gray-600 mt-2">AI-powered predictions for product reorders</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generate Predictions</CardTitle>
          <CardDescription>
            Use AI to analyze purchase patterns and generate reorder predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={generatePredictions}
            disabled={generating}
            size="lg"
          >
            {generating ? 'Generating...' : 'Generate Predictions'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Predictions</CardTitle>
          <CardDescription>
            Latest AI-generated reorder predictions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading predictions...</p>
          ) : predictions.length === 0 ? (
            <p className="text-gray-500">No predictions yet. Generate some to get started.</p>
          ) : (
            <div className="space-y-4">
              {predictions.map((prediction) => (
                <div key={prediction.id} data-testid="prediction-card" className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{prediction.product_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{prediction.reasoning}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{prediction.predicted_quantity} units</p>
                      <p className="text-sm text-gray-600">
                        Confidence: {(prediction.confidence_score * 100).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {successMessage}
        </div>
      )}
    </div>
  );
}

