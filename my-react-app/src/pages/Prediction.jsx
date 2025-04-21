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
    { label: '1 Week', value: '1w' },
    { label: '1 Month', value: '1mo' },
    { label: '3 Months', value: '3mo' },
    { label: '6 Months', value: '6mo' }
  ];

  const [selectedStock, setSelectedStock] = useState(stocks[0].symbol);
  const [selectedTimeFrame, setSelectedTimeFrame] = useState(timeFrames[2].value); // Default to 1 month
  const [chartData, setChartData] = useState([]);
  const [extraInfo, setExtraInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(null);

  // Function to fetch predictions from backend
  const handlePredict = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          symbol: selectedStock, 
          timeframe: selectedTimeFrame
        })
      });
      
      const data = await response.json();
      if (data.error) {
        console.error("Error:", data.error);
        setLoading(false);
        return;
      }

      // Extract historical data and predictions from API response
      const histDates = data.historical_dates;
      const histPrices = data.historical_prices;
      
      // Get the last historical date for reference
      const lastHistDate = new Date(histDates[histDates.length - 1]);
      setCurrentDate(lastHistDate);

      // Create consistent chart data for historical part
      const historicalDataPoints = histDates.map((date, idx) => ({
        date: date,
        value: histPrices[idx],
        type: 'historical'
      }));

      // Create data points for predictions with proper spacing
      // The backend returns fixed prediction periods regardless of timeframe
      const predictionDataPoints = [];
      
      // These prediction periods are hardcoded in the backend
      const predictionPeriods = {
        next_day: 1,
        one_week: 7,
        one_month: 30,
        three_months: 90
      };
      
      // Add prediction data points with their proper dates
      Object.entries(data.predictions).forEach(([period, value]) => {
        if (value !== null) {
          const daysToAdd = predictionPeriods[period];
          const predictionDate = new Date(lastHistDate);
          predictionDate.setDate(predictionDate.getDate() + daysToAdd);
          
          predictionDataPoints.push({
            date: predictionDate.toISOString().split('T')[0],
            value: value,
            type: 'prediction',
            periodLabel: period.replace('_', ' ')
          });
        }
      });
      
      // Filter chart data based on selected timeframe for better visualization
      const timeframeMultiplier = getTimeframeMultiplier(selectedTimeFrame);
      const filteredHistorical = timeframeMultiplier 
        ? historicalDataPoints.slice(-timeframeMultiplier) 
        : historicalDataPoints;
      
      // Merge historical and prediction data
      const allDataPoints = [...filteredHistorical, ...predictionDataPoints];
      
      // Add a visualization trigger to show we're transitioning from historical to predicted
      // by including the last historical point as the first prediction point
      const transitionPoint = {
        date: histDates[histDates.length - 1],
        value: histPrices[histDates.length - 1],
        type: 'prediction',
        isTransition: true
      };
      
      // Format for recharts
      // Sort to ensure chronological order
      const formattedData = [
        ...allDataPoints.filter(dp => dp.type === 'historical'), 
        transitionPoint,
        ...allDataPoints.filter(dp => dp.type === 'prediction' && !dp.isTransition)
      ].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      setChartData(formattedData);
      setExtraInfo(data.extra_info);
    } catch (error) {
      console.error("API call error:", error);
    }
    setLoading(false);
  };

  // Helper function to filter historical data based on timeframe
  const getTimeframeMultiplier = (timeframe) => {
    switch(timeframe) {
      case '3d': return 3;
      case '1w': return 7;
      case '1mo': return 30;
      case '3mo': return 90;
      case '6mo': return 180;
      default: return null; // Show all data
    }
  };

  // Custom tooltip to show prediction period labels
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <p className="font-semibold">{data.date}</p>
          <p className="text-sm">
            {data.type === 'prediction' && data.periodLabel 
              ? `${data.periodLabel} prediction: $${data.value.toFixed(2)}` 
              : `Price: $${data.value.toFixed(2)}`
            }
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
          <h2 className="text-xl font-bold mb-1">{extraInfo.ticker} Stock Information</h2>
          <p>Current Price: ${extraInfo.current_price.toFixed(2)}</p>
          <p>Percent Change: {extraInfo.percent_change.toFixed(2)}%</p>
        </div>
      )}

      {/* Chart Section */}
      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4 h-[400px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                stroke="#6B7280" 
                tickFormatter={formatXAxis}
                minTickGap={30} // Prevent overcrowding of labels
              />
              <YAxis 
                stroke="#6B7280"
                domain={['auto', 'auto']} // Auto-scale to data
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Historical Price Line */}
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#3B82F6" 
                strokeWidth={2} 
                dot={false}
                activeDot={{ r: 6 }}
                name="Stock Price" 
                data={chartData.filter(item => item.type === 'historical')}
              />
              
              {/* Predicted Price Line */}
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#22c55e" 
                strokeWidth={2} 
                dot={true}
                strokeDasharray="5 5" 
                name="Predicted Price" 
                data={chartData.filter(item => item.type === 'prediction')}
              />
              
              {/* Add a reference line at the current date to visually separate historical/prediction */}
              {currentDate && (
                <ReferenceLine 
                  x={currentDate.toISOString().split('T')[0]} 
                  stroke="#ff6b6b" 
                  strokeWidth={2}
                  strokeDasharray="3 3"
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