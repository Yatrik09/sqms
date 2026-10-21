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
    <div className="fixed inset-0 z-[9999] flex items-start justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-sm overflow-y-auto py-8 sm:py-14 animate-in fade-in duration-200">
      <div className="bg-white border border-[#d6d6d6] rounded-[28px] w-full max-w-5xl shadow-2xl text-[#1d1d1f] my-auto overflow-hidden relative z-[10000]">
        {/* Header */}
        <div className="p-6 sm:p-8 flex items-start justify-between border-b border-[#f0f0f2]">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#0071e3] text-xs font-medium mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>SQMS Multi-Tenant Partner Program</span>
            </div>
            <h2 className="text-xl sm:text-3xl font-semibold text-[#1d1d1f] tracking-tight">
              {checkoutStep === 'details'
                ? (isAlreadySubscribed ? `Upgrade Checkout & Payment Gateway: ${selectedPlan?.name || 'Enterprise'}` : `Secure Checkout: ${selectedPlan?.name || 'Franchise'} Plan`)
                : checkoutStep === 'success'
                ? (isAlreadySubscribed ? 'Plan Upgraded Successfully!' : 'Payment Confirmed & Workshop Activated!')
                : (isAlreadySubscribed ? 'Upgrade Your Workshop Franchise Plan' : 'Choose Your Workshop Franchise Plan')}
            </h2>
            <p className="text-xs sm:text-sm text-[#707070] mt-1 max-w-2xl">
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
            className="p-2 rounded-full border border-[#d6d6d6] hover:bg-[#f5f5f7] text-[#1d1d1f] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 max-h-[78vh] overflow-y-auto">
          {/* STEP 1: PLAN SELECTOR */}
          {checkoutStep === 'select' && (
            <div className="space-y-6">
              {/* If user is already subscribed, show Current Plan Info Banner */}
              {isAlreadySubscribed && (
                <div className="p-5 rounded-2xl bg-[#f5f5f7] border border-[#d6d6d6] text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#1d1d1f]">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-white text-[#0071e3] flex items-center justify-center border border-[#d6d6d6] shrink-0">
                      <Sparkles className="w-4 h-4 text-[#0071e3]" />
                    </div>
                    <div>
                      <span className="font-semibold text-[#1d1d1f] block text-sm">
                        Active Subscription: {user?.plan_name || 'Multi-Branch Growth'}
                      </span>
                      <span className="text-[#707070] text-xs">
                        Your franchise currently has quota for {user?.max_allowed_centers || 5} Workshop Centers. Select a higher tier below to upgrade your plan.
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[#10b981] font-medium bg-white px-3 py-1 rounded-full border border-emerald-200 text-[11px] inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10b981]" />
                      Status: ACTIVE
                    </span>
                  </div>
                </div>
              )}

              {/* Billing Toggle */}
              <div className="flex justify-center">
                <div className="bg-[#f5f5f7] p-1 rounded-full border border-[#d6d6d6] inline-flex items-center space-x-1">
                  <button
                    onClick={() => setBillingPeriod('monthly')}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition cursor-pointer ${
                      billingPeriod === 'monthly'
                        ? 'bg-white text-[#1d1d1f] shadow-sm'
                        : 'text-[#707070] hover:text-[#1d1d1f]'
                    }`}
                  >
                    Monthly Billing
                  </button>
                  <button
                    onClick={() => setBillingPeriod('yearly')}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer ${
                      billingPeriod === 'yearly'
                        ? 'bg-white text-[#1d1d1f] shadow-sm'
                        : 'text-[#707070] hover:text-[#1d1d1f]'
                    }`}
                  >
                    <span>Yearly Billing</span>
                    <span className="text-[10px] bg-emerald-50 text-[#10b981] px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                      Save 16%
                    </span>
                  </button>
                </div>
              </div>

              {/* Plans Grid */}
              {loadingPlans ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-8 h-8 text-[#0071e3] animate-spin" />
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
                        className={`rounded-[28px] p-6 border transition-all duration-300 flex flex-col justify-between relative shadow-none ${
                          isCurrentPlan
                            ? 'bg-[#fafafc] border-2 border-[#10b981]'
                            : isUpgrade
                            ? 'bg-white border-2 border-[#0071e3]'
                            : isLowerTier
                            ? 'bg-[#fafafc] border-[#d6d6d6] opacity-60'
                            : isPopular
                            ? 'bg-white border-2 border-[#0071e3]'
                            : 'bg-white border border-[#d6d6d6] hover:border-[#86868b]'
                        }`}
                      >
                        {isCurrentPlan && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#10b981] text-[10px] font-medium tracking-wider uppercase text-white shadow-sm flex items-center space-x-1">
                            <Check className="w-3 h-3 text-white" />
                            <span>Your Current Plan</span>
                          </div>
                        )}
                        {isUpgrade && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#0071e3] text-[10px] font-medium tracking-wider uppercase text-white shadow-sm flex items-center space-x-1">
                            <Sparkles className="w-3 h-3 text-white" />
                            <span>Recommended Upgrade</span>
                          </div>
                        )}
                        {isPopular && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-[#0071e3] text-[10px] font-medium tracking-wider uppercase text-white shadow-sm">
                            Recommended for Growth
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium uppercase tracking-wider text-[#707070]">
                              {isCurrentPlan ? 'Active Plan' : isLowerTier ? 'Included Tier' : isUpgrade ? 'Upgrade Tier' : p.badge}
                            </span>
                            <div className="p-2 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#0071e3]">
                              {p.max_centers === 1 ? (
                                <Building2 className="w-4 h-4" />
                              ) : (
                                <Layers className="w-4 h-4" />
                              )}
                            </div>
                          </div>

                          <h3 className="text-xl font-semibold text-[#1d1d1f] mt-3 flex items-center gap-2">
                            <span>{p.name}</span>
                          </h3>
                          <p className="text-xs text-[#707070] mt-1 min-h-[32px]">{p.description}</p>

                          {/* Plan Limit Callout */}
                          <div className="mt-4 p-3 rounded-2xl bg-[#f5f5f7] border border-[#d6d6d6] flex items-center space-x-2 text-xs">
                            <Info className="w-4 h-4 text-[#0071e3] shrink-0" />
                            <span className="text-[#1d1d1f] font-medium">
                              {isStarter ? (
                                <>Limit: <strong className="text-[#1d1d1f]">1 Service Center</strong> only</>
                              ) : (
                                <>Limit: <strong className="text-[#10b981]">Up to {p.max_centers === 999 ? 'Unlimited' : p.max_centers} Centers</strong> across cities</>
                              )}
                            </span>
                          </div>

                          {/* Pricing */}
                          <div className="mt-4">
                            <div className="flex items-baseline space-x-1">
                              <span className="text-3xl font-semibold text-[#1d1d1f]">
                                ₹{price.toLocaleString('en-IN')}
                              </span>
                              <span className="text-xs text-[#707070]">/{billingPeriod === 'monthly' ? 'month' : 'year'}</span>
                            </div>
                            <span className="text-[11px] text-[#707070] block mt-0.5">
                              + 18% GST Applicable (₹{Math.round(price * 0.18).toLocaleString('en-IN')})
                            </span>
                          </div>

                          {/* Features list */}
                          <ul className="mt-5 space-y-2 text-xs text-[#707070]">
                            {p.features.map((feat, idx) => (
                              <li key={idx} className="flex items-start space-x-2">
                                <Check className="w-3.5 h-3.5 text-[#0071e3] shrink-0 mt-0.5" />
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
                            className="mt-6 w-full py-2.5 rounded-full font-medium text-xs bg-[#f5f5f7] text-[#10b981] border border-emerald-200 flex items-center justify-center space-x-1.5 cursor-default"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                            <span>Your Current Active Plan</span>
                          </button>
                        ) : isLowerTier ? (
                          <button
                            type="button"
                            disabled
                            className="mt-6 w-full py-2.5 rounded-full font-medium text-xs bg-[#f5f5f7] text-[#707070] border border-[#d6d6d6] flex items-center justify-center space-x-1.5 cursor-not-allowed"
                          >
                            <span>Included in Higher Tier</span>
                          </button>
                        ) : isUpgrade ? (
                          <button
                            type="button"
                            onClick={() => handleSelectPlan(p)}
                            className="mt-6 w-full py-2.5 rounded-full font-medium text-xs bg-[#0071e3] hover:bg-[#0077ed] text-white shadow-none flex items-center justify-center space-x-1.5 cursor-pointer transition"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                            <span>Upgrade to {p.name.split(' ')[0]}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelectPlan(p)}
                            className={`mt-6 w-full py-2.5 rounded-full font-medium text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-none ${
                              isPopular
                                ? 'bg-[#0071e3] hover:bg-[#0077ed] text-white'
                                : 'bg-[#1d1d1f] hover:bg-black text-white'
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
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-[#b64400] text-xs flex items-center space-x-2.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-[#b64400]" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Selected Plan Summary Banner */}
              <div className="bg-[#f5f5f7] border border-[#d6d6d6] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[#1d1d1f]">
                <div>
                  <span className="text-[10px] uppercase font-medium text-[#707070] tracking-wider">
                    Selected Subscription Plan
                  </span>
                  <div className="text-base font-semibold text-[#1d1d1f] flex items-center space-x-2 mt-0.5">
                    <span>{selectedPlan.name}</span>
                    <span className="text-xs bg-white text-[#0071e3] px-2.5 py-0.5 rounded-full border border-[#d6d6d6] font-medium">
                      {selectedPlan.max_centers === 1 ? '1 Center Allowed' : `Up to ${selectedPlan.max_centers} Centers`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className="text-base font-semibold text-[#10b981]">
                      ₹{totalAmount.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-[#707070] block">incl. 18% GST</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('select')}
                    className="text-xs text-[#0066cc] hover:underline font-medium cursor-pointer"
                  >
                    Change Plan
                  </button>
                </div>
              </div>

              {/* Grid: Workshop Details or Upgrade Overview on Left, Payment Gateway on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {isAlreadySubscribed ? (
                  /* Upgrade Comparison Card */
                  <div className="lg:col-span-7 bg-white border border-[#d6d6d6] rounded-[24px] p-6 space-y-4 shadow-none text-[#1d1d1f]">
                    <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f2]">
                      <h4 className="text-xs font-medium uppercase tracking-wider text-[#707070] flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-[#0071e3]" />
                        <span>Franchise Plan Upgrade Summary</span>
                      </h4>
                      <span className="text-[10px] bg-[#f5f5f7] text-[#0071e3] px-2.5 py-0.5 rounded-full border border-[#d6d6d6] font-medium">
                        Instant Tier Upgrade
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-[#d6d6d6] space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#707070]">Current Plan:</span>
                        <span className="font-semibold text-[#1d1d1f]">{user?.plan_name || 'Multi-Branch Growth'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#707070]">Upgrading To:</span>
                        <span className="font-semibold text-[#10b981] text-sm flex items-center gap-1.5">
                          <span>{selectedPlan.name}</span>
                          <span className="text-[10px] bg-white text-[#10b981] px-2 py-0.5 rounded-full border border-emerald-200 font-medium">
                            {selectedPlan.max_centers === 999 ? 'Unlimited Centers' : `${selectedPlan.max_centers} Centers`}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#707070]">Franchise Brand:</span>
                        <span className="font-semibold text-[#1d1d1f]">{franchiseName || `${user?.name || 'Partner'}'s Auto Group`}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#707070]">Existing Branch Network:</span>
                        <span className="font-medium text-[#0071e3]">All data & branches automatically preserved</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#f5f5f7] border border-[#d6d6d6] text-xs text-[#1d1d1f] space-y-1.5">
                      <div className="font-semibold flex items-center gap-1.5 text-[#1d1d1f]">
                        <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
                        <span>Automated Zero-Downtime Migration</span>
                      </div>
                      <p className="text-[11px] text-[#707070] leading-relaxed">
                        Your account will instantly transition to {selectedPlan.name}. All existing service centers, manager credentials, and queue schedules remain untouched with enhanced quota immediately available.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Workshop Setup Details (7 Cols) */
                  <div className="lg:col-span-7 bg-white border border-[#d6d6d6] rounded-[24px] p-6 space-y-4 shadow-none text-[#1d1d1f]">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-[#707070] flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-[#0071e3]" />
                      <span>Workshop Registration Details</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-[#707070] mb-1">
                          Franchise / Workshop Business Brand Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={franchiseName}
                          onChange={(e) => setFranchiseName(e.target.value)}
                          placeholder="e.g. Apex Auto Mobility Services"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 font-medium"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-[#707070] mb-1">
                          Primary Service Center Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={primaryCenterName}
                          onChange={(e) => setPrimaryCenterName(e.target.value)}
                          placeholder="e.g. Apex Auto - Central Hub"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#707070] mb-1">City *</label>
                        <input
                          type="text"
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="e.g. Ahmedabad"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#707070] mb-1">Area / Neighborhood *</label>
                        <input
                          type="text"
                          required
                          value={area}
                          onChange={(e) => setArea(e.target.value)}
                          placeholder="e.g. SG Highway"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 font-medium"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-[#707070] mb-1">Physical Address *</label>
                        <input
                          type="text"
                          required
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="e.g. Plot 42, Motorway Hub"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 font-medium"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[#707070] mb-1">Official Workshop Phone *</label>
                        <input
                          type="text"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98250 12345"
                          className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 font-medium"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-[#707070] mb-1">Service Bays</label>
                          <input
                            type="number"
                            min={2}
                            max={selectedPlan.max_bays_per_center}
                            value={totalBays}
                            onChange={(e) => setTotalBays(Number(e.target.value))}
                            className="w-full px-3 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] text-center focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-[#707070] mb-1">Technicians</label>
                          <input
                            type="number"
                            min={2}
                            max={25}
                            value={totalMechanics}
                            onChange={(e) => setTotalMechanics(Number(e.target.value))}
                            className="w-full px-3 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] text-center focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 font-medium"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Real-Time Payment Gateway Simulator (5 Cols) */}
                <div className="lg:col-span-5 bg-[#f5f5f7] border border-[#d6d6d6] rounded-[24px] p-6 space-y-4 flex flex-col justify-between shadow-none text-[#1d1d1f]">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#d6d6d6]">
                      <h4 className="text-xs font-medium uppercase tracking-wider text-[#707070] flex items-center space-x-2">
                        <CreditCard className="w-4 h-4 text-[#0071e3]" />
                        <span>Payment Gateway</span>
                      </h4>
                      <div className="flex items-center space-x-1 text-[10px] text-[#10b981] font-medium bg-white px-2 py-0.5 rounded-full border border-emerald-200">
                        <ShieldCheck className="w-3 h-3" />
                        <span>256-Bit SSL</span>
                      </div>
                    </div>

                    {/* Method Selector Tabs */}
                    <div className="grid grid-cols-4 gap-1 mt-3 bg-white p-1 rounded-full border border-[#d6d6d6]">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod('razorpay')}
                        className={`py-1.5 rounded-full text-[11px] font-medium transition flex items-center justify-center space-x-1 cursor-pointer ${
                          paymentMethod === 'razorpay'
                            ? 'bg-[#0071e3] text-white shadow-none'
                            : 'text-[#707070] hover:text-[#1d1d1f]'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-white" />
                        <span>Razorpay</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('card')}
                        className={`py-1.5 rounded-full text-[11px] font-medium transition flex items-center justify-center space-x-1 cursor-pointer ${
                          paymentMethod === 'card'
                            ? 'bg-[#0071e3] text-white shadow-none'
                            : 'text-[#707070] hover:text-[#1d1d1f]'
                        }`}
                      >
                        <CreditCard className="w-3 h-3" />
                        <span>Card</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('upi')}
                        className={`py-1.5 rounded-full text-[11px] font-medium transition flex items-center justify-center space-x-1 cursor-pointer ${
                          paymentMethod === 'upi'
                            ? 'bg-[#0071e3] text-white shadow-none'
                            : 'text-[#707070] hover:text-[#1d1d1f]'
                        }`}
                      >
                        <Smartphone className="w-3 h-3" />
                        <span>UPI / QR</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod('netbanking')}
                        className={`py-1.5 rounded-full text-[11px] font-medium transition flex items-center justify-center space-x-1 cursor-pointer ${
                          paymentMethod === 'netbanking'
                            ? 'bg-[#0071e3] text-white shadow-none'
                            : 'text-[#707070] hover:text-[#1d1d1f]'
                        }`}
                      >
                        <Landmark className="w-3 h-3" />
                        <span>NetBank</span>
                      </button>
                    </div>

                    {/* Method Specific Form */}
                    <div className="mt-4 space-y-3">
                      {paymentMethod === 'razorpay' && (
                        <div className="p-4 rounded-2xl bg-white border border-[#d6d6d6] space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-[#1d1d1f] text-xs">Razorpay Standard Checkout</span>
                              <span className="text-[10px] bg-[#f5f5f7] text-[#0071e3] px-2 py-0.5 rounded-full border border-[#d6d6d6] font-medium">
                                Test Mode
                              </span>
                            </div>
                            <span className="text-[10px] text-[#707070] font-mono">rzp_test</span>
                          </div>
                          <p className="text-xs text-[#707070] leading-relaxed">
                            Official Razorpay modal popup with live test environment support for Cards, UPI apps, QR codes, and Netbanking with HMAC-SHA256 signature verification.
                          </p>
                          <div className="flex flex-wrap gap-1.5 text-[10px] text-[#707070]">
                            <span className="px-2 py-0.5 bg-[#f5f5f7] rounded-full border border-[#d6d6d6] font-medium">All Cards</span>
                            <span className="px-2 py-0.5 bg-[#f5f5f7] rounded-full border border-[#d6d6d6] font-medium">Google Pay / PhonePe / Paytm</span>
                            <span className="px-2 py-0.5 bg-[#f5f5f7] rounded-full border border-[#d6d6d6] font-medium">Netbanking</span>
                          </div>
                        </div>
                      )}
                      {paymentMethod === 'card' && (
                        <>
                          <div>
                            <label className="block text-[11px] font-medium text-[#707070] mb-1">
                              Card Number
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                required
                                value={cardNumber}
                                onChange={(e) => handleCardNumberChange(e.target.value)}
                                placeholder="4532 8819 9201 3491"
                                className="w-full px-3 py-2 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] font-mono placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
                              />
                              <span className="absolute right-3 top-2 text-[10px] font-semibold uppercase text-[#0071e3] bg-[#f5f5f7] px-1.5 py-0.5 rounded border border-[#d6d6d6]">
                                VISA
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-[#707070] mb-1">
                              Cardholder Name
                            </label>
                            <input
                              type="text"
                              required
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value)}
                              placeholder="e.g. Rajesh Patel"
                              className="w-full px-3 py-2 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-medium text-[#707070] mb-1">
                                Expiry (MM/YY)
                              </label>
                              <input
                                type="text"
                                required
                                value={cardExpiry}
                                onChange={(e) => handleCardExpiryChange(e.target.value)}
                                placeholder="08/28"
                                className="w-full px-3 py-2 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] font-mono text-center focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium text-[#707070] mb-1">
                                CVV
                              </label>
                              <input
                                type="password"
                                required
                                maxLength={4}
                                value={cardCvv}
                                onChange={(e) => setCardCvv(e.target.value)}
                                placeholder="•••"
                                className="w-full px-3 py-2 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] font-mono text-center focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
                              />
                            </div>
                          </div>
                        </>
                      )}

                      {paymentMethod === 'upi' && (
                        <div className="space-y-3">
                          {/* Dynamic QR Code display */}
                          <div className="bg-white p-4 rounded-2xl border border-[#d6d6d6] flex flex-col items-center justify-center text-[#1d1d1f] space-y-1.5">
                            <div className="w-28 h-28 border border-[#d6d6d6] p-1 rounded-xl flex items-center justify-center bg-[#fafafc]">
                              <QrCode className="w-24 h-24 text-[#1d1d1f]" />
                            </div>
                            <span className="text-[10px] font-mono text-[#707070] font-medium">
                              merchant.sqms@okaxis
                            </span>
                            <span className="text-[11px] font-semibold text-[#0071e3]">
                              Scan to pay ₹{totalAmount.toLocaleString('en-IN')}
                            </span>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium text-[#707070] mb-1">
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
                                className="flex-1 px-3 py-2 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] font-mono focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20"
                              />
                              <button
                                type="button"
                                onClick={() => setUpiVerified(true)}
                                className="px-3 py-1.5 rounded-full border border-[#86868b] hover:bg-[#f5f5f7] text-[11px] font-medium text-[#1d1d1f] cursor-pointer"
                              >
                                {upiVerified ? <Check className="w-4 h-4 text-[#10b981]" /> : 'Verify'}
                              </button>
                            </div>
                            {upiVerified && (
                              <span className="text-[10px] text-[#10b981] flex items-center space-x-1 mt-1 font-medium">
                                <CheckCircle className="w-3 h-3" />
                                <span>Verified Merchant / User UPI account</span>
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {paymentMethod === 'netbanking' && (
                        <div className="space-y-3">
                          <label className="block text-[11px] font-medium text-[#707070]">
                            Select Your Bank
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Kotak Mahindra', 'Punjab National Bank'].map((b) => (
                              <button
                                key={b}
                                type="button"
                                onClick={() => setSelectedBank(b)}
                                className={`p-2.5 rounded-xl border text-left text-xs font-medium transition cursor-pointer ${
                                  selectedBank === b
                                    ? 'bg-white border-[#0071e3] text-[#0071e3] shadow-sm'
                                    : 'bg-white border-[#d6d6d6] text-[#707070] hover:text-[#1d1d1f]'
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
                    <div className="mt-4 pt-3 border-t border-[#d6d6d6] space-y-1.5 text-xs">
                      <div className="flex justify-between text-[#707070]">
                        <span>Plan Base ({selectedPlan.name}):</span>
                        <span className="font-mono text-[#1d1d1f]">₹{basePrice.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-[#707070]">
                        <span>GST 18% (CGST 9% + SGST 9%):</span>
                        <span className="font-mono text-[#1d1d1f]">₹{gstAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-[#1d1d1f] font-semibold pt-1.5 border-t border-[#d6d6d6]">
                        <span>Total Payable:</span>
                        <span className="font-mono text-[#10b981] text-sm">₹{totalAmount.toLocaleString('en-IN')}</span>
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
                        className="w-full py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-medium text-xs sm:text-sm shadow-none transition flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        {submitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Verifying Payment & Provisioning...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4 text-white" />
                            <span>
                              {isAlreadySubscribed
                                ? `Pay ₹${totalAmount.toLocaleString('en-IN')} & Complete Upgrade`
                                : `Pay ₹${totalAmount.toLocaleString('en-IN')} & Activate Workshop`}
                            </span>
                          </>
                        )}
                      </button>
                    )}
                    <span className="text-[10px] text-[#707070] text-center block mt-2">
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
                <div className="w-16 h-16 bg-[#f5f5f7] border border-[#d6d6d6] text-[#10b981] rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <h3 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">
                  Payment Confirmed • Franchise Workshop Active!
                </h3>
                <p className="text-xs text-[#707070] max-w-md mx-auto">
                  Your payment has been settled. Your account has been upgraded to <strong className="text-[#1d1d1f]">Franchise Owner</strong> with your workshop online.
                </p>
              </div>

              {/* Tax Invoice Card */}
              <div className="bg-white border border-[#d6d6d6] rounded-[28px] p-6 sm:p-8 space-y-4 shadow-xl relative overflow-hidden text-[#1d1d1f]">
                <div className="flex items-start justify-between border-b border-[#f0f0f2] pb-4">
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#0071e3] bg-[#f5f5f7] px-2.5 py-0.5 rounded-full border border-[#d6d6d6]">
                      Official Tax Invoice
                    </span>
                    <h4 className="text-lg font-semibold text-[#1d1d1f] mt-1.5">SQMS Mobility Pvt. Ltd.</h4>
                    <p className="text-[11px] text-[#707070]">GSTIN: 24AAACS9988K1ZQ • CIN: U72200GJ2026PTC099182</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono text-[#1d1d1f] block font-semibold">
                      {purchasedInfo.invoice_number || 'INV-SQMS-2026-94812'}
                    </span>
                    <span className="text-[11px] text-[#707070] block">
                      Ref: {purchasedInfo.payment_reference || 'PAY-SQMS-9281'}
                    </span>
                  </div>
                </div>

                {/* Bill To & Workshop Info */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[#707070] font-medium block text-[10px] uppercase">Billed To</span>
                    <span className="font-semibold text-[#1d1d1f] block">{purchasedInfo.franchise_name}</span>
                    <span className="text-[#707070] block">{purchasedInfo.primary_center_name}</span>
                    <span className="text-[#707070] text-[11px] block">{user?.email}</span>
                  </div>

                  <div>
                    <span className="text-[#707070] font-medium block text-[10px] uppercase">Plan Specification</span>
                    <span className="font-semibold text-[#0071e3] block">{purchasedInfo.plan_name}</span>
                    <span className="text-[#1d1d1f] block">
                      Allowed Limit: <strong className="text-[#10b981]">{purchasedInfo.max_allowed_centers} Workshop Center(s)</strong>
                    </span>
                    <span className="text-[#707070] text-[11px] block">
                      Status: <strong className="text-[#10b981]">Active & Verified</strong>
                    </span>
                  </div>
                </div>

                {/* Amount Table */}
                <div className="bg-[#f5f5f7] rounded-2xl p-4 space-y-2 text-xs border border-[#d6d6d6]">
                  <div className="flex justify-between text-[#707070]">
                    <span>Base Subscription Fee:</span>
                    <span className="font-mono text-[#1d1d1f]">
                      ₹{((purchasedInfo.amount_paid || totalAmount) - (purchasedInfo.tax_amount || gstAmount)).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#707070]">
                    <span>GST @ 18% (Tax):</span>
                    <span className="font-mono text-[#1d1d1f]">
                      ₹{(purchasedInfo.tax_amount || gstAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#1d1d1f] font-semibold pt-2 border-t border-[#d6d6d6]">
                    <span>Total Paid (via {purchasedInfo.payment_method || 'Online Payment'}):</span>
                    <span className="font-mono text-[#10b981] text-sm">
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
                  className="w-full sm:w-1/2 py-3 rounded-full border border-[#86868b] hover:bg-[#f5f5f7] text-[#1d1d1f] font-medium text-xs transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download / Print Invoice</span>
                </button>

                <button
                  type="button"
                  onClick={handleModalClose}
                  className="w-full sm:w-1/2 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs shadow-none transition flex items-center justify-center space-x-2 cursor-pointer"
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
