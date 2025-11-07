'use client';

import { useMemo } from 'react';
import { Card } from '@/components/b2b';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Forecast {
  id: string;
  forecast_date: string;
  predicted_quantity: number;
  actual_quantity: number | null;
  product: {
    name: string;
  };
}

interface ForecastChartProps {
  forecasts: Forecast[];
}

export function ForecastChart({ forecasts }: ForecastChartProps) {
  // Group forecasts by date and aggregate
  const chartData = useMemo(() => {
    const dataByDate = new Map<
      string,
      { predicted: number; actual: number; count: number }
    >();

    forecasts.forEach((forecast) => {
      const date = new Date(forecast.forecast_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });

      if (!dataByDate.has(date)) {
        dataByDate.set(date, { predicted: 0, actual: 0, count: 0 });
      }

      const entry = dataByDate.get(date)!;
      entry.predicted += forecast.predicted_quantity || 0;
      if (forecast.actual_quantity !== null) {
        entry.actual += forecast.actual_quantity;
        entry.count++;
      }
    });

    return Array.from(dataByDate.entries())
      .map(([date, data]) => ({
        date,
        predicted: Math.round(data.predicted),
        actual: data.count > 0 ? Math.round(data.actual) : null,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA.getTime() - dateB.getTime();
      });
  }, [forecasts]);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <Card variant="bordered" padding="lg">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-b2b-dark">Forecast Trends</h2>
        <p className="text-sm text-b2b-gray-500 mt-1">
          Predicted vs actual usage over time
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
            label={{
              value: 'Quantity',
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: '12px', fill: '#6b7280' },
            }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '12px',
            }}
            labelStyle={{ color: '#111827', fontWeight: 'bold' }}
          />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Predicted"
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#10b981"
            strokeWidth={2}
            name="Actual"
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Legend explanation */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-600"></div>
          <span className="text-b2b-gray-600">
            Predicted: AI-generated forecasts
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-green-600"></div>
          <span className="text-b2b-gray-600">
            Actual: Verified order data
          </span>
        </div>
      </div>
    </Card>
  );
}

