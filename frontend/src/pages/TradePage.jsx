import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import TradeModal from "../components/TradeModal"; // import the modal
import { apiGet } from '../api';

function TradePage() {
  // Retrieve the stock symbol from the URL (e.g., /trade/AAPL)
  const { symbol } = useParams();

  // State for the chart data and selected period
  const [chartData, setChartData] = useState([]);
  const [chartPeriod, setChartPeriod] = useState("1d"); // fix initial to match API
  const [currentTime, setCurrentTime] = useState(new Date());
  const [stockData, setStockData] = useState(null);

  // for trade modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState('BUY');

  // Fetch stock details including name
  useEffect(() => {
    const fetchStockData = async () => {
      try {
        const snapshot = await apiGet("/api/snapshot");
        const currentStock = snapshot[symbol]; 
        if (currentStock) {
          setStockData(currentStock);
        }
      } catch (error) {
        console.error("Error fetching stock data:", error);
      }
    };

    fetchStockData();
  }, [symbol]);

  // Fetch historical data for the selected symbol and period
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const history = await apiGet(`/api/history/${symbol}/${chartPeriod}`);
        if (history.data && Array.isArray(history.data)) {
          const sortedData = history.data
            .map((entry) => ({
              date: new Date(entry.time),
              price: entry.value,
            }))
            .sort((a, b) => a.date - b.date);

          setChartData(sortedData);
        }
      } catch (error) {
        console.error("Error fetching chart history:", error);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 60000);
    return () => clearInterval(interval);
  }, [symbol, chartPeriod]);

  // Update the clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // For demonstration, pretend these are dynamic (you can also update these based on live data)
  const urlParams = new URLSearchParams(window.location.search);
  const currentPrice = parseFloat(urlParams.get('currentValue')) || 430.08;
  const changeValue = parseFloat(urlParams.get('changeValue')) || 307.49;
  const changePercent = parseFloat(urlParams.get('changePercent')) || 0.73;

  // Format the current time with timezone
  const formattedTime = currentTime.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  // Custom formatter for chart timestamps
  const formatChartTime = (date) => {
    if (chartPeriod === "1d") {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (chartPeriod === "5d") {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="p-4 sm:p-8 text-white pb-safe" style={{ fontFamily: "'Poppins', sans-serif" }}>
      {/* Top section: symbol, price, buy/sell */}
      <div className="flex items-start sm:items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-4 sm:gap-0">
        <div>
          <h1 className="text-xl font-bold">{symbol?.toUpperCase()}</h1>
          <p className="text-sm text-gray-400">{stockData?.name || 'Loading...'}</p>
        </div>

        {/* Buy / Sell Buttons - Only on desktop */}
        <div className="hidden sm:flex items-center space-x-2">
          <button
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500"
            onClick={() => { setInitialTab('BUY'); setIsModalOpen(true); }}
          >
            Buy
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500"
            onClick={() => { setInitialTab('SELL'); setIsModalOpen(true); }}
          >
            Sell
          </button>
        </div>
      </div>

      {/* Price + Change */}
      <div className="mb-2">
        <span className="text-2xl sm:text-3xl font-bold mr-2">
          ${currentPrice.toLocaleString()}
        </span>
        <span className={`text-base sm:text-lg font-semibold ${changeValue >= 0 ? "text-green-400" : "text-red-400"}`}>
          {changeValue >= 0 ? `+${changeValue}` : changeValue} ({changePercent >= 0 ? `+${changePercent}%` : `${changePercent}%`})
        </span>
      </div>
      <p className="text-gray-400 text-xs sm:text-sm mb-4">{formattedTime}</p>

      {/* Time Range Buttons */}
      <div className="flex space-x-2 mb-4 sm:mb-6 overflow-x-auto pb-2 sm:pb-0">
        {["1d", "5d", "1mo", "3mo"].map((range) => (
          <button
            key={range}
            onClick={() => setChartPeriod(range)}
            className={`px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors flex-shrink-0 ${chartPeriod === range ? "border border-white/20" : ""}`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Green Line Chart */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-2 sm:p-4 h-[300px] sm:h-[500px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis 
              dataKey="date"
              stroke="#9CA3AF"
              tickFormatter={formatChartTime}
              tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
            />
            <YAxis 
              stroke="#9CA3AF" 
              domain={["auto", "auto"]}
              tick={{ fontSize: window.innerWidth < 640 ? 10 : 12 }}
            />
            <Tooltip
              labelFormatter={formatChartTime}
              contentStyle={{
                backgroundColor: "rgba(17,24,39,0.9)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.5rem",
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

      {/* Mobile Trade Section - Always visible on mobile */}
      <div className="sm:hidden mt-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden">
        <TradeModal
          symbol={symbol}
          stockData={stockData}
          currentPrice={currentPrice}
          changePercent={changePercent}
          isOpen={true}
          onClose={() => {}}
          isMobile={true}
          initialTab="BUY"
        />
      </div>

      {/* Desktop Trade Modal */}
      {isModalOpen && (
        <div className="hidden sm:block">
          <TradeModal
            symbol={symbol}
            stockData={stockData} 
            currentPrice={currentPrice}
            changePercent={changePercent}
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            isMobile={false}
            initialTab={initialTab}
          />
        </div>
      )}

      {/* Analytics Text Block - Hidden on mobile */}
      <div className="hidden sm:block text-sm text-gray-300 leading-relaxed bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-4 mt-6">
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
          Based on our forecast, it's now a <span className="text-red-400">bad time</span> to buy {symbol}.
        </p>
        <p>
          For more details, check our <span className="text-blue-400 underline cursor-pointer">AI insights</span> on {symbol}.
        </p>
      </div>
    </div>
  );
}

export default TradePage;