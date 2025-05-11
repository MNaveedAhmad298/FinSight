import React from "react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import LoginPage from "./pages/Login"
import SignUpPage from "./pages/Signup"
import Prediction from "./pages/Prediction";
import StockDetail from "./pages/StockDetail";
import TradePage from "./pages/TradePage";
import Portfolio from "./pages/Portfolio";
import Chat from "./components/Chat"; // Import the Chat component
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from  "./pages/ResetPassword";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = ['/login', '/signup', '/forgotpassword', '/reset-password', '/'].includes(location.pathname);

  return (
    <div className="flex h-screen">
      {!isAuthPage && <Sidebar />}
      <div className={`flex-1 bg-[#0D0E12] text-white overflow-auto relative ${!isAuthPage ? 'lg:pt-0 pt-16' : ''}`}>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/forgotpassword" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/prediction" element={<Prediction />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/details/:symbol" element={<StockDetail />} />
          <Route path="/trade/:symbol" element={<TradePage />} />
        </Routes>
        <Chat />
      </div>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
