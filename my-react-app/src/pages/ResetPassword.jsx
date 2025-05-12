// src/components/ResetPassword.jsx
import React, { useState, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { Lock, ArrowRight } from "lucide-react";
import "../app.css";

function ResetPassword() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Extract token from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(search);
    const t = params.get("token") || "";
    setToken(t);
    if (!t) {
      setError("No reset token provided.");
    }
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Missing reset token.");
      return;
    }

    setLoading(true);
    try {
      const resp = await fetch("http://localhost:5000/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.message || "Failed to reset.");
      setMessage("Password reset successful! Redirecting to login...");
      // Redirect after a short delay
      setTimeout(() => navigate("/login"), 2000);
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
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Reset Password</h1>
            <p className="text-gray-400">Enter a new password for your account</p>
          </div>

          {message && <p className="text-green-400 mb-4 text-sm text-center">{message}</p>}
          {error && <p className="text-red-500 mb-4 text-sm text-center">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                placeholder="New password"
                className="block w-full pl-10 pr-3 py-2.5 sm:py-3 border-0 rounded-lg bg-white/5 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-colors text-sm sm:text-base"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                placeholder="Confirm password"
                className="block w-full pl-10 pr-3 py-2.5 sm:py-3 border-0 rounded-lg bg-white/5 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-colors text-sm sm:text-base"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 sm:py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Reset Password <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
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

export default ResetPassword;
