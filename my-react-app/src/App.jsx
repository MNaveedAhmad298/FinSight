import React from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/Login"
import SignUpPage from "./pages/Signup"
import Prediction from "./pages/Prediction";
import StockDetail from "./pages/StockDetail";
import TradePage from "./pages/TradePage";
import Portfolio from "./pages/Portfolio";
import Chat from "./components/Chat"; // Import the Chat component


const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
    <Router>
      {/* Use flex to place Sidebar and Main Content side by side */}
      <div className="flex h-screen">
        {/* Sidebar with its own background color */}
        <Sidebar />

        {/* Main Content with a different background color */}
        <div className="flex-1 bg-[#0D0E12] text-white overflow-auto relative">
          <Routes>
    
            <Route path="/" element={<LoginPage />} />
            
            <Route path="/signup" element={<SignUpPage />} />
            
            <Route path="/Dashboard" element={<Dashboard />} />
            
            <Route path="/prediction" element={<Prediction />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/details/:symbol" element={<StockDetail />} />
            <Route path="/trade/:symbol" element={<TradePage />} />
            
            {/* other routes */}
          </Routes>
          {/* Chat component fixed at bottom-right */}
          <Chat />
        </div>
      </div>
    </Router>
    </QueryClientProvider>
  );
}

export default App;
