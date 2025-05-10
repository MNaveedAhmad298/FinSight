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
    <div className="flex-1 p-8 overflow-auto">
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          {
            title: "Portfolio Value",
            value: `$${portfolioData.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: `${portfolioData.totalValueChange >= 0 ? '+' : ''}${portfolioData.totalValueChange.toFixed(2)}%`,
            period: "vs last week",
            icon: <LineChart className="w-6 h-6 text-blue-500" />,
            isPositive: portfolioData.totalValueChange >= 0
          },
          {
            title: "Today's Profit/Loss",
            value: `${portfolioData.dailyProfit >= 0 ? '+' : ''}$${portfolioData.dailyProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            change: `${portfolioData.dailyProfitChange >= 0 ? '+' : ''}${portfolioData.dailyProfitChange.toFixed(2)}%`,
            period: "today",
            icon: <Wallet className="w-6 h-6 text-green-500" />,
            isPositive: portfolioData.dailyProfit >= 0
          },
          {
            title: "Total Investment",
            value: "$89,240.85",
            change: "+4.3%",
            period: "vs last month",
            icon: <BarChart3 className="w-6 h-6 text-blue-500" />,
            isPositive: true
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
              <span className="text-sm text-gray-400">Updated just now</span>
            </div>
            <h3 className="text-lg font-medium mb-1">{stat.title}</h3>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-bold ${stat.isPositive ? '' : 'text-red-500'}`}>{stat.value}</span>
              <span className={stat.isPositive ? 'text-green-500 text-sm' : 'text-red-500 text-sm'}>{stat.change}</span>
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
              {/* <div className="mb-6 flex justify-end">
                <div className="flex items-center gap-4">
                  <span className="text-gray-400">Select Stock:</span>
                  <select
                    value={selectedSymbol}
                    onChange={(e) => setSelectedSymbol(e.target.value)}
                    className="stock-selector"
                  >
                    {stocks.map(stock => (
                      <option key={stock.symbol} value={stock.symbol}>
                        {stock.symbol} - {stock.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div> */}
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
            {["1d", "5d", "1mo", "3mo"].map((range) => (
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
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                >
                  <div>
                    <div className="font-medium">{stock.symbol}</div>
                    <div className="text-sm text-gray-400">{stock.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${stock.price.toFixed(2)}</div>
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
        <h2 className="text-xl font-bold mb-4 text-gray-100">Watchlist</h2>
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
                  className="border-b border-white/5 hover:bg-white/5 transition-colors"
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
                  <td className="py-4 text-right">${stock.price.toFixed(2)}</td>
                  <td
                    className={`py-4 text-right ${
                      stock.change >= 0 ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {stock.change >= 0 ? "+" : ""}
                    {Math.abs(stock.change).toFixed(2)}%
                  </td>
                  <td className="py-4 text-right text-gray-400">
                    {stock.volume}
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
