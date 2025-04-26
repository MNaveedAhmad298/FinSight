import React from 'react';

const symbolToDomain = {
  AAPL: 'apple.com',
  MSFT: 'microsoft.com',
  GOOGL: 'google.com',
  AMZN: 'amazon.com',
};

function Portfolio() {
  // Example portfolio stats
  const portfolioStats = {
    totalValue: 125430.5,
    dailyProfit: 1250.0,
    overallReturn: 8.5,
  };

  // Example holdings
  const holdings = [
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      shares: 50,
      avgPrice: 150.0,
      currentPrice: 175.84,
      change: 1.72,
      totalValue: 8792,
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      shares: 10,
      avgPrice: 2400,
      currentPrice: 2800,
      change: 2.5,
      totalValue: 28000,
    },
    {
      symbol: 'AMZN',
      name: 'Amazon.com Inc.',
      shares: 5,
      avgPrice: 3300,
      currentPrice: 3400,
      change: -1.2,
      totalValue: 17000,
    },
  ];

  return (
    <div className="p-8">
      {/* Title and Subtitle */}
      <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
      <p className="text-gray-400 mb-8">Your trading portfolio at a glance</p>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {/* Total Portfolio Value */}
        <div className="
          rounded-xl p-6
          bg-white/5 backdrop-blur-md border border-white/10
          shadow-[0_0_15px_rgba(59,130,246,0.15)]
        ">
          <p className="text-base text-gray-400 mb-2">Total Portfolio Value</p>
          <p className="text-3xl font-bold">
            ${portfolioStats.totalValue.toLocaleString()}
          </p>
        </div>

        {/* Today's Profit/Loss */}
        <div className="
          rounded-xl p-6
          bg-white/5 backdrop-blur-md border border-white/10
          shadow-[0_0_15px_rgba(59,130,246,0.15)]
        ">
          <p className="text-base text-gray-400 mb-2">Today's Profit/Loss</p>
          <p
            className={`text-3xl font-bold ${
              portfolioStats.dailyProfit >= 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {portfolioStats.dailyProfit >= 0
              ? `+$${portfolioStats.dailyProfit.toLocaleString()}`
              : `-$${Math.abs(portfolioStats.dailyProfit).toLocaleString()}`}
          </p>
        </div>

        {/* Overall Return */}
        <div className="
          rounded-xl p-6
          bg-white/5 backdrop-blur-md border border-white/10
          shadow-[0_0_15px_rgba(59,130,246,0.15)]
        ">
          <p className="text-base text-gray-400 mb-2">Overall Return</p>
          <p
            className={`text-3xl font-bold ${
              portfolioStats.overallReturn >= 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {portfolioStats.overallReturn >= 0
              ? `+${portfolioStats.overallReturn}%`
              : `${portfolioStats.overallReturn}%`}
          </p>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="rounded-xl p-6 bg-white/5 backdrop-blur-md border border-white/10">
        <h2 className="text-xl font-bold mb-4">Holdings</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 border-b border-white/10">
                <th className="pb-4 text-left">Asset</th>
                <th className="pb-4 text-left">Shares</th>
                <th className="pb-4 text-right">Avg Price</th>
                <th className="pb-4 text-right">Current Price</th>
                <th className="pb-4 text-right">Change</th>
                <th className="pb-4 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((holding, idx) => {
                const domain = symbolToDomain[holding.symbol] || '';
                const logoUrl = domain
                  ? `https://logo.clearbit.com/${domain}?size=64`
                  : null;

                return (
                  <tr key={idx} className="border-b border-white/5">
                    <td className="py-4 font-medium">
                      <div className="flex items-center gap-2">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={holding.symbol}
                            className="w-6 h-6 rounded-full"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-gray-500 flex items-center justify-center text-xs">
                            {holding.symbol.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <div>{holding.symbol}</div>
                          <div className="text-sm text-gray-400">{holding.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 text-left">{holding.shares}</td>
                    <td className="py-4 text-right">${holding.avgPrice.toFixed(2)}</td>
                    <td className="py-4 text-right">${holding.currentPrice.toFixed(2)}</td>
                    <td
                      className={`py-4 text-right ${
                        holding.change >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {holding.change >= 0 ? `+${holding.change}%` : `${holding.change}%`}
                    </td>
                    <td className="py-4 text-right">
                      ${holding.totalValue.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Portfolio;
