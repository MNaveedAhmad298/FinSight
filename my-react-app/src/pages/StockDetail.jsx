import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  ResponsiveContainer,
} from 'recharts';
import { ArrowUp, ArrowDown } from 'lucide-react';

function StockDetail() {
  // Get the stock symbol from the URL parameter (e.g., /details/BTC)
  const { symbol } = useParams();

  // Dummy chart data for different prediction intervals
  const chartData5Day = [
    { date: 'Mon', price: 45000 },
    { date: 'Tue', price: 46000 },
    { date: 'Wed', price: 47000 },
    { date: 'Thu', price: 48000 },
    { date: 'Fri', price: 49000 },
  ];

  const chartData15Day = [
    { date: 'Day 1', price: 44000 },
    { date: 'Day 5', price: 45500 },
    { date: 'Day 10', price: 46500 },
    { date: 'Day 15', price: 48000 },
  ];

  const chartData1Month = [
    { date: 'Week 1', price: 45000 },
    { date: 'Week 2', price: 47000 },
    { date: 'Week 3', price: 49000 },
    { date: 'Week 4', price: 51000 },
  ];

  const chartData3Month = [
    { date: 'Month 1', price: 43000 },
    { date: 'Month 2', price: 45000 },
    { date: 'Month 3', price: 47000 },
  ];

  const chartData6Month = [
    { date: 'Month 1', price: 42000 },
    { date: 'Month 2', price: 44000 },
    { date: 'Month 3', price: 46000 },
    { date: 'Month 4', price: 48000 },
    { date: 'Month 5', price: 50000 },
    { date: 'Month 6', price: 52000 },
  ];

  // Mapping prediction interval labels to chart data
  const chartDataMap = {
    '5-Day Prediction': chartData5Day,
    '15-Day Prediction': chartData15Day,
    '1-Month Prediction': chartData1Month,
    '3-Month Prediction': chartData3Month,
    '6-Month Prediction': chartData6Month,
  };

  // Each prediction now has a value and a change
  // change > 0 => green up arrow, change < 0 => red down arrow
  const predictions = {
    '5-Day Prediction': { value: 102000, change: 2.5 },
    '15-Day Prediction': { value: 110000, change: -1.2 },
    '1-Month Prediction': { value: 120000, change: 4.3 },
    '3-Month Prediction': { value: 135000, change: -2.1 },
    '6-Month Prediction': { value: 150000, change: 5.7 },
  };

  // State to track the currently selected prediction interval
  const [activeInterval, setActiveInterval] = useState('5-Day Prediction');

  return (
    <div
      className="flex-1 p-8 overflow-auto"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* Title Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{symbol} Price Prediction 2025</h1>
        <p className="text-gray-400 mt-2">
          Detailed prediction for {symbol} based on recent trends.
        </p>
      </div>

      {/* Prediction Cards Block */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {Object.entries(predictions).map(([label, data]) => {
          const { value, change } = data;
          const isActive = activeInterval === label;
          const isPositive = change >= 0;

          return (
            <div
              key={label}
              onClick={() => setActiveInterval(label)}
              className={`cursor-pointer h-22 rounded-lg p-3 bg-white/5 backdrop-blur-md flex flex-col items-center justify-center transition-all ${
                isActive ? 'border-2 border-blue-500' : 'border border-white/10'
              }`}
            >
              <p className="text-sm text-gray-400 mb-1">{label}</p>
              <div className="flex items-center gap-1">
                <p className="text-xl font-bold text-blue-400">
                  ${value.toLocaleString()}
                </p>
                {change !== 0 && (
                  <span
                    className={`flex items-center text-sm ${
                      isPositive ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUp className="w-4 h-4" />
                    ) : (
                      <ArrowDown className="w-4 h-4" />
                    )}
                    {isPositive ? `+${change}%` : `${change}%`}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart Block */}
      <div className="rounded-lg p-4 bg-white/5 backdrop-blur-md border border-white/10">
        <h2 className="text-lg font-bold mb-4">Historical & Predicted Price</h2>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartDataMap[activeInterval]}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="date" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17,24,39,0.9)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '0.5rem',
                }}
              />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3B82F6"
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default StockDetail;
