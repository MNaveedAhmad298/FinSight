import React, { useEffect, useState } from "react";
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

const symbolToDomain = {
  AAPL: "apple.com",
  MSFT: "microsoft.com",
  GOOGL: "google.com",
  AMZN: "amazon.com",
  META: "meta.com",
  NVDA: "nvidia.com",
  TSLA: "tesla.com",
  JPM: "jpmorganchase.com",
  V: "visa.com",
  WMT: "walmart.com",
  UNH: "unitedhealthgroup.com",
  JNJ: "jnj.com",
  MA: "mastercard.com",
  PG: "pg.com",
  HD: "homedepot.com",
  BAC: "bankofamerica.com",
  KO: "coca-cola.com",
  DIS: "disney.com",
  PFE: "pfizer.com",
  CSCO: "cisco.com",
};

function Dashboard() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [chartPeriod, setChartPeriod] = useState("1W");
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [portfolioData, setPortfolioData] = useState({
    totalValue: 0,
    dailyProfit: 0,
    totalValueChange: 0,
    dailyProfitChange: 0
  });

  // Get auth headers for API calls
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // Fetch portfolio data
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const headers = getAuthHeaders();
        const response = await fetch('http://localhost:5000/portfolio', {
          headers
        });
        
        if (response.ok) {
          const data = await response.json();
          setPortfolioData({
            totalValue: data.totalValue,
            dailyProfit: data.dailyProfit,
            totalValueChange: data.overallReturn,
            dailyProfitChange: (data.dailyProfit / (data.totalValue - data.dailyProfit)) * 100
          });
        }
      } catch (error) {
        console.error('Error fetching portfolio:', error);
      }
    };

    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await fetch(
          `http://localhost:5000/api/history/${selectedSymbol}/${chartPeriod}`
        );
        const { data } = await response.json();
        setChartData(
          data.map((entry) => ({
            time: new Date(entry.time).toLocaleString(),
            value: entry.value,
          }))
        );
      } catch (error) {
        console.error("Error fetching history:", error);
      }
    };

    fetchHistory();
  }, [selectedSymbol, chartPeriod]);

  // Fetch data from Flask API
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/stocks");
        const data = await response.json();

        // Transform API data to match mock data structure
        const transformedData = data.map((stock) => ({
          symbol: stock.symbol,
          name: stock.name,
          price: stock.close,
          change: stock.change,
          volume: new Intl.NumberFormat("en-US", {
            notation: "compact",
            maximumFractionDigits: 1,
          }).format(stock.volume),
          logo: symbolToDomain[stock.symbol]
            ? `https://logo.clearbit.com/${
                symbolToDomain[stock.symbol]
              }?size=48`
            : null,
        }));

        setStocks(transformedData);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching stock data:", error);
        setLoading(false);
      }
    };

    fetchStocks();
    const interval = setInterval(fetchStocks, 60000);
    return () => clearInterval(interval);
  }, []);

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
    <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-auto">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {[
          {
            title: "Portfolio Value",
            value: `$${portfolioData.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: `${portfolioData.totalValueChange >= 0 ? '+' : ''}${portfolioData.totalValueChange.toFixed(2)}%`,
            period: "vs last week",
            icon: <LineChart className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />,
          },
          {
            title: "Today's Profit/Loss",
            value: `${portfolioData.dailyProfit >= 0 ? '+' : ''}$${portfolioData.dailyProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: `${portfolioData.dailyProfitChange >= 0 ? '+' : ''}${portfolioData.dailyProfitChange.toFixed(2)}%`,
            period: "today",
            icon: <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />,
          },
          {
            title: "Total Investment",
            value: "$89,240.85",
            change: "+4.3%",
            period: "vs last month",
            icon: <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />,
          },
        ].map((stat, index) => (
          <div
            key={index}
            className="rounded-xl p-4 sm:p-6 bg-white/5 backdrop-blur-md border border-white/10 transition-transform hover:-translate-y-1"
          >
            <div className="flex justify-between items-start mb-3 sm:mb-4">
              <div className="p-2 bg-white/5 rounded-lg">{stat.icon}</div>
              <span className="text-xs sm:text-sm text-gray-400">Updated just now</span>
            </div>
            <h3 className="text-base sm:text-lg font-medium mb-1">{stat.title}</h3>
            <div className="flex items-baseline gap-2">
              <span className={`text-xl sm:text-2xl font-bold ${stat.isPositive ? '' : 'text-red-500'}`}>{stat.value}</span>
              <span className={stat.isPositive ? 'text-green-500 text-xs sm:text-sm' : 'text-red-500 text-xs sm:text-sm'}>{stat.change}</span>
            </div>
            <span className="text-xs sm:text-sm text-gray-400">{stat.period}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Market Activity Chart */}
        <div className="lg:col-span-2 rounded-xl p-4 sm:p-6 bg-white/5 backdrop-blur-md border border-white/10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4 sm:gap-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <h2 className="text-lg sm:text-xl font-bold">Market Activity</h2>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="stock-selector w-full sm:w-auto bg-white/5 rounded-lg px-3 py-1.5 sm:py-2 text-sm sm:text-base"
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
                  <option key={stock.symbol} value={stock.symbol} className="bg-gray-800">
                    {stock.symbol} - {stock.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mb-4 sm:mb-6">
            {["1d", "5d", "1mo", "3mo", "6mo", "1y"].map((range) => (
              <button
                key={range}
                onClick={() => setChartPeriod(range)}
                className="px-2.5 sm:px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs sm:text-sm transition-colors"
              >
                {range}
              </button>
            ))}
          </div>
          
          <div className="h-[250px] sm:h-[300px]">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-blue-400 animate-pulse text-sm sm:text-base">Loading chart data...</div>
              </div>
            ) : (
              <ResponsiveContainer>
                <AreaChart data={chartData}>
                  <XAxis dataKey="time" tick={{ fill: "#6B7280", fontSize: "12px" }} />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "#6B7280", fontSize: "12px" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(17,24,39,0.9)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "0.5rem",
                      fontSize: "12px"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3B82F6"
                    fill="rgba(59, 130, 246, 0.1)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Movers */}
        <div className="rounded-xl p-4 sm:p-6 bg-white/5 backdrop-blur-md border border-white/10">
          <h2 className="text-lg sm:text-xl font-bold mb-4">Top Movers</h2>
          <div className="space-y-3 sm:space-y-4">
            {[...stocks]
              .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
              .slice(0, 3)
              .map((stock) => (
                <div
                  key={stock.symbol}
                  className="flex items-center justify-between p-3 sm:p-4 bg-white/5 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm sm:text-base">{stock.symbol}</div>
                    <div className="text-xs sm:text-sm text-gray-400">{stock.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm sm:text-base">
                      ${stock.price?.toFixed(2) || "0.00"}
                    </div>
                    <div
                      className={`
                        text-xs sm:text-sm flex items-center gap-1
                        ${stock.change >= 0 ? "text-green-500" : "text-red-500"}
                      `}
                    >
                      {stock.change >= 0 ? (
                        <ArrowUp className="w-3 h-3 sm:w-4 sm:h-4" />
                      ) : (
                        <ArrowDown className="w-3 h-3 sm:w-4 sm:h-4" />
                      )}
                      {Math.abs(stock.change).toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Watchlist Table */}
      <div className="rounded-xl p-4 sm:p-6 mt-4 sm:mt-6 bg-white/5 backdrop-blur-md border border-white/10">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-gray-100">Watchlist</h2>
        <div className="overflow-x-auto -mx-4 sm:-mx-6">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full">
              <thead>
                <tr className="text-gray-400 border-b border-white/10">
                  <th className="text-left text-xs sm:text-sm font-semibold p-4 sm:p-6">Symbol</th>
                  <th className="text-left text-xs sm:text-sm font-semibold p-4 sm:p-6">Name</th>
                  <th className="text-right text-xs sm:text-sm font-semibold p-4 sm:p-6">Price</th>
                  <th className="text-right text-xs sm:text-sm font-semibold p-4 sm:p-6">24h Change</th>
                  <th className="text-right text-xs sm:text-sm font-semibold p-4 sm:p-6">Volume</th>
                  <th className="text-right text-xs sm:text-sm font-semibold p-4 sm:p-6">Trade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stocks.map((stock) => (
                  <tr
                    key={stock.symbol}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 sm:py-4 px-4 sm:px-6 font-medium text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        {stock.logo ? (
                          <img
                            src={stock.logo}
                            alt={stock.symbol}
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded"
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-500/10 rounded flex items-center justify-center">
                            <LineChart className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                          </div>
                        )}
                        {stock.symbol}
                      </div>
                    </td>
                    <td className="p-4 sm:p-6 text-gray-400 text-xs sm:text-sm">{stock.name}</td>
                    <td className="p-4 sm:p-6 text-right text-xs sm:text-sm">
                      ${stock.price?.toFixed(2) || "0.00"}
                    </td>
                    <td className={`p-4 sm:p-6 text-right text-xs sm:text-sm ${stock.change >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {stock.change >= 0 ? "+" : ""}
                      {Math.abs(stock.change || 0).toFixed(2)}%
                    </td>
                    <td className="p-4 sm:p-6 text-right text-gray-400 text-xs sm:text-sm">
                      {stock.volume || "0"}
                    </td>
                    <td className="p-4 sm:p-6 text-right">
                      <Link
                        to={`/trade/${stock.symbol}?currentValue=${stock.price}&changeValue=${stock.change}&currentPercent=${stock.change}`}
                        className="px-3 sm:px-4 py-1 sm:py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors text-xs sm:text-sm"
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
    </div>
  );
}

export default Dashboard;
