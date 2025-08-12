import React, { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

function AIPrediction() {
  // Stocks allowed (should match backend ALLOWED_STOCKS)
  const stocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'NVDA', name: 'Nvidia' },
    { symbol: 'AMZN', name: 'Amazon' },
    { symbol: 'MSFT', name: 'Microsoft' },
    { symbol: 'META', name: 'Meta Platforms' },
    { symbol: 'TSLA', name: 'Tesla' },
    { symbol: 'JPM', name: 'JPMorgan Chase' },
    { symbol: 'V', name: 'Visa Inc.' },
    { symbol: 'WMT', name: 'Walmart' },
    { symbol: 'UNH', name: 'UnitedHealth Group' },
    { symbol: 'JNJ', name: 'Johnson & Johnson' },
    { symbol: 'MA', name: 'Mastercard' },
    { symbol: 'PG', name: 'Procter & Gamble' },
    { symbol: 'HD', name: 'Home Depot' },
    { symbol: 'BAC', name: 'Bank of America' },
    { symbol: 'KO', name: 'Coca-Cola' },
    { symbol: 'F', name: 'Ford Motor Company' },
    { symbol: 'PFE', name: 'Pfizer' },
    { symbol: 'CSCO', name: 'Cisco Systems' }
  ];

  // Timeframe options: label for display and value for API
  const timeFrames = [
    { label: '3 Days', value: '3d' },
    { label: '7 Days', value: '7d' },
    { label: '15 Days', value: '15d' },
    { label: '1 Month', value: '1m' }
  ];

  const [selectedStock, setSelectedStock] = useState(stocks[0].symbol);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(timeFrames[2].value); // Default to 15 days
  const [chartData, setChartData] = useState([]);
  const [extraInfo, setExtraInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(null);

  // Function to fetch predictions from backend
  const handlePredict = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/forecast', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          symbol: selectedStock, 
          timeframe: selectedTimeFrame
        })
      });
      
      const data = await response.json();
      console.log('Received prediction data:', data);
      
      // Check if we have required data
      if (!data.historical_dates || !data.historical_prices || 
          !data.predicted_dates || !data.predicted_prices) {
        console.error("Missing required data fields");
        setLoading(false);
        return;
      }
      
      // Get the last historical date for the reference line
      const lastHistDate = data.historical_dates[data.historical_dates.length - 1];
      setCurrentDate(lastHistDate);
      
      // Format data for the chart - CORRECTED VERSION
      let formattedData = [];
      
      // Add historical data points
      for (let i = 0; i < data.historical_dates.length; i++) {
        formattedData.push({
          date: data.historical_dates[i],
          historicalValue: data.historical_prices[i],
          predictedValue: null, // No predicted value for historical dates
          type: 'historical'
        });
      }
      
      // Add prediction data points
      for (let i = 0; i < data.predicted_dates.length; i++) {
        formattedData.push({
          date: data.predicted_dates[i],
          historicalValue: null, // No historical value for prediction dates
          predictedValue: data.predicted_prices[i],
          type: 'prediction'
        });
      }
      
      // Set extra info if available
      if (data.extra_info) {
        setExtraInfo(data.extra_info);
      }
      
      // Sort by date to ensure chronological order
      formattedData.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      console.log('Formatted chart data:', formattedData);
      setChartData(formattedData);
      
    } catch (error) {
      console.error("API call error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Custom tooltip to show prediction period labels - UPDATED
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const value = data.historicalValue || data.predictedValue;
      const isPrediction = data.type === 'prediction';
      
      return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <p className="font-semibold">{data.date}</p>
          <p className="text-sm">
            {isPrediction ? 'Predicted' : 'Historical'} Price: ${value?.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  // Format the X-axis tick values to be more readable
  const formatXAxis = (tickItem) => {
    const date = new Date(tickItem);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="flex-1 p-8 overflow-auto text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
      <h1 className="text-3xl font-bold mb-2">AI Predictions</h1>
      <p className="text-gray-400 mb-8">Select a stock and a timeframe to see future predictions</p>

      <div className="w-full bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-6 mb-6 flex items-center gap-6">
        {/* Stock Dropdown */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Select Stock</label>
          <select
            value={selectedStock}
            onChange={(e) => setSelectedStock(e.target.value)}
            className="w-[200px] bg-white text-black border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            {stocks.map((stock) => (
              <option key={stock.symbol} value={stock.symbol}>
                {stock.symbol} - {stock.name}
              </option>
            ))}
          </select>
        </div>

        {/* Time Frame Dropdown */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Select Time Frame</label>
          <select
            value={selectedTimeFrame}
            onChange={(e) => setSelectedTimeFrame(e.target.value)}
            className="w-[200px] bg-white text-black border border-white/10 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            {timeFrames.map((tf) => (
              <option key={tf.value} value={tf.value}>
                {tf.label}
              </option>
            ))}
          </select>
        </div>

        {/* Predict Button */}
        <div className="flex items-end">
          <button
            onClick={handlePredict}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg transition-colors text-white font-semibold"
          >
            {loading ? "Loading..." : "Predict"}
          </button>
        </div>
      </div>

      {/* Extra Textual Information */}
      {extraInfo && (
        <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 mb-6">
          <h2 className="text-xl font-bold mb-1">Prediction Information</h2>
          <p>Last Updated: {new Date(extraInfo.last_updated).toLocaleString()}</p>
          <p>Confidence: {extraInfo.confidence}</p>
          {/* <p>Model: {extraInfo.model}</p> */}
        </div>
      )}

      {/* Chart Section - CORRECTED */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 h-[400px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280" 
                tickFormatter={formatXAxis}
                minTickGap={30}
              />
              <YAxis 
                stroke="#6B7280"
                domain={['auto', 'auto']}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Historical Price Line - Blue, Solid */}
              <Line 
                type="monotone" 
                dataKey="historicalValue" 
                stroke="#3B82F6" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 6 }}
                name="Historical Price"
                connectNulls={false}
              />
              
              {/* Predicted Price Line - Green, Dashed */}
              <Line 
                type="monotone" 
                dataKey="predictedValue" 
                stroke="#22c55e" 
                strokeWidth={2} 
                dot={true}
                strokeDasharray="5 5" 
                name="Predicted Price"
                connectNulls={false}
              />
              
              {/* Add a reference line at the current date to visually separate historical/prediction */}
              {currentDate && (
                <ReferenceLine 
                  x={currentDate} 
                  stroke="#ff6b6b" 
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{ value: "Today", position: "top" }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>Select a stock and click Predict to view the chart</p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
          <span>Historical Price</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
          <span>Predicted Price</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
          <span>Current Date</span>
        </div>
      </div>
    </div>
  );
}

export default AIPrediction;