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
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md relative z-10 rounded-2xl p-8 bg-white/5 backdrop-blur-md border border-white/10 shadow-xl">
        <h1 className="text-3xl font-bold text-center mb-4">Reset Password</h1>
        <p className="text-gray-400 text-center mb-6">
          Enter a new password for your account
        </p>

        {message && <p className="text-green-400 mb-4">{message}</p>}
        {error && <p className="text-red-500 mb-4">{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4 relative">
            <Lock className="absolute left-3 top-3 text-gray-400" />
            <input
              type="password"
              placeholder="New password"
              className="block w-full pl-10 pr-3 py-3 rounded-lg bg-white/5 placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="mb-6 relative">
            <Lock className="absolute left-3 top-3 text-gray-400" />
            <input
              type="password"
              placeholder="Confirm password"
              className="block w-full pl-10 pr-3 py-3 rounded-lg bg-white/5 placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? "Resetting..." : <>Reset Password <ArrowRight /></>}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-blue-400 hover:text-blue-300">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
