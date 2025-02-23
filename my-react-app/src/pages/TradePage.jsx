// src/pages/TradePage.jsx

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

import TradeModal from '../components/TradeModal'; // import the modal

function TradePage() {
  // Retrieve the stock symbol from the URL (e.g., /trade/AAPL)
  const { symbol } = useParams();

  // Sample data for the line chart
  // In reality, you'd fetch historical data for the symbol
  const chartData = [
    { date: 'Mar 2023', price: 320 },
    { date: 'Apr 2023', price: 340 },
    { date: 'May 2023', price: 360 },
    { date: 'Jun 2023', price: 330 },
    { date: 'Jul 2023', price: 370 },
    { date: 'Aug 2023', price: 390 },
    { date: 'Sep 2023', price: 410 },
    { date: 'Oct 2023', price: 420 },
    { date: 'Nov 2023', price: 405 },
    { date: 'Dec 2023', price: 430 },
    { date: 'Jan 2024', price: 450 }, // "future" data
  ];

  // For demonstration, pretend these are dynamic
  const currentPrice = 430.08;
  const changeValue = +307.49; // positive
  const changePercent = +0.73; // positive

  // Control the TradeModal’s open/close
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="p-8 text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Top section: symbol, price, buy/sell */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">
            {symbol?.toUpperCase()} (DJI)
          </h1>
          <p className="text-sm text-gray-400">
            Dow Jones Industrial Average
          </p>
        </div>

        {/* Buy / Sell Buttons that open the modal */}
        <div className="flex items-center space-x-2">
          <button
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500"
            onClick={() => setIsModalOpen(true)}
          >
            Buy
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500"
            onClick={() => setIsModalOpen(true)}
          >
            Sell
          </button>
        </div>
      </div>

      {/* Price + Change */}
      <div className="mb-2">
        <span className="text-3xl font-bold mr-2">
          ${currentPrice.toLocaleString()}
        </span>
        <span className={`text-lg font-semibold ${changeValue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {changeValue >= 0 ? `+${changeValue}` : changeValue} 
          ({changePercent >= 0 ? `+${changePercent}%` : `${changePercent}%`})
        </span>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        Oct 28, 10:00:56 PM UTC-4
      </p>

      {/* Time Range Buttons */}
      <div className="flex space-x-2 mb-6">
        {['1D', '5D', '1M', '6M', '1Y', '5Y', 'MAX'].map((range) => (
          <button
            key={range}
            className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
          >
            {range}
          </button>
        ))}
      </div>

      {/* Green Line Chart */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(17,24,39,0.9)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '0.5rem',
              }}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#22c55e"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Analytics Text Block */}
      <div className="text-sm text-gray-300 leading-relaxed bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4 mt-6">
        <p className="mb-2">
          According to our current {symbol} price prediction, the price of {symbol} is predicted to rise by <span className="text-green-400">+3.57%</span> and reach <span className="font-bold">$130,104</span> by March 21, 2025.
        </p>
        <p className="mb-2">
          Per our technical indicators, the current sentiment for {symbol} is <span className="text-red-400">Bearish</span> while the Fear &amp; Greed Index is showing <span className="text-yellow-400">41 (Fear)</span>.
        </p>
        <p className="mb-2">
          {symbol} recorded <span className="font-bold">14/30</span> (47%) green days with 3.46% price volatility over the last 30 days.
        </p>
        <p className="mb-2">
          Based on our forecast, it’s now a <span className="text-red-400">bad time</span> to buy {symbol}.
        </p>
        <p>
          For more details, check our <span className="text-blue-400 underline cursor-pointer">AI insights</span> on {symbol}.
        </p>
      </div>

      {/* The TradeModal in top-right corner, toggled by isModalOpen */}
      <TradeModal
        symbol={symbol}
        currentPrice={currentPrice}
        changePercent={changePercent}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}

export default TradePage;
