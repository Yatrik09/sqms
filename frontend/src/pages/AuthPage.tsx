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
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-6 sm:py-12 px-3 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white relative overflow-hidden">
      {/* Background ambient automotive lighting */}
      <div className="absolute top-1/4 left-1/4 w-[32rem] h-[32rem] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[32rem] h-[32rem] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto w-full z-10">
        {/* Mobile Brand Header */}
        <div className="lg:hidden flex items-center justify-between mb-4 px-1">
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Car className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center">
                <span className="text-xl font-black tracking-tight text-white">Smart</span>
                <span className="text-xl font-black tracking-tight text-blue-500 ml-0.5">Q</span>
              </div>
              <span className="text-[10px] font-semibold text-slate-400 block -mt-0.5">Automotive AI Queue System</span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Cloud Live</span>
          </span>
        </div>

        {/* Logout Banner */}
        {logoutNotice && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-sm flex items-center justify-between shadow-xl">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{logoutNotice}</span>
            </div>
            <button
              onClick={clearLogoutNotice}
              className="text-xs text-emerald-400 hover:text-emerald-200 underline font-semibold ml-4 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Brand & Features Overview (Desktop only) */}
          <div className="hidden lg:block lg:col-span-5 text-left space-y-6 px-2 sm:px-4">
            <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 items-center justify-center shadow-xl shadow-blue-500/30">
              <Car className="w-9 h-9 text-white" />
            </div>

            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold mb-3">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Next-Gen Automotive AI</span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
                Smart Queue Management System
              </h1>
              <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
                Real-time queue tracking, predictive machine learning turnaround estimations, automated workshop bay allocation, and multi-service-center workload balancing.
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start space-x-3.5 text-xs sm:text-sm text-slate-300">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 border border-blue-500/30">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-white block">Predictive ML Turnaround</span>
                  <span className="text-slate-400">Gradient Boosting ML estimates waiting time and service duration dynamically.</span>
                </div>
              </div>

              <div className="flex items-start space-x-3.5 text-xs sm:text-sm text-slate-300">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 border border-indigo-500/30">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <span className="font-bold text-white block">Proximity Location-Based Balancing</span>
                  <span className="text-slate-400">Directs drivers from Science City to nearby branches first, minimizing wait times.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: High-End Production Form */}
          <div className="w-full lg:col-span-7 bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-10 shadow-2xl">
            {/* Tabs */}
            <div className="flex border-b border-slate-800 mb-5">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition flex-1 text-center cursor-pointer ${
                  authMode === 'login'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode('register')}
                className={`pb-3 text-xs sm:text-sm font-bold border-b-2 transition flex-1 text-center cursor-pointer ${
                  authMode === 'register'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                Create Account
              </button>
              {authMode === 'reset' && (
                <button
                  type="button"
                  className="pb-3 text-xs sm:text-sm font-bold border-b-2 border-indigo-500 text-white flex-1 text-center cursor-pointer"
                >
                  Reset Password
                </button>
              )}
            </div>

            {/* 1-Tap Demo Quick Fill Section */}
            {authMode === 'login' && (
              <div className="mb-5 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-slate-800/60 border border-slate-700/70">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>1-Tap Demo Login</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Tap to auto-fill</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {DEMO_PERSONAS.map((p) => {
                    const isSelected = email === p.email;
                    return (
                      <button
                        key={p.label}
                        type="button"
                        onClick={() => handleSelectPersona(p)}
                        className={`p-2 rounded-xl text-left border transition flex items-center space-x-2 cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'bg-blue-600/30 border-blue-500 text-white shadow-sm ring-1 ring-blue-500/50'
                            : 'bg-slate-900/80 hover:bg-slate-800 border-slate-700/70 text-slate-300'
                        }`}
                      >
                        <span className="text-base shrink-0">{p.icon}</span>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold block truncate">{p.label}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{p.role}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Success Notice */}
            {successNotice && (
              <div className="mb-5 p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* Form Mode Notice */}
            {authMode === 'login' ? (
              <div className="mb-6 p-4 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Sign in to your account</span>
                  <span className="text-[11px] text-slate-400">Enter your email and password to access your dashboard</span>
                </div>
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                  <Lock className="w-4 h-4" />
                </div>
              </div>
            ) : authMode === 'register' ? (
              <div className="mb-6 p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs text-blue-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">Registering New Account</span>
                  <span className="text-slate-400">Select your home area for automated nearby workshop recommendations.</span>
                </div>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs text-blue-300 hover:text-white underline font-semibold ml-3 cursor-pointer shrink-0"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <div className="mb-6 p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 text-xs text-indigo-200 flex items-center justify-between">
                <div>
                  <span className="font-bold text-white block">
                    {resetStep === 'request_otp' ? 'Step 1: Authenticate Identity' : 'Step 2: Enter Verification Code'}
                  </span>
                  <span className="text-slate-400">
                    {resetStep === 'request_otp'
                      ? 'Enter your registered email address to receive an authenticated 6-digit OTP.'
                      : `Enter the 6-digit verification code dispatched to ${email}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs text-indigo-300 hover:text-white underline font-semibold ml-3 cursor-pointer shrink-0"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Register-only fields: Name & Phone & Area */}
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => handleChange('name', e.target.value, setName)}
                        onBlur={(e) => handleBlur('name', e.target.value)}
                        placeholder="John Doe"
                        className={`w-full pl-10 pr-3 py-3 bg-slate-800/90 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                          touched.name && fieldErrors.name
                            ? 'border-red-500 ring-2 ring-red-500/30 bg-red-950/20'
                            : 'border-slate-700 focus:border-blue-500'
                        }`}
                      />
                    </div>
                    {touched.name && fieldErrors.name && (
                      <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-red-400 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                        <span>{fieldErrors.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Phone Number (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => handleChange('phone', e.target.value, setPhone)}
                          onBlur={(e) => handleBlur('phone', e.target.value)}
                          placeholder="+91 98765 43210"
                          className={`w-full pl-10 pr-3 py-3 bg-slate-800/90 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                            touched.phone && fieldErrors.phone
                              ? 'border-red-500 ring-2 ring-red-500/30 bg-red-950/20'
                              : 'border-slate-700 focus:border-blue-500'
                          }`}
                        />
                      </div>
                      {touched.phone && fieldErrors.phone && (
                        <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-red-400 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                          <span>{fieldErrors.phone}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Your Primary Area</span>
                        <span className="text-[10px] text-blue-400 font-normal">Ahmedabad</span>
                      </label>
                      <AreaSelectDropdown
                        value={selectedArea}
                        onChange={(area) => setSelectedArea(area)}
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Reset Mode Step 2 Verification Badge & Dev OTP Card */}
              {authMode === 'reset' && resetStep === 'verify_otp' && (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                      <span className="text-slate-300">
                        Identity Target: <strong className="text-white font-mono">{email}</strong>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setResetStep('request_otp');
                        setGlobalError(null);
                        setSuccessNotice(null);
                      }}
                      className="text-xs text-blue-400 hover:text-blue-200 underline font-semibold cursor-pointer"
                    >
                      Change Email
                    </button>
                  </div>

                  {/* 6-Digit Verification Code (OTP) Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        6-Digit Verification Code (OTP) *
                      </label>
                      <button
                        type="button"
                        disabled={resendCooldown > 0 || loading}
                        onClick={handleResendOTP}
                        className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer disabled:text-slate-500"
                      >
                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend OTP'}
                      </button>
                    </div>
                    <div className="relative">
                      <Key className={`w-4 h-4 absolute left-3.5 top-3.5 transition-colors ${
                        isOtpError ? 'text-red-400' : 'text-slate-500'
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
                        className={`w-full pl-10 pr-3 py-3 bg-slate-800/90 border rounded-xl text-base text-white tracking-widest font-mono text-center placeholder-slate-500 focus:outline-none transition ${
                          isOtpError
                            ? 'border-red-500 ring-2 ring-red-500/30 bg-red-950/20'
                            : 'border-slate-700 focus:border-blue-500'
                        }`}
                      />
                    </div>
                    {touched.otp && fieldErrors.otp && (
                      <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-red-400 font-medium animate-in fade-in slide-in-from-top-1 duration-150">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                        <span>{fieldErrors.otp}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Email field (Hidden only in Reset Step 2 because target email is already verified and locked) */}
              {!(authMode === 'reset' && resetStep === 'verify_otp') && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className={`w-4 h-4 absolute left-3.5 top-3.5 transition-colors ${
                      isEmailError ? 'text-red-400' : 'text-slate-500'
                    }`} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => handleChange('email', e.target.value, setEmail)}
                      onBlur={(e) => handleBlur('email', e.target.value)}
                      placeholder="user@example.com"
                      className={`w-full pl-10 pr-3 h-12 bg-slate-800/90 border rounded-xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                        isEmailError
                          ? 'border-red-500 ring-2 ring-red-500/30 bg-red-950/20'
                          : 'border-slate-700 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  {touched.email && fieldErrors.email && (
                    <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-red-400 font-medium animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                      <span>{fieldErrors.email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Password field: ONLY shown for Login, Register, or Reset Step 2 (NEVER during Step 1) */}
              {(authMode === 'login' || authMode === 'register' || (authMode === 'reset' && resetStep === 'verify_otp')) && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {authMode === 'reset' ? 'New Password *' : 'Password *'}
                    </label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => switchMode('reset')}
                        className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer underline"
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className={`w-4 h-4 absolute left-3.5 top-4 transition-colors ${
                      isPasswordError ? 'text-red-400' : 'text-slate-500'
                    }`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => handleChange('password', e.target.value, setPassword)}
                      onBlur={(e) => handleBlur('password', e.target.value)}
                      placeholder="••••••••••••"
                      className={`w-full pl-10 pr-10 h-12 bg-slate-800/90 border rounded-xl text-base sm:text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                        isPasswordError
                          ? 'border-red-500 ring-2 ring-red-500/30 bg-red-950/20'
                          : 'border-slate-700 focus:border-blue-500'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password field-level error (client-side validation only) */}
                  {touched.password && fieldErrors.password && (
                    <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-red-400 font-medium animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                      <span>{fieldErrors.password}</span>
                    </div>
                  )}

                  {/* Password Strength Meter & Checklist in Register / Reset Mode */}
                  {(authMode === 'register' || authMode === 'reset') && password.length > 0 && (
                    <div className="mt-2.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Password Strength:</span>
                        <span className={`font-bold ${strength.text}`}>{strength.label}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5 h-1.5">
                        <div className={`rounded-full transition-all duration-300 ${strength.score >= 1 ? strength.color : 'bg-slate-800'}`} />
                        <div className={`rounded-full transition-all duration-300 ${strength.score >= 2 ? strength.color : 'bg-slate-800'}`} />
                        <div className={`rounded-full transition-all duration-300 ${strength.score >= 3 ? strength.color : 'bg-slate-800'}`} />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-1">
                        <div className={`flex items-center space-x-1 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {hasMinLength ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-slate-600 inline-block text-center text-[8px] leading-3">·</span>}
                          <span>At least 6 characters</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {hasUpper ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-slate-600 inline-block text-center text-[8px] leading-3">·</span>}
                          <span>Uppercase letter (A-Z)</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {hasLower ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-slate-600 inline-block text-center text-[8px] leading-3">·</span>}
                          <span>Lowercase letter (a-z)</span>
                        </div>
                        <div className={`flex items-center space-x-1 ${hasNumberOrSymbol ? 'text-emerald-400' : 'text-slate-500'}`}>
                          {hasNumberOrSymbol ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full border border-slate-600 inline-block text-center text-[8px] leading-3">·</span>}
                          <span>Number or symbol</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Confirm Password (Register or Reset Step 2) */}
              {(authMode === 'register' || (authMode === 'reset' && resetStep === 'verify_otp')) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    {authMode === 'reset' ? 'Confirm New Password *' : 'Confirm Password *'}
                  </label>
                  <div className="relative">
                    <Lock className={`w-4 h-4 absolute left-3.5 top-3.5 ${
                      touched.confirmPassword && fieldErrors.confirmPassword ? 'text-red-400' : 'text-slate-500'
                    }`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value, setConfirmPassword)}
                      onBlur={(e) => handleBlur('confirmPassword', e.target.value)}
                      placeholder="••••••••••••"
                      className={`w-full pl-10 pr-3 py-3 bg-slate-800/90 border rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none font-mono text-xs sm:text-sm transition ${
                        touched.confirmPassword && fieldErrors.confirmPassword
                          ? 'border-red-500 ring-2 ring-red-500/30 bg-red-950/20'
                          : 'border-slate-700 focus:border-blue-500'
                      }`}
                    />
                  </div>
                  {touched.confirmPassword && fieldErrors.confirmPassword && (
                    <div className="flex items-center space-x-1.5 mt-1.5 text-xs text-red-400 font-semibold animate-in fade-in slide-in-from-top-1 duration-150">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                      <span>{fieldErrors.confirmPassword}</span>
                    </div>
                  )}
                </div>
              )}

              {authMode === 'register' && (
                <div className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/80 text-xs text-slate-400 space-y-1">
                  <span className="font-bold text-slate-200 block flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Customer Account Registration</span>
                  </span>
                  <span className="text-[11px] leading-relaxed text-slate-400 block">
                    Branch Managers are provisioned by the Franchise Owner, and Floor Technicians are provisioned by the Branch Manager.
                  </span>
                </div>
              )}

              {/* Single Dedicated Form Error Alert */}
              {globalError && (
                <div className="p-4 rounded-2xl bg-rose-950/85 border border-rose-500/60 text-rose-200 text-xs sm:text-sm shadow-xl shadow-rose-950/40 animate-in fade-in slide-in-from-bottom-2">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <span className="block font-semibold text-rose-100 leading-snug">{globalError}</span>
                      {serverErrorField === 'password' && authMode === 'login' && (
                        <div>
                          <button
                            type="button"
                            onClick={() => switchMode('reset')}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-rose-900/60 hover:bg-rose-900 border border-rose-400/40 text-xs font-bold text-rose-200 hover:text-white transition cursor-pointer"
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
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-900 border border-blue-400/40 text-xs font-bold text-blue-200 hover:text-white transition cursor-pointer"
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
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-900 border border-blue-400/40 text-xs font-bold text-blue-200 hover:text-white transition cursor-pointer"
                          >
                            <span>Click here to sign in with this email →</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 mt-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-500/25 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                {authMode === 'reset' ? (
                  resetStep === 'request_otp' ? (
                    <Mail className="w-5 h-5" />
                  ) : (
                    <KeyRound className="w-5 h-5" />
                  )
                ) : (
                  <LogIn className="w-5 h-5" />
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
                {!loading && <ArrowRight className="w-5 h-5" />}
              </button>
            </form>

            {/* Bottom Switch Links */}
            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs sm:text-sm text-slate-400">
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
                className="text-blue-400 hover:text-blue-300 font-bold transition cursor-pointer"
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
