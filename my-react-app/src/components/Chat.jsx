import React, { useState } from "react";
import { MessageSquare } from "lucide-react";
import "./Chat.css";

function Chat() {
  // UI state
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // message state
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  
  // (Optional) history state
  const [chatHistory, setChatHistory] = useState([
    { role: 'assistant', content: "Hello! I'm your AI trading assistant. How can I help you today?" }
  ]);

  const handleSend = async (e) => {
    e.preventDefault();            // prevent form submission reload
    if (!message.trim()) return;

    setIsLoading(true);
    setChatHistory(prev => [...prev, { role: 'user', content: message }]);

    try {
      const res = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      if (res.ok) {
        setResponse(data.response);
        setChatHistory(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setResponse(`Error: ${data.error}`);
      }
    } catch (err) {
      setResponse(`Network error: ${err.message}`);
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
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-200"
            >
              X
            </button>
          </div>
          <div className="chat-history h-150 overflow-auto space-y-4 mb-4">
            {chatHistory.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === "user"
                      ? "bg-blue-500/20 text-blue-100 mr-4"
                      : "bg-white/5 text-gray-100"
                  }`}
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {msg.content}
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
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
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
