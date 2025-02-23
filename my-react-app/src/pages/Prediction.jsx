import React, { useState } from 'react';
import { Link } from 'react-router-dom';

function Prediction() {
  // Mapping from stock symbol to domain for fetching logos from Clearbit
  const symbolToDomain = {
    BTC: 'bitcoin.org',
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
  };

  // Sample data with some negative changes, including a 'priceChange' field
  const mockPredictions = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 39964,
      priceChange: -2.3,      // Negative
      prediction30d: 106671,
      change30d: -10.17,      // Negative
      prediction1m: 129803,
      change1m: 35.59,        // Positive
      prediction3m: 157671,
      change3m: -65.19,       // Negative
    },
    {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      price: 178.44,
      priceChange: 1.2,       // Positive
      prediction30d: 192.5,
      change30d: 7.88,
      prediction1m: 210.8,
      change1m: -18.16,       // Negative
      prediction3m: 235.2,
      change3m: 31.8,
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft',
      price: 415.32,
      priceChange: -0.5,      // Negative
      prediction30d: 450.0,
      change30d: -8.36,       // Negative
      prediction1m: 482.6,
      change1m: 16.19,
      prediction3m: 550.1,
      change3m: 32.48,
    },
    {
      symbol: 'GOOGL',
      name: 'Alphabet Inc.',
      price: 2800,
      priceChange: 2.1,       // Positive
      prediction30d: 2900,
      change30d: 5.2,
      prediction1m: 3100,
      change1m: 7.3,
      prediction3m: 3300,
      change3m: 10.5,
    },
    {
      symbol: 'AMZN',
      name: 'Amazon.com Inc.',
      price: 3300,
      priceChange: -1.0,      // Negative
      prediction30d: 3400,
      change30d: 6.5,
      prediction1m: 3600,
      change1m: 8.2,
      prediction3m: 3800,
      change3m: -12.4,        // Negative
    },
    {
      symbol: 'META',
      name: 'Meta Platforms Inc.',
      price: 300,
      priceChange: 3.2,       // Positive
      prediction30d: 310,
      change30d: 4.8,
      prediction1m: 330,
      change1m: 6.2,
      prediction3m: 350,
      change3m: 9.1,
    },
    {
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      price: 220,
      priceChange: 0.0,       // Zero (no change)
      prediction30d: 230,
      change30d: -5.0,        // Negative
      prediction1m: 245,
      change1m: 7.0,
      prediction3m: 260,
      change3m: 10.0,
    },
    {
      symbol: 'TSLA',
      name: 'Tesla Inc.',
      price: 900,
      priceChange: 4.5,       // Positive
      prediction30d: 950,
      change30d: 8.5,
      prediction1m: 1000,
      change1m: -12.3,        // Negative
      prediction3m: 1100,
      change3m: 15.8,
    },
    {
      symbol: 'JPM',
      name: 'JPMorgan Chase & Co.',
      price: 150,
      priceChange: -0.7,      // Negative
      prediction30d: 155,
      change30d: 3.5,
      prediction1m: 160,
      change1m: 4.2,
      prediction3m: 165,
      change3m: -5.0,         // Negative
    },
    {
      symbol: 'V',
      name: 'Visa Inc.',
      price: 220,
      priceChange: 1.0,       // Positive
      prediction30d: 230,
      change30d: 4.0,
      prediction1m: 240,
      change1m: 5.5,
      prediction3m: 250,
      change3m: 6.8,
    },
    {
      symbol: 'WMT',
      name: 'Walmart Inc.',
      price: 140,
      priceChange: -3.4,      // Negative
      prediction30d: 145,
      change30d: -2.5,        // Negative
      prediction1m: 150,
      change1m: 3.0,
      prediction3m: 155,
      change3m: 4.2,
    },
  ];

  // ----- PAGINATION LOGIC -----
  const itemsPerPage = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(mockPredictions.length / itemsPerPage);

  // Calculate which stocks to display on the current page
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStocks = mockPredictions.slice(startIndex, endIndex);

  // Handle page changes
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Helper to render a cell with a main value and an optional change below
  const renderValueWithChange = (value, change) => {
    if (value === undefined || value === null) return '-';
    const isNegative = change < 0;
    // Format the main value (price or prediction)
    const formattedValue = `$${value.toLocaleString()}`;

    return (
      <div className="inline-block text-right">
        {/* Main Value */}
        <div className="text-lg font-medium">{formattedValue}</div>
        {/* Change Below */}
        {change !== undefined && change !== 0 && (
          <div className={`text-sm ${isNegative ? 'text-red-500' : 'text-green-500'}`}>
            {isNegative ? `${change}%` : `+${change}%`}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="flex-1 p-8 overflow-auto"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <h1 className="text-3xl font-bold mb-6">Stock Price Prediction</h1>

      <div className="rounded-xl p-6 bg-white/5 backdrop-blur-md border border-white/10">
        <h2 className="text-xl font-bold mb-4">Predictions</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 border-b border-white/10">
                <th className="pb-4 text-left">Name</th>
                <th className="pb-4 text-right">Price</th>
                <th className="pb-4 text-right">30D Prediction</th>
                <th className="pb-4 text-right">1M Prediction</th>
                <th className="pb-4 text-right">3M Prediction</th>
                <th className="pb-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody>
              {currentStocks.map((stock) => {
                const domain = symbolToDomain[stock.symbol];
                const logoUrl = domain ? `https://logo.clearbit.com/${domain}` : null;

                return (
                  <tr key={stock.symbol} className="border-b border-white/10">
                    {/* Symbol & Name */}
                    <td className="py-4 font-medium">
                      <div className="flex items-center gap-3">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt={stock.symbol}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <span className="w-8 h-8 inline-block" />
                        )}
                        <div>
                          <div className="text-xl font-bold">{stock.symbol}</div>
                          <div className="text-gray-400 text-sm">{stock.name}</div>
                        </div>
                      </div>
                    </td>

                    {/* Current Price + Price Change */}
                    <td className="py-4 text-right">
                      {renderValueWithChange(stock.price, stock.priceChange)}
                    </td>

                    {/* 30D Prediction + Change */}
                    <td className="py-4 text-right">
                      {renderValueWithChange(stock.prediction30d, stock.change30d)}
                    </td>

                    {/* 1M Prediction + Change */}
                    <td className="py-4 text-right">
                      {renderValueWithChange(stock.prediction1m, stock.change1m)}
                    </td>

                    {/* 3M Prediction + Change */}
                    <td className="py-4 text-right">
                      {renderValueWithChange(stock.prediction3m, stock.change3m)}
                    </td>

                    {/* Details Link */}
                    <td className="py-4 text-right">
                      <Link
                        to={`/details/${stock.symbol}`}
                        className="px-4 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                      >
                        Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        <div className="flex justify-center mt-6">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-2 flex items-center space-x-2">
            {/* Previous Button */}
            <button
              onClick={handlePrevPage}
              className="px-3 py-1 rounded hover:bg-blue-500/10 text-gray-300"
              disabled={currentPage === 1}
            >
              «
            </button>

            {/* Page Numbers */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`
                  px-3 py-1 rounded hover:bg-blue-500/10 transition-colors
                  ${
                    page === currentPage
                      ? 'bg-blue-500/20 text-blue-400'
                      : 'text-gray-300'
                  }
                `}
              >
                {page}
              </button>
            ))}

            {/* Next Button */}
            <button
              onClick={handleNextPage}
              className="px-3 py-1 rounded hover:bg-blue-500/10 text-gray-300"
              disabled={currentPage === totalPages}
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Prediction;
