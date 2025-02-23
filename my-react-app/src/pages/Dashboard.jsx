import React from 'react';
import { Link } from 'react-router-dom';
import { LineChart, BarChart3, Wallet, Bell, ArrowUp, ArrowDown } from 'lucide-react';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockChartData = [
  { name: '9:30', value: 34500 },
  { name: '10:30', value: 35200 },
  { name: '11:30', value: 34900 },
  { name: '12:30', value: 35800 },
  { name: '13:30', value: 35400 },
  { name: '14:30', value: 36200 },
  { name: '15:30', value: 36800 },
];

const mockStocks = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 178.44, change: 2.5, volume: '45.2M' },
  { symbol: 'MSFT', name: 'Microsoft', price: 415.32, change: -0.8, volume: '22.1M' },
  { symbol: 'GOOGL', name: 'Alphabet', price: 141.18, change: 1.2, volume: '18.7M' },
  { symbol: 'AMZN', name: 'Amazon', price: 174.42, change: -1.5, volume: '31.4M' },
];

function Dashboard() {
  return (
    <div className="flex-1 p-8 overflow-auto">
      {/* Top Bar */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Market Overview</h1>
        <div className="relative">
          <Bell className="w-6 h-6 text-gray-400" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          {
            title: 'Portfolio Value',
            value: '$125,566.77',
            change: '+2.5%',
            period: 'vs last week',
            icon: <LineChart className="w-6 h-6 text-blue-500" />
          },
          {
            title: "Today's Profit",
            value: '+$3,204.75',
            change: '+1.8%',
            period: 'today',
            icon: <Wallet className="w-6 h-6 text-green-500" />
          },
          {
            title: 'Total Investment',
            value: '$89,240.85',
            change: '+4.3%',
            period: 'vs last month',
            icon: <BarChart3 className="w-6 h-6 text-blue-500" />
          }
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
              <div className="p-2 bg-white/5 rounded-lg">
                {stat.icon}
              </div>
              <span className="text-sm text-gray-400">Updated just now</span>
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
        {/* Market Activity Chart */}
        <div
          className="
            rounded-xl p-6 col-span-2
            bg-white/5 backdrop-blur-md border border-white/10
          "
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Market Activity</h2>
            <div className="flex gap-4">
              <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">1D</button>
              <button className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400">1W</button>
              <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">1M</button>
              <button className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">1Y</button>
            </div>
          </div>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17,24,39,0.9)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '0.5rem'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3B82F6"
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Movers */}
        <div
          className="
            rounded-xl p-6
            bg-white/5 backdrop-blur-md border border-white/10
          "
        >
          <h2 className="text-xl font-bold mb-4">Top Movers</h2>
          <div className="space-y-4">
            {mockStocks.slice(0, 3).map((stock) => (
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
                      ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}
                    `}
                  >
                    {stock.change >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    {Math.abs(stock.change)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Watchlist Table */}
      <div
        className="
          rounded-xl p-6 mt-6
          bg-white/5 backdrop-blur-md border border-white/10
        "
      >
        <h2 className="text-xl font-bold mb-4">Watchlist</h2>
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
              {mockStocks.map((stock) => (
                <tr key={stock.symbol} className="border-b border-white/5">
                  <td className="py-4 font-medium">{stock.symbol}</td>
                  <td className="py-4 text-gray-400">{stock.name}</td>
                  <td className="py-4 text-right">${stock.price.toFixed(2)}</td>
                  <td
                    className={`
                      py-4 text-right flex items-center justify-end gap-1
                      ${stock.change >= 0 ? 'text-green-500' : 'text-red-500'}
                    `}
                  >
                    {stock.change >= 0 ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                    {Math.abs(stock.change)}%
                  </td>
                  <td className="py-4 text-right text-gray-400">{stock.volume}</td>
                  <td className="py-4 text-right">
                    {/* Link to Trade Page */}
                    <Link
                      to={`/trade/${stock.symbol}`}
                      className="
                        px-4 py-1 rounded-lg
                        bg-blue-500/20 text-blue-400
                        hover:bg-blue-500/30 transition-colors
                      "
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
