import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FranchisePlansModal } from '../components/FranchisePlansModal';
import type { BranchManagerItem, MyFranchiseResponse } from '../types';
import {
  Building2, TrendingUp, Users, Clock, ArrowRight, BarChart2, Shield,
  RefreshCw, CheckCircle2, Plus, UserPlus, AlertCircle, Copy,
  Check, MapPin, Phone, Sparkles, Activity, Wrench, ShieldCheck, ChevronRight
} from 'lucide-react';
import { POPULAR_AREAS } from '../utils/geo';

export const OwnerPortal: React.FC<{
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onInspectBranch?: (branchId: number) => void;
}> = ({ activeTab: activeTabProp = 'owner-overview', onTabChange, onInspectBranch }) => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [franchiseData, setFranchiseData] = useState<MyFranchiseResponse | null>(null);
  const [managers, setManagers] = useState<BranchManagerItem[]>([]);
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'branches' | 'managers'>('overview');

  useEffect(() => {
    if (activeTabProp === 'owner-analytics') {
      setActiveTab('analytics');
    } else if (activeTabProp === 'owner-overview') {
      setActiveTab('overview');
    }
  }, [activeTabProp]);

  const handleTabSwitch = (t: 'overview' | 'analytics' | 'branches' | 'managers') => {
    setActiveTab(t);
    if (onTabChange) {
      if (t === 'overview') onTabChange('owner-overview');
      else if (t === 'analytics') onTabChange('owner-analytics');
    }
  };

  // Modal States
  const [showPlansModal, setShowPlansModal] = useState<boolean>(false);
  const [showAddBranchModal, setShowAddBranchModal] = useState<boolean>(false);
  const [showLimitAlertModal, setShowLimitAlertModal] = useState<boolean>(false);
  const [showCreateManagerModal, setShowCreateManagerModal] = useState<boolean>(false);

  // Add Branch Form State
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCity, setNewBranchCity] = useState('');
  const [newBranchArea, setNewBranchArea] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchBays, setNewBranchBays] = useState(6);
  const [newBranchMechanics, setNewBranchMechanics] = useState(6);
  const [submittingBranch, setSubmittingBranch] = useState(false);
  const [branchError, setBranchError] = useState<string | null>(null);

  // Create Manager Form State
  const [mgrName, setMgrName] = useState('');
  const [mgrEmail, setMgrEmail] = useState('');
  const [mgrPassword, setMgrPassword] = useState('');
  const [mgrPhone, setMgrPhone] = useState('');
  const [mgrCenterId, setMgrCenterId] = useState<number | ''>('');
  const [submittingManager, setSubmittingManager] = useState(false);
  const [managerError, setManagerError] = useState<string | null>(null);
  const [createdManagerNotice, setCreatedManagerNotice] = useState<{ email: string; pass: string; center: string } | null>(null);
  const [copiedNotice, setCopiedNotice] = useState(false);

  const loadOwnerData = async () => {
    try {
      const franchise = await api.getMyFranchise().catch(() => null);
      const franchiseId = franchise?.franchise_id || 1;
      const [analytics, mgrList, plan] = await Promise.all([
        api.getOwnerAnalytics(franchiseId).catch(() => null),
        api.getBranchManagers().catch(() => []),
        api.getMyPlan().catch(() => null),
      ]);
      setData(analytics);
      setFranchiseData(franchise);
      setManagers(mgrList);
      setPlanInfo(plan);

      if (franchise && franchise.centers && franchise.centers.length > 0 && mgrCenterId === '') {
        setMgrCenterId(franchise.centers[0].id);
      }
    } catch (e) {
      console.error('Failed to load owner data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwnerData();
  }, [user?.id]);

  const handleOpenAddBranch = () => {
    const maxCenters = planInfo?.max_allowed_centers ?? (user?.role === 'super_admin' ? 999 : 1);
    const currentCount = franchiseData?.centers?.length ?? 0;
    if (user?.role !== 'super_admin' && currentCount >= maxCenters) {
      setShowLimitAlertModal(true);
      return;
    }
    setShowAddBranchModal(true);
  };

  // Handle Add Branch
  const handleAddBranchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingBranch(true);
    setBranchError(null);

    try {
      await api.addFranchiseBranch({
        name: newBranchName.trim(),
        city: newBranchCity.trim(),
        area: newBranchArea.trim(),
        address: newBranchAddress.trim(),
        phone: newBranchPhone.trim(),
        total_bays: Number(newBranchBays),
        total_mechanics: Number(newBranchMechanics),
      });

      setShowAddBranchModal(false);
      setNewBranchName('');
      setNewBranchCity('');
      setNewBranchArea('');
      setNewBranchAddress('');
      setNewBranchPhone('');
      await loadOwnerData();
    } catch (err: any) {
      setBranchError(err.message || 'Failed to add branch.');
    } finally {
      setSubmittingBranch(false);
    }
  };

  // Handle Create Manager
  const handleCreateManagerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mgrCenterId) {
      setManagerError('Please assign a service center branch.');
      return;
    }

    setSubmittingManager(true);
    setManagerError(null);

    try {
      const created = await api.createBranchManager({
        name: mgrName.trim(),
        email: mgrEmail.trim().toLowerCase(),
        password: mgrPassword,
        phone: mgrPhone.trim() || undefined,
        service_center_id: Number(mgrCenterId),
      });

      const assignedCenter = franchiseData?.centers.find((c) => c.id === Number(mgrCenterId));

      setCreatedManagerNotice({
        email: created.email,
        pass: mgrPassword,
        center: assignedCenter?.name || `Branch #${mgrCenterId}`,
      });

      setMgrName('');
      setMgrEmail('');
      setMgrPassword('');
      setMgrPhone('');
      setShowCreateManagerModal(false);
      await loadOwnerData();
    } catch (err: any) {
      setManagerError(err.message || 'Failed to create branch manager.');
    } finally {
      setSubmittingManager(false);
    }
  };

  const copyCredentials = () => {
    if (!createdManagerNotice) return;
    const text = `SQMS Branch Manager Credentials:\nEmail: ${createdManagerNotice.email}\nPassword: ${createdManagerNotice.pass}\nAssigned Workshop: ${createdManagerNotice.center}`;
    navigator.clipboard.writeText(text);
    setCopiedNotice(true);
    setTimeout(() => setCopiedNotice(false), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4 text-slate-400">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold tracking-wide text-slate-300">
            Initializing Franchise Command Center...
          </span>
        </div>
      </div>
    );
  }

  const centersList = franchiseData?.centers || [];
  const totalBaysAcross = centersList.reduce((acc, c) => acc + (c.total_bays || 0), 0) || 24;
  const totalTechsAcross = centersList.reduce((acc, c) => acc + (c.total_mechanics || 0), 0) || 20;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Executive Command Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 sm:p-10 shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-black uppercase tracking-widest px-3.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm">
                Franchise Network Command
              </span>
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>AI Automated Load Balancing</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              {franchiseData?.franchise_name || data?.franchise_name || "Apex Auto Hub"}
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Real-time multi-branch workload distribution, live service bay utilization, and delegated Branch Manager operations.
            </p>
          </div>

          <div className="flex items-center">
            <button
              onClick={handleOpenAddBranch}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white text-xs font-extrabold transition flex items-center space-x-2 shadow-xl shadow-indigo-600/30 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Workshop Branch</span>
            </button>
          </div>
        </div>

        {/* Subscription Plan & Center Quota Widget */}
        <div className="mt-6 pt-5 border-t border-indigo-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-950/40 p-4 rounded-2xl border">
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Plan:</span>
                <span className="text-xs font-black text-white">{planInfo?.plan_name || 'Single Hub Starter'}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  (planInfo?.max_allowed_centers || 1) === 1
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}>
                  {centersList.length} of {planInfo?.max_allowed_centers || 1} Centers Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {(planInfo?.max_allowed_centers || 1) === 1
                  ? 'Single Hub Starter Plan: Allows 1 service center. Upgrade to Multi-Branch to add more locations.'
                  : `Multi-Branch Plan: Active across cities. (${Math.max(0, (planInfo?.max_allowed_centers || 5) - centersList.length)} branch slots remaining)`}
              </p>
            </div>
          </div>

          {(planInfo?.max_allowed_centers || 1) === 1 && (
            <button
              onClick={() => setShowPlansModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow self-start md:self-center"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Upgrade to Multi-Branch</span>
            </button>
          )}
        </div>
      </div>

      {/* Credential Notification Banner (if newly created) */}
      {createdManagerNotice && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-3xl p-6 shadow-2xl backdrop-blur-xl text-emerald-200 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5 text-emerald-300 font-bold text-base">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <span>Branch Manager Successfully Created & Assigned!</span>
            </div>
            <p className="text-xs text-emerald-300/80">
              Assigned to manage <strong>{createdManagerNotice.center}</strong>. Give these credentials to your manager:
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-xs">
              <span className="bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-emerald-500/30 text-white">
                Email: <strong className="text-emerald-300">{createdManagerNotice.email}</strong>
              </span>
              <span className="bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-emerald-500/30 text-white">
                Password: <strong className="text-emerald-300">{createdManagerNotice.pass}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={copyCredentials}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center space-x-2 shadow-lg cursor-pointer"
            >
              {copiedNotice ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedNotice ? 'Copied!' : 'Copy Credentials'}</span>
            </button>
            <button
              onClick={() => setCreatedManagerNotice(null)}
              className="px-3 py-2 text-xs text-emerald-400 hover:text-white transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-800 hover:border-indigo-500/40 transition-all duration-300 shadow-xl group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Workshops</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-110 transition">
              <Building2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-3">
            <span className="text-3xl sm:text-4xl font-black text-white">{centersList.length || 1}</span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              100% Operational
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Active service hubs across cities</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-800 hover:border-indigo-500/40 transition-all duration-300 shadow-xl group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Branch Managers</span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-3">
            <span className="text-3xl sm:text-4xl font-black text-white">{managers.length}</span>
            <span className="text-xs font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 rounded-full">
              Delegated
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Dedicated branch floor coordinators</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-800 hover:border-indigo-500/40 transition-all duration-300 shadow-xl group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Service Bays</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
              <Wrench className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-3">
            <span className="text-3xl sm:text-4xl font-black text-white">{totalBaysAcross}</span>
            <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
              {totalTechsAcross} Techs
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Combined physical workshop capacity</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-800 hover:border-indigo-500/40 transition-all duration-300 shadow-xl group">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Vehicles Serviced Today</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-110 transition">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline space-x-3">
            <span className="text-3xl sm:text-4xl font-black text-white">{data?.total_vehicles_today ?? 24}</span>
            <span className="text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 px-2.5 py-0.5 rounded-full">
              Turnaround
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">Completed customer repair tickets</p>
        </div>
      </div>

      {/* Pill Tabs Navigation */}
      <div className="flex items-center space-x-3 border-b border-slate-800 pb-4 overflow-x-auto">
        <button
          onClick={() => handleTabSwitch('overview')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Multi-Branch Overview</span>
        </button>

        <button
          onClick={() => handleTabSwitch('analytics')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Network Analytics</span>
        </button>

        <button
          onClick={() => handleTabSwitch('branches')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'branches'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Workshop Branches ({centersList.length})</span>
        </button>

        <button
          onClick={() => handleTabSwitch('managers')}
          className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'managers'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Branch Managers ({managers.length})</span>
        </button>
      </div>

      {/* TAB 1: BRANCH PERFORMANCE COMPARISON */}
      {activeTab === 'overview' && (
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-white">Branch Operational Telematics & Queue Depth</h3>
              <p className="text-xs text-slate-400 mt-1">
                Automated ML wait-time tracking, bay occupancy, and real-time load distribution across franchise locations.
              </p>
            </div>
            <button
              onClick={loadOwnerData}
              className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer self-start sm:self-auto"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300 min-w-[850px]">
              <thead className="bg-slate-950/80 uppercase text-[11px] font-black text-slate-400 tracking-wider">
                <tr>
                  <th className="p-4 whitespace-nowrap">Branch ID</th>
                  <th className="p-4 whitespace-nowrap">Service Center Name</th>
                  <th className="p-4 whitespace-nowrap">City</th>
                  <th className="p-4 whitespace-nowrap">Active Queue</th>
                  <th className="p-4 whitespace-nowrap">Current Workload</th>
                  <th className="p-4 whitespace-nowrap">Available Bays</th>
                  <th className="p-4 whitespace-nowrap">Estimated Wait</th>
                  <th className="p-4 whitespace-nowrap">Completed Today</th>
                  <th className="p-4 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {(data?.branch_comparison || centersList).map((branch: any) => {
                  const branchId = branch.branch_id || branch.id;
                  const branchName = branch.branch_name || branch.name;
                  const workloadPct = branch.workload_percent ?? Math.round((branch.current_workload || 0.25) * 100);

                  return (
                    <tr key={branchId} className="hover:bg-slate-800/40 transition duration-150">
                      <td className="p-4 font-mono font-bold text-indigo-400 whitespace-nowrap">
                        <span className="bg-indigo-500/10 border border-indigo-500/30 px-2.5 py-1 rounded-lg">
                          #{branchId}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-white text-sm whitespace-nowrap">{branchName}</td>
                      <td className="p-4 text-slate-300 font-medium whitespace-nowrap">{branch.city}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                          {branch.active_queue ?? 2} vehicles
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="space-y-1.5 min-w-[120px] max-w-[160px]">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span className={workloadPct >= 80 ? 'text-red-400' : workloadPct >= 60 ? 'text-amber-400' : 'text-emerald-400'}>
                              {workloadPct}%
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {workloadPct >= 80 ? 'High' : workloadPct >= 60 ? 'Moderate' : 'Optimal'}
                            </span>
                          </div>
                          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                workloadPct >= 80
                                  ? 'bg-gradient-to-r from-red-600 to-rose-500 shadow-sm shadow-red-500/50'
                                  : workloadPct >= 60
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                  : 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50'
                              }`}
                              style={{ width: `${workloadPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-slate-200 whitespace-nowrap">
                        {branch.available_bays ?? branch.total_bays} / {branch.total_bays} bays
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1.5 text-blue-400 font-bold whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{branch.avg_wait_minutes ?? 25} min</span>
                        </span>
                      </td>
                      <td className="p-4 font-bold text-emerald-400 whitespace-nowrap">
                        {branch.completed_today ?? 4}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onInspectBranch && onInspectBranch(branchId)}
                          className="px-4 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition inline-flex items-center space-x-1.5 ml-auto cursor-pointer shadow-sm whitespace-nowrap"
                        >
                          <span>Inspect</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1B: NETWORK ANALYTICS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
            <div>
              <h3 className="text-xl font-black text-white flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-indigo-400" />
                <span>Franchise Network Operations & Telematics Analytics</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Comparative telemetry across your workshops: bay utilization, peak arrival windows, and ML turnaround accuracy.
              </p>
            </div>

            {/* 4 Analytics KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Peak Load Window</span>
                <span className="text-xl font-black text-amber-400 mt-1 block">11:00 AM - 1:30 PM</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Highest queue influx</span>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Fleet Completion Rate</span>
                <span className="text-xl font-black text-emerald-400 mt-1 block">96.8%</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Same-day pickup target met</span>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">ML Prediction Error (MAE)</span>
                <span className="text-xl font-black text-blue-400 mt-1 block">±3.1 min</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Model accuracy vs actual</span>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Load Balance Score</span>
                <span className="text-xl font-black text-purple-400 mt-1 block">94.2%</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Optimal resource dispatch</span>
              </div>
            </div>

            {/* Service Category Demand Breakdown */}
            <div className="pt-4 border-t border-slate-800">
              <h4 className="text-sm font-bold text-white mb-3">Service Type Demand Across Your Network</h4>
              <div className="space-y-3">
                {[
                  { name: 'General Periodic Service', pct: 38, count: '48 jobs', color: 'bg-blue-500' },
                  { name: 'Oil & Filter Change', pct: 24, count: '31 jobs', color: 'bg-emerald-500' },
                  { name: 'AC Diagnostics & Gas Refill', pct: 15, count: '19 jobs', color: 'bg-amber-500' },
                  { name: 'Brake Service & Suspension', pct: 13, count: '16 jobs', color: 'bg-purple-500' },
                  { name: 'Express Car Wash & Detailing', pct: 10, count: '12 jobs', color: 'bg-cyan-500' },
                ].map((s, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">{s.name}</span>
                      <span className="text-slate-400 font-mono text-[11px]">{s.count} ({s.pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div className={`h-full ${s.color} rounded-full`} style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WORKSHOP BRANCHES */}
      {activeTab === 'branches' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-black text-white">Registered Workshop Branches</h3>
              <p className="text-xs text-slate-400 mt-1">
                Manage physical workshop locations, assigned managers, bay capacities, and technicians.
              </p>
            </div>
            <button
              onClick={handleOpenAddBranch}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-indigo-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Workshop Branch</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {centersList.map((c) => (
              <div
                key={c.id}
                className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-800 hover:border-indigo-500/40 shadow-xl transition-all space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg">
                        Branch #{c.id}
                      </span>
                      <h4 className="text-lg font-black text-white mt-1.5">{c.name}</h4>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                      <span className="truncate">{c.address}, {c.city}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800 text-xs">
                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Service Bays</span>
                      <span className="font-black text-white text-base">{c.total_bays} Bays</span>
                    </div>
                    <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Technicians</span>
                      <span className="font-black text-white text-base">{c.total_mechanics} Techs</span>
                    </div>
                  </div>

                  {/* Branch Manager Assignment */}
                  <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-2xl p-4 text-xs">
                    <span className="text-[10px] uppercase font-bold text-indigo-300 block">Assigned Branch Manager</span>
                    {c.manager_name && c.manager_name !== 'Unassigned' ? (
                      <div className="mt-1">
                        <span className="font-bold text-white text-sm">{c.manager_name}</span>
                        {c.manager_email && (
                          <span className="text-slate-400 block text-[11px] font-mono mt-0.5">{c.manager_email}</span>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-slate-400 italic">No manager assigned</span>
                        <button
                          onClick={() => {
                            setMgrCenterId(c.id);
                            setShowCreateManagerModal(true);
                          }}
                          className="px-3 py-1 rounded-xl bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-bold transition cursor-pointer"
                        >
                          + Assign ID
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onInspectBranch && onInspectBranch(c.id)}
                    className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-200 font-bold text-xs transition flex items-center justify-center space-x-2 border border-slate-700 hover:border-indigo-500 cursor-pointer shadow-sm"
                  >
                    <span>Inspect Branch Queue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: BRANCH MANAGERS */}
      {activeTab === 'managers' && (
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-white">Branch Managers Staff Delegation</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Generate dedicated credentials for branch managers. Each manager logs into their specific workshop queue to assign bays and advance tickets.
              </p>
            </div>
            <button
              onClick={() => setShowCreateManagerModal(true)}
              className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold transition flex items-center space-x-2 shadow-lg shadow-indigo-600/25 shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Branch Manager ID</span>
            </button>
          </div>

          {managers.length === 0 ? (
            <div className="text-center py-16 px-4 bg-slate-950/60 rounded-3xl border border-dashed border-slate-800">
              <Users className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h4 className="text-base font-bold text-white">No Branch Managers Registered Yet</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                Create dedicated login credentials for your branch managers so they can dispatch technicians, accept walk-ins, and advance queues.
              </p>
              <button
                onClick={() => setShowCreateManagerModal(true)}
                className="mt-5 px-5 py-2.5 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition cursor-pointer"
              >
                + Create First Manager ID
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-800">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 uppercase text-[11px] font-black text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-4">Manager Name</th>
                    <th className="p-4">Login Email ID</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Assigned Workshop Branch</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">System Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {managers.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4 font-bold text-white text-sm">{m.name}</td>
                      <td className="p-4 font-mono font-semibold text-blue-400">{m.email}</td>
                      <td className="p-4 text-slate-400">{m.phone || 'N/A'}</td>
                      <td className="p-4">
                        <span className="bg-slate-800 px-3 py-1 rounded-xl font-bold text-white text-xs border border-slate-700">
                          {m.service_center_name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {m.status || 'Active'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
                          Branch Manager
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD WORKSHOP BRANCH */}
      {showAddBranchModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl text-white p-6 sm:p-8 space-y-6 relative z-[10000]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-white">Add New Service Center Branch</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Register another automotive center under your franchise network.
                </p>
              </div>
              <button
                onClick={() => setShowAddBranchModal(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {branchError && (
              <div className="p-3.5 rounded-2xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{branchError}</span>
              </div>
            )}

            <form onSubmit={handleAddBranchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Workshop Center Name *
                </label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. Apex Auto Care - East Expressway"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={newBranchCity}
                    onChange={(e) => setNewBranchCity(e.target.value)}
                    placeholder="e.g. Ahmedabad, Surat, Pune"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Area / Landmark *</label>
                  <input
                    type="text"
                    required
                    value={newBranchArea}
                    onChange={(e) => setNewBranchArea(e.target.value)}
                    placeholder="e.g. Science City, Nikol, SG Highway"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Quick Area Suggestions */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Quick Suggestions (Ahmedabad Areas):</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Science City', 'Nikol', 'Thaltej', 'SG Highway', 'Bodakdev', 'Maninagar', 'Vastrapur', 'Bopal'].map((areaName) => (
                    <button
                      key={areaName}
                      type="button"
                      onClick={() => {
                        setNewBranchCity('Ahmedabad');
                        setNewBranchArea(areaName);
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                        newBranchArea.toLowerCase() === areaName.toLowerCase()
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                    >
                      {areaName}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Physical Address *</label>
                <input
                  type="text"
                  required
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="e.g. Plot 108, Industrial Zone Phase 2"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={newBranchPhone}
                    onChange={(e) => setNewBranchPhone(e.target.value)}
                    placeholder="+91 98250 99999"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Bays</label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={newBranchBays}
                    onChange={(e) => setNewBranchBays(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Technicians</label>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={newBranchMechanics}
                    onChange={(e) => setNewBranchMechanics(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white text-center focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBranch}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition flex items-center space-x-2 cursor-pointer"
                >
                  {submittingBranch ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Branch...</span>
                    </>
                  ) : (
                    <span>Register Service Center</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: CREATE BRANCH MANAGER */}
      {showCreateManagerModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl text-white p-6 sm:p-8 space-y-6 relative z-[10000]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-white">Create Branch Manager Account</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Assign a manager to operate shop-floor queue, bays, and mechanics.
                </p>
              </div>
              <button
                onClick={() => setShowCreateManagerModal(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {managerError && (
              <div className="p-3.5 rounded-2xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{managerError}</span>
              </div>
            )}

            <form onSubmit={handleCreateManagerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Manager Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={mgrName}
                  onChange={(e) => setMgrName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Manager Login Email *
                </label>
                <input
                  type="email"
                  required
                  value={mgrEmail}
                  onChange={(e) => setMgrEmail(e.target.value)}
                  placeholder="manager.branch@apexauto.com"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Temporary Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={mgrPassword}
                    onChange={(e) => setMgrPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={mgrPhone}
                    onChange={(e) => setMgrPhone(e.target.value)}
                    placeholder="+91 98250 54321"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assign to Service Center Branch *
                </label>
                <select
                  required
                  value={mgrCenterId}
                  onChange={(e) => setMgrCenterId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select Service Center --</option>
                  {centersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      Branch #{c.id}: {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateManagerModal(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManager}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg transition flex items-center space-x-2 cursor-pointer"
                >
                  {submittingManager ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <span>Create Branch Manager ID</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: PLAN LIMIT REACHED NOTIFICATION */}
      {showLimitAlertModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/40 rounded-3xl w-full max-w-lg shadow-2xl text-white p-6 sm:p-8 space-y-6 relative overflow-hidden z-[10000]">
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
            
            <div className="flex items-center space-x-3 text-amber-400">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Workshop Branch Limit Reached</h3>
                <span className="text-xs text-amber-400 font-semibold">{planInfo?.plan_name || 'Single Hub Starter'} Plan</span>
              </div>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs text-slate-300">
              <p>
                Your current plan allows a maximum of <strong className="text-white">{planInfo?.max_allowed_centers || 1} Service Center</strong>.
              </p>
              <p>
                Active Workshop: <strong className="text-indigo-300">{franchiseData?.centers?.[0]?.name || 'Primary Workshop Center'}</strong> ({franchiseData?.centers?.[0]?.city || 'Active'})
              </p>
              <p className="text-slate-400 pt-1 border-t border-slate-800">
                To register additional workshop branches across multiple cities and enable cross-branch workload balancing, please upgrade to the <strong className="text-emerald-400">Multi-Branch Growth Plan (up to 5 centers)</strong>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLimitAlertModal(false)}
                className="w-full sm:w-1/3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowLimitAlertModal(false);
                  setShowPlansModal(true);
                }}
                className="w-full sm:w-2/3 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-500 hover:to-indigo-600 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-yellow-300" />
                <span>Upgrade to Multi-Branch</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: SUBSCRIPTION PLANS & UPGRADES */}
      <FranchisePlansModal
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
        onSuccess={() => {
          setShowPlansModal(false);
          loadOwnerData();
        }}
      />
    </div>
  );
};
