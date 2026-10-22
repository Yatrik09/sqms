import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import type { NotificationItem } from '../types';
import { api } from '../services/api';
import { ProfileModal } from './ProfileModal';
import { FranchisePlansModal } from './FranchisePlansModal';
import { cleanDisplayName } from '../utils/formatters';
import {
  Car, Bell, LogOut, Sliders, User, ShieldCheck, ChevronDown, Check, X, UserCog, Building2, Sparkles, Smartphone, Menu, TrendingUp, Users, Clock, MapPin
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { user, wsConnected, logout, lastWsEvent } = useAuth();
  // Mutually exclusive dropdown state
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
    <header className="sticky top-0 z-50 bg-white/92 backdrop-blur-xl border-b border-[#d6d6d6] text-[#1d1d1f] shadow-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Brand Logo & Navigation Links */}
          <div className="flex items-center">
            {/* Logo & Brand */}
            <div
              className="flex items-center space-x-2.5 cursor-pointer select-none mr-6 lg:mr-8 shrink-0"
              onClick={() => {
                if (user?.role === 'customer') switchTab('active-service');
                else if (user?.role === 'branch_manager') switchTab('manager-queue');
                else if (user?.role === 'franchise_owner') switchTab('owner-overview');
                else if (user?.role === 'super_admin') switchTab('admin-dashboard');
              }}
            >
              <img
                src="/logo.png"
                alt="DriveOps"
                className="h-8 sm:h-9 w-auto object-contain max-w-[150px] sm:max-w-[170px]"
              />
            </div>

            {/* Navigation Links per Authenticated Role */}
            <nav className="hidden md:flex items-center space-x-1">
              {user?.role === 'customer' && (
                <>
                  <button
                    onClick={() => switchTab('active-service')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'active-service'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    Live Queue
                  </button>
                  <button
                    onClick={() => switchTab('book-service')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'book-service'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    Book Service
                  </button>
                  <button
                    onClick={() => switchTab('history')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'history'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    Service Records
                  </button>
                  <button
                    onClick={() => switchTab('nearby-centers')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'nearby-centers'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    Nearby Workshops
                  </button>
                  <button
                    onClick={() => switchTab('my-vehicles')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'my-vehicles'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    My Vehicles
                  </button>
                  <button
                    onClick={() => switchTab('about-us')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'about-us'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    About Us
                  </button>
                </>
              )}

              {user?.role === 'technician' && (
                <>
                  <button
                    onClick={() => switchTab('floor-mobile')}
                    className={`px-3 py-1.5 rounded-full text-xs transition flex items-center space-x-1.5 cursor-pointer ${
                      currentTab === 'floor-mobile'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Workshop Floor</span>
                  </button>
                  <button
                    onClick={() => switchTab('about-us')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'about-us'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
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
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'manager-queue'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    Live Workshop Queue
                  </button>
                  <button
                    onClick={() => switchTab('floor-mobile')}
                    className={`px-3 py-1.5 rounded-full text-xs transition flex items-center space-x-1.5 cursor-pointer ${
                      currentTab === 'floor-mobile'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Floor View</span>
                  </button>
                  <button
                    onClick={() => switchTab('manager-analytics')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'manager-analytics'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    Branch Analytics
                  </button>
                  <button
                    onClick={() => switchTab('about-us')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'about-us'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
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
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'owner-overview'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    Multi-Branch Overview
                  </button>
                  <button
                    onClick={() => switchTab('owner-analytics')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'owner-analytics'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    Network Analytics
                  </button>
                  <button
                    onClick={() => switchTab('owner-branches')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'owner-branches'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    Workshop Branches
                  </button>
                  <button
                    onClick={() => switchTab('owner-managers')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'owner-managers'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    Branch Managers
                  </button>
                  <button
                    onClick={() => switchTab('about-us')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'about-us'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
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
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'admin-dashboard'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    Plans & Revenue
                  </button>
                  <button
                    onClick={() => switchTab('admin-centers')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'admin-centers'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    Workshop Directory
                  </button>
                  <button
                    onClick={() => switchTab('admin-ml')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'admin-ml'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    ML Retraining & Models
                  </button>
                  <button
                    onClick={() => switchTab('admin-audit')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'admin-audit'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    System Audit Trail
                  </button>
                  <button
                    onClick={() => switchTab('about-us')}
                    className={`px-3 py-1.5 rounded-full text-xs transition cursor-pointer ${
                      currentTab === 'about-us'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]'
                        : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#fafafc] font-normal'
                    }`}
                  >
                    About Us
                  </button>
                </>
              )}
            </nav>
          </div>

          {/* Right Controls: User Profile, Notifications, Direct Log Out */}
          <div className="flex items-center space-x-2 sm:space-x-3 pl-3 border-l border-[#e6e6e8]">
            {/* Mobile Backdrop Overlay for Dropdowns */}
            {openDropdown && (
              <div
                className="fixed inset-0 z-40 bg-black/20 backdrop-blur-xs sm:hidden"
                onClick={() => setOpenDropdown(null)}
              />
            )}

            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setOpenDropdown(prev => prev === 'notifications' ? null : 'notifications')}
                className={`p-2 rounded-full relative transition cursor-pointer ${
                  openDropdown === 'notifications'
                    ? 'bg-[#f5f5f7] text-[#1d1d1f] ring-1 ring-[#d6d6d6]'
                    : 'text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
                }`}
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0071e3]" />
                )}
              </button>

              {openDropdown === 'notifications' && (
                <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 bg-[#fafafc] border border-[#d6d6d6] rounded-[20px] shadow-lg py-2 z-50 text-[#1d1d1f] animate-in fade-in slide-in-from-top-1 duration-150 max-w-sm sm:max-w-none mx-auto sm:mx-0">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#e6e6e8]">
                    <div className="flex items-center space-x-1.5">
                      <Bell className="w-3.5 h-3.5 text-[#0071e3]" />
                      <span className="text-xs font-semibold text-[#1d1d1f]">Notifications ({unreadCount})</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {unreadCount > 0 && (
                        <button onClick={handleMarkAllRead} className="text-[11px] text-[#0066cc] hover:underline cursor-pointer">
                          Mark all read
                        </button>
                      )}
                      <button
                        onClick={() => setOpenDropdown(null)}
                        className="p-1 text-[#707070] hover:text-[#1d1d1f] sm:hidden cursor-pointer rounded-lg"
                        title="Close notifications"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-[#e6e6e8]">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#707070] space-y-1">
                        <Bell className="w-6 h-6 text-[#86868b] mx-auto mb-2 opacity-50" />
                        <div className="font-medium text-[#1d1d1f]">No notifications yet</div>
                        <div className="text-[11px] text-[#86868b]">Live service stage and bay updates will appear here.</div>
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-3 text-xs ${n.read_status ? 'opacity-60' : 'bg-white'}`}>
                          <div className="font-semibold text-[#1d1d1f]">{n.title}</div>
                          <div className="text-[#707070] mt-0.5 text-[11px] leading-relaxed break-words">{n.message}</div>
                          <div className="text-[10px] text-[#86868b] mt-1 font-mono">{n.created_at ? n.created_at.slice(0, 16).replace('T', ' ') : ''}</div>
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
                className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-full border transition cursor-pointer ${
                  openDropdown === 'user'
                    ? 'bg-[#f5f5f7] border-[#d6d6d6]'
                    : 'bg-white hover:bg-[#f5f5f7] border-[#d6d6d6]'
                }`}
                title="Account Details"
              >
                <div className="w-5 h-5 rounded-full bg-[#1d1d1f] text-white font-semibold text-[10px] flex items-center justify-center">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="text-xs font-medium text-[#1d1d1f] leading-tight">{cleanDisplayName(user?.name)}</div>
                </div>
                <ChevronDown className={`w-3 h-3 text-[#707070] transition-transform duration-200 ${openDropdown === 'user' ? 'rotate-180' : ''}`} />
              </button>

              {/* User Account Popover */}
              {openDropdown === 'user' && (
                <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-72 bg-[#fafafc] border border-[#d6d6d6] rounded-[20px] shadow-lg p-4 z-50 text-[#1d1d1f] animate-in fade-in slide-in-from-top-1 duration-150 max-w-sm sm:max-w-none mx-auto sm:mx-0">
                  <div className="flex items-center justify-between pb-3 border-b border-[#e6e6e8]">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#1d1d1f] text-white font-semibold text-xs flex items-center justify-center">
                        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#1d1d1f]">{cleanDisplayName(user?.name)}</div>
                        <div className="text-[11px] text-[#707070] truncate max-w-[150px]">{user?.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => setOpenDropdown(null)}
                      className="p-1 rounded-full text-[#707070] hover:text-[#1d1d1f] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="pt-3 space-y-2">
                    {/* 1. Edit Profile */}
                    <button
                      onClick={() => {
                        setOpenDropdown(null);
                        setShowProfileModal(true);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-white hover:bg-[#f5f5f7] border border-[#d6d6d6] text-xs font-medium text-[#1d1d1f] transition flex items-center space-x-2.5 cursor-pointer text-left"
                    >
                      <UserCog className="w-4 h-4 text-[#0071e3] shrink-0" />
                      <div className="flex-1">
                        <div className="leading-tight font-semibold">Edit Profile</div>
                        <div className="text-[10px] text-[#707070]">Account details & credentials</div>
                      </div>
                    </button>

                    {/* 2. Your Plans (Franchise Owners) */}
                    {user?.role === 'franchise_owner' && (
                      <button
                        onClick={() => {
                          setOpenDropdown(null);
                          setShowPlansModal(true);
                        }}
                        className="w-full py-2 px-3 rounded-xl bg-white hover:bg-[#f5f5f7] border border-[#d6d6d6] text-xs font-medium text-[#1d1d1f] transition flex items-center space-x-2.5 cursor-pointer text-left"
                      >
                        <Sparkles className="w-4 h-4 text-[#0071e3] shrink-0" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="leading-tight font-semibold">Your Plans</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]">
                              {user?.plan_name && user.plan_name !== 'None' ? user.plan_name : 'Multi-Branch'}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#707070]">Subscription tier & center quota</div>
                        </div>
                      </button>
                    )}

                    {/* 3. Log Out */}
                    <button
                      onClick={handleLogout}
                      className="w-full py-2 px-3 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 text-xs font-medium text-rose-600 transition flex items-center space-x-2.5 cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
                      <div className="flex-1">
                        <div className="leading-tight font-semibold">Log Out</div>
                        <div className="text-[10px] text-[#707070]">Sign out of your session</div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Prominent Outlined Log Out Pill */}
            <button
              onClick={handleLogout}
              title="Sign out of DriveOps platform"
              className="flex items-center space-x-1.5 px-3 py-1 rounded-full border border-[#86868b] hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-medium transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#707070]" />
              <span className="hidden sm:inline">Log Out</span>
            </button>

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="md:hidden p-1.5 rounded-full text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] border border-[#d6d6d6] transition cursor-pointer"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Responsive Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-[#e6e6e8] space-y-1 bg-[#fafafc] rounded-b-[20px] px-2">
            {user?.role === 'customer' && (
              <>
                <button
                  onClick={() => { switchTab('active-service'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'active-service' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Car className="w-4 h-4 text-[#0071e3]" />
                  <span>Live Queue</span>
                </button>
                <button
                  onClick={() => { switchTab('book-service'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'book-service' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#0071e3]" />
                  <span>Book Service</span>
                </button>
                <button
                  onClick={() => { switchTab('history'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'history' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Clock className="w-4 h-4 text-[#0071e3]" />
                  <span>Service Records</span>
                </button>
                <button
                  onClick={() => { switchTab('nearby-centers'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'nearby-centers' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-[#0071e3]" />
                  <span>Nearby Workshops</span>
                </button>
                <button
                  onClick={() => { switchTab('my-vehicles'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'my-vehicles' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Car className="w-4 h-4 text-[#707070]" />
                  <span>My Vehicles</span>
                </button>
                <button
                  onClick={() => { switchTab('about-us'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium transition flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'about-us' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#707070]" />
                  <span>About Us</span>
                </button>
              </>
            )}

            {user?.role === 'technician' && (
              <>
                <button
                  onClick={() => { switchTab('floor-mobile'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'floor-mobile' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Workshop Floor Screen</span>
                </button>
                <button
                  onClick={() => { switchTab('about-us'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'about-us' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#707070]" />
                  <span>About Us</span>
                </button>
              </>
            )}

            {user?.role === 'branch_manager' && (
              <>
                <button
                  onClick={() => { switchTab('manager-queue'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'manager-queue' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#0071e3]" />
                  <span>Live Operations & Queue</span>
                </button>
                <button
                  onClick={() => { switchTab('floor-mobile'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'floor-mobile' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Workshop Floor Screen</span>
                </button>
                <button
                  onClick={() => { switchTab('manager-analytics'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'manager-analytics' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-[#0071e3]" />
                  <span>Branch Analytics</span>
                </button>
                <button
                  onClick={() => { switchTab('about-us'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'about-us' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#707070]" />
                  <span>About Us</span>
                </button>
              </>
            )}

            {user?.role === 'franchise_owner' && (
              <>
                <button
                  onClick={() => { switchTab('owner-overview'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'owner-overview' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#0071e3]" />
                  <span>Multi-Branch Overview</span>
                </button>
                <button
                  onClick={() => { switchTab('owner-analytics'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'owner-analytics' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 text-[#0071e3]" />
                  <span>Network Analytics</span>
                </button>
                <button
                  onClick={() => { switchTab('owner-branches'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'owner-branches' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#707070]" />
                  <span>Workshop Branches</span>
                </button>
                <button
                  onClick={() => { switchTab('owner-managers'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'owner-managers' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Users className="w-4 h-4 text-[#707070]" />
                  <span>Branch Managers</span>
                </button>
                <button
                  onClick={() => { switchTab('about-us'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'about-us' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#707070]" />
                  <span>About Us</span>
                </button>
              </>
            )}

            {user?.role === 'super_admin' && (
              <>
                <button
                  onClick={() => { switchTab('admin-dashboard'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'admin-dashboard' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-[#0071e3]" />
                  <span>Plans & Revenue</span>
                </button>
                <button
                  onClick={() => { switchTab('admin-centers'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'admin-centers' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#0071e3]" />
                  <span>Workshop Directory</span>
                </button>
                <button
                  onClick={() => { switchTab('admin-ml'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'admin-ml' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Sliders className="w-4 h-4 text-[#0071e3]" />
                  <span>ML Retraining & Models</span>
                </button>
                <button
                  onClick={() => { switchTab('admin-audit'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'admin-audit' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-[#0071e3]" />
                  <span>System Audit Trail</span>
                </button>
                <button
                  onClick={() => { switchTab('about-us'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium flex items-center space-x-2.5 cursor-pointer ${
                    currentTab === 'about-us' ? 'bg-[#f5f5f7] text-[#1d1d1f] font-semibold border border-[#d6d6d6]' : 'text-[#707070] hover:bg-white'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-[#707070]" />
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
