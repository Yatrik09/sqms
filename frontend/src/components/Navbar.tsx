import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserRole, NotificationItem } from '../types';
import { api } from '../services/api';
import { ProfileModal } from './ProfileModal';
import { FranchisePlansModal } from './FranchisePlansModal';
import { cleanDisplayName } from '../utils/formatters';
import {
  Car, Bell, LogOut, Sliders, User, ShieldCheck, ChevronDown, Check, X, UserCog, Building2, Sparkles, Smartphone, Menu
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, wsConnected, logout, lastWsEvent } = useAuth();
  // Mutually exclusive dropdown state: only one popover can ever be open at a time
  const [openDropdown, setOpenDropdown] = useState<'notifications' | 'user' | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const notificationsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close overlays on outside click, escape key, or global modal/overlay events
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const insideNotifications = notificationsRef.current && notificationsRef.current.contains(target);
      const insideUserMenu = userMenuRef.current && userMenuRef.current.contains(target);

      if (!insideNotifications && !insideUserMenu) {
        setOpenDropdown(null);
      }
    };

    const handleCloseAll = () => {
      setOpenDropdown(null);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('close-sqms-overlays', handleCloseAll);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('close-sqms-overlays', handleCloseAll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const switchTab = (tab: string) => {
    setOpenDropdown(null);
    setCurrentTab(tab);
  };

  // Fetch notifications
  const loadNotifications = async () => {
    try {
      const data = await api.getMyNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n: NotificationItem) => !n.read_status).length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, lastWsEvent]);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      loadNotifications();
    } catch {
      // ignore
    }
  };

  const handleLogout = () => {
    setOpenDropdown(null);
    logout();
  };

  return (
    <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 text-white shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => {
              if (user?.role === 'customer') switchTab('active-service');
              else if (user?.role === 'branch_manager') switchTab('manager-queue');
              else if (user?.role === 'franchise_owner') switchTab('owner-overview');
              else if (user?.role === 'super_admin') switchTab('admin-dashboard');
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/30">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div className="flex items-center">
              <span className="text-2xl font-black tracking-tight text-white">Smart</span>
              <span className="text-2xl font-black tracking-tight text-blue-500 ml-1">Q</span>
            </div>
          </div>

          {/* Navigation Links per Authenticated Role */}
          <nav className="hidden md:flex items-center space-x-1">
            {user?.role === 'customer' && (
              <>
                <button
                  onClick={() => switchTab('active-service')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'active-service' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Live Service Tracking
                </button>
                <button
                  onClick={() => switchTab('book-service')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'book-service' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Book Service & AI Recommendation
                </button>
                <button
                  onClick={() => switchTab('my-vehicles')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'my-vehicles' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  My Vehicles
                </button>
                <button
                  onClick={() => switchTab('about-us')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'about-us' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  About Us
                </button>
                <button
                  onClick={() => setShowPlansModal(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 bg-gradient-to-r from-emerald-500/25 via-blue-500/25 to-indigo-500/25 hover:from-emerald-500/35 hover:to-indigo-500/35 text-emerald-300 border border-emerald-500/40 shadow-sm cursor-pointer ml-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  <span>Upgrade to Franchise</span>
                </button>
              </>
            )}

            {user?.role === 'technician' && (
              <>
                <button
                  onClick={() => switchTab('floor-mobile')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                    currentTab === 'floor-mobile'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-amber-300 hover:bg-slate-800'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Workshop Floor Screen</span>
                </button>
                <button
                  onClick={() => switchTab('about-us')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'about-us' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  About Us
                </button>
              </>
            )}

            {user?.role === 'branch_manager' && (
              <>
                <button
                  onClick={() => switchTab('manager-queue')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'manager-queue' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Live Workshop Queue
                </button>
                <button
                  onClick={() => switchTab('floor-mobile')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1.5 ${
                    currentTab === 'floor-mobile'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-amber-400 hover:bg-slate-800 border border-amber-500/30'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>📱 Floor Screen</span>
                </button>
                <button
                  onClick={() => switchTab('manager-analytics')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'manager-analytics' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Branch Analytics
                </button>
                <button
                  onClick={() => switchTab('about-us')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'about-us' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  About Us
                </button>
              </>
            )}

            {user?.role === 'franchise_owner' && (
              <>
                <button
                  onClick={() => switchTab('owner-overview')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'owner-overview' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Multi-Branch Overview
                </button>
                <button
                  onClick={() => switchTab('owner-analytics')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'owner-analytics' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Network Analytics
                </button>
                <button
                  onClick={() => switchTab('about-us')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'about-us' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  About Us
                </button>
              </>
            )}

            {user?.role === 'super_admin' && (
              <>
                <button
                  onClick={() => switchTab('admin-dashboard')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'admin-dashboard' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Admin System
                </button>
                <button
                  onClick={() => switchTab('admin-centers')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'admin-centers' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Workshops & Centers
                </button>
                <button
                  onClick={() => switchTab('admin-ml')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'admin-ml' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  ML Models & Retraining
                </button>
                <button
                  onClick={() => switchTab('admin-audit')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'admin-audit' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  Audit Trail
                </button>
                <button
                  onClick={() => switchTab('about-us')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    currentTab === 'about-us' ? 'bg-blue-600 text-white shadow' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  About Us
                </button>
              </>
            )}
          </nav>

          {/* Right Controls: User Profile, Notifications, Direct Log Out */}
          <div className="flex items-center space-x-3 sm:space-x-4 pl-4 border-l border-slate-800">

            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setOpenDropdown(prev => prev === 'notifications' ? null : 'notifications')}
                className={`p-2 rounded-xl relative transition cursor-pointer ${
                  openDropdown === 'notifications'
                    ? 'bg-slate-800 text-white ring-1 ring-blue-500/50'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </button>

              {openDropdown === 'notifications' && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 text-slate-200 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
                    <span className="text-xs font-bold text-white">Notifications ({unreadCount})</span>
                    {unreadCount > 0 && (
                      <button onClick={handleMarkAllRead} className="text-[11px] text-blue-400 hover:underline">
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-700/50">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400">No notifications yet.</div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-3 text-xs ${n.read_status ? 'opacity-60' : 'bg-slate-700/30'}`}>
                          <div className="font-semibold text-slate-200">{n.title}</div>
                          <div className="text-slate-300 mt-0.5 text-[11px]">{n.message}</div>
                          <div className="text-[10px] text-slate-500 mt-1">{n.created_at.slice(0, 16)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Authenticated User Profile with Dropdown */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setOpenDropdown(prev => prev === 'user' ? null : 'user')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                  openDropdown === 'user'
                    ? 'bg-slate-750 border-blue-500/50 ring-1 ring-blue-500/30 shadow-md'
                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700 hover:border-slate-600'
                }`}
                title="Account Details"
              >
                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-bold text-slate-200 leading-tight">{cleanDisplayName(user?.name)}</div>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${openDropdown === 'user' ? 'rotate-180' : ''}`} />
              </button>

              {/* User Account Popover */}
              {openDropdown === 'user' && (
                <div className="absolute right-0 mt-2 w-72 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 text-slate-200 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">{cleanDisplayName(user?.name)}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[150px]">{user?.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setOpenDropdown(null)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-3 border-t border-slate-700 space-y-2">
                    {/* 1. Edit Profile */}
                    <button
                      onClick={() => {
                        setOpenDropdown(null);
                        setShowProfileModal(true);
                      }}
                      className="w-full py-2.5 px-3 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 hover:text-blue-200 border border-blue-500/30 text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer shadow-sm text-left"
                    >
                      <UserCog className="w-4 h-4 text-blue-400 shrink-0" />
                      <div className="flex-1">
                        <div className="leading-tight">Edit Profile</div>
                        <div className="text-[10px] text-slate-400 font-normal">Account details & password</div>
                      </div>
                    </button>

                    {/* 2. Your Plans (Only visible to Franchise Owners who actually subscribe to branch tiers) */}
                    {user?.role === 'franchise_owner' && (
                      <button
                        onClick={() => {
                          setOpenDropdown(null);
                          setShowPlansModal(true);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer shadow-sm text-left"
                      >
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="leading-tight">Your Plans</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-semibold border border-indigo-400/30">
                              {user?.plan_name && user.plan_name !== 'None' ? user.plan_name : 'Multi-Branch'}
                            </span>
                          </div>
                          <div className="text-[10px] text-indigo-300/80 font-normal">Subscription tier & center quota</div>
                        </div>
                      </button>
                    )}

                    {/* 2b. For Customers: Upgrade to Franchise Owner CTA */}
                    {user?.role === 'customer' && (
                      <button
                        onClick={() => {
                          setOpenDropdown(null);
                          setShowPlansModal(true);
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500/20 via-blue-500/20 to-indigo-500/20 hover:from-emerald-500/30 hover:to-indigo-500/30 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer shadow-sm text-left"
                      >
                        <Sparkles className="w-4 h-4 text-yellow-300 shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="leading-tight">Upgrade to Franchise</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-200 font-semibold border border-emerald-400/30">
                              Partner
                            </span>
                          </div>
                          <div className="text-[10px] text-emerald-300/80 font-normal">Start your workshop franchise</div>
                        </div>
                      </button>
                    )}


                    {/* 3. Log Out */}
                    <button
                      onClick={handleLogout}
                      className="w-full py-2.5 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-red-200 border border-red-500/30 text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer shadow-sm text-left"
                    >
                      <LogOut className="w-4 h-4 text-red-400 shrink-0" />
                      <div className="flex-1">
                        <div className="leading-tight">Log Out</div>
                        <div className="text-[10px] text-red-400/70 font-normal">Sign out of your session</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Prominent Log Out Button */}
            <button
              onClick={handleLogout}
              title="Sign out of SQMS platform"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log Out</span>
            </button>

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-amber-400" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Responsive Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-slate-800/80 space-y-2 animate-fadeIn bg-slate-900/90 rounded-b-2xl px-2">
            {user?.role === 'customer' && (
              <>
                <button
                  onClick={() => { switchTab('active-service'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'active-service' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Car className="w-4 h-4 text-blue-400" />
                  <span>Live Service Tracking</span>
                </button>
                <button
                  onClick={() => { switchTab('book-service'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'book-service' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span>Book Service & AI Recommendation</span>
                </button>
                <button
                  onClick={() => { switchTab('my-vehicles'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'my-vehicles' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Car className="w-4 h-4 text-blue-400" />
                  <span>My Vehicles</span>
                </button>
                <button
                  onClick={() => { switchTab('about-us'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'about-us' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>About Us</span>
                </button>
                <button
                  onClick={() => { setShowPlansModal(true); setMobileMenuOpen(false); }}
                  className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-emerald-300 border border-emerald-500/40 transition flex items-center space-x-2.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                  <span>Upgrade to Franchise</span>
                </button>
              </>
            )}

            {user?.role === 'technician' && (
              <>
                <button
                  onClick={() => { switchTab('floor-mobile'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'floor-mobile' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-amber-300 hover:bg-slate-800'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Workshop Floor Screen</span>
                </button>
                <button
                  onClick={() => { switchTab('about-us'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'about-us' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>About Us</span>
                </button>
              </>
            )}

            {user?.role === 'branch_manager' && (
              <>
                <button
                  onClick={() => { switchTab('manager-queue'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'manager-queue' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Live Operations & Queue</span>
                </button>
                <button
                  onClick={() => { switchTab('floor-mobile'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-black flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'floor-mobile' ? 'bg-amber-500 text-slate-950 shadow-md' : 'text-amber-300 hover:bg-slate-800'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Workshop Floor Screen</span>
                </button>
                <button
                  onClick={() => { switchTab('manager-analytics'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'manager-analytics' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>Branch Analytics</span>
                </button>
                <button
                  onClick={() => { switchTab('about-us'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'about-us' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>About Us</span>
                </button>
              </>
            )}

            {user?.role === 'franchise_owner' && (
              <>
                <button
                  onClick={() => { switchTab('owner-overview'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'owner-overview' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Multi-Branch Overview</span>
                </button>
                <button
                  onClick={() => { switchTab('manager-queue'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'manager-queue' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>Workshop Floor Operations</span>
                </button>
                <button
                  onClick={() => { switchTab('owner-analytics'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'owner-analytics' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>Network Analytics</span>
                </button>
                <button
                  onClick={() => { switchTab('about-us'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'about-us' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>About Us</span>
                </button>
              </>
            )}

            {user?.role === 'super_admin' && (
              <>
                <button
                  onClick={() => { switchTab('admin-dashboard'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'admin-dashboard' ? 'bg-purple-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                  <span>Platform Operations</span>
                </button>
                <button
                  onClick={() => { switchTab('admin-centers'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'admin-centers' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Workshops & Centers</span>
                </button>
                <button
                  onClick={() => { switchTab('admin-ml'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'admin-ml' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>ML Retraining & Models</span>
                </button>
                <button
                  onClick={() => { switchTab('admin-audit'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'admin-audit' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Audit Trail</span>
                </button>
                <button
                  onClick={() => { switchTab('about-us'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'about-us' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>About Us</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Profile & Account Edit Modal */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onOpenPlans={() => setShowPlansModal(true)}
      />

      {/* Franchise & Workshop Plans Modal */}
      <FranchisePlansModal
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
      />
    </header>
  );
};
