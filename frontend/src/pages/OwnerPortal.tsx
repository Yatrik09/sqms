import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api, getInitialCached, DEFAULT_OWNER_ANALYTICS, DEFAULT_FRANCHISE_DATA } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { FranchisePlansModal } from '../components/FranchisePlansModal';
import type { BranchManagerItem, MyFranchiseResponse } from '../types';
import {
  Building2, TrendingUp, Users, Clock, ArrowRight, BarChart2, Shield,
  RefreshCw, CheckCircle2, Plus, UserPlus, AlertCircle, Copy,
  Check, MapPin, Phone, Sparkles, Activity, Wrench, ShieldCheck, ChevronRight,
  Zap, ArrowRightLeft, DollarSign, Star, AlertTriangle, Layers, Filter
} from 'lucide-react';
import { POPULAR_AREAS } from '../utils/geo';

export const OwnerPortal: React.FC<{
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onInspectBranch?: (branchId: number) => void;
}> = ({ activeTab: activeTabProp = 'owner-overview', onTabChange, onInspectBranch }) => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(() => getInitialCached('owner_analytics_1', DEFAULT_OWNER_ANALYTICS));
  const [franchiseData, setFranchiseData] = useState<MyFranchiseResponse | null>(() => getInitialCached('my_franchise', DEFAULT_FRANCHISE_DATA as any));
  const [managers, setManagers] = useState<BranchManagerItem[]>(() => getInitialCached('branch_managers', []));
  const [planInfo, setPlanInfo] = useState<any>(() => getInitialCached('my_plan', { plan_name: 'Multi-Branch Growth Plan', max_allowed_centers: 5 }));
  const [loading, setLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
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

  // AI Service Analysis & Staff Reallocation State
  const [selectedBranchId, setSelectedBranchId] = useState<number | 'all'>('all');
  const [showReallocateModal, setShowReallocateModal] = useState<boolean>(false);
  const [reallocateFromId, setReallocateFromId] = useState<number | ''>('');
  const [reallocateToId, setReallocateToId] = useState<number | ''>('');
  const [reallocateTechId, setReallocateTechId] = useState<number | ''>('');
  const [reallocateReason, setReallocateReason] = useState<string>('');
  const [submittingReallocate, setSubmittingReallocate] = useState<boolean>(false);
  const [reallocateError, setReallocateError] = useState<string | null>(null);
  const [reallocateSuccessMsg, setReallocateSuccessMsg] = useState<string | null>(null);

  const handleOpenDeployStaff = (targetBranchId?: number, suggestedSourceId?: number, defaultReason?: string) => {
    const branches = data?.branch_comparison || [];
    const target = targetBranchId || branches[0]?.branch_id;
    let source = suggestedSourceId;
    if (!source || source === target) {
      const other = branches.find((b: any) => b.branch_id !== target);
      source = other ? other.branch_id : undefined;
    }

    setReallocateToId(target || '');
    setReallocateFromId(source || '');
    setReallocateReason(defaultReason || 'AI Service Demand Surge Staff Rebalance');

    if (source) {
      const sourceBranch = branches.find((b: any) => b.branch_id === source);
      if (sourceBranch && sourceBranch.technicians && sourceBranch.technicians.length > 0) {
        setReallocateTechId(sourceBranch.technicians[0].id);
      } else {
        setReallocateTechId('');
      }
    } else {
      setReallocateTechId('');
    }

    setReallocateError(null);
    setShowReallocateModal(true);
  };

  const handleSourceBranchChange = (fromId: number) => {
    setReallocateFromId(fromId);
    const branches = data?.branch_comparison || [];
    const sourceBranch = branches.find((b: any) => b.branch_id === fromId);
    if (sourceBranch && sourceBranch.technicians && sourceBranch.technicians.length > 0) {
      setReallocateTechId(sourceBranch.technicians[0].id);
    } else {
      setReallocateTechId('');
    }
  };

  const handleReallocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reallocateTechId || !reallocateFromId || !reallocateToId) {
      setReallocateError('Please select a source branch, technician, and target branch.');
      return;
    }
    if (Number(reallocateFromId) === Number(reallocateToId)) {
      setReallocateError('Source and target branches must be different.');
      return;
    }

    setSubmittingReallocate(true);
    setReallocateError(null);

    try {
      const res = await api.reallocateTechnician({
        technician_id: Number(reallocateTechId),
        from_center_id: Number(reallocateFromId),
        to_center_id: Number(reallocateToId),
        reason: reallocateReason.trim() || 'AI Demand Surge Rebalance',
      });

      setReallocateSuccessMsg(res.message || 'Staff deployed successfully!');
      setShowReallocateModal(false);
      await loadOwnerData();
      setTimeout(() => setReallocateSuccessMsg(null), 7000);
    } catch (err: any) {
      setReallocateError(err.message || 'Failed to deploy technician.');
    } finally {
      setSubmittingReallocate(false);
    }
  };

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
    setIsSyncing(true);
    try {
      const franchise = await api.getMyFranchise().catch(() => null);
      const franchiseId = franchise?.franchise_id || 1;
      const [analytics, mgrList, plan] = await Promise.all([
        api.getOwnerAnalytics(franchiseId).catch(() => null),
        api.getBranchManagers().catch(() => []),
        api.getMyPlan().catch(() => null),
      ]);
      if (analytics) setData(analytics);
      if (franchise) setFranchiseData(franchise as any);
      if (mgrList && mgrList.length > 0) setManagers(mgrList as any);
      if (plan) setPlanInfo(plan);

      if (franchise && franchise.centers && franchise.centers.length > 0 && mgrCenterId === '') {
        setMgrCenterId(franchise.centers[0].id);
      }
    } catch (e) {
      console.error('Failed to sync owner data', e);
    } finally {
      setIsSyncing(false);
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

  if (loading && !data && !franchiseData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-white">
        <div className="flex flex-col items-center space-y-4 text-[#707070]">
          <div className="w-10 h-10 border-2 border-[#0071e3] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium tracking-tight text-[#1d1d1f]">
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-white text-[#1d1d1f]">
      {/* Executive Command Header */}
      <div className="relative rounded-[28px] bg-white border border-[#d6d6d6] p-6 sm:p-10 shadow-none">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider px-3.5 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
                Franchise Network Command
              </span>
              {isSyncing ? (
                <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#707070] text-xs font-medium">
                  <RefreshCw className="w-3 h-3 text-[#0071e3] animate-spin" />
                  <span>Syncing with Cloud...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#1d1d1f] text-xs font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>AI Automated Load Balancing</span>
                </div>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-[#1d1d1f] tracking-tight">
              {franchiseData?.franchise_name || data?.franchise_name || "Apex Auto Hub"}
            </h1>
            <p className="text-sm sm:text-base text-[#707070] max-w-3xl leading-relaxed">
              Real-time multi-branch workload distribution, live service bay utilization, and delegated Branch Manager operations.
            </p>
          </div>

          <div className="flex items-center">
            <button
              onClick={handleOpenAddBranch}
              className="px-6 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center space-x-2 shadow-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Workshop Branch</span>
            </button>
          </div>
        </div>

        {/* Subscription Plan & Center Quota Widget */}
        <div className="mt-6 pt-5 border-t border-[#e6e6e8] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#f5f5f7] p-5 rounded-[20px] border border-[#e6e6e8]">
          <div className="flex items-center space-x-3.5">
            <div className="w-9 h-9 rounded-full bg-white border border-[#d6d6d6] flex items-center justify-center text-[#1d1d1f] shrink-0">
              <Sparkles className="w-4 h-4 text-[#0071e3]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-semibold text-[#707070] uppercase tracking-wider">Plan:</span>
                <span className="text-xs font-semibold text-[#1d1d1f]">{planInfo?.plan_name || 'Single Hub Starter'}</span>
                <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border ${
                  (planInfo?.max_allowed_centers || 1) === 1
                    ? 'bg-white text-[#b64400] border-[#d6d6d6]'
                    : 'bg-white text-[#1d1d1f] border-[#d6d6d6]'
                }`}>
                  {centersList.length} of {planInfo?.max_allowed_centers || 1} Centers Active
                </span>
              </div>
              <p className="text-[12px] text-[#707070] mt-0.5">
                {(planInfo?.max_allowed_centers || 1) === 1
                  ? 'Single Hub Starter Plan: Allows 1 service center. Upgrade to Multi-Branch to add more locations.'
                  : `Multi-Branch Plan: Active across cities. (${Math.max(0, (planInfo?.max_allowed_centers || 5) - centersList.length)} branch slots remaining)`}
              </p>
            </div>
          </div>

          {(planInfo?.max_allowed_centers || 1) === 1 && (
            <button
              onClick={() => setShowPlansModal(true)}
              className="px-4 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer shadow-none self-start md:self-center"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Upgrade to Multi-Branch</span>
            </button>
          )}
        </div>
      </div>

      {/* Credential Notification Banner (if newly created) */}
      {createdManagerNotice && (
        <div className="bg-[#f5f5f7] border border-[#d6d6d6] rounded-[28px] p-6 shadow-none text-[#1d1d1f] flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5 text-[#1d1d1f] font-semibold text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Branch Manager Successfully Created & Assigned</span>
            </div>
            <p className="text-xs text-[#707070]">
              Assigned to manage <strong>{createdManagerNotice.center}</strong>. Give these credentials to your manager:
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 font-mono text-xs">
              <span className="bg-white px-3.5 py-1.5 rounded-xl border border-[#d6d6d6] text-[#1d1d1f]">
                Email: <strong>{createdManagerNotice.email}</strong>
              </span>
              <span className="bg-white px-3.5 py-1.5 rounded-xl border border-[#d6d6d6] text-[#1d1d1f]">
                Password: <strong>{createdManagerNotice.pass}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={copyCredentials}
              className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs transition flex items-center space-x-2 shadow-none cursor-pointer"
            >
              {copiedNotice ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedNotice ? 'Copied' : 'Copy Credentials'}</span>
            </button>
            <button
              onClick={() => setCreatedManagerNotice(null)}
              className="px-3 py-2 text-xs text-[#707070] hover:text-[#1d1d1f] transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 */}
        <div className="bg-white rounded-[28px] p-6 border border-[#d6d6d6] hover:border-[#86868b] transition-all duration-200 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#707070]">Total Workshops</span>
            <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#e6e6e8] flex items-center justify-center text-[#1d1d1f]">
              <Building2 className="w-5 h-5 text-[#0071e3]" />
            </div>
          </div>
          <div className="flex items-baseline space-x-3">
            <span className="text-3xl sm:text-4xl font-semibold text-[#1d1d1f] tracking-tight">{centersList.length || 1}</span>
            <span className="text-xs font-medium text-[#1d1d1f] bg-[#f5f5f7] border border-[#d6d6d6] px-2.5 py-0.5 rounded-full">
              100% Operational
            </span>
          </div>
          <p className="text-xs text-[#86868b] mt-2">Active service hubs across cities</p>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-[28px] p-6 border border-[#d6d6d6] hover:border-[#86868b] transition-all duration-200 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#707070]">Branch Managers</span>
            <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#e6e6e8] flex items-center justify-center text-[#1d1d1f]">
              <Users className="w-5 h-5 text-[#0071e3]" />
            </div>
          </div>
          <div className="flex items-baseline space-x-3">
            <span className="text-3xl sm:text-4xl font-semibold text-[#1d1d1f] tracking-tight">{managers.length}</span>
            <span className="text-xs font-medium text-[#1d1d1f] bg-[#f5f5f7] border border-[#d6d6d6] px-2.5 py-0.5 rounded-full">
              Delegated
            </span>
          </div>
          <p className="text-xs text-[#86868b] mt-2">Dedicated branch floor coordinators</p>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-[28px] p-6 border border-[#d6d6d6] hover:border-[#86868b] transition-all duration-200 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#707070]">Active Service Bays</span>
            <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#e6e6e8] flex items-center justify-center text-[#1d1d1f]">
              <Wrench className="w-5 h-5 text-[#0071e3]" />
            </div>
          </div>
          <div className="flex items-baseline space-x-3">
            <span className="text-3xl sm:text-4xl font-semibold text-[#1d1d1f] tracking-tight">{totalBaysAcross}</span>
            <span className="text-xs font-medium text-[#1d1d1f] bg-[#f5f5f7] border border-[#d6d6d6] px-2.5 py-0.5 rounded-full">
              {totalTechsAcross} Techs
            </span>
          </div>
          <p className="text-xs text-[#86868b] mt-2">Combined physical workshop capacity</p>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-[28px] p-6 border border-[#d6d6d6] hover:border-[#86868b] transition-all duration-200 shadow-none">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#707070]">Vehicles Today</span>
            <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#e6e6e8] flex items-center justify-center text-[#1d1d1f]">
              <Activity className="w-5 h-5 text-[#0071e3]" />
            </div>
          </div>
          <div className="flex items-baseline space-x-3">
            <span className="text-3xl sm:text-4xl font-semibold text-[#1d1d1f] tracking-tight">{data?.total_vehicles_today ?? 24}</span>
            <span className="text-xs font-medium text-[#1d1d1f] bg-[#f5f5f7] border border-[#d6d6d6] px-2.5 py-0.5 rounded-full">
              Turnaround
            </span>
          </div>
          <p className="text-xs text-[#86868b] mt-2">Completed customer repair tickets</p>
        </div>
      </div>

      {/* Pill Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-[#e6e6e8] pb-4 overflow-x-auto">
        <button
          onClick={() => handleTabSwitch('overview')}
          className={`px-5 py-2 rounded-full text-xs font-medium transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-[#1d1d1f] text-white shadow-none'
              : 'bg-transparent text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Multi-Branch Overview</span>
        </button>

        <button
          onClick={() => handleTabSwitch('analytics')}
          className={`px-5 py-2 rounded-full text-xs font-medium transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'analytics'
              ? 'bg-[#1d1d1f] text-white shadow-none'
              : 'bg-transparent text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>AI Service Analysis & Performance</span>
        </button>

        <button
          onClick={() => handleTabSwitch('branches')}
          className={`px-5 py-2 rounded-full text-xs font-medium transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'branches'
              ? 'bg-[#1d1d1f] text-white shadow-none'
              : 'bg-transparent text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Workshop Branches ({centersList.length})</span>
        </button>

        <button
          onClick={() => handleTabSwitch('managers')}
          className={`px-5 py-2 rounded-full text-xs font-medium transition-all flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
            activeTab === 'managers'
              ? 'bg-[#1d1d1f] text-white shadow-none'
              : 'bg-transparent text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Branch Managers ({managers.length})</span>
        </button>
      </div>

      {/* TAB 1: BRANCH PERFORMANCE COMPARISON */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">Branch Operational Telematics & Queue Depth</h3>
              <p className="text-xs text-[#707070] mt-1">
                Automated ML wait-time tracking, bay occupancy, and real-time load distribution across franchise locations.
              </p>
            </div>
            <button
              onClick={loadOwnerData}
              className="p-2 rounded-full bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#1d1d1f] border border-[#d6d6d6] transition cursor-pointer self-start sm:self-auto"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-[20px] border border-[#e6e6e8]">
            <table className="w-full text-left text-xs text-[#1d1d1f] min-w-[850px]">
              <thead className="bg-[#f5f5f7] uppercase text-[11px] font-semibold text-[#707070] tracking-wider border-b border-[#e6e6e8]">
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
              <tbody className="divide-y divide-[#e6e6e8]">
                {(data?.branch_comparison || centersList).map((branch: any) => {
                  const branchId = branch.branch_id || branch.id;
                  const branchName = branch.branch_name || branch.name;
                  const workloadPct = branch.workload_percent ?? Math.round((branch.current_workload || 0.25) * 100);

                  return (
                    <tr key={branchId} className="hover:bg-[#fafafc] transition duration-150">
                      <td className="p-4 font-mono font-medium text-[#1d1d1f] whitespace-nowrap">
                        <span className="bg-[#f5f5f7] border border-[#d6d6d6] px-2.5 py-1 rounded-lg">
                          #{branchId}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-[#1d1d1f] text-sm whitespace-nowrap">{branchName}</td>
                      <td className="p-4 text-[#707070] font-normal whitespace-nowrap">{branch.city}</td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6] whitespace-nowrap">
                          {branch.active_queue ?? 2} vehicles
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="space-y-1.5 min-w-[120px] max-w-[160px]">
                          <div className="flex items-center justify-between text-[11px] font-medium">
                            <span className={workloadPct >= 80 ? 'text-[#b64400]' : 'text-[#1d1d1f]'}>
                              {workloadPct}%
                            </span>
                            <span className="text-[10px] text-[#707070]">
                              {workloadPct >= 80 ? 'High' : workloadPct >= 60 ? 'Moderate' : 'Optimal'}
                            </span>
                          </div>
                          <div className="w-full bg-[#e6e6e8] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 bg-[#0071e3]"
                              style={{ width: `${workloadPct}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-[#1d1d1f] whitespace-nowrap">
                        {branch.available_bays ?? branch.total_bays} / {branch.total_bays} bays
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1.5 text-[#0066cc] font-medium whitespace-nowrap">
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                          <span>{branch.avg_wait_minutes ?? 25} min</span>
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-[#1d1d1f] whitespace-nowrap">
                        {branch.completed_today ?? 4}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setSelectedBranchId(branchId);
                              handleTabSwitch('analytics');
                            }}
                            className="px-3 py-1.5 rounded-full bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#1d1d1f] border border-[#d6d6d6] text-xs font-medium transition inline-flex items-center space-x-1 cursor-pointer"
                            title="AI Service Analysis"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                            <span>AI Analysis</span>
                          </button>
                          <button
                            onClick={() => onInspectBranch && onInspectBranch(branchId)}
                            className="px-3.5 py-1.5 rounded-full border border-[#86868b] hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-medium transition inline-flex items-center space-x-1.5 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 1B: AI SERVICE ANALYSIS & BRANCH PERFORMANCE */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Reallocation Success Banner */}
          {reallocateSuccessMsg && (
            <div className="bg-[#f5f5f7] border border-[#d6d6d6] rounded-[28px] p-5 shadow-none text-[#1d1d1f] flex items-center justify-between gap-4">
              <div className="flex items-center space-x-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-semibold text-sm text-[#1d1d1f] block">AI Staff Deployment Successful</span>
                  <span className="text-xs text-[#707070]">{reallocateSuccessMsg}</span>
                </div>
              </div>
              <button
                onClick={() => setReallocateSuccessMsg(null)}
                className="px-3 py-1.5 rounded-full bg-white border border-[#d6d6d6] text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Executive Header & Controls */}
          <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-3 py-0.5 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
                    AI Autonomous Telematics & Load Balancing
                  </span>
                  <span className="flex items-center space-x-1 text-xs text-[#1d1d1f] font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Live 360° Monitoring</span>
                  </span>
                </div>
                <h3 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight flex items-center space-x-2.5">
                  <TrendingUp className="w-6 h-6 text-[#0071e3]" />
                  <span>Branch Performance & AI Service Analysis</span>
                </h3>
                <p className="text-xs text-[#707070] max-w-3xl leading-relaxed">
                  Real-time 360° telemetry across all workshop branches: bay utilization, staff efficiency, AI service demand analysis, and dynamic technician deployment.
                </p>
              </div>

              <div className="flex items-center space-x-3 shrink-0">
                <button
                  onClick={() => handleOpenDeployStaff()}
                  className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center space-x-2 shadow-none cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>Deploy / Reassign Staff</span>
                </button>
                <button
                  onClick={loadOwnerData}
                  className="p-2 rounded-full bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#1d1d1f] border border-[#d6d6d6] transition cursor-pointer"
                  title="Refresh Telemetry"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Branch Selector Pills Filter */}
            <div className="pt-2 border-t border-[#e6e6e8] flex items-center space-x-2 overflow-x-auto pb-1">
              <span className="text-[11px] font-semibold text-[#707070] uppercase tracking-wider flex items-center space-x-1.5 mr-2 shrink-0">
                <Filter className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>View Center:</span>
              </span>
              <button
                onClick={() => setSelectedBranchId('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  selectedBranchId === 'all'
                    ? 'bg-[#1d1d1f] text-white shadow-none'
                    : 'bg-white text-[#707070] border border-[#d6d6d6] hover:bg-[#f5f5f7]'
                }`}
              >
                All Branches ({data?.branch_comparison?.length || centersList.length})
              </button>
              {(data?.branch_comparison || centersList).map((b: any) => {
                const bId = b.branch_id || b.id;
                const bName = b.branch_name || b.name;
                const hasSurge = b.ai_recommendation?.has_surge;
                return (
                  <button
                    key={bId}
                    onClick={() => setSelectedBranchId(bId)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition cursor-pointer whitespace-nowrap flex items-center space-x-1.5 ${
                      selectedBranchId === bId
                        ? 'bg-[#1d1d1f] text-white shadow-none'
                        : 'bg-white text-[#707070] border border-[#d6d6d6] hover:bg-[#f5f5f7]'
                    }`}
                  >
                    <span>Branch #{bId}: {bName}</span>
                    {hasSurge && (
                      <span className="w-2 h-2 rounded-full bg-[#b64400]" title="High Service Surge Detected" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Executive Network Telemetry (Top 4 KPIs) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#f5f5f7] p-4 rounded-[20px] border border-[#e6e6e8]">
                <span className="text-[10px] uppercase font-semibold text-[#707070] block">Total Active Queue</span>
                <span className="text-xl font-semibold text-[#1d1d1f] mt-1 block">
                  {data?.total_active_queue ?? 6} Vehicles
                </span>
                <span className="text-[10px] text-[#86868b] mt-0.5 block">Waiting & In-Service across network</span>
              </div>

              <div className="bg-[#f5f5f7] p-4 rounded-[20px] border border-[#e6e6e8]">
                <span className="text-[10px] uppercase font-semibold text-[#707070] block">Bay Utilization Rate</span>
                <span className="text-xl font-semibold text-[#1d1d1f] mt-1 block">
                  {(() => {
                    const branches = data?.branch_comparison || [];
                    if (!branches.length) return '72.5%';
                    const avg = Math.round(branches.reduce((acc: number, b: any) => acc + (b.bay_utilization_percent || 65), 0) / branches.length);
                    return `${avg}%`;
                  })()}
                </span>
                <span className="text-[10px] text-[#86868b] mt-0.5 block">Physical workshop floor efficiency</span>
              </div>

              <div className="bg-[#f5f5f7] p-4 rounded-[20px] border border-[#e6e6e8]">
                <span className="text-[10px] uppercase font-semibold text-[#707070] block">Network Avg Wait Time</span>
                <span className="text-xl font-semibold text-[#1d1d1f] mt-1 block">
                  {data?.network_avg_wait ?? 22.4} min
                </span>
                <span className="text-[10px] text-[#86868b] mt-0.5 block">ML dynamic wait time average</span>
              </div>

              <div className="bg-[#f5f5f7] p-4 rounded-[20px] border border-[#e6e6e8]">
                <span className="text-[10px] uppercase font-semibold text-[#707070] block">Est. Daily Gross Revenue</span>
                <span className="text-xl font-semibold text-[#1d1d1f] mt-1 block">
                  ₹{data?.total_revenue_today ? Number(data.total_revenue_today).toLocaleString('en-IN') : '38,400'}
                </span>
                <span className="text-[10px] text-[#86868b] mt-0.5 block">Completed & active service tickets</span>
              </div>
            </div>
          </div>

          {/* AI Demand Surge & Staff Deployment Recommendations Banner */}
          {(() => {
            const branches = data?.branch_comparison || [];
            const surgingBranches = branches.filter((b: any) => b.ai_recommendation?.has_surge);
            if (surgingBranches.length === 0) return null;

            return (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-[#b64400]" />
                  <h4 className="text-base font-semibold text-[#1d1d1f]">AI Autonomous Resource Rebalance Alerts</h4>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {surgingBranches.map((b: any) => {
                    const rec = b.ai_recommendation;
                    return (
                      <div
                        key={b.branch_id}
                        className="bg-white border border-[#d6d6d6] rounded-[28px] p-6 shadow-none relative space-y-4 hover:border-[#86868b] transition-all"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-[#f5f5f7] text-[#b64400] border border-[#d6d6d6] flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#b64400]" />
                              <span>{rec.surge_level || 'CRITICAL SURGE'}</span>
                            </span>
                            <span className="text-xs font-mono font-medium text-[#707070]">
                              Branch #{b.branch_id}
                            </span>
                          </div>
                          <span className="text-xs font-medium text-[#1d1d1f] bg-[#f5f5f7] border border-[#d6d6d6] px-2.5 py-0.5 rounded-full">
                            {rec.demand_share}% {rec.surge_service}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-lg font-semibold text-[#1d1d1f]">{b.branch_name}: {rec.recommendation_title}</h4>
                          <p className="text-xs text-[#707070] mt-1.5 leading-relaxed">
                            {rec.recommendation_text}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                          <div className="bg-[#f5f5f7] p-3 rounded-[16px] border border-[#e6e6e8]">
                            <span className="text-[10px] uppercase font-semibold text-[#707070] block">Recommended Action</span>
                            <span className="text-[#1d1d1f] font-medium block mt-1">{rec.recommended_action}</span>
                          </div>
                          <div className="bg-[#f5f5f7] p-3 rounded-[16px] border border-[#e6e6e8]">
                            <span className="text-[10px] uppercase font-semibold text-[#707070] block">Projected Impact</span>
                            <span className="text-[#1d1d1f] font-medium block mt-1">{rec.projected_impact}</span>
                          </div>
                        </div>

                        <div className="pt-2 flex items-center justify-between gap-3 border-t border-[#e6e6e8]">
                          <span className="text-[11px] text-[#707070]">
                            Suggested Donor: <strong className="text-[#1d1d1f]">{rec.source_branch_name || 'Sister Branch'}</strong>
                          </span>
                          <button
                            onClick={() => handleOpenDeployStaff(b.branch_id, rec.source_branch_id, rec.recommended_action)}
                            className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs transition flex items-center space-x-1.5 shadow-none cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Deploy {rec.target_service_type} Staff Now</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 360° Comprehensive Branch Performance Telemetry */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-[#1d1d1f] tracking-tight">360° Workshop Operational Telematics</h4>
                <p className="text-xs text-[#707070] mt-0.5">
                  Detailed inspection of bays, mechanic utilization, service category demand, and queue velocity for every location.
                </p>
              </div>
              <span className="text-xs font-mono text-[#707070] bg-[#f5f5f7] px-3 py-1 rounded-full border border-[#d6d6d6]">
                {selectedBranchId === 'all'
                  ? `Showing all ${data?.branch_comparison?.length || centersList.length} branches`
                  : `Filtering Branch #${selectedBranchId}`}
              </span>
            </div>

            <div className="space-y-6">
              {(() => {
                const allBranches = data?.branch_comparison || centersList;
                const filtered = selectedBranchId === 'all'
                  ? allBranches
                  : allBranches.filter((b: any) => (b.branch_id || b.id) === selectedBranchId);

                return filtered.map((branch: any) => {
                  const bId = branch.branch_id || branch.id;
                  const bName = branch.branch_name || branch.name;
                  const workloadPct = branch.workload_percent ?? Math.round((branch.current_workload || 0.35) * 100);
                  const totalBays = branch.total_bays || 6;
                  const occupiedBays = branch.occupied_bays ?? Math.round(totalBays * (workloadPct / 100));
                  const availBays = branch.available_bays ?? Math.max(0, totalBays - occupiedBays);
                  const bayUtilPct = branch.bay_utilization_percent ?? Math.round((occupiedBays / totalBays) * 100);

                  const totalMechs = branch.total_mechanics || 6;
                  const busyMechs = branch.busy_mechanics ?? Math.round(totalMechs * (workloadPct / 100));
                  const availMechs = branch.available_mechanics ?? Math.max(0, totalMechs - busyMechs);
                  const mechUtilPct = branch.mechanic_utilization_percent ?? Math.round((busyMechs / totalMechs) * 100);

                  const activeQueue = branch.active_queue ?? 3;
                  const waitingCount = branch.waiting_count ?? Math.max(1, activeQueue - 2);
                  const inServiceCount = branch.in_service_count ?? (activeQueue - waitingCount);
                  const compCount = branch.completed_today ?? 5;

                  const avgWait = branch.avg_wait_minutes ?? 24;
                  const avgService = branch.avg_service_minutes ?? 55;
                  const estRev = branch.estimated_daily_revenue ?? ((compCount * 2400) + 7200);
                  const rating = branch.customer_rating ?? 4.8;
                  const sla = branch.sla_compliance_percent ?? 96;

                  const demandList = branch.service_demand_breakdown || [
                    { service_name: 'General Service', booking_count: 24, demand_percentage: 58, queue_pressure: 'HIGH', avg_time_mins: 45 },
                    { service_name: 'Oil & Filter Change', booking_count: 8, demand_percentage: 18, queue_pressure: 'MODERATE', avg_time_mins: 30 },
                    { service_name: 'Brake Service & Suspension', booking_count: 5, demand_percentage: 12, queue_pressure: 'BALANCED', avg_time_mins: 60 },
                    { service_name: 'Major Engine & Transmission', booking_count: 3, demand_percentage: 6, queue_pressure: 'BALANCED', avg_time_mins: 90 },
                    { service_name: 'Electrical Diagnostics', booking_count: 2, demand_percentage: 4, queue_pressure: 'BALANCED', avg_time_mins: 45 },
                    { service_name: 'Express Wash & Detailing', booking_count: 1, demand_percentage: 2, queue_pressure: 'BALANCED', avg_time_mins: 25 },
                  ];

                  const technicians = branch.technicians || [];

                  return (
                    <div
                      key={bId}
                      className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] hover:border-[#86868b] transition-all duration-200 shadow-none space-y-6"
                    >
                      {/* Branch Card Header */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#e6e6e8]">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2.5">
                            <span className="font-mono text-xs font-medium text-[#1d1d1f] bg-[#f5f5f7] border border-[#d6d6d6] px-2.5 py-0.5 rounded-lg">
                              Branch #{bId}
                            </span>
                            <h3 className="text-xl font-semibold text-[#1d1d1f]">{bName}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                              workloadPct >= 80
                                ? 'bg-[#f5f5f7] text-[#b64400] border border-[#d6d6d6]'
                                : 'bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]'
                            }`}>
                              {workloadPct}% Workload ({workloadPct >= 80 ? 'Heavy Surge' : workloadPct >= 60 ? 'Moderate' : 'Optimal'})
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#707070] pt-0.5">
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3.5 h-3.5 text-[#86868b]" />
                              <span>{branch.address || branch.city}, {branch.city}</span>
                            </span>
                            {branch.phone && (
                              <span className="flex items-center space-x-1">
                                <Phone className="w-3.5 h-3.5 text-[#86868b]" />
                                <span>{branch.phone}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2.5 shrink-0">
                          <button
                            onClick={() => handleOpenDeployStaff(bId)}
                            className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs transition flex items-center space-x-1.5 shadow-none cursor-pointer"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Deploy Staff Here</span>
                          </button>
                          <button
                            onClick={() => onInspectBranch && onInspectBranch(bId)}
                            className="px-3.5 py-2 rounded-full border border-[#86868b] hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-medium transition flex items-center space-x-1 cursor-pointer"
                          >
                            <span>Inspect</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 5-Column 360° Telemetry Metrics */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                        {/* Metric 1: Physical Bays */}
                        <div className="bg-[#f5f5f7] p-4 rounded-[20px] border border-[#e6e6e8] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-semibold text-[#707070] flex items-center space-x-1">
                              <Wrench className="w-3 h-3 text-[#0071e3]" />
                              <span>Service Bays</span>
                            </span>
                            <span className="text-xs font-semibold text-[#0071e3]">{bayUtilPct}%</span>
                          </div>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-semibold text-[#1d1d1f]">{occupiedBays}/{totalBays}</span>
                            <span className="text-xs text-[#707070]">occupied</span>
                          </div>
                          <div className="w-full bg-[#e6e6e8] h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0071e3] rounded-full" style={{ width: `${bayUtilPct}%` }} />
                          </div>
                          <span className="text-[11px] text-[#1d1d1f] block font-medium">{availBays} bays available</span>
                        </div>

                        {/* Metric 2: Technician Workforce */}
                        <div className="bg-[#f5f5f7] p-4 rounded-[20px] border border-[#e6e6e8] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-semibold text-[#707070] flex items-center space-x-1">
                              <Users className="w-3 h-3 text-[#0071e3]" />
                              <span>Technicians</span>
                            </span>
                            <span className="text-xs font-semibold text-[#0071e3]">{mechUtilPct}%</span>
                          </div>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-semibold text-[#1d1d1f]">{busyMechs}/{totalMechs}</span>
                            <span className="text-xs text-[#707070]">on cars</span>
                          </div>
                          <div className="w-full bg-[#e6e6e8] h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0071e3] rounded-full" style={{ width: `${mechUtilPct}%` }} />
                          </div>
                          <span className="text-[11px] text-[#1d1d1f] block font-medium">{availMechs} ready to deploy</span>
                        </div>

                        {/* Metric 3: Active Queue Depth */}
                        <div className="bg-[#f5f5f7] p-4 rounded-[20px] border border-[#e6e6e8] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-semibold text-[#707070] flex items-center space-x-1">
                              <Clock className="w-3 h-3 text-[#0071e3]" />
                              <span>Queue Depth</span>
                            </span>
                            <span className="text-xs font-semibold text-[#1d1d1f]">{activeQueue} Active</span>
                          </div>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-semibold text-[#1d1d1f]">{waitingCount}</span>
                            <span className="text-xs text-[#707070]">waiting</span>
                            <span className="text-xs font-normal text-[#86868b]">•</span>
                            <span className="text-xs text-[#707070]">{inServiceCount} in bays</span>
                          </div>
                          <div className="w-full bg-[#e6e6e8] h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0071e3] rounded-full" style={{ width: `${Math.min(100, activeQueue * 15)}%` }} />
                          </div>
                          <span className="text-[11px] text-[#1d1d1f] block font-medium">{compCount} completed today</span>
                        </div>

                        {/* Metric 4: Turnaround & Wait */}
                        <div className="bg-[#f5f5f7] p-4 rounded-[20px] border border-[#e6e6e8] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-semibold text-[#707070] flex items-center space-x-1">
                              <Activity className="w-3 h-3 text-[#0071e3]" />
                              <span>ML Turnaround</span>
                            </span>
                            <span className="text-xs font-semibold text-[#1d1d1f]">{sla}% SLA</span>
                          </div>
                          <div className="flex items-baseline space-x-2">
                            <span className="text-2xl font-semibold text-[#1d1d1f]">{avgWait}m</span>
                            <span className="text-xs text-[#707070]">avg wait</span>
                          </div>
                          <div className="w-full bg-[#e6e6e8] h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0071e3] rounded-full" style={{ width: `${sla}%` }} />
                          </div>
                          <span className="text-[11px] text-[#707070] block">Avg service duration: {avgService}m</span>
                        </div>

                        {/* Metric 5: Revenue & Rating */}
                        <div className="bg-[#f5f5f7] p-4 rounded-[20px] border border-[#e6e6e8] space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-semibold text-[#707070] flex items-center space-x-1">
                              <DollarSign className="w-3 h-3 text-[#0071e3]" />
                              <span>Gross Est.</span>
                            </span>
                            <span className="text-xs font-semibold text-[#1d1d1f] flex items-center space-x-0.5">
                              <Star className="w-3 h-3 fill-current text-[#1d1d1f]" />
                              <span>{rating}</span>
                            </span>
                          </div>
                          <div className="flex items-baseline space-x-1">
                            <span className="text-2xl font-semibold text-[#1d1d1f]">₹{estRev.toLocaleString('en-IN')}</span>
                          </div>
                          <div className="w-full bg-[#e6e6e8] h-1.5 rounded-full overflow-hidden">
                            <div className="h-full bg-[#0071e3] rounded-full" style={{ width: '88%' }} />
                          </div>
                          <span className="text-[11px] text-[#707070] block">Daily workshop turnover</span>
                        </div>
                      </div>

                      {/* AI Service Demand Breakdown for this Branch */}
                      <div className="bg-[#fafafc] border border-[#e6e6e8] rounded-[20px] p-5 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#1d1d1f] flex items-center space-x-2">
                              <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                              <span>AI Service Demand Breakdown & Queue Bottleneck Radar</span>
                            </h4>
                            <p className="text-[11px] text-[#707070] mt-0.5">
                              Category distribution of customer bookings at {bName}. Use this analysis to deploy staff to high-demand services.
                            </p>
                          </div>
                          <span className="text-[11px] font-medium text-[#707070]">
                            Total Bookings Analyzed: <strong className="text-[#1d1d1f]">{demandList.reduce((acc: number, d: any) => acc + (d.booking_count || 0), 0)}</strong>
                          </span>
                        </div>

                        <div className="space-y-3 pt-1">
                          {demandList.map((service: any, sIdx: number) => {
                            const isHigh = service.queue_pressure === 'HIGH';
                            const isMod = service.queue_pressure === 'MODERATE';

                            return (
                              <div key={sIdx} className="space-y-1.5">
                                <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-semibold text-[#1d1d1f]">{service.service_name}</span>
                                    <span className="text-[10px] text-[#86868b] font-mono">({service.avg_time_mins}m avg duration)</span>
                                  </div>

                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono text-[#707070] font-medium text-[11px]">
                                      {service.booking_count} bookings ({service.demand_percentage}%)
                                    </span>
                                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider border ${
                                      isHigh
                                        ? 'bg-[#f5f5f7] text-[#b64400] border-[#d6d6d6]'
                                        : isMod
                                        ? 'bg-[#f5f5f7] text-[#1d1d1f] border-[#d6d6d6]'
                                        : 'bg-white text-[#707070] border-[#d6d6d6]'
                                    }`}>
                                      {isHigh ? 'Surge' : isMod ? 'Moderate' : 'Balanced'}
                                    </span>
                                  </div>
                                </div>

                                <div className="w-full bg-[#e6e6e8] h-2 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-[#0071e3] rounded-full transition-all duration-500"
                                    style={{ width: `${service.demand_percentage}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Active Technicians Roster on Floor */}
                      {technicians.length > 0 && (
                        <div className="pt-2 border-t border-[#e6e6e8] space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-[#707070] uppercase tracking-wider flex items-center space-x-1.5">
                              <Users className="w-3.5 h-3.5 text-[#0071e3]" />
                              <span>Active Technicians Assigned to {bName} ({technicians.length})</span>
                            </span>
                            <button
                              onClick={() => handleOpenDeployStaff(undefined, bId, `Rebalance staff from ${bName}`)}
                              className="text-[11px] font-medium text-[#0066cc] hover:underline transition cursor-pointer flex items-center space-x-1"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>Transfer a Tech from this Branch</span>
                            </button>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {technicians.map((m: any) => (
                              <div
                                key={m.id}
                                className="bg-[#f5f5f7] border border-[#d6d6d6] px-3.5 py-1.5 rounded-full flex items-center space-x-2 text-xs"
                              >
                                <span className="font-medium text-[#1d1d1f]">{m.name}</span>
                                <span className="text-[10px] text-[#707070] font-normal">
                                  {m.specialization}
                                </span>
                                <span className={`w-2 h-2 rounded-full ${
                                  m.availability === 'Available' ? 'bg-emerald-500' : 'bg-amber-500'
                                }`} title={m.availability} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: WORKSHOP BRANCHES */}
      {activeTab === 'branches' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">Registered Workshop Branches</h3>
              <p className="text-xs text-[#707070] mt-1">
                Manage physical workshop locations, assigned managers, bay capacities, and technicians.
              </p>
            </div>
            <button
              onClick={handleOpenAddBranch}
              className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center space-x-2 shadow-none cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Workshop Branch</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {centersList.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-[28px] p-6 border border-[#d6d6d6] hover:border-[#86868b] shadow-none transition-all space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-medium text-[#707070] bg-[#f5f5f7] border border-[#d6d6d6] px-2.5 py-0.5 rounded-lg">
                        Branch #{c.id}
                      </span>
                      <h4 className="text-lg font-semibold text-[#1d1d1f] mt-1.5">{c.name}</h4>
                    </div>
                    <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
                      Active
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-[#707070]">
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-[#86868b] shrink-0" />
                      <span className="truncate">{c.address}, {c.city}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-[#86868b] shrink-0" />
                      <span>{c.phone}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#e6e6e8] text-xs">
                    <div className="bg-[#f5f5f7] p-3 rounded-[16px] border border-[#e6e6e8]">
                      <span className="text-[#707070] block text-[10px] uppercase font-semibold">Service Bays</span>
                      <span className="font-semibold text-[#1d1d1f] text-base">{c.total_bays} Bays</span>
                    </div>
                    <div className="bg-[#f5f5f7] p-3 rounded-[16px] border border-[#e6e6e8]">
                      <span className="text-[#707070] block text-[10px] uppercase font-semibold">Technicians</span>
                      <span className="font-semibold text-[#1d1d1f] text-base">{c.total_mechanics} Techs</span>
                    </div>
                  </div>

                  {/* Branch Manager Assignment */}
                  <div className="bg-[#f5f5f7] border border-[#e6e6e8] rounded-[16px] p-4 text-xs">
                    <span className="text-[10px] uppercase font-semibold text-[#707070] block">Assigned Branch Manager</span>
                    {c.manager_name && c.manager_name !== 'Unassigned' ? (
                      <div className="mt-1">
                        <span className="font-semibold text-[#1d1d1f] text-sm">{c.manager_name}</span>
                        {c.manager_email && (
                          <span className="text-[#707070] block text-[11px] font-mono mt-0.5">{c.manager_email}</span>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[#707070] italic">No manager assigned</span>
                        <button
                          onClick={() => {
                            setMgrCenterId(c.id);
                            setShowCreateManagerModal(true);
                          }}
                          className="px-3 py-1 rounded-full bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6] text-xs font-medium transition cursor-pointer"
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
                    className="w-full py-2.5 rounded-full border border-[#86868b] hover:bg-[#f5f5f7] text-[#1d1d1f] font-medium text-xs transition flex items-center justify-center space-x-2 cursor-pointer shadow-none"
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
        <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">Branch Managers Staff Delegation</h3>
              <p className="text-xs text-[#707070] mt-1 max-w-2xl">
                Generate dedicated credentials for branch managers. Each manager logs into their specific workshop queue to assign bays and advance tickets.
              </p>
            </div>
            <button
              onClick={() => setShowCreateManagerModal(true)}
              className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition flex items-center space-x-2 shadow-none shrink-0 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Branch Manager ID</span>
            </button>
          </div>

          {managers.length === 0 ? (
            <div className="text-center py-16 px-4 bg-[#f5f5f7] rounded-[24px] border border-dashed border-[#d6d6d6]">
              <Users className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
              <h4 className="text-base font-semibold text-[#1d1d1f]">No Branch Managers Registered Yet</h4>
              <p className="text-xs text-[#707070] max-w-md mx-auto mt-1 leading-relaxed">
                Create dedicated login credentials for your branch managers so they can dispatch technicians, accept walk-ins, and advance queues.
              </p>
              <button
                onClick={() => setShowCreateManagerModal(true)}
                className="mt-5 px-5 py-2.5 rounded-full bg-[#0071e3] text-white font-medium text-xs shadow-none hover:bg-[#0077ed] transition cursor-pointer"
              >
                + Create First Manager ID
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-[20px] border border-[#e6e6e8]">
              <table className="w-full text-left text-xs text-[#1d1d1f]">
                <thead className="bg-[#f5f5f7] uppercase text-[11px] font-semibold text-[#707070] tracking-wider border-b border-[#e6e6e8]">
                  <tr>
                    <th className="p-4">Manager Name</th>
                    <th className="p-4">Login Email ID</th>
                    <th className="p-4">Phone</th>
                    <th className="p-4">Assigned Workshop Branch</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">System Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e6e6e8]">
                  {managers.map((m) => (
                    <tr key={m.id} className="hover:bg-[#fafafc] transition">
                      <td className="p-4 font-semibold text-[#1d1d1f] text-sm">{m.name}</td>
                      <td className="p-4 font-mono font-medium text-[#0066cc]">{m.email}</td>
                      <td className="p-4 text-[#707070]">{m.phone || 'N/A'}</td>
                      <td className="p-4">
                        <span className="bg-[#f5f5f7] px-3 py-1 rounded-full font-medium text-[#1d1d1f] text-xs border border-[#d6d6d6]">
                          {m.service_center_name || 'Unassigned'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
                          {m.status || 'Active'}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-[#f5f5f7] text-[#0066cc] border border-[#d6d6d6]">
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-[#d6d6d6] rounded-[28px] w-full max-w-xl shadow-2xl text-[#1d1d1f] p-6 sm:p-8 space-y-6 relative z-[10000]">
            <div className="flex items-center justify-between border-b border-[#e6e6e8] pb-4">
              <div>
                <h3 className="text-xl font-semibold text-[#1d1d1f]">Add New Service Center Branch</h3>
                <p className="text-xs text-[#707070] mt-0.5">
                  Register another automotive center under your franchise network.
                </p>
              </div>
              <button
                onClick={() => setShowAddBranchModal(false)}
                className="text-[#707070] hover:text-[#1d1d1f] transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {branchError && (
              <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-[#b64400] text-[#b64400] text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{branchError}</span>
              </div>
            )}

            <form onSubmit={handleAddBranchSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                  Workshop Center Name *
                </label>
                <input
                  type="text"
                  required
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. Apex Auto Care - East Expressway"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={newBranchCity}
                    onChange={(e) => setNewBranchCity(e.target.value)}
                    placeholder="e.g. Ahmedabad, Surat, Pune"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1">Area / Landmark *</label>
                  <input
                    type="text"
                    required
                    value={newBranchArea}
                    onChange={(e) => setNewBranchArea(e.target.value)}
                    placeholder="e.g. Science City, Nikol, SG Highway"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
              </div>

              {/* Quick Area Suggestions */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-semibold text-[#707070] tracking-wider">Quick Suggestions (Ahmedabad Areas):</span>
                <div className="flex flex-wrap gap-1.5">
                  {['Science City', 'Nikol', 'Thaltej', 'SG Highway', 'Bodakdev', 'Maninagar', 'Vastrapur', 'Bopal'].map((areaName) => (
                    <button
                      key={areaName}
                      type="button"
                      onClick={() => {
                        setNewBranchCity('Ahmedabad');
                        setNewBranchArea(areaName);
                      }}
                      className={`px-3 py-1 rounded-full text-[10px] font-medium border transition cursor-pointer ${
                        newBranchArea.toLowerCase() === areaName.toLowerCase()
                          ? 'bg-[#1d1d1f] text-white border-[#1d1d1f]'
                          : 'bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#1d1d1f] border-[#d6d6d6]'
                      }`}
                    >
                      {areaName}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1">Physical Address *</label>
                <input
                  type="text"
                  required
                  value={newBranchAddress}
                  onChange={(e) => setNewBranchAddress(e.target.value)}
                  placeholder="e.g. Plot 108, Industrial Zone Phase 2"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    required
                    value={newBranchPhone}
                    onChange={(e) => setNewBranchPhone(e.target.value)}
                    placeholder="+91 98250 99999"
                    className="w-full px-3 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1">Bays</label>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={newBranchBays}
                    onChange={(e) => setNewBranchBays(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] text-center focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1">Technicians</label>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={newBranchMechanics}
                    onChange={(e) => setNewBranchMechanics(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] text-center focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#e6e6e8]">
                <button
                  type="button"
                  onClick={() => setShowAddBranchModal(false)}
                  className="px-4 py-2 rounded-full text-xs text-[#707070] hover:text-[#1d1d1f] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingBranch}
                  className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-medium text-xs shadow-none transition flex items-center space-x-2 cursor-pointer"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-[#d6d6d6] rounded-[28px] w-full max-w-lg shadow-2xl text-[#1d1d1f] p-6 sm:p-8 space-y-6 relative z-[10000]">
            <div className="flex items-center justify-between border-b border-[#e6e6e8] pb-4">
              <div>
                <h3 className="text-xl font-semibold text-[#1d1d1f]">Create Branch Manager Account</h3>
                <p className="text-xs text-[#707070] mt-0.5">
                  Assign a manager to operate shop-floor queue, bays, and mechanics.
                </p>
              </div>
              <button
                onClick={() => setShowCreateManagerModal(false)}
                className="text-[#707070] hover:text-[#1d1d1f] transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {managerError && (
              <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-[#b64400] text-[#b64400] text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{managerError}</span>
              </div>
            )}

            <form onSubmit={handleCreateManagerSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                  Manager Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={mgrName}
                  onChange={(e) => setMgrName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                  Manager Login Email *
                </label>
                <input
                  type="email"
                  required
                  value={mgrEmail}
                  onChange={(e) => setMgrEmail(e.target.value)}
                  placeholder="manager.branch@apexauto.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                    Temporary Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={mgrPassword}
                    onChange={(e) => setMgrPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={mgrPhone}
                    onChange={(e) => setMgrPhone(e.target.value)}
                    placeholder="+91 98250 54321"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                  Assign to Service Center Branch *
                </label>
                <select
                  required
                  value={mgrCenterId}
                  onChange={(e) => setMgrCenterId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                >
                  <option value="">-- Select Service Center --</option>
                  {centersList.map((c) => (
                    <option key={c.id} value={c.id}>
                      Branch #{c.id}: {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#e6e6e8]">
                <button
                  type="button"
                  onClick={() => setShowCreateManagerModal(false)}
                  className="px-4 py-2 rounded-full text-xs text-[#707070] hover:text-[#1d1d1f] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingManager}
                  className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-medium text-xs shadow-none transition flex items-center space-x-2 cursor-pointer"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-[#d6d6d6] rounded-[28px] w-full max-w-lg shadow-2xl text-[#1d1d1f] p-6 sm:p-8 space-y-6 relative z-[10000]">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-[#b64400]" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#1d1d1f]">Workshop Branch Limit Reached</h3>
                <span className="text-xs text-[#707070]">{planInfo?.plan_name || 'Single Hub Starter'} Plan</span>
              </div>
            </div>

            <div className="bg-[#f5f5f7] border border-[#e6e6e8] rounded-[20px] p-4 space-y-2 text-xs text-[#1d1d1f]">
              <p>
                Your current plan allows a maximum of <strong>{planInfo?.max_allowed_centers || 1} Service Center</strong>.
              </p>
              <p>
                Active Workshop: <strong className="text-[#0071e3]">{franchiseData?.centers?.[0]?.name || 'Primary Workshop Center'}</strong> ({franchiseData?.centers?.[0]?.city || 'Active'})
              </p>
              <p className="text-[#707070] pt-1 border-t border-[#e6e6e8]">
                To register additional workshop branches across multiple cities and enable cross-branch workload balancing, please upgrade to the <strong>Multi-Branch Growth Plan (up to 5 centers)</strong>.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLimitAlertModal(false)}
                className="w-full sm:w-1/3 py-2.5 rounded-full text-xs font-medium text-[#707070] hover:text-[#1d1d1f] transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowLimitAlertModal(false);
                  setShowPlansModal(true);
                }}
                className="w-full sm:w-2/3 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs shadow-none transition flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Upgrade to Multi-Branch</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL: AI CROSS-BRANCH STAFF DEPLOYMENT */}
      {showReallocateModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white border border-[#d6d6d6] rounded-[28px] w-full max-w-xl shadow-2xl text-[#1d1d1f] p-6 sm:p-8 space-y-6 relative z-[10000]">
            <div className="flex items-center justify-between border-b border-[#e6e6e8] pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
                    AI Load Balancing
                  </span>
                  <span className="text-xs text-[#0071e3] font-medium flex items-center space-x-1">
                    <Zap className="w-3 h-3 fill-current" />
                    <span>Real-Time Staff Deployment</span>
                  </span>
                </div>
                <h3 className="text-xl font-semibold text-[#1d1d1f]">Deploy & Reassign Workshop Staff</h3>
                <p className="text-xs text-[#707070]">
                  Transfer technicians from branches with surplus capacity to centers experiencing high service demand surges.
                </p>
              </div>
              <button
                onClick={() => setShowReallocateModal(false)}
                className="text-[#707070] hover:text-[#1d1d1f] transition cursor-pointer text-lg p-1"
              >
                ✕
              </button>
            </div>

            {reallocateError && (
              <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-[#b64400] text-[#b64400] text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{reallocateError}</span>
              </div>
            )}

            <form onSubmit={handleReallocateSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Source Branch */}
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                    Source Branch (Donor Center) *
                  </label>
                  <select
                    required
                    value={reallocateFromId}
                    onChange={(e) => handleSourceBranchChange(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                  >
                    <option value="">-- Select Source Branch --</option>
                    {(data?.branch_comparison || centersList).map((b: any) => {
                      const bId = b.branch_id || b.id;
                      const bName = b.branch_name || b.name;
                      return (
                        <option key={bId} value={bId}>
                          Branch #{bId}: {bName} ({b.city})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Target Branch */}
                <div>
                  <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                    Target Branch (Surge Center) *
                  </label>
                  <select
                    required
                    value={reallocateToId}
                    onChange={(e) => setReallocateToId(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                  >
                    <option value="">-- Select Target Branch --</option>
                    {(data?.branch_comparison || centersList)
                      .filter((b: any) => (b.branch_id || b.id) !== Number(reallocateFromId))
                      .map((b: any) => {
                        const bId = b.branch_id || b.id;
                        const bName = b.branch_name || b.name;
                        const isSurge = b.ai_recommendation?.has_surge;
                        return (
                          <option key={bId} value={bId}>
                            Branch #{bId}: {bName} {isSurge ? '🚨 [HIGH SURGE]' : ''}
                          </option>
                        );
                      })}
                  </select>
                </div>
              </div>

              {/* Technician Dropdown */}
              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                  Select Technician to Deploy *
                </label>
                {(() => {
                  const sourceBranch = (data?.branch_comparison || []).find(
                    (b: any) => (b.branch_id || b.id) === Number(reallocateFromId)
                  );
                  const techs = sourceBranch?.technicians || [];

                  if (techs.length === 0) {
                    return (
                      <div className="p-3 bg-[#f5f5f7] border border-[#d6d6d6] rounded-xl text-xs text-[#707070] italic">
                        {reallocateFromId ? 'No specific technician records assigned to this branch yet. One will be auto-assigned.' : 'Please select a source branch first.'}
                      </div>
                    );
                  }

                  return (
                    <select
                      required
                      value={reallocateTechId}
                      onChange={(e) => setReallocateTechId(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
                    >
                      <option value="">-- Select Technician --</option>
                      {techs.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.name} — Specialization: {m.specialization} [{m.availability}]
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              {/* Deployment Reason */}
              <div>
                <label className="block text-xs font-medium text-[#1d1d1f] mb-1">
                  Deployment Reason & AI Notes
                </label>
                <input
                  type="text"
                  value={reallocateReason}
                  onChange={(e) => setReallocateReason(e.target.value)}
                  placeholder="e.g. Deploy General Service staff to balance Branch 1 surge"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
                />
              </div>

              {/* Projected Dynamic Impact Card */}
              <div className="bg-[#f5f5f7] border border-[#e6e6e8] rounded-[20px] p-4 text-xs space-y-2">
                <span className="text-[10px] uppercase font-semibold text-[#707070] block tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                  <span>Projected Operational Impact</span>
                </span>
                <div className="flex items-center justify-between text-[#1d1d1f] text-xs font-medium">
                  <span>Source Branch Tech Capacity:</span>
                  <span className="text-[#b64400] font-semibold">-1 Technician</span>
                </div>
                <div className="flex items-center justify-between text-[#1d1d1f] text-xs font-medium">
                  <span>Target Branch Tech Capacity:</span>
                  <span className="text-emerald-600 font-semibold">+1 Technician</span>
                </div>
                <p className="text-[11px] text-[#707070] pt-1 border-t border-[#e6e6e8]">
                  ⚡ Instantly recalculates dynamic workshop workload %, bay throughput, and projected queue wait times upon deployment.
                </p>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#e6e6e8]">
                <button
                  type="button"
                  onClick={() => setShowReallocateModal(false)}
                  className="px-4 py-2 rounded-full text-xs text-[#707070] hover:text-[#1d1d1f] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReallocate}
                  className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-medium text-xs shadow-none transition flex items-center space-x-2 cursor-pointer"
                >
                  {submittingReallocate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deploying Technician...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 fill-current" />
                      <span>Confirm Staff Deployment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
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
