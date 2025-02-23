import React, { useState } from 'react';
import { X } from 'lucide-react';

function TradeModal({ symbol, currentPrice, changePercent, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('BUY');

  // Example user balances
  const userBalanceUSD = 700.005;     // How much USD the user has
  const userBalanceShares = 0.034;   // How many shares/coins the user has

  // Format the market price to two decimals
  const price = currentPrice ? currentPrice.toFixed(2) : '0.00';

  // Convert price to a number for calculations
  const numericPrice = parseFloat(price) || 0;

  // Calculate how many shares user can buy with their USD
  const maxBuyShares = numericPrice > 0 ? userBalanceUSD / numericPrice : 0;

  // Calculate how many USD user gets if they sell all their shares
  const maxSellValueUSD = numericPrice * userBalanceShares;

  // The user enters the total buy/sell amount here (in USD for buy, or ??? for sell)
  const [amount, setAmount] = useState('');

  // If the modal is closed, don’t render anything
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
          className={`
            w-1/2 py-2 rounded-lg
            ${activeTab === 'BUY'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }
          `}
        >
          Buy
        </button>
        <button
          onClick={() => setActiveTab('SELL')}
          className={`
            w-1/2 py-2 rounded-lg
            ${activeTab === 'SELL'
              ? 'bg-purple-600 text-white'
              : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }
          `}
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

        {/* Total Field */}
        <div className="bg-white/5 border-2 border-purple-600 rounded-lg p-3 grid grid-cols-[120px_1fr] items-center">
          <div className="text-sm text-gray-400">Total</div>
          <div className="flex justify-end items-center space-x-1">
            <input
              type="text"
              placeholder="Minimum 5"
              value={amount}
              onChange={(e) => {
                const val = e.target.value;
                // Allow only numbers with up to 2 decimal places
                if (/^\d*\.?\d{0,2}$/.test(val)) {
                  setAmount(val);
                }
              }}
              onBlur={() => {
                // Format to 2 decimals on blur if a valid number
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

      {/* Available Info */}
      <div className="mt-4 text-xs text-gray-400 space-y-1">
        {activeTab === 'BUY' ? (
          <>
            {/* Avbl (in USD) */}
            <div className="flex justify-between items-center">
              <span>Avbl</span>
              <span>{userBalanceUSD.toFixed(3)} USD</span>
            </div>
            {/* Max Buy (in symbol) */}
            <div className="flex justify-between items-center">
              <span>Max Buy</span>
              <span>
                {maxBuyShares.toFixed(3)} {symbol?.toUpperCase()}
              </span>
            </div>
          </>
        ) : (
          <>
            {/* Avbl (in shares) */}
            <div className="flex justify-between items-center">
              <span>Avbl</span>
              <span>
                {userBalanceShares.toFixed(3)} {symbol?.toUpperCase()}
              </span>
            </div>
            {/* Max Sell (in USD) */}
            <div className="flex justify-between items-center">
              <span>Max Sell</span>
              <span>${(numericPrice * userBalanceShares).toFixed(2)} USD</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TradeModal;
