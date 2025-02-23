import React from "react";
import {
  LineChart,
  BarChart3,
  Brain,
  Wallet,
  Settings,
  Bell,
  Search,
  Notebook as Robot,
} from "lucide-react";
import { Link } from "react-router-dom";

function Sidebar() {
  return (
    // Give the sidebar a separate background color or gradient
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
          { icon: <BarChart3 />, label: "Dashboard", path: "/" },
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
        <button className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 w-full">
          <Settings />
          <span>Settings</span>
        </button>

        <div className="flex items-center gap-4 mt-4 p-4 rounded-lg glass-effect">
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=faces"
              alt="Profile"
              className="w-10 h-10 rounded-full"
            />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1F2128]" />
          </div>
          <div>
            <p className="font-medium">John Doe</p>
            <p className="text-sm text-gray-400">Premium Plan</p>
          </div>
          <Bell className="ml-auto w-5 h-5 text-gray-400" />
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
