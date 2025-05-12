import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, DollarSign } from 'lucide-react';

const symbolToDomain = {
  AAPL: 'apple.com',
  MSFT: 'microsoft.com',
  GOOGL: 'google.com',
  AMZN: 'amazon.com',
  META: 'meta.com',
  NVDA: 'nvidia.com',
  TSLA: 'tesla.com',
  JPM: 'jpmorganchase.com',
  V: 'visa.com',
  WMT: 'walmart.com',
  UNH: 'unitedhealthgroup.com',
  JNJ: 'jnj.com',
  MA: 'mastercard.com',
  PG: 'pg.com',
  HD: 'homedepot.com',
  BAC: 'bankofamerica.com',
  KO: 'coca-cola.com',
  PFE: 'pfizer.com',
  CSCO: 'cisco.com'
};

function Portfolio() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [portfolioData, setPortfolioData] = useState({
    totalValue: 0,
    dailyProfit: 0,
    overallReturn: 0,
    availableBalance: 0,
    holdings: []
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return null;
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        setLoading(true);
        const headers = getAuthHeaders();
        if (!headers) return;

        const response = await fetch('http://localhost:5000/portfolio', {
          headers
        });
        
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch portfolio data');
        }

        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }

        setPortfolioData({
          totalValue: data.totalValue,
          dailyProfit: data.dailyProfit,
          overallReturn: data.overallReturn,
          availableBalance: data.availableBalance,
          holdings: data.holdings.map(h => ({
            symbol: h.stock_symbol,
            name: h.stock_name,
            shares: h.quantity,
            currentPrice: h.current_price,
            dailyPnL: (h.current_price - h.previous_close) * h.quantity,
            change: ((h.current_price - h.previous_close) / h.previous_close * 100),
            totalValue: h.total_value
          }))
        });
      } catch (err) {
        console.error('Error fetching portfolio:', err);
        setError(err.message || 'Failed to load portfolio data');
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 60000);
    return () => clearInterval(interval);
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex-1 p-8 overflow-auto flex items-center justify-center">
        <div className="text-blue-400 animate-pulse">
          Loading portfolio data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-8 overflow-auto flex items-center justify-center">
        <div className="text-red-400">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Portfolio</h1>
      <p className="text-sm sm:text-base text-gray-400 mb-4 sm:mb-6 lg:mb-8">Your trading portfolio at a glance</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="rounded-xl p-4 sm:p-6 bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
          <div className="mb-3">
            <div className="p-3 rounded-lg bg-blue-500/10 inline-block mb-2">
              <Wallet className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />
            </div>
            <p className="text-sm sm:text-base text-gray-400">Total Portfolio Value</p>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
            ${portfolioData.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="rounded-xl p-4 sm:p-6 bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]">
          <div className="mb-3">
            <div className="p-3 rounded-lg bg-blue-500/10 inline-block mb-2">
              <TrendingUp className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />
            </div>
            <p className="text-sm sm:text-base text-gray-400">Today's Profit/Loss</p>
          </div>
          <p className={`text-xl sm:text-2xl lg:text-3xl font-bold ${portfolioData.dailyProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {portfolioData.dailyProfit >= 0 ? '+' : ''}{`$${Math.abs(portfolioData.dailyProfit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} `}
            <span className="text-base sm:text-lg lg:text-xl">
              ({((portfolioData.dailyProfit / (portfolioData.totalValue - portfolioData.dailyProfit)) * 100).toFixed(2)}%)
            </span>
          </p>
        </div>

        <div className="rounded-xl p-4 sm:p-6 bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.15)] sm:col-span-2 lg:col-span-1">
          <div className="mb-3">
            <div className="p-3 rounded-lg bg-blue-500/10 inline-block mb-2">
              <DollarSign className="w-6 h-6 sm:w-7 sm:h-7 text-blue-500" />
            </div>
            <p className="text-sm sm:text-base text-gray-400">Available Balance</p>
          </div>
          <p className="text-xl sm:text-2xl lg:text-3xl font-bold">
            ${portfolioData.availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {portfolioData.holdings.length > 0 ? (
        <div className="rounded-xl overflow-hidden bg-white/5 backdrop-blur-md border border-white/10">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-300">Symbol</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-300">Name</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-gray-300">Shares</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-gray-300">Current Price</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-gray-300">Daily PnL</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-gray-300">Change</th>
                  <th className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm font-semibold text-gray-300">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {portfolioData.holdings.map((holding) => (
                  <tr key={holding.symbol} className="hover:bg-white/5">
                    <td className="px-4 sm:px-6 py-3 sm:py-4">
                      <div className="flex items-center gap-2">
                        <img
                          src={`https://logo.clearbit.com/${symbolToDomain[holding.symbol]}`}
                          alt={holding.symbol}
                          className="w-5 h-5 sm:w-6 sm:h-6 rounded"
                          onError={(e) => {
                            e.target.src = 'https://via.placeholder.com/24?text=' + holding.symbol;
                          }}
                        />
                        <span className="text-xs sm:text-sm">{holding.symbol}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-gray-300 text-xs sm:text-sm">{holding.name}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm">{holding.shares}</td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm">${holding.currentPrice.toFixed(2)}</td>
                    <td className={`px-4 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm ${holding.dailyPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {holding.dailyPnL >= 0 ? '+' : ''}{`$${Math.abs(holding.dailyPnL).toFixed(2)}`}
                    </td>
                    <td className={`px-4 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm ${holding.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {holding.change >= 0 ? '+' : ''}{holding.change.toFixed(2)}%
                    </td>
                    <td className="px-4 sm:px-6 py-3 sm:py-4 text-right text-xs sm:text-sm">${holding.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-6 sm:py-8 text-gray-400">
          <p className="text-sm sm:text-base">No holdings in your portfolio yet.</p>
          <p className="mt-2 text-sm sm:text-base">Start trading to build your portfolio!</p>
        </div>
      )}
    </div>
  );
}

export default Portfolio;
