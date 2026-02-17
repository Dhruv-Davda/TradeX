import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  ShoppingCart,
  TrendingUp,
  History,
  BarChart3,
  Receipt,
  Users,
  Coins,
  Package,
  Scale,
  DollarSign,
  Database,
  Layers,
  Gem,
  ShoppingBag,
  Tag,
  Hammer,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface NavItem {
  name: string;
  href: string;
  icon: React.FC<{ className?: string }>;
}

interface NavSection {
  label?: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Buy', href: '/buy', icon: ShoppingCart },
      { name: 'Sell', href: '/sell', icon: TrendingUp },
      { name: 'Transfer', href: '/transfer', icon: Receipt },
      { name: 'Settlement', href: '/settlement', icon: Coins },
      { name: 'Trade History', href: '/history', icon: History },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      { name: 'Expenses', href: '/expenses', icon: Receipt },
      { name: 'Income', href: '/income', icon: DollarSign },
      { name: 'Merchants', href: '/merchants', icon: Users },
    ],
  },
  {
    label: 'Jewellery',
    items: [
      { name: 'Ghaat', href: '/ghaat', icon: Gem },
      { name: 'Ghaat Buy', href: '/ghaat-buy', icon: ShoppingBag },
      { name: 'Ghaat Sell', href: '/ghaat-sell', icon: Tag },
      { name: 'Karigars', href: '/karigars', icon: Hammer },
      { name: 'Raw Gold', href: '/raw-gold', icon: Coins },
    ],
  },
  {
    items: [
      { name: 'Data Migration', href: '/migration', icon: Database },
    ],
  },
];

interface SidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

// Sidebar component with mobile support
export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onMobileClose }) => {
  // Stock is now managed by the database through StockService
  return (
    <div className={`fixed inset-y-0 left-0 z-40 w-64 glass-dark border-r border-white/10 transform transition-all duration-300 ease-in-out ${
      isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    }`}>
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="flex items-center px-6 py-6 border-b border-white/10">
          <motion.div 
            className="w-10 h-10 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl flex items-center justify-center shadow-glow"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <Coins className="w-6 h-6 text-white" />
          </motion.div>
          <div className="ml-4">
            <h1 className="text-xl font-bold font-display gradient-text">TradeManager</h1>
            <p className="text-xs text-secondary-400">for your business</p>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto sidebar-scroll relative">
          {(() => {
            let globalIndex = 0;
            return navigationSections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="pt-2 pb-2">
                {section.label && (
                  <div className="px-4 py-2 mt-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-secondary-500">{section.label}</span>
                  </div>
                )}
                {section.items.map((item) => {
                  const index = globalIndex++;
                  return (
                    <NavLink
                      key={item.name}
                      to={item.href}
                      onClick={onMobileClose}
                      className={({ isActive }) =>
                        `flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative ${
                          isActive
                            ? 'bg-gradient-to-r from-primary-500/20 to-accent-500/20 text-white shadow-glow border border-primary-500/30'
                            : 'text-secondary-300 hover:bg-white/5 hover:text-white hover:shadow-soft'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <motion.div
                          className="flex items-center w-full"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                            delay: index * 0.05
                          }}
                          whileHover={{ x: 4 }}
                        >
                          <div className={`p-2 rounded-lg mr-3 transition-all duration-200 ${
                            isActive
                              ? 'bg-primary-500/20 text-primary-400'
                              : 'text-secondary-400 group-hover:text-primary-400 group-hover:bg-primary-500/10'
                          }`}>
                            <item.icon className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-sm">{item.name}</span>
                          {isActive && (
                            <motion.div
                              className="absolute right-2 w-2 h-2 bg-primary-400 rounded-full"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            />
                          )}
                        </motion.div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            ));
          })()}
        </nav>
        
        {/* Stock Management
        <div className="px-4 py-4 border-t border-white/10">
          <h3 className="text-sm font-semibold text-white mb-3 px-2">Current Stock</h3>
          <div className="space-y-2">
            {stock.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    item.metalType === 'gold' ? 'bg-yellow-400/10' : 'bg-gray-400/10'
                  }`}>
                    {item.metalType === 'gold' ? (
                      <Package className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <Scale className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white capitalize">
                      {item.metalType}
                    </p>
                    <p className={`text-xs ${item.quantity < 0 ? 'text-red-400' : 'text-secondary-400'}`}>
                      {item.metalType === 'gold' ? item.quantity : (item.quantity / 1000).toFixed(2)} {item.metalType === 'gold' ? 'gms' : 'kg'}
                      {item.quantity < 0 && ' ⚠️'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
         */}
        {/* Footer */}
        <div className="p-4 border-t border-white/10">
          <div className="text-xs text-secondary-500 text-center">
            <p>TradeX by Dhruv Davda</p>
            <p className="mt-1">© 2025 - v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
};