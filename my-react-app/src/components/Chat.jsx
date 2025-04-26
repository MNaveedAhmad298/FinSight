import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import './Chat.css';

function Chat() {
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: "Hello! I'm your AI trading assistant. How can I help you today?" }
  ]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    // Append the user's message and clear input
    const userMsg = chatMessage;
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg })
      });
    
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    
      const data = await response.json();
      setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (error) {
      console.error('Error fetching assistant response:', error);
      setChatHistory(prev => [
        ...prev,
        { role: 'assistant', content: "Sorry, I encountered an error. Please try again later." }
      ]);
    } finally {
      setIsLoading(false);
    }
  }    

  return (
    <>
      {/* Chat button - fixed at bottom-right */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full opacity-80 hover:opacity-100 z-50"
          title="Chat"
        >
          <MessageSquare className="w-8 h-8" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 w-140 bg-[#1F2128] p-5 rounded-xl shadow-2xl z-50">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold">AI Assistant</h1>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-200">
              X
            </button>
          </div>
          <div className="chat-history h-150 overflow-auto space-y-4 mb-4">
            {chatHistory.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
  className={`max-w-[80%] rounded-lg p-3 ${
    message.role === 'user'
      ? 'bg-blue-500/20 text-blue-100 mr-4'
      : 'bg-white/5 text-gray-100'
  }`}
  style={{ whiteSpace: 'pre-wrap' }}
>
  {message.content}
</div>

              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[80%] rounded-lg p-3 bg-white/5 text-gray-100">
                  Loading...
                </div>
              </div>
            )}
          </div>
          <form onSubmit={handleChatSubmit} className="flex gap-2">
            <input
              type="text"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              placeholder="Ask about your stock market..."
              className="flex-1 bg-white/5 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="px-4 py-3 bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
              disabled={isLoading}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default Chat;
