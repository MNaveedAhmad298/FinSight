import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send } from 'lucide-react';
import './Chat.css';
import { apiPost } from '../api';

function Chat() {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: "Hello! I'm your AI trading assistant. How can I help you today?" }
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Function to scroll to bottom of chat
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };
  // Scroll to bottom when new messages are added
  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  // Handle clicks outside of chat on mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle on mobile screens
      if (window.innerWidth < 640) {
        const chatWindow = document.getElementById('chat-window');
        if (chatWindow && !chatWindow.contains(event.target)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || isLoading) return;

    const userMsg = chatMessage.trim();
    setChatMessage('');
    setIsLoading(true);

    try {
      setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);

      const data = await apiPost("/api/ask", { message: userMsg }, {
  headers: getAuthHeaders()
});
    
    setChatHistory(prev => [...prev, { role: 'assistant', content: data.response || data.reply || '' }]);
    } catch (error) {
      console.error('Error fetching assistant response:', error);
      setChatHistory(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, I encountered an error. Please try again later." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Chat button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 bg-blue-500 text-white p-3 sm:p-4 rounded-full opacity-80 hover:opacity-100 z-50 shadow-lg transition-transform hover:scale-105 active:scale-95"
          title="Chat with AI Assistant"
        >
          <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7" />
        </button>
      )}

      {isOpen && (
        <div 
          id="chat-window"
          className="fixed inset-0 sm:inset-auto sm:bottom-4 sm:right-4 flex flex-col bg-[#1F2128] sm:w-[400px] sm:h-[600px] sm:rounded-xl shadow-2xl z-50"
        >
          {/* Chat header */}
          <div className="flex justify-between items-center p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold">AI Assistant</h1>
                <p className="text-xs text-gray-400">Always here to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hidden sm:flex p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Chat messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-history">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === "user"
                      ? "bg-blue-500/20 text-blue-100"
                      : "bg-white/5 text-gray-100"
                  } ${msg.role === "assistant" ? "animate-fadeIn" : ""}`}
                >
                  <div className="text-sm sm:text-base whitespace-pre-wrap break-words">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-white/5 text-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-.3s]" />
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-.5s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} /> {/* Scroll anchor */}
          </div>

          {/* Chat input and mobile close button */}
          <div className="border-t border-white/10">
            <form onSubmit={handleChatSubmit} className="p-4 flex gap-2">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Ask about your stocks..."
                className="flex-1 bg-white/5 rounded-lg px-4 py-3 text-sm sm:text-base placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !chatMessage.trim()}
                className="px-4 py-2 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:hover:bg-blue-500 active:scale-95"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </form>
            
            {/* Mobile close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="sm:hidden w-full py-3 px-4 text-gray-400 hover:text-white hover:bg-white/5 transition-colors border-t border-white/10 flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              <span>Close Chat</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Chat;
