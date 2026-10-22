import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ServiceCenter, SubscriptionPlan } from '../types';
import {
  Shield, Building2, Users, Activity, Settings, RefreshCw, CheckCircle2,
  Clock, Layers, Sparkles, TrendingUp, CreditCard, ArrowRight, Check,
  DollarSign, Receipt, Award, Edit3, Trash2, Plus, X, AlertCircle, AlertTriangle,
  Eye, EyeOff, CheckCircle
} from 'lucide-react';

interface AdminPortalProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  initialTab?: string;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ activeTab = 'admin-dashboard', onTabChange, initialTab }) => {
  const [tab, setTab] = useState<string>(() => {
    const t = activeTab || initialTab || 'overview';
    if (t === 'admin-centers' || t === 'centers') return 'centers';
    if (t === 'admin-audit' || t === 'audit') return 'audit';
    return 'overview';
  });
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [subscriptionOverview, setSubscriptionOverview] = useState<any>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Admin Plan Management State
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<SubscriptionPlan | null>(null);
  const [planActionLoading, setPlanActionLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Plan Form State
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formBadge, setFormBadge] = useState('Standard');
  const [formPriceMonthly, setFormPriceMonthly] = useState<number>(499);
  const [formPriceYearly, setFormPriceYearly] = useState<number>(5000);
  const [formMaxCenters, setFormMaxCenters] = useState<number>(1);
  const [formMaxBays, setFormMaxBays] = useState<number>(8);
  const [formMaxManagers, setFormMaxManagers] = useState<number>(1);
  const [formDescription, setFormDescription] = useState('');
  const [formFeaturesText, setFormFeaturesText] = useState('');
  const [formIsActive, setFormIsActive] = useState<boolean>(true);

  const loadData = async () => {
    try {
      const [cList, aData, logs, subData, pList] = await Promise.all([
        api.getServiceCenters().catch(() => []),
        api.getAdminAnalytics().catch(() => null),
        api.getAuditLogs(30).catch(() => []),
        api.getAdminSubscriptionOverview().catch(() => null),
        api.getAdminSubscriptionPlans().catch(() => []),
      ]);
      setCenters(cList as any);
      setAnalytics(aData);
      setAuditLogs(logs);
      setSubscriptionOverview(subData);
      setPlans(pList);
    } catch (e) {
      console.error('Failed to load admin data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setFormId(plan.id);
    setFormName(plan.name);
    setFormBadge(plan.badge || 'Standard');
    setFormPriceMonthly(plan.price_monthly);
    setFormPriceYearly(plan.price_yearly);
    setFormMaxCenters(plan.max_centers);
    setFormMaxBays(plan.max_bays_per_center);
    setFormMaxManagers(plan.max_managers);
    setFormDescription(plan.description || '');
    setFormFeaturesText((plan.features || []).join('\n'));
    setFormIsActive(plan.is_active !== false);
    setFeedback(null);
  };

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormId('');
    setFormName('');
    setFormBadge('Custom Hub');
    setFormPriceMonthly(999);
    setFormPriceYearly(9999);
    setFormMaxCenters(2);
    setFormMaxBays(10);
    setFormMaxManagers(2);
    setFormDescription('Targeted multi-bay workshop configuration with high concurrency.');
    setFormFeaturesText('2 Service Center Locations\nDynamic Wait Time Queue Prediction\nUp to 10 Service Bays\n2 Dedicated Branch Managers');
    setFormIsActive(true);
    setIsCreateModalOpen(true);
    setFeedback(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setPlanActionLoading(true);
    try {
      const features = formFeaturesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const updated = await api.updateSubscriptionPlan(editingPlan.id, {
        name: formName.trim(),
        badge: formBadge.trim(),
        price_monthly: Number(formPriceMonthly),
        price_yearly: Number(formPriceYearly),
        max_centers: Number(formMaxCenters),
        max_bays_per_center: Number(formMaxBays),
        max_managers: Number(formMaxManagers),
        description: formDescription.trim(),
        features,
        is_active: formIsActive,
      });

      setPlans((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingPlan(null);
      setFeedback({ type: 'success', message: `Plan "${updated.name}" updated successfully.` });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to update plan' });
    } finally {
      setPlanActionLoading(false);
    }
  };

  const handleSaveCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setPlanActionLoading(true);
    try {
      const features = formFeaturesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const created = await api.createSubscriptionPlan({
        id: formId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        name: formName.trim(),
        badge: formBadge.trim(),
        price_monthly: Number(formPriceMonthly),
        price_yearly: Number(formPriceYearly),
        max_centers: Number(formMaxCenters),
        max_bays_per_center: Number(formMaxBays),
        max_managers: Number(formMaxManagers),
        description: formDescription.trim(),
        features,
        is_active: true,
      });

      setPlans((prev) => [...prev, created]);
      setIsCreateModalOpen(false);
      setFeedback({ type: 'success', message: `New plan "${created.name}" created successfully.` });
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to create plan' });
    } finally {
      setPlanActionLoading(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmPlan) return;
    setPlanActionLoading(true);
    try {
      const res = await api.deleteSubscriptionPlan(deleteConfirmPlan.id);
      if (res.action === 'deactivated') {
        setPlans((prev) => prev.map((p) => (p.id === deleteConfirmPlan.id ? { ...p, is_active: false } : p)));
        setFeedback({
          type: 'success',
          message: `Plan "${deleteConfirmPlan.name}" was deactivated (existing franchise subscriptions remain protected).`,
        });
      } else {
        setPlans((prev) => prev.filter((p) => p.id !== deleteConfirmPlan.id));
        setFeedback({
          type: 'success',
          message: `Plan "${deleteConfirmPlan.name}" permanently deleted.`,
        });
      }
      setDeleteConfirmPlan(null);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to delete plan' });
    } finally {
      setPlanActionLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'admin-centers' || activeTab === 'centers') {
      setTab('centers');
    } else if (activeTab === 'admin-audit' || activeTab === 'audit') {
      setTab('audit');
    } else if (activeTab === 'admin-dashboard' || activeTab === 'overview') {
      setTab('overview');
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-white">
        <div className="flex flex-col items-center space-y-4 text-[#707070]">
          <div className="w-10 h-10 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium tracking-tight text-[#1d1d1f]">
            Loading Super Administrator Console...
          </span>
        </div>
      </div>
    );
  }

  const defaultTierStats = {
    starter: { count: 0, revenue: 0, price_monthly: 4999, name: "Single Hub Starter" },
    growth: { count: 0, revenue: 0, price_monthly: 12999, name: "Multi-Branch Growth" },
    enterprise: { count: 0, revenue: 0, price_monthly: 24999, name: "Enterprise Franchise" }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-white text-[#1d1d1f]">
      {/* Admin Header */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 text-[#1d1d1f] shadow-none flex flex-col md:flex-row md:items-center justify-between gap-6 border border-[#d6d6d6]">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
              Super Administrator Console
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#707070] border border-[#d6d6d6] font-medium">
              {tab === 'centers' ? 'Workshop Directory' : tab === 'audit' ? 'System Audit Trail' : 'Plans & Revenue Analytics'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold mt-2 text-[#1d1d1f] tracking-tight">
            {tab === 'centers' ? 'Workshop Centers Directory' : tab === 'audit' ? 'Security & System Audit Trail' : 'System Architecture & Plans Revenue'}
          </h1>
          <p className="text-[#707070] text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            {tab === 'centers'
              ? `Real-time directory of all ${centers.length} registered service centers, workshop capacities, and active queue counts.`
              : tab === 'audit'
              ? `Cryptographically logged audit events (${auditLogs.length} events), authorization records, and administrative actions.`
              : 'Managing multi-tenant franchise networks, subscription plan revenue, pricing tiers, and quota limits.'}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="p-2 rounded-full bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#1d1d1f] border border-[#d6d6d6] transition cursor-pointer"
            title="Refresh All Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* KPI 1: Active Queues */}
        <div className="bg-white p-5 rounded-[24px] border border-[#d6d6d6] hover:border-[#86868b] transition-all shadow-none">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#707070] block">Active Queues</span>
          <span className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] mt-1 block">{analytics?.active_queues ?? 0}</span>
          <span className="text-[10px] text-[#86868b] block mt-0.5">Live waiting vehicles</span>
        </div>

        {/* KPI 2: System Avg Wait */}
        <div className="bg-white p-5 rounded-[24px] border border-[#d6d6d6] hover:border-[#86868b] transition-all shadow-none">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#707070] block">System Avg Wait</span>
          <span className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] mt-1 block">{analytics?.system_avg_wait_minutes ?? 25.0}m</span>
          <span className="text-[10px] text-[#86868b] block mt-0.5">Across all branches</span>
        </div>

        {/* KPI 3: Daily Customers */}
        <div className="bg-white p-5 rounded-[24px] border border-[#d6d6d6] hover:border-[#86868b] transition-all shadow-none">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#707070] block">Total Customers</span>
          <span className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] mt-1 block">{analytics?.total_customers ?? 0}</span>
          <span className="text-[10px] text-[#86868b] block mt-0.5">Registered user accounts</span>
        </div>

        {/* KPI 4: Franchise Networks */}
        <div className="bg-white p-5 rounded-[24px] border border-[#d6d6d6] hover:border-[#86868b] transition-all shadow-none">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#707070] block">Franchise Networks</span>
          <span className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] mt-1 block">
            {subscriptionOverview?.total_franchises ?? analytics?.total_franchises ?? 0}
          </span>
          <span className="text-[10px] text-[#86868b] block mt-0.5">Active partner groups</span>
        </div>

        {/* KPI 5: Franchise Owners */}
        <div className="bg-white p-5 rounded-[24px] border border-[#d6d6d6] hover:border-[#86868b] transition-all shadow-none">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#707070] block">Franchise Owners</span>
          <span className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] mt-1 block">
            {subscriptionOverview?.total_franchise_owners ?? 0}
          </span>
          <span className="text-[10px] text-[#86868b] block mt-0.5">Verified workshop owners</span>
        </div>

        {/* KPI 6: Plans Revenue */}
        <div className="bg-white p-5 rounded-[24px] border border-[#d6d6d6] hover:border-[#86868b] transition-all shadow-none">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#707070] block">Plans Revenue</span>
          <span className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] mt-1 block">
            ₹{Math.round(subscriptionOverview?.total_revenue || 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-[#707070] block mt-0.5">
            {subscriptionOverview?.total_plans_sold || 0} Plans Sold
          </span>
        </div>
      </div>

      {/* TAB 1: PLANS & REVENUE ANALYTICS */}
      {tab === 'overview' && (
        <div className="space-y-8">
          {/* Feedback banner */}
          {feedback && (
            <div className={`p-4 rounded-[20px] flex items-center justify-between border ${
              feedback.type === 'success'
                ? 'bg-[#f5f5f7] border-[#d6d6d6] text-[#1d1d1f]'
                : 'bg-[#f5f5f7] border-[#b64400] text-[#b64400]'
            }`}>
              <div className="flex items-center space-x-2.5 text-xs font-medium">
                {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-[#b64400]" />}
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="p-1 hover:text-[#1d1d1f] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Subscription Plans Management Header & Grid */}
          <div>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-[#1d1d1f] flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-[#0071e3]" />
                  <span>Subscription Plans Management & Pricing</span>
                </h3>
                <p className="text-xs text-[#707070]">
                  Full Super Admin control to create, edit, customize pricing, quotas, features, or deactivate subscription tiers.
                </p>
              </div>
              <button
                onClick={handleOpenCreate}
                className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs shadow-none transition flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Plan</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(plans.length > 0 ? plans : [
                {
                  id: 'starter',
                  name: 'Single Hub Starter',
                  price_monthly: 499,
                  price_yearly: 5000,
                  max_centers: 1,
                  max_bays_per_center: 8,
                  max_managers: 1,
                  badge: 'Single Workshop',
                  description: 'Single-location service centers with up to 8 bays & 1 manager.',
                  features: ['1 Workshop listing', 'Dynamic Wait Time ML', 'Up to 8 Bays', '1 Branch Manager'],
                  is_active: true
                },
                {
                  id: 'growth',
                  name: 'Multi-Branch Growth',
                  price_monthly: 1499,
                  price_yearly: 15000,
                  max_centers: 5,
                  max_bays_per_center: 15,
                  max_managers: 5,
                  badge: 'Most Popular',
                  description: 'Multi-city automotive networks with up to 5 branch locations.',
                  features: ['Up to 5 Service Centers', 'Multi-Branch Load Balancing', '5 Branch Managers', 'Surge Predictions'],
                  is_active: true
                },
                {
                  id: 'enterprise',
                  name: 'Enterprise Franchise',
                  price_monthly: 1999,
                  price_yearly: 20000,
                  max_centers: 999,
                  max_bays_per_center: 30,
                  max_managers: 999,
                  badge: 'Full Network',
                  description: 'Unlimited workshop branches, custom ML retraining, and SLA.',
                  features: ['Unlimited Branches', 'Unlimited Managers', 'Custom ML Retraining', '24/7 SLA Support'],
                  is_active: true
                }
              ]).map((p) => {
                const tierStat = subscriptionOverview?.tier_breakdown?.[p.id];
                const isInactive = p.is_active === false;
                return (
                  <div
                    key={p.id}
                    className={`bg-white border rounded-[28px] p-6 relative space-y-4 shadow-none flex flex-col justify-between transition ${
                      isInactive ? 'border-[#e6e6e8] opacity-70' : 'border-[#d6d6d6] hover:border-[#86868b]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
                            {p.badge || 'Standard'}
                          </span>
                          {isInactive ? (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#707070] border border-[#d6d6d6] flex items-center gap-1">
                              <EyeOff className="w-3 h-3 text-[#707070]" /> Inactive
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6] flex items-center gap-1">
                              <Eye className="w-3 h-3 text-emerald-600" /> Active
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-base font-semibold text-[#1d1d1f]">₹{Number(p.price_monthly).toLocaleString()} <span className="text-[11px] font-normal text-[#707070]">/ mo</span></div>
                          <div className="text-[11px] font-normal text-[#707070]">₹{Number(p.price_yearly).toLocaleString()} / yr</div>
                        </div>
                      </div>

                      <h4 className="text-xl font-semibold text-[#1d1d1f]">{p.name}</h4>
                      <div className="text-[11px] font-mono text-[#86868b]">ID: {p.id}</div>
                      <p className="text-xs text-[#707070] mt-2 leading-relaxed">{p.description}</p>

                      {/* Quotas */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#e6e6e8] text-center">
                        <div className="bg-[#f5f5f7] p-2.5 rounded-[16px] border border-[#e6e6e8]">
                          <span className="text-[9px] text-[#707070] uppercase font-semibold block">Centers</span>
                          <span className="text-sm font-semibold text-[#1d1d1f]">{p.max_centers}</span>
                        </div>
                        <div className="bg-[#f5f5f7] p-2.5 rounded-[16px] border border-[#e6e6e8]">
                          <span className="text-[9px] text-[#707070] uppercase font-semibold block">Bays/Ctr</span>
                          <span className="text-sm font-semibold text-[#1d1d1f]">{p.max_bays_per_center}</span>
                        </div>
                        <div className="bg-[#f5f5f7] p-2.5 rounded-[16px] border border-[#e6e6e8]">
                          <span className="text-[9px] text-[#707070] uppercase font-semibold block">Managers</span>
                          <span className="text-sm font-semibold text-[#1d1d1f]">{p.max_managers}</span>
                        </div>
                      </div>

                      {/* Features bullet list */}
                      {p.features && p.features.length > 0 && (
                        <div className="mt-4 space-y-1.5 pt-3 border-t border-[#e6e6e8]">
                          {p.features.slice(0, 5).map((feat, fidx) => (
                            <div key={fidx} className="flex items-start text-xs text-[#707070]">
                              <Check className="w-3.5 h-3.5 text-[#1d1d1f] mr-2 shrink-0 mt-0.5" />
                              <span className="leading-tight">{feat}</span>
                            </div>
                          ))}
                          {p.features.length > 5 && (
                            <div className="text-[11px] text-[#86868b] pl-5.5">+ {p.features.length - 5} more features</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      {/* Sales telemetry */}
                      <div className="pt-3 border-t border-[#e6e6e8] grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-[#f5f5f7] p-2.5 rounded-[16px] border border-[#e6e6e8]">
                          <span className="text-[10px] text-[#707070] uppercase font-semibold block">Plans Sold</span>
                          <span className="text-lg font-semibold text-[#1d1d1f] mt-0.5 block">{tierStat?.count ?? 0}</span>
                        </div>
                        <div className="bg-[#f5f5f7] p-2.5 rounded-[16px] border border-[#e6e6e8]">
                          <span className="text-[10px] text-[#707070] uppercase font-semibold block">Revenue</span>
                          <span className="text-lg font-semibold text-[#1d1d1f] mt-0.5 block">
                            ₹{(tierStat?.revenue ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons: Edit and Delete */}
                      <div className="flex items-center gap-2 pt-2 border-t border-[#e6e6e8]">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="flex-1 py-2 px-3 rounded-full border border-[#86868b] hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Plan</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmPlan(p)}
                          className="py-2 px-3 rounded-full bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#b64400] border border-[#d6d6d6] text-xs font-medium transition flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Delete or Deactivate Plan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Franchise Owners Directory */}
          <div className="bg-white border border-[#d6d6d6] rounded-[28px] p-6 sm:p-8 space-y-5 shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#1d1d1f] flex items-center space-x-2">
                  <Users className="w-5 h-5 text-[#0071e3]" />
                  <span>Registered Franchise Owners Directory</span>
                </h3>
                <p className="text-xs text-[#707070]">
                  Franchise owners manage and register workshops under their subscribed branch quotas.
                </p>
              </div>
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
                {subscriptionOverview?.franchise_owners?.length || 0} Owners Registered
              </span>
            </div>

            <div className="overflow-x-auto rounded-[20px] border border-[#e6e6e8]">
              <table className="w-full text-left text-xs text-[#1d1d1f] min-w-[700px]">
                <thead className="bg-[#f5f5f7] uppercase text-[10px] font-semibold text-[#707070] tracking-wider border-b border-[#e6e6e8]">
                  <tr>
                    <th className="p-3.5">Owner Name</th>
                    <th className="p-3.5">Email & Phone</th>
                    <th className="p-3.5">Franchise Brand</th>
                    <th className="p-3.5">Active Plan</th>
                    <th className="p-3.5">Branches (Active / Limit)</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e6e8]">
                  {(!subscriptionOverview?.franchise_owners || subscriptionOverview.franchise_owners.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-[#707070]">
                        No franchise owners registered yet.
                      </td>
                    </tr>
                  ) : (
                    subscriptionOverview.franchise_owners.map((fo: any) => (
                      <tr key={fo.id} className="hover:bg-[#fafafc] transition">
                        <td className="p-3.5 font-semibold text-[#1d1d1f]">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#1d1d1f] font-semibold flex items-center justify-center text-xs">
                              {fo.name?.charAt(0) || 'O'}
                            </div>
                            <span>{fo.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono text-[#1d1d1f] block">{fo.email}</span>
                          <span className="text-[11px] text-[#707070]">{fo.phone || 'No phone'}</span>
                        </td>
                        <td className="p-3.5 font-medium text-[#1d1d1f]">
                          {fo.franchise_name}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6] font-medium text-[11px]">
                            {fo.plan_name}
                          </span>
                        </td>
                        <td className="p-3.5 font-medium text-[#1d1d1f]">
                          {fo.centers_count} of {fo.max_allowed_centers} branches
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6] text-[10px] font-medium">
                            {fo.status?.toUpperCase() || 'ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Plan Purchases & Invoices Table */}
          <div className="bg-white border border-[#d6d6d6] rounded-[28px] p-6 sm:p-8 space-y-5 shadow-none">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[#1d1d1f] flex items-center space-x-2">
                  <Receipt className="w-5 h-5 text-[#0071e3]" />
                  <span>Recent Plan Purchases & Invoices</span>
                </h3>
                <p className="text-xs text-[#707070]">
                  Real-time record of all subscription plan purchases, billing amounts, and transaction references.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-[20px] border border-[#e6e6e8]">
              <table className="w-full text-left text-xs text-[#1d1d1f] min-w-[750px]">
                <thead className="bg-[#f5f5f7] uppercase text-[10px] font-semibold text-[#707070] tracking-wider border-b border-[#e6e6e8]">
                  <tr>
                    <th className="p-3.5">Invoice #</th>
                    <th className="p-3.5">Purchaser</th>
                    <th className="p-3.5">Subscribed Plan</th>
                    <th className="p-3.5">Billing Period</th>
                    <th className="p-3.5">Total Amount (Inc. GST)</th>
                    <th className="p-3.5">Payment Method</th>
                    <th className="p-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e6e8]">
                  {(!subscriptionOverview?.invoices || subscriptionOverview.invoices.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-[#707070]">
                        No purchase invoices recorded yet.
                      </td>
                    </tr>
                  ) : (
                    subscriptionOverview.invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-[#fafafc] transition">
                        <td className="p-3.5 font-mono font-medium text-[#0066cc]">{inv.invoice_number}</td>
                        <td className="p-3.5">
                          <span className="font-semibold text-[#1d1d1f] block">{inv.customer_name}</span>
                          <span className="text-[11px] text-[#707070] font-mono">{inv.customer_email}</span>
                        </td>
                        <td className="p-3.5 font-medium text-[#1d1d1f]">{inv.plan_name}</td>
                        <td className="p-3.5 capitalize text-[#707070]">{inv.billing_period}</td>
                        <td className="p-3.5 font-semibold text-[#1d1d1f]">
                          ₹{inv.total_amount?.toLocaleString()}
                        </td>
                        <td className="p-3.5 uppercase font-mono text-[11px] text-[#707070]">
                          {inv.payment_method}
                        </td>
                        <td className="p-3.5 text-[#707070]">{inv.created_at}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WORKSHOPS DIRECTORY (MONITORING ONLY) */}
      {tab === 'centers' && (
        <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-[#1d1d1f]">Service Centers Network ({centers.length} Centers)</h3>
              <p className="text-xs text-[#707070]">
                System-wide overview of active workshops, bays, mechanics, and live workload. (Service centers are registered and managed by Franchise Owners).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[20px] border border-[#e6e6e8]">
            <table className="w-full text-left text-xs text-[#1d1d1f] min-w-[800px]">
              <thead className="bg-[#f5f5f7] uppercase text-[10px] font-semibold text-[#707070] tracking-wider border-b border-[#e6e6e8]">
                <tr>
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Center Name</th>
                  <th className="p-3.5">City / Area</th>
                  <th className="p-3.5">Phone</th>
                  <th className="p-3.5">Bays (Avail/Total)</th>
                  <th className="p-3.5">Mechs (Avail/Total)</th>
                  <th className="p-3.5">Workload</th>
                  <th className="p-3.5">Queue</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e6e8]">
                {centers.map((c) => (
                  <tr key={c.id} className="hover:bg-[#fafafc] transition">
                    <td className="p-3.5 font-mono font-medium text-[#1d1d1f]">#{c.id}</td>
                    <td className="p-3.5 font-semibold text-[#1d1d1f]">{c.name}</td>
                    <td className="p-3.5 text-[#707070]">
                      {c.area}, {c.city}
                    </td>
                    <td className="p-3.5 text-[#707070]">{c.phone}</td>
                    <td className="p-3.5 font-medium text-[#1d1d1f]">
                      {c.available_bays} / {c.total_bays} bays
                    </td>
                    <td className="p-3.5 font-medium text-[#1d1d1f]">
                      {c.available_mechanics} / {c.total_mechanics} mechs
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-[#1d1d1f]">{Math.round(c.current_workload * 100)}%</span>
                    </td>
                    <td className="p-3.5 font-semibold text-[#1d1d1f]">{c.active_queue_count} vehicles</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#1d1d1f] font-medium border border-[#d6d6d6] text-[10px]">
                        {c.status?.toUpperCase() || 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT TRAIL */}
      {tab === 'audit' && (
        <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-[#1d1d1f]">Security & Operational Audit Trail</h3>
            <p className="text-xs text-[#707070]">Chronological ledger of security events, status updates, and administrative actions.</p>
          </div>

          <div className="overflow-x-auto rounded-[20px] border border-[#e6e6e8]">
            <table className="w-full text-left text-xs text-[#1d1d1f] min-w-[700px]">
              <thead className="bg-[#f5f5f7] uppercase text-[10px] font-semibold text-[#707070] tracking-wider border-b border-[#e6e6e8]">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Entity</th>
                  <th className="p-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e6e6e8] font-mono text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#fafafc] transition">
                    <td className="p-3.5 text-[#707070] text-[11px]">{log.timestamp.slice(0, 19)}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#1d1d1f] font-medium text-[10px] border border-[#d6d6d6]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-[#1d1d1f] font-medium">{log.entity} #{log.entity_id}</td>
                    <td className="p-3.5 text-[#707070] font-sans">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT PLAN */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#d6d6d6] rounded-[28px] p-6 sm:p-8 max-w-2xl w-full text-[#1d1d1f] shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#e6e6e8]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6] flex items-center justify-center">
                  <Edit3 className="w-5 h-5 text-[#0071e3]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1d1d1f]">Edit Subscription Plan</h3>
                  <span className="text-xs font-mono text-[#707070]">ID: {editingPlan.id}</span>
                </div>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-2 text-[#707070] hover:text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Plan Display Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium focus:outline-none focus:border-[#0071e3]"
                    placeholder="e.g. Single Hub Starter"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium focus:outline-none focus:border-[#0071e3]"
                    placeholder="e.g. Most Popular, Single Workshop"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Monthly Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={formPriceMonthly}
                    onChange={(e) => setFormPriceMonthly(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Yearly Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={formPriceYearly}
                    onChange={(e) => setFormPriceYearly(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Max Centers</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMaxCenters}
                    onChange={(e) => setFormMaxCenters(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium focus:outline-none focus:border-[#0071e3] text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Max Bays / Center</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMaxBays}
                    onChange={(e) => setFormMaxBays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium focus:outline-none focus:border-[#0071e3] text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Max Managers</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMaxManagers}
                    onChange={(e) => setFormMaxManagers(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium focus:outline-none focus:border-[#0071e3] text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Plan Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs focus:outline-none focus:border-[#0071e3] leading-relaxed"
                  placeholder="Summary of who this plan is tailored for..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#1d1d1f]">Features List</label>
                  <span className="text-[10px] text-[#707070]">One feature per line</span>
                </div>
                <textarea
                  rows={5}
                  value={formFeaturesText}
                  onChange={(e) => setFormFeaturesText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-mono focus:outline-none focus:border-[#0071e3] leading-relaxed"
                  placeholder="1 Service Center&#10;Up to 8 Bays&#10;Dynamic Waiting Time Prediction"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="formIsActiveEdit"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0071e3] bg-white border-[#d6d6d6] cursor-pointer"
                />
                <label htmlFor="formIsActiveEdit" className="text-xs font-medium text-[#1d1d1f] cursor-pointer select-none">
                  Plan is Active (Visible to franchise owners during purchase/upgrade)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#e6e6e8]">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2.5 rounded-full text-[#707070] hover:text-[#1d1d1f] text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planActionLoading}
                  className="px-6 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center space-x-2 shadow-none cursor-pointer disabled:opacity-50"
                >
                  {planActionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Plan Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE PLAN */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#d6d6d6] rounded-[28px] p-6 sm:p-8 max-w-2xl w-full text-[#1d1d1f] shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#e6e6e8]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6] flex items-center justify-center">
                  <Plus className="w-5 h-5 text-[#0071e3]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1d1d1f]">Create New Subscription Plan</h3>
                  <span className="text-xs text-[#707070]">Add a custom franchise tier with bespoke quotas & pricing</span>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-[#707070] hover:text-[#1d1d1f] rounded-full hover:bg-[#f5f5f7] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Plan Identifier (Slug) *</label>
                  <input
                    type="text"
                    required
                    value={formId}
                    onChange={(e) => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-mono focus:outline-none focus:border-[#0071e3]"
                    placeholder="e.g. regional_tier"
                  />
                  <span className="text-[10px] text-[#707070] mt-0.5 block">Lowercase key used internally & by payment gateway</span>
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Plan Display Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium focus:outline-none focus:border-[#0071e3]"
                    placeholder="e.g. Regional Fleet Pro"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium focus:outline-none focus:border-[#0071e3]"
                    placeholder="e.g. Custom Hub"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Monthly Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={formPriceMonthly}
                    onChange={(e) => setFormPriceMonthly(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Yearly Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={formPriceYearly}
                    onChange={(e) => setFormPriceYearly(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Max Centers</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMaxCenters}
                    onChange={(e) => setFormMaxCenters(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium focus:outline-none focus:border-[#0071e3] text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Max Bays / Center</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMaxBays}
                    onChange={(e) => setFormMaxBays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium focus:outline-none focus:border-[#0071e3] text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Max Managers</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMaxManagers}
                    onChange={(e) => setFormMaxManagers(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium focus:outline-none focus:border-[#0071e3] text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-[#1d1d1f] block mb-1">Plan Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs focus:outline-none focus:border-[#0071e3] leading-relaxed"
                  placeholder="Short overview of the plan..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#1d1d1f]">Features List</label>
                  <span className="text-[10px] text-[#707070]">One feature per line</span>
                </div>
                <textarea
                  rows={4}
                  value={formFeaturesText}
                  onChange={(e) => setFormFeaturesText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#d6d6d6] text-[#1d1d1f] text-xs font-mono focus:outline-none focus:border-[#0071e3] leading-relaxed"
                  placeholder="2 Workshop Centers&#10;Up to 10 Service Bays&#10;Dynamic Waiting Time Prediction"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-[#e6e6e8]">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-full text-[#707070] hover:text-[#1d1d1f] text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planActionLoading}
                  className="px-6 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center space-x-2 shadow-none cursor-pointer disabled:opacity-50"
                >
                  {planActionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Plan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: DELETE CONFIRMATION */}
      {deleteConfirmPlan && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#d6d6d6] rounded-[28px] p-6 sm:p-7 max-w-md w-full text-[#1d1d1f] shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-[#b64400]">
              <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#b64400]" />
              </div>
              <h3 className="text-base font-semibold text-[#1d1d1f]">Delete Subscription Plan?</h3>
            </div>

            <p className="text-xs text-[#707070] leading-relaxed">
              Are you sure you want to remove <strong className="text-[#1d1d1f]">{deleteConfirmPlan.name}</strong> (<code className="text-[#b64400]">{deleteConfirmPlan.id}</code>)?
            </p>
            <div className="p-3 rounded-2xl bg-[#f5f5f7] border border-[#e6e6e8] text-[11px] text-[#707070] leading-relaxed">
              <strong>Safe Deactivation Policy:</strong> If any franchise owner has an active subscription under this tier, DriveOps will safely deactivate the plan so their operations continue uninterrupted while removing it from checkout. If unused, it is permanently deleted.
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#e6e6e8]">
              <button
                type="button"
                onClick={() => setDeleteConfirmPlan(null)}
                className="px-4 py-2 rounded-full text-[#707070] hover:text-[#1d1d1f] text-xs font-medium transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={planActionLoading}
                onClick={handleExecuteDelete}
                className="px-5 py-2 rounded-full bg-[#b64400] hover:bg-[#963700] text-white text-xs font-medium transition flex items-center space-x-2 shadow-none cursor-pointer disabled:opacity-50"
              >
                {planActionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Yes, Delete / Deactivate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
