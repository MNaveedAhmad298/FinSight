import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

function TradeModal({ symbol, currentPrice, changePercent, isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('BUY');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [warningMessage, setWarningMessage] = useState(''); // Add warning message state
  const [shake, setShake] = useState(false); // Add state for shake animation

  // States for balances fetched from backend
  const [userBalanceUSD, setUserBalanceUSD] = useState(0);
  // userShares is an object: e.g., { AAPL: 0, GOOGL: 0 }
  const [userShares, setUserShares] = useState({});

  // State for trade amount (for BUY: USD amount, for SELL: number of shares)
  const [amount, setAmount] = useState('');

  // Format market price to two decimals and convert to number
  const price = currentPrice ? currentPrice.toFixed(2) : '0.00';
  const numericPrice = parseFloat(price) || 0;

  // Calculate max whole number of shares that can be bought/sold
  const maxBuyShares = numericPrice > 0 ? Math.floor(userBalanceUSD / numericPrice) : 0;
  // Remove Math.floor as it's not needed for selling exact number of shares
  const availableSharesForSymbol = userShares[symbol] || 0;

  // Get auth token for requests
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  // Fetch balances from the backend when the modal opens
  useEffect(() => {
    if (isOpen) {
      setError(''); // Clear any previous errors
      fetch('http://localhost:5000/api/balance', {
        headers: getAuthHeaders()
      })
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setError(data.error);
          } else {
            setUserBalanceUSD(data.usd);
            // Expecting data.shares to be an object mapping stock symbols to share amounts
            setUserShares(data.shares);
          }
        })
        .catch(err => {
          console.error('Failed to fetch balance:', err);
          setError('Failed to load account balance');
        });
    }
  }, [isOpen]);

  // Handle trade submission
  const handleTradeSubmit = async () => {
    if (!amount || parseInt(amount) <= 0) {
      setError('Please enter a valid quantity');
      return;
    }

    // Validate trade amount
    const quantity = parseInt(amount);
    if (activeTab === 'BUY') {
      const totalCost = quantity * numericPrice;
      if (totalCost > userBalanceUSD) {
        setError('Insufficient balance for this trade');
        return;
      }
    } else {
      // SELL validation
      if (quantity > (userShares[symbol] || 0)) {
        setError('Insufficient shares for this trade');
        return;
      }
    }

    setError('');
    setWarningMessage(''); // Clear warning message before processing trade
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

      // Update balances using values returned from backend
      setUserBalanceUSD(data.usd);
      setUserShares(data.shares);
      setAmount(''); // Clear input on success
      setWarningMessage(''); // Ensure warning is cleared after successful trade
      onClose(); // Only close on success
    } catch (err) {
      console.error('Trade API error:', err);
      setError(err.message || 'Trade failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Modify the tab click handlers to reset state
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setAmount(''); // Reset amount
    setError(''); // Clear any errors
    setWarningMessage(''); // Clear any warnings
  };

  // Add function to check if quantity is valid
  const isQuantityValid = () => {
    if (!amount || parseInt(amount) <= 0) return false;
    const numVal = parseInt(amount);
    const maxLimit = activeTab === 'BUY' ? maxBuyShares : availableSharesForSymbol;
    return numVal <= maxLimit;
  };

  // Function to trigger shake animation
  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500); // Reset after animation
  };

  if (!isOpen) return null;

  // Determine color for the percent change
  const isPositive = changePercent >= 0;
  const changeColor = isPositive ? 'text-green-500' : 'text-red-500';

  return (
    <div className="absolute top-8 right-8 w-[400px] bg-[#1F2128] text-white rounded-xl shadow-lg p-6 z-50">
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

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Trade</h2>
        <button onClick={onClose}>
          <X className="w-5 h-5 text-gray-400 hover:text-gray-200" />
        </button>
      </div>

      {/* Error message in red */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* Warning message also in red */}
      {warningMessage && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {warningMessage}
        </div>
      )}

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
          onClick={() => handleTabChange('BUY')}
          className={`w-1/2 py-2 rounded-lg ${activeTab === 'BUY' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}
        >
          Buy
        </button>
        <button
          onClick={() => handleTabChange('SELL')}
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
          <div className="text-sm text-gray-400">Enter Quantity</div>
          <div className="flex justify-end items-center space-x-1">
            <button 
              onClick={() => {
                const currentVal = parseInt(amount) || 0;
                if (currentVal <= 0) {
                  triggerShake();
                  return;
                }
                const newVal = Math.max(0, currentVal - 1);
                setAmount(newVal === 0 ? '' : newVal.toString());
                setWarningMessage(''); // Clear warning on decrease
              }}
              className="px-1.5 text-sm bg-white/10 rounded hover:bg-white/20 min-w-[24px] h-[24px] flex items-center justify-center"
            >
              -
            </button>
            <input
              type="text"
              value={amount}
              placeholder="0"
              onChange={(e) => {
                const val = e.target.value;
                // Only allow whole numbers by rejecting any decimal input
                if (/^\d*$/.test(val)) {  // This regex only allows digits, no decimals
                  const numVal = parseInt(val) || 0;
                  setAmount(val);
                  if (val !== '') {
                    const maxLimit = activeTab === 'BUY' ? maxBuyShares : availableSharesForSymbol;
                    if (numVal > maxLimit) {
                      const message = activeTab === 'BUY' 
                        ? `Exceeds available USD balance`
                        : `Exceeds current ${symbol} holding`;
                      setWarningMessage(message);
                    } else {
                      setWarningMessage('');
                    }
                  } else {
                    setWarningMessage('');
                  }
                }
              }}
              className={`bg-transparent outline-none text-right w-full caret-purple-600 mx-1 ${shake ? 'shake' : ''}`}
            />
            <button 
              onClick={() => {
                const currentVal = parseInt(amount) || 0;
                const maxLimit = activeTab === 'BUY' ? maxBuyShares : availableSharesForSymbol;
                if (currentVal >= maxLimit) {
                  triggerShake();
                  return;
                }
                const newVal = Math.min(maxLimit, currentVal + 1);
                setAmount(newVal.toString());
                // Only show warning if we're trying to exceed the limit
                if (newVal >= maxLimit && currentVal + 1 > maxLimit) {
                  const message = activeTab === 'BUY' 
                    ? `Exceeds available USD balance`
                    : `Exceeds current ${symbol} holding`;
                  setWarningMessage(message);
                } else {
                  setWarningMessage('');
                }
              }}
              className="px-1.5 text-sm bg-white/10 rounded hover:bg-white/20 min-w-[24px] h-[24px] flex items-center justify-center"
            >
              +
            </button>
            <span className="text-sm text-gray-400 ml-1">{symbol?.toUpperCase()}</span>
          </div>
        </div>
      </div>

      {/* Submit Trade Button - disabled when quantity is invalid */}
      <div className="mt-4">
        <button
          onClick={handleTradeSubmit}
          disabled={loading || !isQuantityValid()}
          className={`w-full py-2 rounded-lg transition-colors font-semibold ${
            isQuantityValid() 
              ? 'bg-blue-600 hover:bg-blue-500' 
              : 'bg-gray-600 cursor-not-allowed opacity-50'
          }`}
        >
          {loading ? 'Processing...' : 'Submit Trade'}
        </button>
      </div>

      {/* Available Info */}
      <div className="mt-4 text-xs text-gray-400 space-y-1">
        {activeTab === 'BUY' ? (
          <>
            <div className="flex justify-between items-center">
              <span>Available Balance</span>
              <span>{userBalanceUSD.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Max Buy</span>
              <span>{maxBuyShares} {symbol?.toUpperCase()}</span>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center">
              <span>Available Shares</span>
              <span>{availableSharesForSymbol} {symbol?.toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Total Value</span>
              <span>${(availableSharesForSymbol * numericPrice).toFixed(2)} USD</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default TradeModal;
