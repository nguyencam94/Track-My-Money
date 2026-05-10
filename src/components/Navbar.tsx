import { Link, useLocation } from 'react-router-dom';
import { Home, CreditCard, PieChart as PieIcon, LogOut, Wallet, Plus, Settings, ChevronDown, User, BarChart3 } from 'lucide-react';
import { logout } from '../lib/firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useTransactionModal } from '../context/TransactionModalContext';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const { profile } = useAuth();
  const { open: openTransactionModal } = useTransactionModal();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navItems = [
    { label: 'Tổng quan', path: '/', icon: Home },
    { label: 'Giao dịch', path: '/transactions', icon: CreditCard },
  ];

  const secondaryNavItems = [
    { label: 'Thống kê', path: '/statistics', icon: BarChart3 },
    { label: 'Quản lý nợ', path: '/debts', icon: Wallet },
  ];

  return (
    <>
      {/* Top Header with Dropdown */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-indigo-50 z-[70] px-4 md:px-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="md:hidden w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-lg shadow-indigo-100">F</div>
          <h1 className="md:hidden text-lg font-black tracking-tight text-indigo-950">FinancePro</h1>
          <div className="hidden md:block"></div>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 p-1.5 pl-3 bg-indigo-50/50 hover:bg-indigo-50 rounded-2xl transition-all border border-indigo-100 group"
          >
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-0.5">Tài khoản</p>
              <p className="text-xs font-bold text-indigo-900 leading-none">{profile?.displayName || 'Người dùng'}</p>
            </div>
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100 group-hover:border-indigo-400 group-hover:text-indigo-700 transition-all">
              <User className="w-4 h-4" />
            </div>
            <ChevronDown className={cn("w-4 h-4 text-indigo-300 transition-transform duration-300", showDropdown && "rotate-180")} />
          </button>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-3 w-56 bg-white rounded-3xl shadow-2xl shadow-indigo-200 border border-indigo-50 overflow-hidden py-2"
              >
                <Link 
                  to="/settings" 
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50 hover:text-indigo-800 transition-all"
                >
                  <Settings className="w-4 h-4" />
                  Cài đặt bảo mật
                </Link>
                <div className="h-px bg-indigo-50 mx-4 my-1" />
                <button 
                  onClick={() => {
                    setShowDropdown(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Đăng xuất
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Mobile Navbar (Centered Plus Button) */}
      <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-white border-t border-slate-100 px-4 py-2 md:hidden flex justify-between items-center shadow-[0_-4px_30px_rgba(0,0,0,0.05)]">
        <div className="flex gap-4 sm:gap-8 lg:gap-12 flex-1 justify-around items-center">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all",
                  isActive ? "text-indigo-600 scale-110" : "text-indigo-400"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-all", isActive && "drop-shadow-sm")} />
                <span className="text-[7px] font-black uppercase tracking-widest leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Floating Action Button (Centered) */}
        <div className="relative -top-6 px-4">
          <button
            onClick={openTransactionModal}
            className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-300 border-4 border-white active:scale-90 transition-all ring-4 ring-indigo-600/5 hover:bg-indigo-700"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>

        <div className="flex gap-4 sm:gap-8 lg:gap-12 flex-1 justify-around items-center">
          {secondaryNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all",
                  isActive ? "text-indigo-600 scale-110" : "text-indigo-400"
                )}
              >
                <item.icon className={cn("w-5 h-5 transition-all", isActive && "drop-shadow-sm")} />
                <span className="text-[7px] font-black uppercase tracking-widest leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar (Adjusted Top for Header) */}
      <nav className="fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-indigo-100 p-6 hidden md:flex flex-col z-50 pt-20">
        <div className="flex items-center gap-3 mb-10 absolute top-5 left-6">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">F</div>
          <h1 className="text-xl font-black tracking-tight text-indigo-950">FinancePro</h1>
        </div>

        <div className="space-y-1">
          {[...navItems, ...secondaryNavItems].map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "px-4 py-4 rounded-2xl flex items-center gap-4 font-bold transition-all mb-1 border-2 border-transparent",
                  isActive 
                    ? "bg-indigo-50/50 border-indigo-50 text-indigo-600 shadow-sm" 
                    : "text-indigo-400 hover:bg-indigo-50/30 hover:text-indigo-900"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-600" : "text-indigo-300")} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-8">
          <button
            onClick={openTransactionModal}
            className="w-full bg-indigo-600 text-white p-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all group"
          >
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
              <Plus className="w-5 h-5" />
            </div>
            Thêm giao dịch
          </button>
        </div>

        <div className="mt-auto">
          <Link 
            to="/settings"
            className={cn(
              "w-full flex items-center gap-4 px-4 py-4 font-bold transition-all hover:bg-indigo-50/30 rounded-2xl mb-1",
              location.pathname === '/settings' ? "text-indigo-600 bg-indigo-50/50" : "text-indigo-400"
            )}
          >
            <Settings className="w-5 h-5" />
            Cài đặt
          </Link>
          <button
            onClick={logout}
            className="w-full flex items-center gap-4 px-4 py-4 text-indigo-400 hover:text-rose-600 font-bold transition-all hover:bg-rose-50 rounded-2xl"
          >
            <LogOut className="w-5 h-5" />
            Đăng xuất
          </button>
        </div>
      </nav>
    </>
  );
}
