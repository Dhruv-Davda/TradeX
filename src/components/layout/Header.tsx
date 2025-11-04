import React, { useState, useEffect, useRef } from 'react';
import { Menu, User, LogOut, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext-simple';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onMenuToggle, isMenuOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleProfileClick = () => {
    setShowProfileMenu(!showProfileMenu);
  };

  // Close profile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-secondary-800/95 backdrop-blur-md border-b border-white/10 px-6 py-4 h-20">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl text-secondary-400 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </motion.button>
          <div className="ml-2 lg:ml-0">
            <h1 className="text-xl font-bold font-display gradient-text">
              TradeX
            </h1>
            <p className="text-xs text-secondary-400">Trading Manager</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          {/* <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-3 text-secondary-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200 group"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-danger-500 rounded-full animate-pulse"></span>
          </motion.button> */}
          
          {/* User Profile */}
          <div className="relative" ref={profileRef}>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleProfileClick}
              className="flex items-center space-x-5 bg-white/5 rounded-xl px-2 py-1 hover:bg-white/10 transition-all duration-200 group cursor-pointer"
            >
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-white">{user?.businessName}</p>
                <p className="text-xs text-secondary-400">{user?.email}</p>
              </div>
              <motion.div 
                className="w-10 h-10 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-glow group-hover:shadow-glow-purple transition-all duration-200"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <User className="w-5 h-5 text-white" />
              </motion.div>
            </motion.div>
            
            {/* Profile Dropdown */}
            {showProfileMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 top-full mt-2 w-48 bg-secondary-800 rounded-xl shadow-xl border border-white/10 py-2 z-50"
              >
                <div className="px-4 py-2 border-b border-white/10">
                  <p className="text-sm font-medium text-white">{user?.businessName}</p>
                  <p className="text-xs text-secondary-400">{user?.email}</p>
                </div>
                <button 
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings/user');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-secondary-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  User Settings
                </button>
                <button 
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings/account');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-secondary-300 hover:bg-white/5 hover:text-white transition-colors"
                >
                  Account Settings
                </button>
              </motion.div>
            )}
          </div>
          
          {/* Logout Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="p-3 text-secondary-400 hover:text-danger-400 hover:bg-danger-500/10 rounded-xl transition-all duration-200 group"
          >
            <LogOut className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200" />
          </motion.button>
        </div>
      </div>
    </header>
  );
};