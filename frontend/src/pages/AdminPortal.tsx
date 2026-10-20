import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { ServiceCenter } from '../types';
import {
  Shield, Building2, Users, Activity, Settings, RefreshCw, CheckCircle2,
  Clock, Layers, Sparkles, TrendingUp, CreditCard, ArrowRight, Check,
  DollarSign, Receipt, Award
} from 'lucide-react';

export const AdminPortal: React.FC<{ initialTab?: string }> = ({ initialTab = 'overview' }) => {
  const [tab, setTab] = useState<string>(initialTab === 'centers' || initialTab === 'audit' ? initialTab : 'overview');
  const [centers, setCenters] = useState<ServiceCenter[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [subscriptionOverview, setSubscriptionOverview] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      const [cList, aData, logs, subData] = await Promise.all([
        api.getServiceCenters().catch(() => []),
        api.getAdminAnalytics().catch(() => null),
        api.getAuditLogs(30).catch(() => []),
        api.getAdminSubscriptionOverview().catch(() => null),
      ]);
      setCenters(cList);
      setAnalytics(aData);
      setAuditLogs(logs);
      setSubscriptionOverview(subData);
    } catch (e) {
      console.error('Failed to load admin data', e);
    } finally {
      setLoading(false);
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
          {/* 3 Plans Sales & Revenue Breakdown Cards */}
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <span>Subscription Plans Sales & Revenue Breakdown</span>
              </h3>
              <p className="text-xs text-slate-400">
                Track how many of each subscription tier have been purchased by franchise owners and total revenue generated.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Plan 1: Starter */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 relative overflow-hidden space-y-4 shadow-xl hover:border-slate-700 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    Single Workshop
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">₹499 / mo</span>
                </div>

                <div>
                  <h4 className="text-xl font-black text-white">{tier.starter?.name || 'Single Hub Starter'}</h4>
                  <p className="text-xs text-slate-400 mt-1">Single-location service centers with up to 8 bays & 1 manager.</p>
                </div>

                <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Plans Sold</span>
                    <span className="text-2xl font-black text-white mt-0.5 block">{tier.starter?.count ?? 0}</span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Revenue</span>
                    <span className="text-2xl font-black text-emerald-400 mt-0.5 block">
                      ₹{(tier.starter?.revenue ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Plan 2: Growth (Most Popular) */}
              <div className="bg-slate-900/90 border border-indigo-500/40 rounded-3xl p-6 relative overflow-hidden space-y-4 shadow-xl hover:border-indigo-500/60 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                    Most Popular
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo-300">₹11,999 / mo</span>
                </div>

                <div>
                  <h4 className="text-xl font-black text-white">{tier.growth?.name || 'Multi-Branch Growth'}</h4>
                  <p className="text-xs text-slate-300 mt-1">Multi-city automotive networks with up to 5 branch locations.</p>
                </div>

                <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Plans Sold</span>
                    <span className="text-2xl font-black text-white mt-0.5 block">{tier.growth?.count ?? 0}</span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Revenue</span>
                    <span className="text-2xl font-black text-emerald-400 mt-0.5 block">
                      ₹{Math.round(tier.growth?.revenue ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Plan 3: Enterprise */}
              <div className="bg-slate-900/90 border border-purple-500/30 rounded-3xl p-6 relative overflow-hidden space-y-4 shadow-xl hover:border-purple-500/50 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                    Full Network
                  </span>
                  <span className="text-xs font-mono font-bold text-purple-300">₹24,999 / mo</span>
                </div>

                <div>
                  <h4 className="text-xl font-black text-white">{tier.enterprise?.name || 'Enterprise Franchise'}</h4>
                  <p className="text-xs text-slate-400 mt-1">Unlimited workshop branches, custom ML retraining, and SLA.</p>
                </div>

                <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Plans Sold</span>
                    <span className="text-2xl font-black text-white mt-0.5 block">{tier.enterprise?.count ?? 0}</span>
                  </div>
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Revenue</span>
                    <span className="text-2xl font-black text-emerald-400 mt-0.5 block">
                      ₹{(tier.enterprise?.revenue ?? 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
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
    </div>
  );
};
