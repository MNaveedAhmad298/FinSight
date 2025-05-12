import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, User, Mail, Lock, ArrowRight } from "lucide-react";
import "../app.css";

export function Signup() {
    const [formData, setFormData] = useState({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();
  
    const handleChange = (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setLoading(true);
      setError("");
  
      // Basic validation
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
  
      try {
        // Replace with your actual API endpoint
        const response = await fetch("http://localhost:5000/api/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: formData.fullName,
            email: formData.email,
            password: formData.password,
          }),
        });
  
        const data = await response.json();
  
        if (!response.ok) {
          throw new Error(data.message || "Signup failed");
        }
  
        // Redirect to login page on successful signup
        navigate("/login", { state: { message: "Account created successfully! Please login." } });
      } catch (error) {
        setError(error.message || "Signup failed. Please try again.");
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
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">Create Account</h1>
              <p className="text-gray-400">Join our trading platform today</p>
            </div>
  
            {error && (
              <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}
  
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 sm:space-y-5">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2.5 sm:py-3 border-0 rounded-lg bg-white/5 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-colors text-sm sm:text-base"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                </div>
  
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2.5 sm:py-3 border-0 rounded-lg bg-white/5 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-colors text-sm sm:text-base"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>
  
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-10 py-2.5 sm:py-3 border-0 rounded-lg bg-white/5 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-colors text-sm sm:text-base"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-gray-400 hover:text-gray-300 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                </div>
  
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1.5 sm:mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="block w-full pl-10 pr-3 py-2.5 sm:py-3 border-0 rounded-lg bg-white/5 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:bg-white/10 transition-colors text-sm sm:text-base"
                      placeholder="••••••••"
                      required
                    />
                  </div>
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
                        Create Account <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
  
            <div className="mt-6 sm:mt-8 text-center">
              <p className="text-sm text-gray-400">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-blue-400 hover:text-blue-300">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  export default Signup;
  
  // Add these components to your routes
  // Example:
  /*
  import { Login, Signup } from './path/to/auth-components';
  
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/dashboard" element={<Dashboard />} />
    ...
  </Routes>
  */