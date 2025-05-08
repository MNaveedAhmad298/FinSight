import React, { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  BarChart3,
  Wallet,
  Bell,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import "../app.css";
import { io } from "socket.io-client";

const symbolToDomain = {
  AAPL:  "apple.com",
  MSFT:  "microsoft.com",
  NVDA:  "nvidia.com",
  AMZN:  "amazon.com",
  AVGO:  "broadcom.com",
  META:  "meta.com",
  NFLX:  "netflix.com",
  COST:  "costco.com",
  TSLA:  "tesla.com",
  GOOGL: "google.com",
  GOOG:  "google.com",
  TMUS:  "t-mobile.com",
  PLTR:  "palantir.com",
  CSCO:  "cisco.com",
  LIN:   "linde.com",
  ISRG:  "intuitivesurgical.com",
  PEP:   "pepsico.com",
  INTU:  "intuit.com",
  BKNG:  "bookingholdings.com",
  ADBE:  "adobe.com",
  AMD:   "amd.com",
  AMGN:  "amgen.com",
  QCOM:  "qualcomm.com",
  TXN:   "ti.com",
  HON:   "honeywell.com",
  GILD:  "gilead.com",
  VRTX:  "vrtx.com",
  CMCSA: "comcast.com",
  PANW:  "paloaltonetworks.com",
  ADP:   "adp.com",
  AMAT:  "appliedmaterials.com",
  MELI:  "mercadolibre.com",
  CRWD:  "crowdstrike.com",
  ADI:   "analog.com",
  SBUX:  "starbucks.com",
  LRCX:  "lamresearch.com",
  MSTR:  "microstrategy.com",
  KLAC:  "kla.com",
  MDLZ:  "mondelezinternational.com",
  MU:    "micron.com",
  INTC:  "intel.com",
  APP:   "applovin.com",
  CTAS:  "cintas.com",
  CDNS:  "cadence.com",
  ORLY:  "oreillyauto.com",
  FTNT:  "fortinet.com",
  DASH:  "doordash.com",
  CEG:   "constellation.com",
  SNPS:  "synopsys.com",
  PDD:   "pinduoduo.com"
};

function Dashboard() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [chartPeriod, setChartPeriod] = useState("1W");
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [chartDataCache, setChartDataCache] = useState({});
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  // Function to update stock price and calculate change
  const updateStock = (symbol, price) => {
    setStocks(prev => {
      // Find the stock we need to update
      const stockIndex = prev.findIndex(stock => stock.symbol === symbol);
      
      // If we don't have this stock, ignore the update
      if (stockIndex === -1) return prev;
      
      // Make a copy of the stocks array
      const newStocks = [...prev];
      const stock = newStocks[stockIndex];
      
      // Calculate the percentage change
      const oldPrice = stock.price;
      const changePct = ((price - oldPrice) / oldPrice) * 100;
      
      // Update the stock
      newStocks[stockIndex] = {
        ...stock,
        price: price,
        change: changePct,
        // Add a visual indicator for recent updates
        recentlyUpdated: true
      };
      
      // Clear the 'recentlyUpdated' flag after a short delay
      setTimeout(() => {
        setStocks(current => 
          current.map(s => 
            s.symbol === symbol ? { ...s, recentlyUpdated: false } : s
          )
        );
      }, 2000);
      
      return newStocks;
    });
  };

  // Fetch initial stock data from API
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/stocks");
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();

        // Transform API data to match our structure
        const transformedData = data.map((stock) => ({
          symbol: stock.symbol,
          name: stock.name || stock.symbol,
          price: stock.price || 0,
          change: stock.change || 0,
          volume: new Intl.NumberFormat("en-US", {
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(stock.volume || 0),
          logo: symbolToDomain[stock.symbol]
            ? `https://logo.clearbit.com/${
                symbolToDomain[stock.symbol]
              }?size=48`
            : null,
        }));

        setStocks(transformedData);
        
        // If we don't have an already selected symbol but we got stocks,
        // select the first one by default
        if (transformedData.length > 0 && !selectedSymbol) {
          setSelectedSymbol(transformedData[0].symbol);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching stock data:", error);
        
        // If API fails, use empty array but mark as loaded
        setStocks([]);
        setLoading(false);
      }
    };
    
    fetchStocks();
  }, []);

  // Set up WebSocket connection for live updates
  useEffect(() => {
    // Only set up socket if we have loaded initial stocks
    if (loading) return;
    
    // Create socket connection
    const newSocket = io("http://localhost:5000", {
      transports: ["websocket"]  // force WebSocket transport
    });
    
    // Socket event handlers
    newSocket.on("connect", () => {
      console.log("Socket.IO connected!");
      setConnected(true);
    });
    
    newSocket.on("stock_update", (data) => {
      console.log("Received stock update:", data);
      updateStock(data.symbol, data.price);
    });
    
    newSocket.on("disconnect", () => {
      console.log("Socket.IO disconnected.");
      setConnected(false);
    });
    
    newSocket.on("error", (error) => {
      console.error("Socket.IO error:", error);
    });
    
    // Store socket in state
    setSocket(newSocket);
    
    // Clean up on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [loading]); // Only run when loading state changes

  // Fetch chart data when selected symbol or period changes
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        // Show loading state
        setLoading(true);
        
        // Check if we already have this data cached client-side
        const cacheKey = `${selectedSymbol}-${chartPeriod}`;
        if (chartDataCache[cacheKey]) {
          // Use cached data if available
          setChartData(chartDataCache[cacheKey]);
          setLoading(false);
          return;
        }
        
        // Fetch from API if not cached
        const response = await fetch(
          `http://localhost:5000/api/history/${selectedSymbol}/${chartPeriod}`
        );
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const { data } = await response.json();
        
        // Format the data
        const formattedData = data.map((entry) => ({
          time: new Date(entry.time).toLocaleString(),
          value: entry.value,
        }));
        
        // Update the state
        setChartData(formattedData);
        
        // Cache the result client-side
        setChartDataCache(prev => ({
          ...prev,
          [cacheKey]: formattedData
        }));
        
      } catch (error) {
        console.error("Error fetching history:", error);
        // For demo purposes, create some mock data if API fails
        const mockData = Array.from({ length: 24 }, (_, i) => ({
          time: new Date(Date.now() - i * 3600000).toLocaleString(),
          value: 150 + Math.random() * 10
        })).reverse();
        
        setChartData(mockData);
      } finally {
        setLoading(false);
      }
    };
  
    if (selectedSymbol) {
      fetchHistory();
    }
  }, [selectedSymbol, chartPeriod]);

  if (loading) {
    return (
      <div className="flex-1 p-8 overflow-auto flex items-center justify-center">
        <div className="text-blue-400 animate-pulse">
          Loading market data...
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 overflow-auto">
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          {
            title: "Portfolio Value",
            value: "$125,566.77",
            change: "+2.5%",
            period: "vs last week",
            icon: <LineChart className="w-6 h-6 text-blue-500" />,
          },
          {
            title: "Today's Profit",
            value: "+$3,204.75",
            change: "+1.8%",
            period: "today",
            icon: <Wallet className="w-6 h-6 text-green-500" />,
          },
          {
            title: "Total Investment",
            value: "$89,240.85",
            change: "+4.3%",
            period: "vs last month",
            icon: <BarChart3 className="w-6 h-6 text-blue-500" />,
          },
        ].map((stat, index) => (
          <div
            key={index}
            className="
              rounded-xl p-6
              bg-white/5 backdrop-blur-md border border-white/10
              transition-transform hover:-translate-y-1
            "
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-white/5 rounded-lg">{stat.icon}</div>
              <span className="text-sm text-gray-400">
                {connected ? (
                  <span className="flex items-center">
                    <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span> 
                    Live
                  </span>
                ) : (
                  "Updated just now"
                )}
              </span>
            </div>
            <h3 className="text-lg font-medium mb-1">{stat.title}</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">{stat.value}</span>
              <span className="text-green-500 text-sm">{stat.change}</span>
            </div>
            <span className="text-sm text-gray-400">{stat.period}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Market Activity Chart - Updated with better stock selector */}
        <div className="rounded-xl p-6 col-span-2 bg-white/5 backdrop-blur-md border border-white/10">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold">Market Activity</h2>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="stock-selector"
                style={{
                  WebkitAppearance: "none",
                  MozAppearance: "none",
                  appearance: "none",
                  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "right 0.5rem center",
                  backgroundSize: "1em",
                  paddingRight: "2.5rem",
                }}
              >
                {stocks.map((stock) => (
                  <option
                    key={stock.symbol}
                    value={stock.symbol}
                    className="bg-gray-800"
                  >
                    {stock.symbol} - {stock.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex space-x-2 mb-6">
            {["1d", "5d", "1mo", "3mo", "6mo", "1y"].map((range) => (
              <button
                key={range}
                onClick={() => setChartPeriod(range)}
                className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors"
              >
                {range}
              </button>
            ))}
          </div>
          <div className="h-[300px]">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-blue-400 animate-pulse">Loading chart data...</div>
            </div>
          ):(
            <ResponsiveContainer>
              <AreaChart data={chartData}>
                <XAxis dataKey="time" tick={{ fill: "#6B7280" }} />
                <YAxis domain={["auto", "auto"]} tick={{ fill: "#6B7280" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(17,24,39,0.9)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                />
                <Area
                  dataKey="value"
                  stroke="#3B82F6"
                  fill="rgba(59, 130, 246, 0.1)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          </div>
        </div>

        {/* Top Movers - Updated with real data */}
        <div
          className="
            rounded-xl p-6
            bg-white/5 backdrop-blur-md border border-white/10
          "
        >
          <h2 className="text-xl font-bold mb-4">Top Movers</h2>
          <div className="space-y-4">
            {[...stocks]
              .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
              .slice(0, 3)
              .map((stock) => (
                <div
                  key={stock.symbol}
                  className={`
                    flex items-center justify-between p-3 bg-white/5 rounded-lg
                    ${stock.recentlyUpdated ? 'animate-pulse bg-blue-900/30' : ''}
                  `}
                >
                  <div>
                    <div className="font-medium">{stock.symbol}</div>
                    <div className="text-sm text-gray-400">{stock.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${stock.price?.toFixed(2) || "0.00"}</div>
                    <div
                      className={`
                        text-sm flex items-center gap-1
                        ${stock.change >= 0 ? "text-green-500" : "text-red-500"}
                      `}
                    >
                      {stock.change >= 0 ? (
                        <ArrowUp className="w-4 h-4" />
                      ) : (
                        <ArrowDown className="w-4 h-4" />
                      )}
                      {Math.abs(stock.change).toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Watchlist Table - Updated with real data */}
      <div className="rounded-xl p-6 mt-6 bg-white/5 backdrop-blur-md border border-white/10">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-100">Watchlist</h2>
          {connected && (
            <div className="flex items-center text-sm text-green-400">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
              Live Market Data
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 border-b border-white/10">
                <th className="pb-4 text-left">Symbol</th>
                <th className="pb-4 text-left">Name</th>
                <th className="pb-4 text-right">Price</th>
                <th className="pb-4 text-right">24h Change</th>
                <th className="pb-4 text-right">Volume</th>
                <th className="pb-4 text-right">Trade</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock) => (
                <tr
                  key={stock.symbol}
                  className={`
                    border-b border-white/5 hover:bg-white/5 transition-colors
                    ${stock.recentlyUpdated ? 'bg-blue-900/20' : ''}
                  `}
                >
                  <td className="py-4 font-medium flex items-center">
                    {stock.logo ? (
                      <img
                        src={stock.logo}
                        alt={stock.symbol}
                        className="table-icon"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="table-icon bg-blue-500/10 flex items-center justify-center">
                        <LineChart className="w-4 h-4 text-blue-400" />
                      </div>
                    )}
                    {stock.symbol}
                  </td>
                  <td className="py-4 text-gray-400">{stock.name}</td>
                  <td className={`py-4 text-right ${stock.recentlyUpdated ? 'text-white font-bold' : ''}`}>
                    ${stock.price?.toFixed(2) || "0.00"}
                  </td>
                  <td
                    className={`py-4 text-right ${
                      stock.change >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {stock.change >= 0 ? "+" : ""}
                    {Math.abs(stock.change || 0).toFixed(2)}%
                  </td>
                  <td className="py-4 text-right text-gray-400">
                    {stock.volume || "0"}
                  </td>
                  <td className="py-4 text-right">
                    <Link
                      to={`/trade/${stock.symbol}?currentValue=${stock.price}&changeValue=${stock.change}&currentPercent=${stock.change}`}
                      className="px-4 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                    >
                      Trade
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;