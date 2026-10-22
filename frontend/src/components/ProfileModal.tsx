import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import {
  X, User, Mail, Phone, Lock, CheckCircle2, AlertCircle, Save, KeyRound,
  Building2, Sparkles, MapPin, Navigation, Compass, RefreshCw, ArrowRight, CheckCircle
} from 'lucide-react';
import { POPULAR_AREAS, findClosestArea } from '../utils/geo';
import { AreaSelectDropdown } from './AreaSelectDropdown';
import { cleanDisplayName } from '../utils/formatters';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPlans?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onOpenPlans }) => {
  useLockBodyScroll(isOpen);
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState<string>(user?.name || '');
  const [email, setEmail] = useState<string>(user?.email || '');
  const [phone, setPhone] = useState<string>(user?.phone || '');
  const [city, setCity] = useState<string>(user?.city || 'Ahmedabad');
  const [area, setArea] = useState<string>(user?.area || 'Science City');
  const [latitude, setLatitude] = useState<number>(user?.latitude || 23.0784);
  const [longitude, setLongitude] = useState<number>(user?.longitude || 72.5074);
  const [detectingGps, setDetectingGps] = useState<boolean>(false);

  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPasswordChange, setShowPasswordChange] = useState<boolean>(false);

  const [planInfo, setPlanInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state whenever opened
  useEffect(() => {
    if (user && isOpen) {
      setName(user.name);
      setEmail(user.email);
      setPhone(user.phone || '');
      setCity(user.city || 'Ahmedabad');
      setArea(user.area || 'Science City');
      setLatitude(user.latitude || 23.0784);
      setLongitude(user.longitude || 72.5074);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
      setSuccessMessage(null);
      setErrorMessage(null);

      if (user.role === 'franchise_owner') {
        api.getMyPlan()
          .then((p) => setPlanInfo(p))
          .catch(() => setPlanInfo(null));
      }
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSelectArea = (areaName: string) => {
    setArea(areaName);
    const matched = POPULAR_AREAS.find((a) => a.name.toLowerCase() === areaName.toLowerCase());
    if (matched) {
      setCity(matched.city);
      setLatitude(matched.lat);
      setLongitude(matched.lon);
    }
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lon = Math.round(pos.coords.longitude * 10000) / 10000;
        setLatitude(lat);
        setLongitude(lon);
        const closest = findClosestArea(lat, lon);
        setArea(closest.name);
        setCity(closest.city);
        setDetectingGps(false);
        setSuccessMessage(`Detected location: ${closest.name}, ${closest.city} (GPS matched)`);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setDetectingGps(false);
        setErrorMessage('Unable to retrieve GPS coordinates. Please select your area from the list.');
      },
      { timeout: 7000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    // Validation
    if (showPasswordChange) {
      if (!currentPassword) {
        setErrorMessage('Current password is required to set a new password.');
        setLoading(false);
        return;
      }
      if (newPassword.length < 6) {
        setErrorMessage('New password must be at least 6 characters long.');
        setLoading(false);
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMessage('New password and confirmation do not match.');
        setLoading(false);
        return;
      }
    }

    try {
      await updateProfile({
        name,
        email,
        phone,
        city,
        area,
        latitude,
        longitude,
        current_password: showPasswordChange ? currentPassword : undefined,
        new_password: showPasswordChange ? newPassword : undefined,
      });

      setSuccessMessage('Profile and location updated successfully! Workshop distance recommendations have been re-calibrated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordChange(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto overscroll-contain animate-in fade-in duration-200 py-8 sm:py-14">
      <div className="bg-white border border-[#d6d6d6] rounded-[28px] max-w-xl w-full shadow-2xl relative my-auto text-[#1d1d1f] z-[10000] max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header - Fixed & Spaced */}
        <div className="p-5 sm:px-8 sm:py-6 border-b border-[#e6e6e8] shrink-0 flex items-center justify-between bg-white">
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] tracking-tight flex items-center space-x-2.5">
              <User className="w-5 h-5 text-[#0071e3]" />
              <span>User Profile & Location</span>
            </h2>
            <p className="text-xs text-[#707070] mt-0.5">
              Manage your personal credentials, contact details, and home proximity area.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#707070] hover:text-[#1d1d1f] transition flex items-center justify-center cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form with Scrollable Body and Fixed Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-8 space-y-6 bg-white">
            {/* Identity Card */}
            <div className="p-4 rounded-2xl bg-[#fafafc] border border-[#e6e6e8] flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-[#0071e3] text-white font-semibold text-lg flex items-center justify-center shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-[#1d1d1f] truncate">{cleanDisplayName(user.name)}</span>
                </div>
                <div className="text-xs text-[#707070] truncate">{user.email}</div>
                <div className="text-[11px] text-[#86868b] mt-0.5">Account ID: #{user.id}</div>
              </div>
            </div>

            {/* Franchise Owner Plan & Remaining Branches Quota */}
            {user.role === 'franchise_owner' && planInfo && (
              <div className="p-4 sm:p-5 rounded-2xl bg-[#fafafc] border border-[#d6d6d6] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#1d1d1f] flex items-center space-x-1.5 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                    <span>Your Subscription Plan</span>
                  </span>
                  <span className="text-xs font-semibold text-[#1d1d1f] px-2.5 py-0.5 rounded-full bg-white border border-[#d6d6d6]">
                    {planInfo.plan_name}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-[#707070]">Workshop Branches Quota:</span>
                  <span className="font-semibold text-[#1d1d1f]">
                    {planInfo.current_centers_count} of {planInfo.max_allowed_centers} Active
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#e6e6e8] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0071e3] rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(100, Math.round((planInfo.current_centers_count / Math.max(1, planInfo.max_allowed_centers)) * 100))}%`
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#707070]">
                  <span>
                    {Math.max(0, planInfo.max_allowed_centers - planInfo.current_centers_count)} branch slots remaining
                  </span>
                  <span className="text-[#10b981] font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-[#10b981]" />
                    Status: {planInfo.subscription_status?.toUpperCase() || 'ACTIVE'}
                  </span>
                </div>

                {/* Upgrade Plan & Payment Gateway CTA */}
                <div className="pt-2.5 border-t border-[#e6e6e8] flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-[#707070]">Need more workshop branches?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPlans?.();
                    }}
                    className="px-4 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center space-x-1.5 shadow-none cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Upgrade Plan & Payment Gateway</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Feedback messages */}
            {successMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#707070] uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#d6d6d6] focus:border-[#0071e3] rounded-xl text-sm text-[#1d1d1f] placeholder-[#86868b] focus:outline-none transition shadow-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#707070] uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#d6d6d6] focus:border-[#0071e3] rounded-xl text-sm text-[#1d1d1f] placeholder-[#86868b] focus:outline-none transition shadow-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#707070] uppercase tracking-wider mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-[#d6d6d6] focus:border-[#0071e3] rounded-xl text-sm text-[#1d1d1f] placeholder-[#86868b] focus:outline-none transition shadow-none"
                  />
                </div>
              </div>

              {/* Proximity Location Section */}
              <div className="p-4 rounded-2xl bg-[#fafafc] border border-[#e6e6e8] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider">
                    <MapPin className="w-4 h-4 text-[#0071e3]" />
                    <span>Proximity & Service Center Location</span>
                  </div>

                  <button
                    type="button"
                    onClick={handleDetectGps}
                    disabled={detectingGps}
                    className="px-3.5 py-1.5 rounded-full bg-white hover:bg-[#f5f5f7] text-[#0071e3] border border-[#d6d6d6] text-xs font-medium flex items-center space-x-1.5 cursor-pointer transition shadow-none"
                  >
                    {detectingGps ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Navigation className="w-3.5 h-3.5" />
                    )}
                    <span>{detectingGps ? 'Locating...' : 'Detect GPS'}</span>
                  </button>
                </div>

                <p className="text-[11px] text-[#707070]">
                  Your location determines which workshop service centers are listed first (nearest to furthest).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#707070] mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ahmedabad"
                      className="w-full px-3 py-2 bg-white border border-[#d6d6d6] focus:border-[#0071e3] rounded-xl text-xs text-[#1d1d1f] focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#707070] mb-1">
                      Area / Landmark
                    </label>
                    <AreaSelectDropdown
                      value={area}
                      onChange={handleSelectArea}
                      buttonClassName="!py-2 !px-3 text-xs bg-white border-[#d6d6d6]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#707070] bg-white p-2.5 rounded-xl border border-[#e6e6e8]">
                  <span className="flex items-center space-x-1.5">
                    <Compass className="w-3.5 h-3.5 text-[#86868b]" />
                    <span>Coordinates: <strong className="text-[#1d1d1f]">{latitude}° N, {longitude}° E</strong></span>
                  </span>
                  <span className="text-[#0071e3] font-semibold">{area}, {city}</span>
                </div>
              </div>

              {/* Toggle Change Password */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordChange(!showPasswordChange)}
                  className="text-xs font-medium text-[#0071e3] hover:text-[#0077ed] flex items-center space-x-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{showPasswordChange ? 'Cancel Password Change' : 'Change Password'}</span>
                </button>

                {showPasswordChange && (
                  <div className="mt-3 p-4 rounded-2xl bg-[#fafafc] border border-[#e6e6e8] space-y-3 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-xs font-semibold text-[#707070] mb-1">
                        Current Password
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-[#86868b] absolute left-3 top-2.5" />
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-9 pr-3 py-2 bg-white border border-[#d6d6d6] focus:border-[#0071e3] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#707070] mb-1">
                        New Password (Min 6 Characters)
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-[#86868b] absolute left-3 top-2.5" />
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-9 pr-3 py-2 bg-white border border-[#d6d6d6] focus:border-[#0071e3] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#707070] mb-1">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-[#86868b] absolute left-3 top-2.5" />
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-9 pr-3 py-2 bg-white border border-[#d6d6d6] focus:border-[#0071e3] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sticky Actions Footer */}
          <div className="flex items-center justify-end space-x-3 p-4 sm:px-8 border-t border-[#e6e6e8] bg-[#f5f5f7] shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full border border-[#86868b] text-xs font-medium text-[#1d1d1f] hover:bg-white transition cursor-pointer"
            >
              Close
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-medium text-xs shadow-none transition flex items-center space-x-2 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving Changes...' : 'Save Profile & Location'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

