import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

function TradeModal({ symbol, currentPrice, changePercent, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('BUY');
  

  // States for balances fetched from backend
  const [userBalanceUSD, setUserBalanceUSD] = useState(0);
  // userShares is an object: e.g., { AAPL: 0, GOOGL: 0 }
  const [userShares, setUserShares] = useState({});

  // State for trade amount (for BUY: USD amount, for SELL: number of shares)
  const [amount, setAmount] = useState('');

  // Format market price to two decimals and convert to number
  const price = currentPrice ? currentPrice.toFixed(2) : '0.00';
  const numericPrice = parseFloat(price) || 0;

  // For BUY, calculate max shares you can buy with available USD
  const maxBuyShares = numericPrice > 0 ? userBalanceUSD / numericPrice : 0;
  // For SELL, available shares for the current symbol (defaulting to 0)
  const availableSharesForSymbol = userShares[symbol] || 50;
  const maxSellValueUSD = numericPrice * availableSharesForSymbol;

  // Fetch balances from the backend when the modal opens
  useEffect(() => {
    if (isOpen) {
      fetch('http://localhost:5000/api/balance')
        .then(res => res.json())
        .then(data => {
          setUserBalanceUSD(data.usd);
          // Expecting data.shares to be an object mapping stock symbols to share amounts
          setUserShares(data.shares);
        })
        .catch(err => console.error('Failed to fetch balance:', err));
    }
  }, [isOpen]);

  // Handle trade submission
  const handleTradeSubmit = () => {
    const payload = {
      symbol,
      tradeType: activeTab,
      amount,
      price: numericPrice,
    };

    fetch('http://localhost:5000/api/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert(`Trade failed: ${data.error}`);
        } else {
          alert(data.message);
          // Update balances using values returned from backend
          setUserBalanceUSD(data.usd);
          setUserShares(data.shares);
          setAmount(''); // Clear input on success
        }
      })
      .catch(err => {
        console.error('Trade API error:', err);
        alert('Trade failed due to network error.');
      });
  };

  if (!isOpen) return null;

  // Determine color for the percent change
  const isPositive = changePercent >= 0;
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';

  return (
    <div className="absolute top-8 right-8 w-[400px] bg-[#1F2128] text-white rounded-xl shadow-lg p-6 z-50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Trade</h2>
        <button onClick={onClose}>
          <X className="w-5 h-5 text-gray-400 hover:text-gray-200" />
        </button>
      </div>

      {/* Symbol + Price/Change */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-400">{symbol?.toUpperCase()}</div>
        <div className={`text-sm font-bold ${changeColor}`}>
          {isPositive ? `+${changePercent.toFixed(2)}%` : `${changePercent.toFixed(2)}%`}
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex space-x-1 mb-4">
        <button
          onClick={() => setActiveTab('BUY')}
          className={`w-1/2 py-2 rounded-lg ${activeTab === 'BUY' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
        >
          Buy
        </button>
        <button
          onClick={() => setActiveTab('SELL')}
          className={`w-1/2 py-2 rounded-lg ${activeTab === 'SELL' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
        >
          Sell
        </button>
      </div>

      {/* Form Fields */}
      <div className="space-y-4 mb-4">
        {/* Market Price (read-only) */}
        <div className="bg-white/5 rounded-lg p-3 grid grid-cols-[120px_1fr] items-center">
          <div className="text-sm text-gray-400">Market Price</div>
          <div className="flex justify-end items-center space-x-1">
            <input
              type="text"
              value={price}
              readOnly
              className="bg-transparent outline-none text-right w-full text-gray-400 caret-purple-600"
            />
            <span className="text-sm text-gray-400">USD</span>
          </div>
        </div>

        {/* Total Field (for trade amount) */}
        <div className="bg-white/5 border-2 border-purple-600 rounded-lg p-3 grid grid-cols-[120px_1fr] items-center">
          <div className="text-sm text-gray-400">Total</div>
          <div className="flex justify-end items-center space-x-1">
            <input
              type="text"
              placeholder="Minimum 5"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*\.?\d{0,2}$/.test(val)) {
                  setAmount(val);
                }
              }}
              onBlur={() => {
                if (amount !== '') {
                  const numericVal = parseFloat(amount);
                  if (!isNaN(numericVal)) {
                    setAmount(numericVal.toFixed(2));
                  }
                }
              }}
              className="bg-transparent outline-none text-right w-full caret-purple-600"
            />
            <span className="text-sm text-gray-400">USD</span>
          </div>
        </div>
      </div>

      {/* Submit Trade Button */}
      <div className="mt-4">
        <button
          onClick={handleTradeSubmit}
          className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors font-semibold"
        >
          Submit Trade
        </button>
      </div>

      {/* Available Info */}
      <div className="mt-4 text-xs text-gray-400 space-y-1">
        {activeTab === 'BUY' ? (
          <>
            <div className="flex justify-between items-center">
              <span>Avbl</span>
              <span>{userBalanceUSD.toFixed(3)} USD</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Max Buy</span>
              <span>{maxBuyShares.toFixed(3)} {symbol?.toUpperCase()}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span>Avbl</span>
              <span>{availableSharesForSymbol.toFixed(3)} {symbol?.toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Max Sell</span>
              <span>${maxSellValueUSD.toFixed(2)} USD</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TradeModal;
