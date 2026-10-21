import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Car, Lock, Mail, User, Phone, AlertCircle, ArrowRight, CheckCircle2,
  ShieldCheck, LogIn, Eye, EyeOff, Sparkles, Activity, KeyRound, MapPin, Check, X,
  ShieldAlert, RefreshCw, Key
} from 'lucide-react';
import { POPULAR_AREAS } from '../utils/geo';
import { AreaSelectDropdown } from '../components/AreaSelectDropdown';

type AuthMode = 'login' | 'register' | 'reset';
type ResetStep = 'request_otp' | 'verify_otp';

const DEMO_PERSONAS = [
  { label: 'Super Admin', email: 'admin@demo.local', pass: 'AdminPassword123!', icon: '👑', role: 'Full Admin' },
  { label: 'Franchise Owner', email: 'owner@demo.local', pass: 'OwnerPassword123!', icon: '🏢', role: 'HQ & Analytics' },
  { label: 'Branch Manager', email: 'manager@demo.local', pass: 'ManagerPassword123!', icon: '🔧', role: 'Workshop Floor' },
  { label: 'Customer', email: 'customer@demo.local', pass: 'CustomerPassword123!', icon: '🚗', role: 'Driver Portal' },
  { label: 'Technician', email: 'tech@demo.local', pass: 'TechPassword123!', icon: '👨‍🔧', role: 'Floor Bay Cards' },
];

export const AuthPage: React.FC = () => {
  const { login, register, requestPasswordResetOTP, verifyOTPAndResetPassword, logoutNotice, clearLogoutNotice } = useAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [resetStep, setResetStep] = useState<ResetStep>('request_otp');

  const handleSelectPersona = (p: typeof DEMO_PERSONAS[0]) => {
    setAuthMode('login');
    setEmail(p.email);
    setPassword(p.pass);
    setGlobalError(null);
    setServerErrorField(null);
    setFieldErrors({});
    setTouched({ email: true, password: true });
  };

  // Form fields
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [otp, setOtp] = useState<string>('');
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [selectedArea, setSelectedArea] = useState<string>('Science City');
  const [selectedCity] = useState<string>('Ahmedabad');

  // Validation & Error state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [serverErrorField, setServerErrorField] = useState<'email' | 'password' | 'otp' | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Computed error states for inputs
  const isEmailError = (touched.email && !!fieldErrors.email) || serverErrorField === 'email';
  const isPasswordError = (touched.password && !!fieldErrors.password) || serverErrorField === 'password';
  const isOtpError = (touched.otp && !!fieldErrors.otp) || serverErrorField === 'otp';

  // Cooldown timer for resending OTP
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Password rules evaluation
  const hasMinLength = password.length >= 6;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  const getPasswordStrength = () => {
    if (!password) return { label: 'Empty', color: 'bg-slate-700', text: 'text-slate-500', score: 0 };
    let score = 0;
    if (hasMinLength) score++;
    if (hasUpper) score++;
    if (hasLower) score++;
    if (hasNumberOrSymbol) score++;

    if (score <= 1) return { label: 'Weak', color: 'bg-red-500', text: 'text-red-400', score: 1 };
    if (score <= 3) return { label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-400', score: 2 };
    return { label: 'Strong & Secure', color: 'bg-emerald-500', text: 'text-emerald-400', score: 3 };
  };

  const strength = getPasswordStrength();

  // Field validation function
  const validateField = (fieldName: string, val: string): string | null => {
    const trimmed = val.trim();

    if (fieldName === 'email') {
      if (!trimmed) return 'Email address is required.';
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(trimmed)) {
        return 'Please enter a valid email address (e.g. name@domain.com).';
      }
    }

    if (fieldName === 'otp' && authMode === 'reset' && resetStep === 'verify_otp') {
      if (!trimmed) return 'Verification code is required.';
      if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) {
        return 'Please enter the 6-digit verification code.';
      }
    }

    if (fieldName === 'name' && authMode === 'register') {
      if (!trimmed) return 'Full name is required.';
      if (trimmed.length < 2) return 'Full name must be at least 2 characters.';
    }

    if (fieldName === 'phone' && authMode === 'register') {
      if (trimmed) {
        const cleaned = trimmed.replace(/[\s-]/g, '');
        if (!/^\+?[0-9]{10,14}$/.test(cleaned)) {
          return 'Please enter a valid phone number (at least 10 digits).';
        }
      }
    }

    if (fieldName === 'password') {
      // In reset mode step 1, password is not needed!
      if (authMode === 'reset' && resetStep === 'request_otp') return null;
      if (!val) return 'Password is required.';
      if ((authMode === 'register' || authMode === 'reset') && val.length < 6) {
        return 'Password must be at least 6 characters long.';
      }
    }

    if (fieldName === 'confirmPassword') {
      if (authMode === 'reset' && resetStep === 'request_otp') return null;
      if (authMode === 'register' || authMode === 'reset') {
        if (!val) return 'Please confirm your password.';
        if (val !== password) return 'Passwords do not match.';
      }
    }

    return null;
  };

  // Blur handler
  const handleBlur = (fieldName: string, val: string) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
    const errorMsg = validateField(fieldName, val);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (errorMsg) {
        next[fieldName] = errorMsg;
      } else {
        delete next[fieldName];
      }
      return next;
    });
  };

  // Change handler with live re-validation if already touched
  const handleChange = (fieldName: string, val: string, setter: (v: string) => void) => {
    setter(val);
    if (globalError) {
      setGlobalError(null);
    }
    if (serverErrorField === fieldName) {
      setServerErrorField(null);
    }
    if (touched[fieldName]) {
      const errorMsg = validateField(fieldName, val);
      setFieldErrors((prev) => {
        const next = { ...prev };
        if (errorMsg) {
          next[fieldName] = errorMsg;
        } else {
          delete next[fieldName];
        }
        return next;
      });
    }

    // Clear field-level error on editing field
    if (fieldErrors[fieldName]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  };

  const switchMode = (mode: AuthMode) => {
    setAuthMode(mode);
    setResetStep('request_otp');
    setOtp('');
    setResendCooldown(0);
    setGlobalError(null);
    setServerErrorField(null);
    setSuccessNotice(null);
    setFieldErrors({});
    setTouched({});
    setPassword('');
    setConfirmPassword('');
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0 || loading) return;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;
    setLoading(true);
    setGlobalError(null);
    try {
      await requestPasswordResetOTP(cleanEmail);
      setResendCooldown(30);
      setSuccessNotice('A new 6-digit verification code has been dispatched to your email.');
    } catch (err: any) {
      setGlobalError(err.message || 'Failed to resend verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearLogoutNotice();
    setGlobalError(null);
    setServerErrorField(null);
    setSuccessNotice(null);

    const cleanEmail = email.trim().toLowerCase();

    // ==========================================
    // FORGOT PASSWORD STEP 1: REQUEST OTP
    // ==========================================
    if (authMode === 'reset' && resetStep === 'request_otp') {
      const emailErr = validateField('email', email);
      if (emailErr) {
        setFieldErrors({ email: emailErr });
        setTouched({ email: true });
        return;
      }

      setLoading(true);
      try {
        await requestPasswordResetOTP(cleanEmail);
        setResetStep('verify_otp');
        setResendCooldown(30);
        setSuccessNotice('A 6-digit verification code has been sent to your registered email address. Please check your inbox.');
      } catch (err: any) {
        const msg: string = err.message || 'Failed to request verification code.';
        const lower = msg.toLowerCase();
        if (lower.includes('wrong email') || lower.includes('no account') || lower.includes('404')) {
          setServerErrorField('email');
          setGlobalError('Wrong Email: No account found with this email address. Please check your email or click Create Account.');
        } else {
          setGlobalError(msg);
        }
      } finally {
        setLoading(false);
      }
      return;
    }

    // ==========================================
    // FORGOT PASSWORD STEP 2: VERIFY OTP & RESET
    // ==========================================
    if (authMode === 'reset' && resetStep === 'verify_otp') {
      const errors: Record<string, string> = {};
      const touchedFields: Record<string, boolean> = {
        otp: true,
        password: true,
        confirmPassword: true,
      };

      const otpErr = validateField('otp', otp);
      if (otpErr) errors.otp = otpErr;

      const passErr = validateField('password', password);
      if (passErr) errors.password = passErr;

      const confirmErr = validateField('confirmPassword', confirmPassword);
      if (confirmErr) errors.confirmPassword = confirmErr;

      setTouched(touchedFields);

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        return;
      }

      setLoading(true);
      try {
        await verifyOTPAndResetPassword(cleanEmail, otp.trim(), password);
        setSuccessNotice('Identity verified and password successfully reset! Logging in...');
      } catch (err: any) {
        const msg: string = err.message || 'Verification failed. Please check your code and try again.';
        const lower = msg.toLowerCase();
        if (lower.includes('code') || lower.includes('otp')) {
          setServerErrorField('otp');
        }
        setGlobalError(msg);
      } finally {
        setLoading(false);
      }
      return;
    }

    // ==========================================
    // STANDARD LOGIN / REGISTRATION
    // ==========================================
    const errors: Record<string, string> = {};
    const touchedFields: Record<string, boolean> = {
      email: true,
      password: true,
    };

    const emailErr = validateField('email', email);
    if (emailErr) errors.email = emailErr;

    const passErr = validateField('password', password);
    if (passErr) errors.password = passErr;

    if (authMode === 'register') {
      touchedFields.name = true;
      touchedFields.phone = true;
      touchedFields.confirmPassword = true;

      const nameErr = validateField('name', name);
      if (nameErr) errors.name = nameErr;

      const phoneErr = validateField('phone', phone);
      if (phoneErr) errors.phone = phoneErr;

      const confirmErr = validateField('confirmPassword', confirmPassword);
      if (confirmErr) errors.confirmPassword = confirmErr;
    }

    setTouched(touchedFields);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      if (authMode === 'register') {
        const selectedAreaObj = POPULAR_AREAS.find((a) => a.name === selectedArea);
        await register(
          name.trim(),
          cleanEmail,
          password,
          phone.trim() || undefined,
          selectedCity,
          selectedArea,
          selectedAreaObj?.lat || 23.0784,
          selectedAreaObj?.lon || 72.5074
        );
      } else {
        await login(cleanEmail, password);
      }
    } catch (err: any) {
      const msg: string = err.message || 'Authentication failed. Please verify your credentials.';
      const lower = msg.toLowerCase();

      // Specific error feedback matching database/API responses
      if (
        lower.includes('wrong password') ||
        lower.includes('incorrect password') ||
        lower.includes('password is wrong') ||
        lower.includes('invalid password') ||
        lower.includes('401')
      ) {
        setServerErrorField('password');
        setGlobalError('Wrong Password: The password you entered is incorrect. Please verify your password or use Reset Password.');
      } else if (
        lower.includes('wrong email') ||
        lower.includes('no account found') ||
        lower.includes('user not found') ||
        lower.includes('404')
      ) {
        setServerErrorField('email');
        setGlobalError('Wrong Email: No account found with this email address. Please check your email or click Create Account.');
      } else if (
        lower.includes('already exists') ||
        lower.includes('already registered')
      ) {
        setServerErrorField('email');
        setGlobalError('This email is already registered. Please Sign In or use Reset Password.');
      } else {
        setServerErrorField(null);
        setGlobalError(msg.includes('detail') ? 'Wrong Email or Password: The credentials you entered do not match our records.' : msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col justify-center py-8 sm:py-16 px-4 sm:px-6 lg:px-8 font-sans selection:bg-[#0071e3] selection:text-white relative">
      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full z-10">
        {/* Mobile Brand Header */}
        <div className="lg:hidden flex items-center justify-between mb-6 px-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-2xl bg-[#1d1d1f] flex items-center justify-center">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center">
                <span className="text-xl font-semibold tracking-tight text-[#1d1d1f]">Smart</span>
                <span className="text-xl font-semibold tracking-tight text-[#0071e3] ml-0.5">Q</span>
              </div>
              <span className="text-[11px] font-normal text-[#707070] block -mt-0.5">Automotive AI Queue System</span>
            </div>
          </div>
          <span className="text-[12px] font-medium px-3 py-1 rounded-full bg-white border border-[#d6d6d6] text-[#1d1d1f] flex items-center space-x-1.5 shadow-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Cloud Live</span>
          </span>
        </div>

        {/* Logout Banner */}
        {logoutNotice && (
          <div className="mb-6 p-4 rounded-[20px] bg-white border border-emerald-500/40 text-emerald-800 text-[14px] flex items-center justify-between shadow-none">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{logoutNotice}</span>
            </div>
            <button
              onClick={clearLogoutNotice}
              className="text-[12px] text-emerald-700 hover:text-emerald-900 underline font-medium ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          {/* Left Column: Brand & Features Overview (Desktop only) */}
          <div className="hidden lg:block lg:col-span-5 text-left space-y-6 px-2 sm:px-4">
            <div>
              <img
                src="/logo.png"
                alt="DriveOps"
                className="h-12 w-auto object-contain mb-3"
              />
            </div>

            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border border-[#d6d6d6] text-[#1d1d1f] text-[12px] font-medium mb-3 shadow-none">
                <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>Automotive Intelligence</span>
              </div>
              <h1 className="text-4xl lg:text-[44px] font-semibold tracking-tight text-[#1d1d1f] leading-[1.08]">
                DriveOps
              </h1>
              <p className="mt-1 text-base font-semibold text-[#0071e3]">
                Book Today. Drive Tomorrow.
              </p>
              <p className="mt-3 text-[17px] text-[#707070] leading-[1.47]">
                Real-time queue tracking, predictive machine learning turnaround estimations, automated workshop bay allocation, and multi-service-center workload balancing.
              </p>
            </div>

            {/* Feature Highlights - 28px Apple cards */}
            <div className="space-y-3.5 pt-2">
              <div className="p-4 rounded-[20px] bg-white border border-[#d6d6d6] flex items-start space-x-3.5 text-[14px] text-[#707070] shadow-none">
                <div className="w-8 h-8 rounded-full bg-[#f5f5f7] text-[#0071e3] flex items-center justify-center shrink-0 mt-0.5 border border-[#d6d6d6]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-[#1d1d1f] block text-[15px]">Predictive ML Turnaround</span>
                  <span className="text-[#707070]">Gradient Boosting ML estimates waiting time and service duration dynamically.</span>
                </div>
              </div>

              <div className="p-4 rounded-[20px] bg-white border border-[#d6d6d6] flex items-start space-x-3.5 text-[14px] text-[#707070] shadow-none">
                <div className="w-8 h-8 rounded-full bg-[#f5f5f7] text-emerald-600 flex items-center justify-center shrink-0 mt-0.5 border border-[#d6d6d6]">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-semibold text-[#1d1d1f] block text-[15px]">Proximity Workload Balancing</span>
                  <span className="text-[#707070]">Directs drivers to nearby branches first, minimizing wait times and bay congestion.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Apple 28px White Card Form */}
          <div className="w-full lg:col-span-7 bg-white border border-[#d6d6d6] rounded-[28px] p-6 sm:p-10 shadow-none">
            {/* Mobile Brand Logo */}
            <div className="flex justify-center mb-6 lg:hidden">
              <img
                src="/logo.png"
                alt="DriveOps"
                className="h-10 w-auto object-contain"
              />
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[#d6d6d6] mb-6">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`pb-3 text-[14px] font-semibold border-b-2 transition flex-1 text-center cursor-pointer ${
                  authMode === 'login'
                    ? 'border-[#1d1d1f] text-[#1d1d1f]'
                    : 'border-transparent text-[#707070] hover:text-[#1d1d1f]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`pb-3 text-[14px] font-semibold border-b-2 transition flex-1 text-center cursor-pointer ${
                  authMode === 'register'
                    ? 'border-[#1d1d1f] text-[#1d1d1f]'
                    : 'border-transparent text-[#707070] hover:text-[#1d1d1f]'
                }`}
              >
                Create Account
              </button>
              {authMode === 'reset' && (
                <button
                  type="button"
                  className="pb-3 text-[14px] font-semibold border-b-2 border-[#0071e3] text-[#0071e3] flex-1 text-center cursor-pointer"
                >
                  Reset Password
                </button>
              )}
            </div>

            {/* 1-Tap Demo Quick Fill Section */}
            {authMode === 'login' && (
              <div className="mb-6 p-4 rounded-[20px] bg-[#f5f5f7] border border-[#d6d6d6]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                    <span>1-Tap Demo Login</span>
                  </span>
                  <span className="text-[11px] text-[#707070]">Tap to auto-fill persona</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEMO_PERSONAS.map((p) => {
                    const isSelected = email === p.email;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => handleSelectPersona(p)}
                        className={`p-2.5 rounded-[14px] text-left border transition flex items-center space-x-2 cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'bg-white border-[#0071e3] text-[#1d1d1f] shadow-none ring-1 ring-[#0071e3]'
                            : 'bg-white hover:bg-[#fafafc] border-[#d6d6d6] text-[#1d1d1f]'
                        }`}
                      >
                        <span className="text-base shrink-0">{p.icon}</span>
                        <div className="min-w-0 flex-1">
                          <span className="text-[12px] font-semibold block truncate text-[#1d1d1f]">{p.label}</span>
                          <span className="text-[10px] text-[#707070] block truncate">{p.role}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Success Notice */}
            {successNotice && (
              <div className="mb-6 p-4 rounded-[20px] bg-[#f0f9eb] border border-[#c2e7b0] text-[#2b641e] text-[13px] flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#389e0d]" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* Form Mode Notice */}
            {authMode === 'login' ? (
              <div className="mb-6 p-4 rounded-[20px] bg-[#fafafc] border border-[#d6d6d6] flex items-center justify-between">
                <div>
                  <span className="text-[14px] font-semibold text-[#1d1d1f] block">Sign in to your account</span>
                  <span className="text-[12px] text-[#707070]">Enter your credentials to access your dashboard</span>
                </div>
                <div className="w-8 h-8 rounded-full bg-white text-[#1d1d1f] flex items-center justify-center border border-[#d6d6d6]">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
            ) : authMode === 'register' ? (
              <div className="mb-6 p-4 rounded-[20px] bg-[#fafafc] border border-[#d6d6d6] text-[13px] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#1d1d1f] block">Registering New Account</span>
                  <span className="text-[#707070]">Select your home area for automated nearby workshop recommendations.</span>
                </div>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-[12px] text-[#0066cc] hover:underline font-medium ml-3 cursor-pointer shrink-0"
                >
                  Sign In
                </button>
              </div>
            ) : (
              <div className="mb-6 p-4 rounded-[20px] bg-[#fafafc] border border-[#d6d6d6] text-[13px] flex items-center justify-between">
                <div>
                  <span className="font-semibold text-[#1d1d1f] block">
                    {resetStep === 'request_otp' ? 'Step 1: Authenticate Identity' : 'Step 2: Enter Verification Code'}
                  </span>
                  <span className="text-[#707070]">
                    {resetStep === 'request_otp'
                      ? 'Enter your registered email address to receive an authenticated 6-digit OTP.'
                      : `Enter the 6-digit verification code dispatched to ${email}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-[12px] text-[#0066cc] hover:underline font-medium ml-3 cursor-pointer shrink-0"
                >
                  Sign In
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Register-only fields: Name & Phone & Area */}
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-[12px] font-semibold text-[#1d1d1f] uppercase tracking-wider mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#86868b] absolute left-4 top-4" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => handleChange('name', e.target.value, setName)}
                        onBlur={(e) => handleBlur('name', e.target.value)}
                        placeholder="John Doe"
                        className={`w-full pl-11 pr-4 h-12 bg-white border rounded-[980px] text-[14px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none transition ${
                          touched.name && fieldErrors.name
                            ? 'border-red-500 ring-1 ring-red-500 bg-red-50/30'
                            : 'border-[#d6d6d6] focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]'
                        }`}
                      />
                    </div>
                    {touched.name && fieldErrors.name && (
                      <div className="flex items-center space-x-1.5 mt-1.5 text-[12px] text-red-600 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                        <span>{fieldErrors.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#1d1d1f] uppercase tracking-wider mb-1.5">
                        Phone Number (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-[#86868b] absolute left-4 top-4" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => handleChange('phone', e.target.value, setPhone)}
                          onBlur={(e) => handleBlur('phone', e.target.value)}
                          placeholder="+91 98765 43210"
                          className={`w-full pl-11 pr-4 h-12 bg-white border rounded-[980px] text-[14px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none transition ${
                            touched.phone && fieldErrors.phone
                              ? 'border-red-500 ring-1 ring-red-500 bg-red-50/30'
                              : 'border-[#d6d6d6] focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]'
                          }`}
                        />
                      </div>
                      {touched.phone && fieldErrors.phone && (
                        <div className="flex items-center space-x-1.5 mt-1.5 text-[12px] text-red-600 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                          <span>{fieldErrors.phone}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-[#1d1d1f] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Your Primary Area</span>
                        <span className="text-[11px] text-[#0066cc] font-normal">Ahmedabad</span>
                      </label>
                      <AreaSelectDropdown
                        value={selectedArea}
                        onChange={(area) => setSelectedArea(area)}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Reset Mode Step 2 Verification Badge */}
              {authMode === 'reset' && resetStep === 'verify_otp' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-[20px] bg-[#f5f5f7] border border-[#d6d6d6] flex items-center justify-between text-[13px]">
                    <div className="flex items-center space-x-2.5">
                      <Mail className="w-4 h-4 text-[#0071e3] shrink-0" />
                      <span className="text-[#707070]">
                        Identity Target: <strong className="text-[#1d1d1f] font-mono">{email}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResetStep('request_otp');
                        setGlobalError(null);
                        setSuccessNotice(null);
                      }}
                      className="text-[12px] text-[#0066cc] hover:underline font-medium cursor-pointer"
                    >
                      Change Email
                    </button>
                  </div>

                  {/* 6-Digit Verification Code (OTP) Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-[12px] font-semibold text-[#1d1d1f] uppercase tracking-wider">
                        6-Digit Verification Code (OTP) *
                      </label>
                      <button
                        type="button"
                        disabled={resendCooldown > 0 || loading}
                        onClick={handleResendOTP}
                        className="text-[12px] text-[#0066cc] hover:underline font-medium cursor-pointer disabled:text-[#86868b]"
                      >
                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend OTP'}
                      </button>
                    </div>
                    <div className="relative">
                      <Key className={`w-4 h-4 absolute left-4 top-4 transition-colors ${
                        isOtpError ? 'text-red-500' : 'text-[#86868b]'
                      }`} />
                      <input
                        type="text"
                        value={otp}
                        maxLength={6}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setOtp(val);
                          if (globalError) setGlobalError(null);
                          if (serverErrorField === 'otp') setServerErrorField(null);
                          if (val.length === 6) {
                            setFieldErrors((prev) => {
                              const next = { ...prev };
                              delete next.otp;
                              return next;
                            });
                          }
                        }}
                        placeholder="••••••"
                        className={`w-full pl-11 pr-4 h-12 bg-white border rounded-[980px] text-[16px] text-[#1d1d1f] tracking-widest font-mono text-center placeholder-[#86868b] focus:outline-none transition ${
                          isOtpError
                            ? 'border-red-500 ring-1 ring-red-500 bg-red-50/30'
                            : 'border-[#d6d6d6] focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]'
                        }`}
                      />
                    </div>
                    {touched.otp && fieldErrors.otp && (
                      <div className="flex items-center space-x-1.5 mt-1.5 text-[12px] text-red-600 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                        <span>{fieldErrors.otp}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Email field */}
              {!(authMode === 'reset' && resetStep === 'verify_otp') && (
                <div>
                  <label className="block text-[12px] font-semibold text-[#1d1d1f] uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className={`w-4 h-4 absolute left-4 top-4 transition-colors ${
                      isEmailError ? 'text-red-500' : 'text-[#86868b]'
                    }`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleChange('email', e.target.value, setEmail)}
                      onBlur={(e) => handleBlur('email', e.target.value)}
                      placeholder="user@example.com"
                      className={`w-full pl-11 pr-4 h-12 bg-white border rounded-[980px] text-[14px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none transition ${
                        isEmailError
                          ? 'border-red-500 ring-1 ring-red-500 bg-red-50/30'
                          : 'border-[#d6d6d6] focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]'
                      }`}
                    />
                  </div>
                  {touched.email && fieldErrors.email && (
                    <div className="flex items-center space-x-1.5 mt-1.5 text-[12px] text-red-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                      <span>{fieldErrors.email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Password field */}
              {(authMode === 'login' || authMode === 'register' || (authMode === 'reset' && resetStep === 'verify_otp')) && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[12px] font-semibold text-[#1d1d1f] uppercase tracking-wider">
                      {authMode === 'reset' ? 'New Password *' : 'Password *'}
                    </label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        className="text-[12px] text-[#0066cc] hover:underline font-medium cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className={`w-4 h-4 absolute left-4 top-4 transition-colors ${
                      isPasswordError ? 'text-red-500' : 'text-[#86868b]'
                    }`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => handleChange('password', e.target.value, setPassword)}
                      onBlur={(e) => handleBlur('password', e.target.value)}
                      placeholder="••••••••••••"
                      className={`w-full pl-11 pr-11 h-12 bg-white border rounded-[980px] text-[14px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none transition ${
                        isPasswordError
                          ? 'border-red-500 ring-1 ring-red-500 bg-red-50/30'
                          : 'border-[#d6d6d6] focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-4 text-[#86868b] hover:text-[#1d1d1f] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {touched.password && fieldErrors.password && (
                    <div className="flex items-center space-x-1.5 mt-1.5 text-[12px] text-red-600 font-medium">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                      <span>{fieldErrors.password}</span>
                    </div>
                  )}

                  {/* Password Strength Meter & Checklist in Register / Reset Mode */}
                  {(authMode === 'register' || authMode === 'reset') && password.length > 0 && (
                    <div className="mt-2.5 p-3.5 rounded-[18px] bg-[#f5f5f7] border border-[#d6d6d6] space-y-2">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="text-[#707070]">Password Strength:</span>
                        <span className={`font-semibold ${strength.text}`}>{strength.label}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 h-1.5">
                        <div className={`rounded-full transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-[#d6d6d6]'}`} />
                        <div className={`rounded-full transition-all duration-300 ${strength.score >= 2 ? strength.color : 'bg-[#d6d6d6]'}`} />
                        <div className={`rounded-full transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-[#d6d6d6]'}`} />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
                        <div className={`flex items-center space-x-1 ${hasMinLength ? 'text-emerald-600 font-medium' : 'text-[#86868b]'}`}>
                          {hasMinLength ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 text-center leading-3">·</span>}
                          <span>At least 6 characters</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${hasUpper ? 'text-emerald-600 font-medium' : 'text-[#86868b]'}`}>
                          {hasUpper ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 text-center leading-3">·</span>}
                          <span>Uppercase letter (A-Z)</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${hasLower ? 'text-emerald-600 font-medium' : 'text-[#86868b]'}`}>
                          {hasLower ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 text-center leading-3">·</span>}
                          <span>Lowercase letter (a-z)</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${hasNumberOrSymbol ? 'text-emerald-600 font-medium' : 'text-[#86868b]'}`}>
                          {hasNumberOrSymbol ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 text-center leading-3">·</span>}
                          <span>Number or symbol</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Password */}
              {(authMode === 'register' || (authMode === 'reset' && resetStep === 'verify_otp')) && (
                <div>
                  <label className="block text-[12px] font-semibold text-[#1d1d1f] uppercase tracking-wider mb-1.5">
                    {authMode === 'reset' ? 'Confirm New Password *' : 'Confirm Password *'}
                  </label>
                  <div className="relative">
                    <Lock className={`w-4 h-4 absolute left-4 top-4 ${
                      touched.confirmPassword && fieldErrors.confirmPassword ? 'text-red-500' : 'text-[#86868b]'
                    }`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value, setConfirmPassword)}
                      onBlur={(e) => handleBlur('confirmPassword', e.target.value)}
                      placeholder="••••••••••••"
                      className={`w-full pl-11 pr-4 h-12 bg-white border rounded-[980px] text-[14px] text-[#1d1d1f] placeholder-[#86868b] focus:outline-none transition ${
                        touched.confirmPassword && fieldErrors.confirmPassword
                          ? 'border-red-500 ring-1 ring-red-500 bg-red-50/30'
                          : 'border-[#d6d6d6] focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]'
                      }`}
                    />
                  </div>
                  {touched.confirmPassword && fieldErrors.confirmPassword && (
                    <div className="flex items-center space-x-1.5 mt-1.5 text-[12px] text-red-600 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                      <span>{fieldErrors.confirmPassword}</span>
                    </div>
                  )}
                </div>
              )}

              {authMode === 'register' && (
                <div className="p-3.5 rounded-[18px] bg-[#f5f5f7] border border-[#d6d6d6] text-[12px] text-[#707070] space-y-1">
                  <span className="font-semibold text-[#1d1d1f] block flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0071e3]" />
                    <span>Customer Account Registration</span>
                  </span>
                  <span className="text-[11px] leading-relaxed text-[#707070] block">
                    Branch Managers are provisioned by the Franchise Owner, and Floor Technicians are provisioned by the Branch Manager.
                  </span>
                </div>
              )}

              {/* Single Dedicated Form Error Alert */}
              {globalError && (
                <div className="p-4 rounded-[20px] bg-[#fff1f0] border border-[#ffccc7] text-[#cf1322] text-[13px] shadow-none">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-[#cf1322] mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <span className="block font-medium text-[#a8071a] leading-snug">{globalError}</span>
                      {serverErrorField === 'password' && authMode === 'login' && (
                        <div>
                          <button
                            type="button"
                            onClick={() => switchMode('reset')}
                            className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-full bg-white border border-[#cf1322] text-[12px] font-medium text-[#cf1322] hover:bg-red-50 transition cursor-pointer"
                          >
                            <span>Click here to reset your password →</span>
                          </button>
                        </div>
                      )}
                      {serverErrorField === 'email' && (authMode === 'login' || (authMode === 'reset' && resetStep === 'request_otp')) && (
                        <div>
                          <button
                            type="button"
                            onClick={() => switchMode('register')}
                            className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-full bg-white border border-[#0071e3] text-[12px] font-medium text-[#0071e3] hover:bg-blue-50 transition cursor-pointer"
                          >
                            <span>Click here to create a new account →</span>
                          </button>
                        </div>
                      )}
                      {globalError.includes('already registered') && (authMode === 'register' || authMode === 'reset') && (
                        <div>
                          <button
                            type="button"
                            onClick={() => switchMode('login')}
                            className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-full bg-white border border-[#0071e3] text-[12px] font-medium text-[#0071e3] hover:bg-blue-50 transition cursor-pointer"
                          >
                            <span>Click here to sign in with this email →</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit CTA - Pricing Blue Pill */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 mt-4 rounded-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-normal text-[15px] shadow-none transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                {authMode === 'reset' ? (
                  resetStep === 'request_otp' ? (
                    <Mail className="w-4 h-4" />
                  ) : (
                    <KeyRound className="w-4 h-4" />
                  )
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>
                  {loading
                    ? 'Processing...'
                    : authMode === 'register'
                    ? 'Create Account & Sign In'
                    : authMode === 'reset'
                    ? resetStep === 'request_otp'
                      ? 'Send Verification Code'
                      : 'Verify Code & Reset Password'
                    : 'Sign In'}
                </span>
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

            {/* Bottom Switch Links */}
            <div className="mt-6 pt-4 border-t border-[#d6d6d6] flex items-center justify-between text-[13px] text-[#707070]">
              <span>
                {authMode === 'register'
                  ? 'Already have an account?'
                  : authMode === 'reset'
                  ? 'Remembered your password?'
                  : "Don't have an account?"}
              </span>
              <button
                type="button"
                onClick={() => switchMode(authMode === 'register' || authMode === 'reset' ? 'login' : 'register')}
                className="text-[#0066cc] hover:underline font-medium transition cursor-pointer"
              >
                {authMode === 'register' || authMode === 'reset'
                  ? 'Sign In here'
                  : 'Create an Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
