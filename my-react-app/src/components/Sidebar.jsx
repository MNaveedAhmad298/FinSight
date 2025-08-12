import React, { useState, useEffect } from "react";
import {
  LineChart,
  BarChart3,
  Brain,
  Wallet,
  Settings,
  Bell,
  Search,
  Notebook as Robot,
  LogOut,
  User,
  X,
  Upload,
  DollarSign,
  Menu,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

function Sidebar() {
  const [user, setUser] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [fundsAmount, setFundsAmount] = useState("");
  const [activeSettingsTab, setActiveSettingsTab] = useState("profile");
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isFundsLoading, setIsFundsLoading] = useState(false);
  const [initialNickname, setInitialNickname] = useState("");
  const [error, setError] = useState("");
  const [showError, setShowError] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(window.innerWidth < 1024);
  const navigate = useNavigate();

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
      setNickname(userData.nickname || userData.name || "");
      setInitialNickname(userData.nickname || userData.name || "");
      // If user has an avatar, set it as preview
      if (userData.avatar) {
        setAvatarPreview(`data:image/jpeg;base64,${userData.avatar}`);
      }
    }
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsSidebarCollapsed(window.innerWidth < 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSignOutClick = () => {
    setShowConfirmDialog(true);
    setIsProfileOpen(false); // Close the profile dropdown
  };

  const handleConfirmSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleCancelSignOut = () => {
    setShowConfirmDialog(false);
  };

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isProfileOpen && !event.target.closest('.profile-section')) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileOpen]);

  // Handle file upload
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        setError("Only image files are allowed");
        setShowError(true);
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        setShowError(true);
        return;
      }

      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  // Handle profile save
  const handleProfileSave = async () => {
    setIsProfileLoading(true);
    try {
      const formData = new FormData();
      formData.append("nickname", nickname);
      if (avatar) {
        formData.append("avatar", avatar);
      }

      const response = await fetch("http://localhost:5000/api/profile", {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) throw new Error("Failed to update profile");

      const updatedUser = await response.json();
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setShowSettingsModal(false);
    } catch (error) {
      console.error("Profile update error:", error);
      setError(error.message || "Failed to update profile");
      setShowError(true);
    } finally {
      setIsProfileLoading(false);
    }
  };

  // Function to check if there are any changes
  const hasChanges = () => {
    const nicknameChanged = nickname !== initialNickname;
    const avatarChanged = avatar !== null;
    return nicknameChanged || avatarChanged;
  };

  // Handle funds request
  const handleFundsRequest = async () => {
    const savedFundsAmount = fundsAmount;
    setFundsAmount("");
    
    setIsFundsLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/request-funds", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: parseFloat(savedFundsAmount) })
      });

      if (!response.ok) throw new Error("Failed to request funds");
    } catch (error) {
      console.error("Funds request error:", error);
      // Restore the amount if request fails
      setFundsAmount(savedFundsAmount);
      setError(error.message || "Failed to request funds");
      setShowError(true);
    } finally {
      setIsFundsLoading(false);
    }
  };

  return (
    <>
      {/* Mobile header - Only visible on small screens */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-[#1F2128] border-b border-white/10 flex items-center justify-between px-4 z-[60]">
        <div className="flex items-center gap-2">
          <LineChart className="w-6 h-6 text-blue-500" />
          <span className="text-xl font-bold text-white">FinSight</span>
        </div>
        <button
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Overlay for mobile - Only visible when sidebar is open on mobile */}
      {!isSidebarCollapsed && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          onClick={() => setIsSidebarCollapsed(true)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed lg:static h-full z-[51] transition-transform duration-300 right-0 ${
        isSidebarCollapsed ? 'translate-x-full lg:translate-x-0' : 'translate-x-0'
      }`}>
        <div className="w-[280px] lg:w-72 bg-[#1F2128] h-full p-4 sm:p-6 flex flex-col text-white overflow-y-auto">
          {/* Logo - Only visible on desktop */}
          <div className="hidden lg:flex items-center gap-2 mb-6 sm:mb-8">
            <LineChart className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            <span className="text-xl sm:text-2xl font-bold">FinSight</span>
          </div>

          {/* Account for mobile header space */}
          <div className="h-16 lg:hidden"></div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="Search stocks..."
              className="w-full bg-white/5 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            />
          </div>

          {/* Navigation */}
          <nav className="space-y-1 sm:space-y-2">
            {[
              { icon: <BarChart3 />, label: "Dashboard", path: "/dashboard" },
              { icon: <Wallet />, label: "Portfolio", path: "/portfolio" },
              { icon: <Brain />, label: "AI Prediction", path: "/prediction" },
            ].map((item, index) => (
              <Link
                key={index}
                to={item.path}
                onClick={() => window.innerWidth < 1024 && setIsSidebarCollapsed(true)}
                className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-white/5 transition-all hover:translate-x-1"
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6">{item.icon}</div>
                <span className="text-sm sm:text-base">{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Bottom Section */}
          <div className="mt-auto pt-6">
            <button 
              onClick={() => setShowSettingsModal(true)}
              className="flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg hover:bg-white/5 w-full text-sm sm:text-base"
            >
              <Settings className="w-5 h-5 sm:w-6 sm:h-6" />
              <span>Settings</span>
            </button>

            {/* Profile Button */}
            <div className="relative profile-section">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 w-full mt-2 sm:mt-4 p-3 sm:p-4 rounded-lg glass-effect hover:bg-white/5 transition-colors"
              >
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                    )}
                  </div>
                  <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1F2128]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base truncate">
                    {user?.nickname || user?.name?.split(' ')[0] || 'Loading...'}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-400 truncate">{user?.email || ''}</p>
                </div>
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 p-3 sm:p-4 rounded-lg bg-[#2A2D38] border border-white/10 shadow-xl">
                  <div className="mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-white/10">
                    <p className="text-xs sm:text-sm text-gray-400">Signed in as</p>
                    <p className="font-semibold text-sm sm:text-base mt-1">{user?.name || 'Loading...'}</p>
                    <p className="text-xs sm:text-sm text-gray-400 mt-0.5">{user?.email || ''}</p>
                  </div>
                  <button
                    onClick={handleSignOutClick}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors text-sm sm:text-base"
                  >
                    <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Error Dialog */}
      {showError && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="w-full max-w-sm relative z-10 rounded-xl p-6 bg-white/5 backdrop-blur-md border border-white/10 shadow-xl mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Error</h3>
              <button
                onClick={() => setShowError(false)}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-red-400 mb-6">{error}</p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowError(false)}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-xl relative z-10 rounded-xl p-6 bg-white/5 backdrop-blur-md border border-white/10 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-semibold text-white">Settings</h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Profile Settings Block */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-xl font-semibold text-white mb-4">Profile Settings</h4>
                
                {/* Avatar Upload */}
                <div className="flex items-center mb-4">
                  <label className="text-sm text-gray-400 w-1/4 shrink-0">
                    Profile Picture
                  </label>
                  <div className="flex-1 flex flex-col items-center -ml-28">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden">
                        {avatarPreview ? (
                          <img
                            src={avatarPreview}
                            alt="Profile"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-12 h-12 text-blue-400" />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-500 transition-colors">
                        <Upload className="w-4 h-4 text-white" />
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={handleAvatarChange}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Only image files (JPG, PNG, GIF) up to 5MB are allowed</p>
                  </div>
                </div>

                {/* Nickname Input */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Nickname
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    placeholder={initialNickname || "Enter your nickname"}
                  />
                </div>

                {/* Profile Action Buttons */}
                <div className="flex gap-3 justify-end mt-4">
                  <button
                    onClick={handleProfileSave}
                    disabled={isProfileLoading || !hasChanges()}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white disabled:opacity-50"
                  >
                    {isProfileLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>

              {/* Request Funds Block */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-xl font-semibold text-white mb-4">Request Funds</h4>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Amount (USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="number"
                      value={fundsAmount}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (value === '' || /^\d*\.?\d*$/.test(value)) {
                          setFundsAmount(value);
                        }
                      }}
                      className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="Enter amount"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                {/* Request Funds Action Button */}
                <div className="flex gap-3 justify-end mt-4">
                  <button
                    onClick={handleFundsRequest}
                    disabled={isFundsLoading || !fundsAmount || parseFloat(fundsAmount) <= 0}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white disabled:opacity-50"
                  >
                    {isFundsLoading ? "Requesting..." : "Request Funds"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-full max-w-md relative z-10 rounded-xl p-6 bg-white/5 backdrop-blur-md border border-white/10 shadow-xl mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-white">Sign Out?</h3>
              <button
                onClick={handleCancelSignOut}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-300 mb-6">
              Are you sure you want to sign out?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancelSignOut}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSignOut}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Sidebar;
