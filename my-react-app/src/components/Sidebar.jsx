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
  const [isLoading, setIsLoading] = useState(false);
  const [initialNickname, setInitialNickname] = useState("");
  const [error, setError] = useState("");
  const [showError, setShowError] = useState(false);
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
    setIsLoading(true);
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
      setIsLoading(false);
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
    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/request-funds", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ amount: parseFloat(fundsAmount) })
      });

      if (!response.ok) throw new Error("Failed to request funds");

      setFundsAmount("");
      setShowSettingsModal(false);
    } catch (error) {
      console.error("Funds request error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="w-72 bg-[#1F2128] p-6 flex flex-col text-white">
        <div className="flex items-center gap-2 mb-8">
          <LineChart className="w-8 h-8 text-blue-500" />
          <span className="text-2xl font-bold">FinSight</span>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search stocks..."
            className="w-full bg-white/5 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <nav className="space-y-2">
          {[
            { icon: <BarChart3 />, label: "Dashboard", path: "/dashboard" },
            { icon: <Wallet />, label: "Portfolio", path: "/portfolio" },
            { icon: <Brain />, label: "AI Prediction", path: "/prediction" },
            { icon: <Robot />, label: "Trade Simulator", path: "/simulator" },
          ].map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 transition-all hover:translate-x-1"
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto">
          <button 
            onClick={() => setShowSettingsModal(true)}
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 w-full"
          >
            <Settings />
            <span>Settings</span>
          </button>

          <div className="relative profile-section">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 w-full mt-4 p-4 rounded-lg glass-effect hover:bg-white/5 transition-colors"
            >
              <div className="relative flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center overflow-hidden">
                  {avatarPreview ? (
                    <img
                      src={avatarPreview}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-blue-400" />
                  )}
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1F2128]" />
              </div>
              <p className="font-semibold text-base whitespace-nowrap overflow-hidden overflow-ellipsis">
                {user?.nickname || user?.name?.split(' ')[0] || 'Loading...'}
              </p>
              <Bell className="ml-auto flex-shrink-0 w-5 h-5 text-gray-400" />
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-4 rounded-lg bg-[#2A2D38] border border-white/10 shadow-xl">
                <div className="mb-4 pb-4 border-b border-white/10">
                  <p className="text-sm text-gray-400">Signed in as</p>
                  <p className="font-semibold mt-1">{user?.name || 'Loading...'}</p>
                  <p className="text-sm text-gray-400 mt-1">{user?.email || ''}</p>
                </div>
                <button
                  onClick={handleSignOutClick}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
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
                    disabled={isLoading || !hasChanges()}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white disabled:opacity-50"
                  >
                    {isLoading ? "Saving..." : "Save Changes"}
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
                    disabled={isLoading || !fundsAmount || parseFloat(fundsAmount) <= 0}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors text-white disabled:opacity-50"
                  >
                    {isLoading ? "Requesting..." : "Request Funds"}
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
