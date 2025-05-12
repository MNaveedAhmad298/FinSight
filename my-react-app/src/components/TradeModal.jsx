import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

function TradeModal({ symbol, currentPrice, changePercent, isOpen, onClose, isMobile }) {
  const [activeTab, setActiveTab] = useState('BUY');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [shake, setShake] = useState(false);

  const [userBalanceUSD, setUserBalanceUSD] = useState(0);
  const [userShares, setUserShares] = useState({});
  const [amount, setAmount] = useState('');

  const price = currentPrice ? currentPrice.toFixed(2) : '0.00';
  const numericPrice = parseFloat(price) || 0;

  const maxBuyShares = numericPrice > 0 ? Math.floor(userBalanceUSD / numericPrice) : 0;
  const availableSharesForSymbol = userShares[symbol] || 0;

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  useEffect(() => {
    if (isOpen) {
      setError('');
      fetch('http://localhost:5000/api/balance', {
        headers: getAuthHeaders()
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setError(data.error);
          } else {
            setUserBalanceUSD(data.usd);
            setUserShares(data.shares);
          }
        })
        .catch(err => {
          console.error('Failed to fetch balance:', err);
          setError('Failed to load account balance');
        });
    }
  }, [isOpen]);

  const handleTradeSubmit = async () => {
    if (!amount || parseInt(amount) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    const quantity = parseInt(amount);
    if (activeTab === 'BUY') {
      const totalCost = quantity * numericPrice;
      if (totalCost > userBalanceUSD) {
        setError('Insufficient balance for this trade');
        return;
      }
    } else {
      if (quantity > (userShares[symbol] || 0)) {
        setError('Insufficient shares for this trade');
        return;
      }
    }

    setError('');
    setWarningMessage('');
    setLoading(true);

    const payload = {
      symbol,
      tradeType: activeTab,
      quantity: quantity,
      price: numericPrice,
    };

    try {
      const response = await fetch('http://localhost:5000/api/trade', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Trade failed');
      }

      setUserBalanceUSD(data.usd);
      setUserShares(data.shares);
      setAmount('');
      setWarningMessage('');
      onClose();
    } catch (err) {
      console.error('Trade API error:', err);
      setError(err.message || 'Trade failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setAmount('');
    setError('');
    setWarningMessage('');
  };

  const isQuantityValid = () => {
    if (!amount || parseInt(amount) <= 0) return false;
    const numVal = parseInt(amount);
    const maxLimit = activeTab === 'BUY' ? maxBuyShares : availableSharesForSymbol;
    return numVal <= maxLimit;
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  // Add ref for input focus handling
  const amountInputRef = useRef(null);

  // Handle input focus for better mobile keyboard interaction
  const handleInputFocus = () => {
    if (isMobile) {
      // Scroll the input into view with a slight delay to ensure keyboard is open
      setTimeout(() => {
        amountInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  };

  if (!isOpen) return null;

  const isPositive = changePercent >= 0;
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';

  return (
    <div 
      className={`
        ${isMobile ? '' : 'fixed sm:absolute inset-x-0 bottom-0 sm:top-8 sm:bottom-auto sm:right-8 sm:left-auto'}
        w-full sm:w-[400px] bg-[#1F2128] text-white sm:rounded-xl shadow-lg ${!isMobile ? 'z-50' : ''}
      `}
    >
      <div className="p-4">
        <style>
          {`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-4px); }
              75% { transform: translateX(4px); }
            }
            .shake {
              animation: shake 0.2s ease-in-out 0s 2;
            }
          `}
        </style>

        {/* Header - Only show close button on desktop */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Trade {symbol}</h2>
          {!isMobile && (
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400 hover:text-gray-200" />
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        {warningMessage && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
            {warningMessage}
          </div>
        )}

        {/* Symbol + Price/Change */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-400">{symbol?.toUpperCase()}</div>
          <div className={`text-sm font-bold ${changeColor}`}>
            {isPositive ? `+${changePercent.toFixed(2)}%` : `${changePercent.toFixed(2)}%`}
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex space-x-2 mb-4">
          <button
            onClick={() => handleTabChange('BUY')}
            className={`w-1/2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'BUY' 
                ? 'bg-green-600 text-white' 
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => handleTabChange('SELL')}
            className={`w-1/2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'SELL' 
                ? 'bg-red-600 text-white' 
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            Sell
          </button>
        </div>

        {/* Form Fields */}
        <div className="space-y-3">
          {/* Market Price (read-only) */}
          <div className="bg-white/5 rounded-lg p-3 grid grid-cols-[80px_1fr] items-center">
            <div className="text-sm text-gray-400">Price</div>
            <div className="flex justify-end items-center space-x-1">
              <input
                type="text"
                value={price}
                readOnly
                className="bg-transparent outline-none text-right w-full text-gray-400 text-sm"
              />
              <span className="text-xs text-gray-400">USD</span>
            </div>
          </div>

          {/* Amount Field */}
          <div className="bg-white/5 border border-blue-500 rounded-lg p-3 grid grid-cols-[80px_1fr] items-center">
            <div className="text-sm text-gray-400">Amount</div>
            <div className="flex justify-end items-center space-x-2">
              <input
                ref={amountInputRef}
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val)) {
                    setAmount(val);
                  }
                }}
                onFocus={handleInputFocus}
                placeholder="0.00"
                className={`bg-transparent outline-none text-right w-full text-sm ${shake ? 'shake' : ''}`}
              />
              <span className="text-xs text-gray-400">USD</span>
            </div>
          </div>
        </div>

        {/* Available Info */}
        <div className="mt-4 py-3 text-xs text-gray-400 space-y-2 border-t border-white/10">
          {activeTab === 'BUY' ? (
            <>
              <div className="flex justify-between items-center">
                <span>Available Balance</span>
                <span>{userBalanceUSD.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Max Buy</span>
                <span>{maxBuyShares.toFixed(4)} {symbol}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <span>Available Shares</span>
                <span>{availableSharesForSymbol.toFixed(4)} {symbol}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Value (USD)</span>
                <span>${(availableSharesForSymbol * numericPrice).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        {/* Submit Button */}
        <button
          onClick={handleTradeSubmit}
          disabled={loading || !isQuantityValid()}
          className={`w-full py-3 rounded-lg text-sm font-semibold mt-4 transition-colors ${
            loading || !isQuantityValid()
              ? 'bg-gray-600 cursor-not-allowed opacity-50'
              : activeTab === 'BUY'
                ? 'bg-green-600 active:bg-green-700'
                : 'bg-red-600 active:bg-red-700'
          }`}
        >
          {loading ? 'Processing...' : `${activeTab === 'BUY' ? 'Buy' : 'Sell'} ${symbol}`}
        </button>
      </div>
    </div>
  );
}

export default TradeModal;
