import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowRight } from "lucide-react";
import "../app.css";
import { apiPost } from '../api';

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      await apiPost("/api/forgot-password", { email });
      setMessage("Check your email for the password reset link!");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4 py-8 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-blue-900/20 to-gray-900 z-0"></div>
      
      <div className="w-full max-w-[min(90%,420px)] relative z-10">
        <div className="rounded-2xl p-4 sm:p-8 bg-white/5 backdrop-blur-md border border-white/10 shadow-xl">
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Forgot Password</h1>
            <p className="text-gray-400">Enter your email to reset your password</p>
          </div>

          {message && <p className="text-green-500 mb-4 text-sm text-center">{message}</p>}
          {error && <p className="text-red-500 mb-4 text-sm text-center">{error}</p>}

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  placeholder="Email address"
                  className="block w-full pl-10 pr-3 py-2.5 sm:py-3 border-0 rounded-lg bg-white/5 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-colors text-sm sm:text-base"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 sm:py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Send Reset Link <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 sm:mt-8 text-center">
            <Link to="/login" className="text-sm text-blue-400 hover:text-blue-300">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
