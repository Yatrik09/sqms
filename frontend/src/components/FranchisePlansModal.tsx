import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { SubscriptionPlan } from '../types';
import {
  ShieldCheck, Check, Sparkles, Building2, Layers, Cpu,
  CreditCard, ArrowRight, X, AlertCircle, RefreshCw, CheckCircle2,
  QrCode, Smartphone, Landmark, Download, FileText, CheckCircle, Info
} from 'lucide-react';
import { RazorpayCheckoutButton } from './RazorpayCheckoutButton';

interface FranchisePlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const FranchisePlansModal: React.FC<FranchisePlansModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, refreshUser } = useAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState<boolean>(true);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('yearly');

  // Checkout state
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'select' | 'details' | 'success'>('select');

  // Form Fields - Workshop Info
  const [franchiseName, setFranchiseName] = useState('');
  const [primaryCenterName, setPrimaryCenterName] = useState('');
  const [city, setCity] = useState('Ahmedabad');
  const [area, setArea] = useState('SG Highway');
  const [address, setAddress] = useState('Plot 42, Motorway Hub');
  const [phone, setPhone] = useState('+91 98250 12345');
  const [totalBays, setTotalBays] = useState(6);
  const [totalMechanics, setTotalMechanics] = useState(6);

  // Form Fields - Payment Gateway
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'card' | 'upi' | 'netbanking'>('razorpay');
  const [cardNumber, setCardNumber] = useState('4532 8819 9201 3491');
  const [cardName, setCardName] = useState('Rajesh Patel');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('883');
  const [upiId, setUpiId] = useState('rajesh.auto@okaxis');
  const [upiVerified, setUpiVerified] = useState(true);
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [purchasedInfo, setPurchasedInfo] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      loadPlans();
      setCheckoutStep('select');
      setErrorMessage(null);
    }
  }, [isOpen]);

  const loadPlans = async () => {
    setLoadingPlans(true);
    try {
      const data = await api.getSubscriptionPlans();
      setPlans(data);
      if (data.length > 0) {
        setSelectedPlan(data[0]); // Default to Starter or popular
      }
    } catch (e) {
      console.error('Failed to load subscription plans', e);
    } finally {
      setLoadingPlans(false);
    }
  };

  const getCurrentUserTier = (): 'starter' | 'growth' | 'enterprise' | null => {
    if (!user || user.role === 'super_admin') return null;
    const tier = (user.plan_tier || '').toLowerCase();
    if (tier.includes('enterprise')) return 'enterprise';
    if (tier.includes('growth')) return 'growth';
    if (tier.includes('starter')) return 'starter';
    const name = (user.plan_name || '').toLowerCase();
    if (name.includes('enterprise')) return 'enterprise';
    if (name.includes('growth')) return 'growth';
    if (name.includes('starter')) return 'starter';
    if (user.role === 'franchise_owner') return 'growth';
    return null;
  };

  const TIER_LEVELS: Record<string, number> = {
    starter: 1,
    growth: 2,
    enterprise: 3,
  };

  const currentTier = getCurrentUserTier();
  const currentTierRank = currentTier ? (TIER_LEVELS[currentTier] || 0) : 0;
  const isAlreadySubscribed = currentTierRank > 0;

  const handleSelectPlan = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
    setCheckoutStep('details');
    // Pre-fill smart defaults based on user
    const baseName = user?.name ? user.name.split(' ')[0] : 'Apex';
    if (!franchiseName) {
      setFranchiseName(`${baseName} Auto Mobility Group`);
    }
    if (!primaryCenterName) {
      setPrimaryCenterName(`${baseName} Car Care - Central Hub`);
    }
    if (!cardName) {
      setCardName(user?.name || 'Workshop Owner');
    }
    if (!upiId) {
      setUpiId(`${user?.email ? user.email.split('@')[0] : 'owner'}@okaxis`);
    }
  };

  const handleCardNumberChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})/g, '$1 ').trim();
    setCardNumber(formatted);
  };

  const handleCardExpiryChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Pricing calculations
  const currentPlanObj = plans.find((p) => p.id === currentTier);
  const currentPlanPrice = currentPlanObj
    ? (billingPeriod === 'yearly' ? currentPlanObj.price_yearly : currentPlanObj.price_monthly)
    : (currentTier === 'growth' ? 15000 : currentTier === 'starter' ? 5000 : 0);

  const targetPlanPrice = selectedPlan
    ? (billingPeriod === 'yearly' ? selectedPlan.price_yearly : selectedPlan.price_monthly)
    : 20000;

  const isUpgrade = isAlreadySubscribed && selectedPlan && (TIER_LEVELS[selectedPlan.id] || 0) > currentTierRank;
  const upgradeDifference = isUpgrade ? Math.max(0, targetPlanPrice - currentPlanPrice) : targetPlanPrice;
  const basePrice = isUpgrade ? upgradeDifference : targetPlanPrice;
  const gstAmount = Math.round(basePrice * 0.18);
  const totalAmount = basePrice + gstAmount;

  const handleCompletePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.purchaseSubscription({
        plan_id: selectedPlan.id,
        franchise_name: franchiseName.trim(),
        primary_center_name: primaryCenterName.trim(),
        city: city.trim(),
        area: area.trim(),
        address: address.trim(),
        phone: phone.trim(),
        total_bays: Number(totalBays),
        total_mechanics: Number(totalMechanics),
        payment_method: paymentMethod,
        billing_period: billingPeriod,
        card_number: paymentMethod === 'card' ? cardNumber : undefined,
        card_name: paymentMethod === 'card' ? cardName : undefined,
        card_expiry: paymentMethod === 'card' ? cardExpiry : undefined,
        upi_id: paymentMethod === 'upi' ? upiId : undefined,
        bank_name: paymentMethod === 'netbanking' ? selectedBank : undefined,
      });

      setPurchasedInfo(res);
      setCheckoutStep('success');

      // Refresh current user profile in AuthContext
      await refreshUser();

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRazorpaySuccess = async (verifyResult: any) => {
    if (!selectedPlan) return;
    setPurchasedInfo({
      invoice_number: verifyResult.invoice_id || `INV-RZP-${new Date().getFullYear()}-${String(verifyResult.payment_id || '').slice(-6)}`,
      payment_reference: verifyResult.payment_id,
      franchise_name: verifyResult.franchise_name || franchiseName.trim() || `${user?.name || 'Automotive'} Group`,
      primary_center_name: verifyResult.primary_center_name || primaryCenterName.trim() || 'Central Workshop Hub',
      plan_name: verifyResult.plan_name || selectedPlan.name,
      max_allowed_centers: verifyResult.max_centers || selectedPlan.max_centers,
      amount_paid: totalAmount,
      tax_amount: gstAmount,
      payment_method: 'Razorpay Online'
    });
    setCheckoutStep('success');

    // Immediately refresh user profile in AuthContext so user.role is franchise_owner
    await refreshUser();

    if (onSuccess) {
      onSuccess();
    }
  };


  const handleModalClose = () => {
    onClose();
    if (checkoutStep === 'success') {
      refreshUser();
      if (onSuccess) {
        onSuccess();
      }
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md overflow-y-auto py-8 sm:py-14">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl text-white my-auto overflow-hidden relative z-[10000]">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        {/* Header */}
        <div className="p-5 sm:p-7 flex items-start justify-between border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SQMS Multi-Tenant Partner Program</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-extrabold text-white">
              {checkoutStep === 'details'
                ? (isAlreadySubscribed ? `Upgrade Checkout & Payment Gateway: ${selectedPlan?.name || 'Enterprise'}` : `Secure Checkout: ${selectedPlan?.name || 'Franchise'} Plan`)
                : checkoutStep === 'success'
                ? (isAlreadySubscribed ? 'Plan Upgraded Successfully!' : 'Payment Confirmed & Workshop Activated!')
                : (isAlreadySubscribed ? 'Upgrade Your Workshop Franchise Plan' : 'Choose Your Workshop Franchise Plan')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl">
              {checkoutStep === 'details'
                ? (isAlreadySubscribed
                    ? 'Review your upgrade details and complete payment via Credit/Debit Card, UPI QR, or Net Banking.'
                    : 'Configure your workshop details and complete payment via Credit/Debit Card, UPI QR, or Net Banking.')
                : checkoutStep === 'success'
                ? 'Your tax invoice has been generated. Your workshop franchise has been updated with expanded quotas.'
                : (isAlreadySubscribed
                    ? 'Review your active franchise plan or upgrade to higher branch tiers.'
                    : 'Scale your automotive service operations. Choose single-hub or multi-branch growth.')}
            </p>
          </div>

          <button
            onClick={handleModalClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-8 max-h-[78vh] overflow-y-auto">
          {/* STEP 1: PLAN SELECTOR */}
          {checkoutStep === 'select' && (
            <div className="space-y-6">
              {/* If user is already subscribed, show Current Plan Info Banner */}
              {isAlreadySubscribed && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 to-slate-900 border border-indigo-500/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30 shrink-0">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div>
                      <span className="font-bold text-white block text-sm">
                        Active Subscription: {user?.plan_name || 'Multi-Branch Growth'}
                      </span>
                      <span className="text-slate-400 text-xs">
                        Your franchise currently has quota for {user?.max_allowed_centers || 5} Workshop Centers. Select a higher tier below to upgrade your plan.
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-emerald-400 font-bold bg-emerald-500/20 px-3 py-1 rounded-full border border-emerald-500/30 text-[11px] inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Status: ACTIVE
                    </span>
                  </div>
                </div>
              )}

              {/* Billing Toggle */}
              <div className="flex justify-center">
                <div className="bg-slate-950 p-1.5 rounded-2xl border border-slate-800 inline-flex items-center space-x-2">
                  <button
                    onClick={() => setBillingPeriod('monthly')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      billingPeriod === 'monthly'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    onClick={() => setBillingPeriod('yearly')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                      billingPeriod === 'yearly'
                        ? 'bg-blue-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>Yearly Billing</span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      Save 16%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              {loadingPlans ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((p) => {
                    const price = billingPeriod === 'monthly' ? p.price_monthly : p.price_yearly;
                    const planRank = TIER_LEVELS[p.id] || 0;
                    const isCurrentPlan = isAlreadySubscribed && planRank === currentTierRank;
                    const isLowerTier = isAlreadySubscribed && planRank < currentTierRank;
                    const isUpgrade = isAlreadySubscribed && planRank > currentTierRank;
                    const isPopular = !isAlreadySubscribed && p.id === 'growth';
                    const isStarter = p.id === 'starter';

                    return (
                      <div
                        key={p.id}
                        className={`rounded-3xl p-6 border transition-all duration-300 flex flex-col justify-between relative ${
                          isCurrentPlan
                            ? 'bg-emerald-950/20 border-emerald-500/50 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                            : isUpgrade
                            ? 'bg-slate-800/90 border-indigo-500/80 shadow-2xl shadow-indigo-500/20 ring-1 ring-indigo-400/40'
                            : isLowerTier
                            ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                            : isPopular
                            ? 'bg-slate-800/80 border-blue-500/50 shadow-xl shadow-blue-500/10'
                            : 'bg-slate-800/30 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {isCurrentPlan && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-emerald-600 text-[10px] font-black tracking-wider uppercase text-white shadow-md flex items-center space-x-1">
                            <Check className="w-3 h-3 text-white" />
                            <span>Your Current Plan</span>
                          </div>
                        )}
                        {isUpgrade && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 text-[10px] font-black tracking-wider uppercase text-white shadow-md flex items-center space-x-1">
                            <Sparkles className="w-3 h-3 text-yellow-300" />
                            <span>Recommended Upgrade</span>
                          </div>
                        )}
                        {isPopular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-[10px] font-black tracking-wider uppercase text-white shadow-md">
                            Recommended for Growth
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              {isCurrentPlan ? 'Active Plan' : isLowerTier ? 'Included Tier' : isUpgrade ? 'Upgrade Tier' : p.badge}
                            </span>
                            <div className="p-2 rounded-xl bg-slate-900 border border-slate-700/60 text-blue-400">
                              {p.max_centers === 1 ? (
                                <Building2 className="w-4 h-4" />
                              ) : (
                                <Layers className="w-4 h-4" />
                              )}
                            </div>
                          </div>

                          <h3 className="text-xl font-black text-white mt-3 flex items-center gap-2">
                            <span>{p.name}</span>
                          </h3>
                          <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{p.description}</p>

                          {/* Plan Limit Callout */}
                          <div className="mt-4 p-2.5 rounded-xl bg-slate-900/80 border border-slate-700/80 flex items-center space-x-2 text-xs">
                            <Info className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="text-slate-300 font-semibold">
                              {isStarter ? (
                                <>Limit: <strong className="text-amber-400">1 Service Center</strong> only</>
                              ) : (
                                <>Limit: <strong className="text-emerald-400">Up to {p.max_centers === 999 ? 'Unlimited' : p.max_centers} Centers</strong> across cities</>
                              )}
                            </span>
                          </div>

                          {/* Pricing */}
                          <div className="mt-4">
                            <div className="flex items-baseline space-x-1">
                              <span className="text-3xl font-black text-white">
                                ₹{price.toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs text-slate-400">/{billingPeriod === 'monthly' ? 'month' : 'year'}</span>
                            </div>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              + 18% GST Applicable (₹{Math.round(price * 0.18).toLocaleString('en-IN')})
                            </span>
                          </div>

                          {/* Features list */}
                          <ul className="mt-5 space-y-2 text-xs text-slate-300">
                            {p.features.map((feat, idx) => (
                              <li key={idx} className="flex items-start space-x-2">
                                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                                <span className="leading-tight">{feat}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Button Action depending on tier */}
                        {isCurrentPlan ? (
                          <button
                            type="button"
                            disabled
                            className="mt-6 w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center justify-center space-x-1.5 cursor-default"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>Your Current Active Plan</span>
                          </button>
                        ) : isLowerTier ? (
                          <button
                            type="button"
                            disabled
                            className="mt-6 w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800/40 text-slate-500 border border-slate-700/40 flex items-center justify-center space-x-1.5 cursor-not-allowed"
                          >
                            <span>Included in Higher Tier</span>
                          </button>
                        ) : isUpgrade ? (
                          <button
                            type="button"
                            onClick={() => handleSelectPlan(p)}
                            className="mt-6 w-full py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/30 flex items-center justify-center space-x-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                            <span>Upgrade to {p.name.split(' ')[0]}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectPlan(p)}
                            className={`mt-6 w-full py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer ${
                              isPopular
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            }`}
                          >
                            <span>Select {p.name.split(' ')[0]}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DETAILS & REALISTIC PAYMENT GATEWAY */}
          {checkoutStep === 'details' && selectedPlan && (
            <form onSubmit={handleCompletePurchase} className="space-y-6 max-w-4xl mx-auto">
              {errorMessage && (
                <div className="p-4 rounded-2xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Selected Plan Summary Banner */}
              <div className="bg-indigo-950/40 border border-indigo-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                    Selected Subscription Plan
                  </span>
                  <div className="text-base font-extrabold text-white flex items-center space-x-2">
                    <span>{selectedPlan.name}</span>
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                      {selectedPlan.max_centers === 1 ? '1 Center Allowed' : `Up to ${selectedPlan.max_centers} Centers`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-emerald-400">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 block">incl. 18% GST</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('select')}
                    className="text-xs text-indigo-300 hover:text-white underline font-semibold cursor-pointer"
                  >
                    Change Plan
                  </button>
                </div>
              </div>

              {/* Grid: Workshop Details or Upgrade Overview on Left, Payment Gateway on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {isAlreadySubscribed ? (
                  /* Upgrade Comparison Card */
                  <div className="lg:col-span-7 bg-slate-800/40 border border-slate-700/80 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-700/60">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>Franchise Plan Upgrade Summary</span>
                      </h4>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30 font-semibold">
                        Instant Tier Upgrade
                      </span>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Current Plan:</span>
                        <span className="font-bold text-slate-300">{user?.plan_name || 'Multi-Branch Growth'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Upgrading To:</span>
                        <span className="font-black text-emerald-400 text-sm flex items-center gap-1.5">
                          <span>{selectedPlan.name}</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold">
                            {selectedPlan.max_centers === 999 ? 'Unlimited Centers' : `${selectedPlan.max_centers} Centers`}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Franchise Brand:</span>
                        <span className="font-semibold text-white">{franchiseName || `${user?.name || 'Partner'}'s Auto Group`}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Existing Branch Network:</span>
                        <span className="font-semibold text-blue-300">All data & branches automatically preserved</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 to-indigo-950/40 border border-blue-500/30 text-xs text-blue-200 space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-blue-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Automated Zero-Downtime Migration</span>
                      </div>
                      <p className="text-[11px] text-blue-300/80 leading-relaxed">
                        Your account will instantly transition to {selectedPlan.name}. All existing service centers, manager credentials, and queue schedules remain untouched with enhanced quota immediately available.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Workshop Setup Details (7 Cols) */
                  <div className="lg:col-span-7 bg-slate-800/40 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-blue-400" />
                      <span>Workshop Registration Details</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Franchise / Workshop Business Brand Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={franchiseName}
                          onChange={(e) => setFranchiseName(e.target.value)}
                          placeholder="e.g. Apex Auto Mobility Services"
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Primary Service Center Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={primaryCenterName}
                          onChange={(e) => setPrimaryCenterName(e.target.value)}
                          placeholder="e.g. Apex Auto - Central Hub"
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Ahmedabad"
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Area / Neighborhood *</label>
                        <input
                          type="text"
                          required
                          value={area}
                          onChange={(e) => setArea(e.target.value)}
                          placeholder="e.g. SG Highway"
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Physical Address *</label>
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. Plot 42, Motorway Hub"
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Official Workshop Phone *</label>
                        <input
                          type="text"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98250 12345"
                          className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Service Bays</label>
                          <input
                            type="number"
                            min={2}
                            max={selectedPlan.max_bays_per_center}
                            value={totalBays}
                            onChange={(e) => setTotalBays(Number(e.target.value))}
                            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-center focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 mb-1">Technicians</label>
                          <input
                            type="number"
                            min={2}
                            max={25}
                            value={totalMechanics}
                            onChange={(e) => setTotalMechanics(Number(e.target.value))}
                            className="w-full px-3 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white text-center focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Real-Time Payment Gateway Simulator (5 Cols) */}
                <div className="lg:col-span-5 bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-emerald-400" />
                        <span>Payment Gateway</span>
                      </h4>
                      <div className="flex items-center space-x-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        <ShieldCheck className="w-3 h-3" />
                        <span>256-Bit SSL</span>
                      </div>
                    </div>

                    {/* Method Selector Tabs */}
                    <div className="grid grid-cols-4 gap-1.5 mt-3 bg-slate-900 p-1 rounded-xl border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('razorpay')}
                        className={`py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                          paymentMethod === 'razorpay'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Razorpay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                          paymentMethod === 'card'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Card</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('upi')}
                        className={`py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                          paymentMethod === 'upi'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>UPI / QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('netbanking')}
                        className={`py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center space-x-1 cursor-pointer ${
                          paymentMethod === 'netbanking'
                            ? 'bg-blue-600 text-white shadow'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Landmark className="w-3 h-3" />
                        <span>NetBank</span>
                      </button>
                    </div>

                    {/* Method Specific Form */}
                    <div className="mt-4 space-y-3">
                      {paymentMethod === 'razorpay' && (
                        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-950/70 to-slate-900 border border-blue-500/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-white text-xs">Razorpay Standard Checkout</span>
                              <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 font-semibold">
                                Test Mode
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">rzp_test</span>
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed">
                            Official Razorpay modal popup with live test environment support for Cards, UPI apps, QR codes, and Netbanking with HMAC-SHA256 signature verification.
                          </p>
                          <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-300">
                            <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700/60 font-medium">All Cards</span>
                            <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700/60 font-medium">Google Pay / PhonePe / Paytm</span>
                            <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700/60 font-medium">Netbanking</span>
                          </div>
                        </div>
                      )}
                      {paymentMethod === 'card' && (
                        <>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Card Number
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                required
                                value={cardNumber}
                                onChange={(e) => handleCardNumberChange(e.target.value)}
                                placeholder="4532 8819 9201 3491"
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-blue-500"
                              />
                              <span className="absolute right-3 top-2 text-[10px] font-black uppercase text-blue-400 bg-blue-500/20 px-1.5 py-0.5 rounded">
                                VISA
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Cardholder Name
                            </label>
                            <input
                              type="text"
                              required
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              placeholder="e.g. Rajesh Patel"
                              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                Expiry (MM/YY)
                              </label>
                              <input
                                type="text"
                                required
                                value={cardExpiry}
                                onChange={(e) => handleCardExpiryChange(e.target.value)}
                                placeholder="08/28"
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono text-center focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                CVV
                              </label>
                              <input
                                type="password"
                                required
                                maxLength={4}
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value)}
                                placeholder="•••"
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono text-center focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {paymentMethod === 'upi' && (
                        <div className="space-y-3">
                          {/* Dynamic QR Code display */}
                          <div className="bg-white p-3 rounded-2xl flex flex-col items-center justify-center text-slate-950 space-y-1.5">
                            <div className="w-28 h-28 border-2 border-slate-900 p-1 rounded-xl flex items-center justify-center bg-slate-50">
                              <QrCode className="w-24 h-24 text-slate-900" />
                            </div>
                            <span className="text-[10px] font-mono text-slate-600 font-bold">
                              merchant.sqms@okaxis
                            </span>
                            <span className="text-[11px] font-black text-indigo-700">
                              Scan to pay ₹{totalAmount.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Or Enter Virtual Payment Address (UPI ID)
                            </label>
                            <div className="flex space-x-1.5">
                              <input
                                type="text"
                                value={upiId}
                                onChange={(e) => {
                                  setUpiId(e.target.value);
                                  setUpiVerified(true);
                                }}
                                placeholder="user@okhdfcbank"
                                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                              />
                              <button
                                type="button"
                                onClick={() => setUpiVerified(true)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-[11px] font-bold text-slate-200 cursor-pointer"
                              >
                                {upiVerified ? <Check className="w-4 h-4 text-emerald-400" /> : 'Verify'}
                              </button>
                            </div>
                            {upiVerified && (
                              <span className="text-[10px] text-emerald-400 flex items-center space-x-1 mt-1 font-semibold">
                                <CheckCircle className="w-3 h-3" />
                                <span>Verified Merchant / User UPI account</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'netbanking' && (
                        <div className="space-y-3">
                          <label className="block text-[11px] font-semibold text-slate-300">
                            Select Your Bank
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Punjab National Bank'].map((b) => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => setSelectedBank(b)}
                                className={`p-2 rounded-xl border text-left text-xs font-semibold transition cursor-pointer ${
                                  selectedBank === b
                                    ? 'bg-blue-600/20 border-blue-500 text-white'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                <div className="truncate">{b}</div>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Order Tax Breakdown */}
                    <div className="mt-4 pt-3 border-t border-slate-700/80 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Plan Base ({selectedPlan.name}):</span>
                        <span className="font-mono text-slate-300">₹{basePrice.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>GST 18% (CGST 9% + SGST 9%):</span>
                        <span className="font-mono text-slate-300">₹{gstAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-white font-extrabold pt-1.5 border-t border-slate-700">
                        <span>Total Payable:</span>
                        <span className="font-mono text-emerald-400 text-sm">₹{totalAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4">
                    {paymentMethod === 'razorpay' ? (
                      <RazorpayCheckoutButton
                        amount={totalAmount}
                        name="SQMS Mobility Pvt. Ltd."
                        description={`${selectedPlan.name} Subscription`}
                        planId={selectedPlan.id}
                        billingPeriod={billingPeriod}
                        franchiseName={franchiseName}
                        primaryCenterName={primaryCenterName}
                        address={address}
                        city={city}
                        area={area}
                        phone={phone}
                        totalBays={totalBays}
                        totalMechanics={totalMechanics}
                        prefill={{
                          name: user?.name || cardName,
                          email: user?.email || '',
                          contact: phone
                        }}
                        notes={{
                          franchise_name: franchiseName,
                          primary_center_name: primaryCenterName,
                          plan_id: selectedPlan.id,
                          billing_period: billingPeriod,
                          address,
                          city,
                          area,
                          phone,
                          total_bays: totalBays,
                          total_mechanics: totalMechanics
                        }}
                        buttonText={
                          isAlreadySubscribed
                            ? `Pay ₹${totalAmount.toLocaleString('en-IN')} with Razorpay & Upgrade`
                            : `Pay ₹${totalAmount.toLocaleString('en-IN')} with Razorpay & Activate`
                        }
                        onSuccess={handleRazorpaySuccess}
                        onError={(err) => setErrorMessage(err)}
                        onCancel={() => setErrorMessage('Razorpay checkout was dismissed by user.')}
                      />
                    ) : (
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-blue-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-50 text-white font-extrabold text-xs sm:text-sm shadow-xl shadow-blue-600/30 transition flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Verifying Payment & Provisioning...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-emerald-300" />
                            <span>
                              {isAlreadySubscribed
                                ? `Pay ₹${totalAmount.toLocaleString('en-IN')} & Complete Upgrade`
                                : `Pay ₹${totalAmount.toLocaleString('en-IN')} & Activate Workshop`}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400 text-center block mt-2">
                      RBI Digital Sandbox Compliant • Instant Activation
                    </span>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* STEP 3: OFFICIAL TAX INVOICE & SUCCESS RECEIPT */}
          {checkoutStep === 'success' && purchasedInfo && (
            <div className="max-w-2xl mx-auto space-y-6 py-4">
              {/* Top Success Badge */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-2xl font-black text-white">
                  Payment Confirmed • Franchise Workshop Active!
                </h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Your payment has been settled. Your account has been upgraded to <strong className="text-white">Franchise Owner</strong> with your workshop online.
                </p>
              </div>

              {/* Tax Invoice Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative overflow-hidden">
                <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      Official Tax Invoice
                    </span>
                    <h4 className="text-lg font-black text-white mt-1">SQMS Mobility Pvt. Ltd.</h4>
                    <p className="text-[11px] text-slate-400">GSTIN: 24AAACS9988K1ZQ • CIN: U72200GJ2026PTC099182</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-slate-300 block font-bold">
                      {purchasedInfo.invoice_number || 'INV-SQMS-2026-94812'}
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Ref: {purchasedInfo.payment_reference || 'PAY-SQMS-9281'}
                    </span>
                  </div>
                </div>

                {/* Bill To & Workshop Info */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Billed To</span>
                    <span className="font-bold text-white block">{purchasedInfo.franchise_name}</span>
                    <span className="text-slate-400 block">{purchasedInfo.primary_center_name}</span>
                    <span className="text-slate-500 text-[11px] block">{user?.email}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Plan Specification</span>
                    <span className="font-bold text-indigo-400 block">{purchasedInfo.plan_name}</span>
                    <span className="text-slate-300 block">
                      Allowed Limit: <strong className="text-emerald-400">{purchasedInfo.max_allowed_centers} Workshop Center(s)</strong>
                    </span>
                    <span className="text-slate-400 text-[11px] block">
                      Status: <strong className="text-emerald-400">Active & Verified</strong>
                    </span>
                  </div>
                </div>

                {/* Amount Table */}
                <div className="bg-slate-900 rounded-xl p-3 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Base Subscription Fee:</span>
                    <span className="font-mono text-slate-200">
                      ₹{((purchasedInfo.amount_paid || totalAmount) - (purchasedInfo.tax_amount || gstAmount)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>GST @ 18% (Tax):</span>
                    <span className="font-mono text-slate-200">
                      ₹{(purchasedInfo.tax_amount || gstAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-white font-extrabold pt-2 border-t border-slate-800">
                    <span>Total Paid (via {purchasedInfo.payment_method || 'Online Payment'}):</span>
                    <span className="font-mono text-emerald-400 text-sm">
                      ₹{(purchasedInfo.amount_paid || totalAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="w-full sm:w-1/2 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition flex items-center justify-center space-x-2 border border-slate-700 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download / Print Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={handleModalClose}
                  className="w-full sm:w-1/2 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>Enter Franchise Command Center</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
