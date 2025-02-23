import React, { useState } from 'react';
import { X } from 'lucide-react';

function TradeModal({ symbol, currentPrice, changePercent, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('BUY');
  const userBalanceUSD = 700.005;
  const userBalanceShares = 0.034;
  // Format the market price to two decimals
  const price = currentPrice ? currentPrice.toFixed(2) : '0.00';
  const [amount, setAmount] = useState('');

  if (!isOpen) return null;

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
        {/* Market Price (read-only) with "USD" on the right */}
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

        {/* Total Field with placeholder, fixed USD, and restriction to two decimals */}
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
                // Format to 2 decimals on blur if a valid number exists
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
      <div className="mt-4 text-xs text-gray-400 flex justify-between">
        {activeTab === 'BUY' ? (
          <div>
            Max Buy: {userBalanceShares.toFixed(3)} {symbol?.toUpperCase()}
          </div>
        ) : (
          <>
            <div>
              Available: {userBalanceShares.toFixed(3)} {symbol?.toUpperCase()}
            </div>
            <div>Max Sell: ${userBalanceUSD.toFixed(3)} USD</div>
          </>
        )}
      </div>
    </div>
  );
}

export default TradeModal;
