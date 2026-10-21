import React, { useState } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type {
  RazorpayOptions,
  RazorpayPaymentSuccessResponse,
  RazorpayPaymentVerifyResponse
} from '../types';
import { ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

interface RazorpayCheckoutButtonProps {
  /** Amount in INR rupees (e.g., 499 for ₹499) */
  amount: number;
  /** Explicit amount in paise if required (overrides amount) */
  amountInPaise?: number;
  currency?: string;
  name?: string;
  description?: string;
  receipt?: string;
  notes?: Record<string, any>;
  planId?: string;
  billingPeriod?: string;
  franchiseName?: string;
  primaryCenterName?: string;
  address?: string;
  city?: string;
  area?: string;
  phone?: string;
  totalBays?: number;
  totalMechanics?: number;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  buttonText?: string;
  className?: string;
  disabled?: boolean;
  onSuccess?: (verifyResult: RazorpayPaymentVerifyResponse) => void;
  onError?: (errorMessage: string) => void;
  onCancel?: () => void;
  showErrorAlert?: boolean;
}

export const RazorpayCheckoutButton: React.FC<RazorpayCheckoutButtonProps> = ({
  amount,
  amountInPaise,
  currency = 'INR',
  name = 'DriveOps — Queue & Workshop Management',
  description = 'Automotive Service & Subscription Payment',
  receipt,
  notes = {},
  planId,
  billingPeriod = 'monthly',
  franchiseName,
  primaryCenterName,
  address,
  city,
  area,
  phone,
  totalBays,
  totalMechanics,
  prefill,
  buttonText,
  className = '',
  disabled = false,
  onSuccess,
  onError,
  onCancel,
  showErrorAlert = true,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper to ensure Razorpay checkout script is loaded
  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window !== 'undefined' && window.Razorpay) {
        return resolve(true);
      }
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleCheckout = async (e: React.MouseEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      // 1. Calculate amount in paise (1 INR = 100 paise)
      const calculatedPaise = amountInPaise !== undefined ? amountInPaise : Math.round(amount * 100);

      if (calculatedPaise < 100) {
        throw new Error('Minimum order amount must be at least ₹1.00 (100 paise).');
      }

      // 2. Ensure checkout.js script is loaded
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }

      // 3. Step 1: Call Backend to create order
      const orderData = await api.createRazorpayOrder({
        amount: calculatedPaise,
        currency,
        receipt: receipt || `sqms_${Date.now()}`,
        notes: {
          ...notes,
          user_id: user?.id,
          sqms_user_id: user?.id ? String(user.id) : '',
          customer_email: user?.email || prefill?.email || '',
          plan_id: planId || '',
          billing_period: billingPeriod || '',
          franchise_name: franchiseName || '',
          primary_center_name: primaryCenterName || '',
          city: city || '',
          area: area || '',
          address: address || '',
          phone: phone || '',
          total_bays: totalBays || 6,
          total_mechanics: totalMechanics || 6,
        }
      });

      if (!orderData || !orderData.order_id) {
        throw new Error('Failed to create Razorpay payment order.');
      }

      // 4. Resolve Public Key ID (prefer frontend env var, fallback to orderData key_id)
      const razorpayKey = import.meta.env.VITE_RAZORPAY_KEY_ID || orderData.key_id;
      if (!razorpayKey) {
        throw new Error('Razorpay public key ID is missing. Please configure VITE_RAZORPAY_KEY_ID.');
      }

      // 5. Step 2: Open Razorpay Standard Checkout Modal
      const options: RazorpayOptions = {
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency || currency,
        name,
        description,
        order_id: orderData.order_id,
        handler: async (response: RazorpayPaymentSuccessResponse) => {
          try {
            setLoading(true);
            // Step 3: Verify Payment Signature on Backend & Provision Franchise Workshop
            const verifyResult = await api.verifyRazorpayPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              user_id: user?.id,
              user_email: user?.email,
              plan_id: planId,
              billing_period: billingPeriod,
              franchise_name: franchiseName,
              primary_center_name: primaryCenterName,
              address,
              city,
              area,
              phone,
              total_bays: totalBays,
              total_mechanics: totalMechanics,
              notes: {
                ...notes,
                user_id: user?.id,
                sqms_user_id: user?.id ? String(user.id) : '',
                customer_email: user?.email || '',
                plan_id: planId,
              }
            });

            setLoading(false);
            if (onSuccess) {
              onSuccess(verifyResult);
            }
          } catch (verifyErr: any) {
            setLoading(false);
            const errText = verifyErr.message || 'Payment signature verification failed.';
            setErrorMessage(errText);
            if (onError) {
              onError(errText);
            }
          }
        },
        prefill: {
          name: prefill?.name || user?.name || '',
          email: prefill?.email || user?.email || '',
          contact: prefill?.contact || user?.phone || ''
        },
        notes: {
          ...notes,
          sqms_user_id: user?.id ? String(user.id) : ''
        },
        theme: {
          color: '#2563EB'
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            if (onCancel) {
              onCancel();
            }
          }
        }
      };

      const razorpayInstance = new window.Razorpay(options);

      // Handle payment failure event (declined card, cancelled bank, etc.)
      razorpayInstance.on('payment.failed', (failureResponse: any) => {
        setLoading(false);
        const reason = failureResponse?.error?.description || failureResponse?.error?.reason || 'Payment could not be processed.';
        const detailedError = `Payment Failed: ${reason}`;
        setErrorMessage(detailedError);
        if (onError) {
          onError(detailedError);
        }
      });

      razorpayInstance.open();
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Unable to initiate Razorpay checkout.';
      setErrorMessage(msg);
      if (onError) {
        onError(msg);
      }
    }
  };

  const defaultButtonLabel = `Pay ₹${amount.toLocaleString('en-IN')} with Razorpay`;

  return (
    <div className="w-full space-y-2">
      {showErrorAlert && errorMessage && (
        <div className="p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-start space-x-2 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block">Checkout Error</span>
            <span>{errorMessage}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={disabled || loading}
        className={
          className ||
          'w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer'
        }
      >
        {loading ? (
          <>
            <RefreshCw className="w-4 h-4 animate-spin text-white" />
            <span>Connecting to Razorpay...</span>
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4 text-emerald-300" />
            <span>{buttonText || defaultButtonLabel}</span>
          </>
        )}
      </button>
    </div>
  );
};
