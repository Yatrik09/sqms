import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ServiceCenter, SubscriptionPlan } from '../types';
import {
  Shield, Building2, Users, Activity, Settings, RefreshCw, CheckCircle2,
  Clock, Layers, Sparkles, TrendingUp, CreditCard, ArrowRight, Check,
  DollarSign, Receipt, Award, Edit3, Trash2, Plus, X, AlertCircle, AlertTriangle,
  Eye, EyeOff, CheckCircle
} from 'lucide-react';

export const AdminPortal: React.FC<{ initialTab?: string }> = ({ initialTab = 'overview' }) => {
  const [tab, setTab] = useState<string>(initialTab === 'centers' || initialTab === 'audit' ? initialTab : 'overview');
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
        .map(f => f.trim())
        .filter(f => f.length > 0);

      await api.updateSubscriptionPlan(editingPlan.id, {
        name: formName.trim(),
        price_monthly: Number(formPriceMonthly),
        price_yearly: Number(formPriceYearly),
        max_centers: Number(formMaxCenters),
        max_bays_per_center: Number(formMaxBays),
        max_managers: Number(formMaxManagers),
        badge: formBadge.trim(),
        description: formDescription.trim(),
        features,
        is_active: formIsActive
      });

      setFeedback({ type: 'success', message: `Plan "${formName}" updated successfully!` });
      setEditingPlan(null);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to update plan' });
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
        .map(f => f.trim())
        .filter(f => f.length > 0);

      const cleanId = (formId.trim() || formName.toLowerCase().replace(/[^a-z0-9]+/g, '_')).trim();

      await api.createSubscriptionPlan({
        id: cleanId,
        name: formName.trim(),
        price_monthly: Number(formPriceMonthly),
        price_yearly: Number(formPriceYearly),
        max_centers: Number(formMaxCenters),
        max_bays_per_center: Number(formMaxBays),
        max_managers: Number(formMaxManagers),
        badge: formBadge.trim(),
        description: formDescription.trim(),
        features,
      });

      setFeedback({ type: 'success', message: `New Plan "${formName}" created successfully!` });
      setIsCreateModalOpen(false);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to create plan' });
    } finally {
      setPlanActionLoading(false);
    }
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmPlan) return;
    setPlanActionLoading(true);
    try {
      const res = await api.deleteSubscriptionPlan(deleteConfirmPlan.id);
      setFeedback({ type: 'success', message: res.message || `Plan "${deleteConfirmPlan.name}" removed.` });
      setDeleteConfirmPlan(null);
      await loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err?.message || 'Failed to delete plan' });
    } finally {
      setPlanActionLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (initialTab) {
      setTab(initialTab === 'centers' || initialTab === 'audit' ? initialTab : 'overview');
    }
  }, [initialTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center space-x-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-purple-500" />
          <span className="text-sm font-medium">Loading system administration & revenue telemetry...</span>
        </div>
      </div>
    );
  }

  const tier = subscriptionOverview?.tier_breakdown || {
    starter: { count: 0, revenue: 0, price_monthly: 499, name: "Single Hub Starter" },
    growth: { count: 0, revenue: 0, price_monthly: 1499, name: "Multi-Branch Growth" },
    enterprise: { count: 0, revenue: 0, price_monthly: 24999, name: "Enterprise Franchise" }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans">
      {/* Admin Header */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-slate-800">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Super Administrator Console
            </span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-semibold">
              Platform Root
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2 text-white">System Architecture & Overview</h1>
          <p className="text-slate-400 text-xs mt-1 max-w-2xl">
            Managing Multi-Tenant Franchises, Subscription Plan Revenue, Workshop Centers, and Live Queue Dispatch.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            title="Refresh All Telemetry"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* KPI 1: Active Queues */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Queues</span>
          <span className="text-2xl font-black text-amber-400 mt-1 block">{analytics?.active_queues ?? 0}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Live waiting vehicles</span>
        </div>

        {/* KPI 2: System Avg Wait */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">System Avg Wait</span>
          <span className="text-2xl font-black text-blue-400 mt-1 block">{analytics?.system_avg_wait_minutes ?? 25.0}m</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Across all branches</span>
        </div>

        {/* KPI 3: Daily Customers */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Total Customers</span>
          <span className="text-2xl font-black text-purple-400 mt-1 block">{analytics?.total_customers ?? 0}</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Registered user accounts</span>
        </div>

        {/* KPI 4: Franchise Networks */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Franchise Networks</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            {subscriptionOverview?.total_franchises ?? analytics?.total_franchises ?? 0}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Active partner groups</span>
        </div>

        {/* KPI 5: Franchise Owners */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Franchise Owners</span>
          <span className="text-2xl font-black text-indigo-400 mt-1 block">
            {subscriptionOverview?.total_franchise_owners ?? 0}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Verified workshop owners</span>
        </div>

        {/* KPI 6: Plans Revenue */}
        <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Plans Revenue</span>
          <span className="text-2xl font-black text-emerald-400 mt-1 block">
            ₹{Math.round(subscriptionOverview?.total_revenue || 0).toLocaleString()}
          </span>
          <span className="text-[10px] text-emerald-400/80 block mt-0.5">
            ● {subscriptionOverview?.total_plans_sold || 0} Plans Sold
          </span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setTab('overview')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center space-x-2 ${
            tab === 'overview' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Plans & Revenue Analytics</span>
        </button>

        <button
          onClick={() => setTab('centers')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center space-x-2 ${
            tab === 'centers' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Workshops Directory ({centers.length})</span>
        </button>

        <button
          onClick={() => setTab('audit')}
          className={`pb-3 border-b-2 transition cursor-pointer flex items-center space-x-2 ${
            tab === 'audit' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>System Audit Trail ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: PLANS & REVENUE ANALYTICS */}
      {tab === 'overview' && (
        <div className="space-y-8">
          {/* Feedback banner */}
          {feedback && (
            <div className={`p-4 rounded-2xl flex items-center justify-between border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-red-950/60 border-red-500/40 text-red-300'
            }`}>
              <div className="flex items-center space-x-2.5 text-xs font-semibold">
                {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="p-1 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Subscription Plans Management Header & Grid */}
          <div>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <span>Subscription Plans Management & Pricing</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Full Super Admin control to create, edit, customize pricing, quotas, features, or deactivate subscription tiers.
                </p>
              </div>
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
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
                    className={`bg-slate-900/90 border rounded-3xl p-6 relative overflow-hidden space-y-4 shadow-xl card-glow flex flex-col justify-between transition ${
                      isInactive ? 'border-slate-800 opacity-70' : 'border-slate-800 hover:border-purple-500/50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            {p.badge || 'Standard'}
                          </span>
                          {isInactive ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                              <EyeOff className="w-3 h-3 text-slate-400" /> Inactive
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Eye className="w-3 h-3 text-emerald-400" /> Active
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-base font-black text-white">₹{Number(p.price_monthly).toLocaleString()} <span className="text-[10px] font-normal text-slate-400">/ mo</span></div>
                          <div className="text-[11px] font-medium text-slate-400">₹{Number(p.price_yearly).toLocaleString()} / yr</div>
                        </div>
                      </div>

                      <h4 className="text-xl font-black text-white">{p.name}</h4>
                      <div className="text-[11px] font-mono text-slate-500">ID: {p.id}</div>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed">{p.description}</p>

                      {/* Quotas */}
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center">
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Centers</span>
                          <span className="text-sm font-black text-white">{p.max_centers}</span>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Bays/Ctr</span>
                          <span className="text-sm font-black text-white">{p.max_bays_per_center}</span>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Managers</span>
                          <span className="text-sm font-black text-white">{p.max_managers}</span>
                        </div>
                      </div>

                      {/* Features bullet list */}
                      {p.features && p.features.length > 0 && (
                        <div className="mt-4 space-y-1.5 pt-3 border-t border-slate-800/60">
                          {p.features.slice(0, 5).map((feat, fidx) => (
                            <div key={fidx} className="flex items-start text-xs text-slate-300">
                              <Check className="w-3.5 h-3.5 text-emerald-400 mr-2 shrink-0 mt-0.5" />
                              <span className="leading-tight">{feat}</span>
                            </div>
                          ))}
                          {p.features.length > 5 && (
                            <div className="text-[11px] text-slate-500 pl-5.5">+ {p.features.length - 5} more features</div>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      {/* Sales telemetry */}
                      <div className="pt-3 border-t border-slate-800 grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Plans Sold</span>
                          <span className="text-lg font-black text-white mt-0.5 block">{tierStat?.count ?? 0}</span>
                        </div>
                        <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Revenue</span>
                          <span className="text-lg font-black text-emerald-400 mt-0.5 block">
                            ₹{(tierStat?.revenue ?? 0).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons: Edit and Delete */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="flex-1 py-2 px-3 rounded-xl bg-purple-600/15 hover:bg-purple-600/25 text-purple-300 hover:text-white border border-purple-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Plan</span>
                        </button>
                        <button
                          onClick={() => setDeleteConfirmPlan(p)}
                          className="py-2 px-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-200 border border-red-500/30 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
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
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <span>Registered Franchise Owners Directory</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Franchise owners manage and register workshops under their subscribed branch quotas.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                {subscriptionOverview?.franchise_owners?.length || 0} Owners Registered
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300 min-w-[700px]">
                <thead className="bg-slate-950/80 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-3.5">Owner Name</th>
                    <th className="p-3.5">Email & Phone</th>
                    <th className="p-3.5">Franchise Brand</th>
                    <th className="p-3.5">Active Plan</th>
                    <th className="p-3.5">Branches (Active / Limit)</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(!subscriptionOverview?.franchise_owners || subscriptionOverview.franchise_owners.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400">
                        No franchise owners registered yet.
                      </td>
                    </tr>
                  ) : (
                    subscriptionOverview.franchise_owners.map((fo: any) => (
                      <tr key={fo.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-bold text-white">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-300 font-bold flex items-center justify-center text-xs">
                              {fo.name?.charAt(0) || 'O'}
                            </div>
                            <span>{fo.name}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className="font-mono text-slate-300 block">{fo.email}</span>
                          <span className="text-[11px] text-slate-500">{fo.phone || 'No phone'}</span>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-200">
                          {fo.franchise_name}
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold text-[11px]">
                            {fo.plan_name}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-200">
                          {fo.centers_count} of {fo.max_allowed_centers} branches
                        </td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
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
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Receipt className="w-5 h-5 text-emerald-400" />
                  <span>Recent Plan Purchases & Invoices</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Real-time record of all subscription plan purchases, billing amounts, and transaction references.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300 min-w-[750px]">
                <thead className="bg-slate-950/80 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
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
                <tbody className="divide-y divide-slate-800/60">
                  {(!subscriptionOverview?.invoices || subscriptionOverview.invoices.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-400">
                        No purchase invoices recorded yet.
                      </td>
                    </tr>
                  ) : (
                    subscriptionOverview.invoices.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono font-bold text-purple-400">{inv.invoice_number}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-white block">{inv.customer_name}</span>
                          <span className="text-[11px] text-slate-400 font-mono">{inv.customer_email}</span>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-200">{inv.plan_name}</td>
                        <td className="p-3.5 capitalize text-slate-400">{inv.billing_period}</td>
                        <td className="p-3.5 font-black text-emerald-400">
                          ₹{inv.total_amount?.toLocaleString()}
                        </td>
                        <td className="p-3.5 uppercase font-mono text-[11px] text-slate-400">
                          {inv.payment_method}
                        </td>
                        <td className="p-3.5 text-slate-400">{inv.created_at}</td>
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
        <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Service Centers Network ({centers.length} Centers)</h3>
              <p className="text-xs text-slate-400">
                System-wide overview of active workshops, bays, mechanics, and live workload. (Service centers are registered and managed by Franchise Owners).
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300 min-w-[800px]">
              <thead className="bg-slate-950/80 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
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
              <tbody className="divide-y divide-slate-800/60">
                {centers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-mono font-bold text-purple-400">#{c.id}</td>
                    <td className="p-3.5 font-bold text-white">{c.name}</td>
                    <td className="p-3.5 text-slate-300">
                      {c.area}, {c.city}
                    </td>
                    <td className="p-3.5 text-slate-400">{c.phone}</td>
                    <td className="p-3.5 font-medium text-slate-300">
                      {c.available_bays} / {c.total_bays} bays
                    </td>
                    <td className="p-3.5 font-medium text-slate-300">
                      {c.available_mechanics} / {c.total_mechanics} mechs
                    </td>
                    <td className="p-3.5">
                      <span className="font-bold text-white">{Math.round(c.current_workload * 100)}%</span>
                    </td>
                    <td className="p-3.5 font-bold text-amber-400">{c.active_queue_count} vehicles</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 text-[10px]">
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
        <div className="bg-slate-900/90 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-4">
          <div>
            <h3 className="text-lg font-bold text-white">Security & Operational Audit Trail</h3>
            <p className="text-xs text-slate-400">Chronological ledger of security events, status updates, and administrative actions.</p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300 min-w-[700px]">
              <thead className="bg-slate-950/80 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Entity</th>
                  <th className="p-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 text-slate-400 text-[11px]">{log.timestamp.slice(0, 19)}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-bold text-[10px] border border-purple-500/30">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-300">{log.entity} #{log.entity_id}</td>
                    <td className="p-3.5 text-slate-400 font-sans">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT PLAN */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-white shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Edit Subscription Plan</h3>
                  <span className="text-xs font-mono text-purple-400">ID: {editingPlan.id}</span>
                </div>
              </div>
              <button
                onClick={() => setEditingPlan(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Plan Display Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Single Hub Starter"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Most Popular, Single Workshop"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Monthly Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={formPriceMonthly}
                    onChange={(e) => setFormPriceMonthly(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Yearly Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={formPriceYearly}
                    onChange={(e) => setFormPriceYearly(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Max Centers</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMaxCenters}
                    onChange={(e) => setFormMaxCenters(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Max Bays / Center</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMaxBays}
                    onChange={(e) => setFormMaxBays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Max Managers</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMaxManagers}
                    onChange={(e) => setFormMaxManagers(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Plan Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500 leading-relaxed"
                  placeholder="Summary of who this plan is tailored for..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">Features List</label>
                  <span className="text-[10px] text-slate-400">One feature per line</span>
                </div>
                <textarea
                  rows={5}
                  value={formFeaturesText}
                  onChange={(e) => setFormFeaturesText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-purple-500 leading-relaxed"
                  placeholder="1 Service Center&#10;Up to 8 Bays&#10;Dynamic Waiting Time Prediction"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="formIsActiveEdit"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700 cursor-pointer"
                />
                <label htmlFor="formIsActiveEdit" className="text-xs font-semibold text-slate-300 cursor-pointer select-none">
                  Plan is Active (Visible to franchise owners during purchase/upgrade)
                </label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planActionLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-purple-500/25 cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-2xl w-full text-white shadow-2xl space-y-6 my-8 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/30">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create New Subscription Plan</h3>
                  <span className="text-xs text-slate-400">Add a custom franchise tier with bespoke quotas & pricing</span>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Plan Identifier (Slug) *</label>
                  <input
                    type="text"
                    required
                    value={formId}
                    onChange={(e) => setFormId(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-purple-500"
                    placeholder="e.g. regional_tier"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Lowercase key used internally & by payment gateway</span>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Plan Display Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Regional Fleet Pro"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Badge Tag</label>
                  <input
                    type="text"
                    value={formBadge}
                    onChange={(e) => setFormBadge(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                    placeholder="e.g. Custom Hub"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Monthly Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={formPriceMonthly}
                    onChange={(e) => setFormPriceMonthly(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Yearly Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1}
                    value={formPriceYearly}
                    onChange={(e) => setFormPriceYearly(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Max Centers</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMaxCenters}
                    onChange={(e) => setFormMaxCenters(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Max Bays / Center</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMaxBays}
                    onChange={(e) => setFormMaxBays(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 text-center"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Max Managers</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMaxManagers}
                    onChange={(e) => setFormMaxManagers(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-purple-500 text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Plan Description</label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none focus:border-purple-500 leading-relaxed"
                  placeholder="Short overview of the plan..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-300">Features List</label>
                  <span className="text-[10px] text-slate-400">One feature per line</span>
                </div>
                <textarea
                  rows={4}
                  value={formFeaturesText}
                  onChange={(e) => setFormFeaturesText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-purple-500 leading-relaxed"
                  placeholder="2 Workshop Centers&#10;Up to 10 Service Bays&#10;Dynamic Waiting Time Prediction"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={planActionLoading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-purple-500/25 cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-6 sm:p-7 max-w-md w-full text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3 text-red-400">
              <div className="w-10 h-10 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-base font-bold text-white">Delete Subscription Plan?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong className="text-white">{deleteConfirmPlan.name}</strong> (<code className="text-red-300">{deleteConfirmPlan.id}</code>)?
            </p>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              💡 <strong>Safe Deactivation Policy:</strong> If any franchise owner has an active subscription under this tier, SQMS will safely deactivate the plan so their operations continue uninterrupted while removing it from checkout. If unused, it is permanently deleted.
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteConfirmPlan(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={planActionLoading}
                onClick={handleExecuteDelete}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-red-500/25 cursor-pointer disabled:opacity-50"
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
