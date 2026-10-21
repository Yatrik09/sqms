import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { QueueEntry, ServiceBay, Mechanic, TechnicianItem } from '../types';
import {
  Users, CheckCircle2, Clock, Play, Plus, PlusCircle, Wrench, Shield, AlertCircle, RefreshCw, Layers, Gauge, Sparkles,
  TrendingUp, BarChart3, Award, FileText, ArrowUpRight, Activity, Calendar, Zap, CheckCircle, PieChart as PieIcon,
  User, Phone, Car, Ticket, X, Building2, Bell, UserPlus, Copy, Check, Trash2
} from 'lucide-react';
import { FranchisePlansModal } from '../components/FranchisePlansModal';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend, PieChart, Pie, Cell
} from 'recharts';

const STATUS_OPTIONS = [
  'Booking Confirmed',
  'Vehicle Received',
  'Waiting',
  'Inspection',
  'Waiting for Bay',
  'Service In Progress',
  'Washing',
  'Repair In Progress',
  'Quality Check',
  'Ready for Pickup',
  'Completed',
  'Cancelled',
];

const PIE_COLORS = ['#2563eb', '#06b6d4', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

const VEHICLE_OPTIONS = [
  { id: 'Sedan', name: 'Sedan' },
  { id: 'SUV', name: 'SUV' },
  { id: 'Hatchback', name: 'Hatchback' },
  { id: 'Luxury', name: 'Luxury' },
  { id: 'Bike', name: 'Two-Wheeler' },
  { id: 'EV', name: 'Electric (EV)' },
];

const SERVICE_OPTIONS = [
  { name: 'General Service', est: '~60m', badge: 'Standard' },
  { name: 'Oil Change', est: '~30m', badge: 'Fast Lane' },
  { name: 'Car Wash', est: '~25m', badge: 'Detaiing' },
  { name: 'Brake Service', est: '~45m', badge: 'Safety' },
  { name: 'AC Service', est: '~40m', badge: 'Climate' },
  { name: 'Minor Accident Repair', est: '~90m', badge: 'Bodywork' },
];

interface ManagerPortalProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  inspectedCenterId?: number;
}

export const ManagerPortal: React.FC<ManagerPortalProps> = ({ activeTab = 'manager-queue', onTabChange, inspectedCenterId }) => {
  const { user, lastWsEvent } = useAuth();
  const [currentViewTab, setCurrentViewTab] = useState<string>(activeTab);
  const [centerId, setCenterId] = useState<number | null>(inspectedCenterId || null);
  const [availableCenters, setAvailableCenters] = useState<any[]>([]);
  const [centerInfo, setCenterInfo] = useState<any>(null);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [bays, setBays] = useState<ServiceBay[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianItem[]>([]);
  const [showCreateTechModal, setShowCreateTechModal] = useState<boolean>(false);
  const [techName, setTechName] = useState<string>('');
  const [techEmail, setTechEmail] = useState<string>('');
  const [techPassword, setTechPassword] = useState<string>('');
  const [techPhone, setTechPhone] = useState<string>('');
  const [techSpecialization, setTechSpecialization] = useState<string>('General Service');
  const [submittingTech, setSubmittingTech] = useState<boolean>(false);
  const [techError, setTechError] = useState<string | null>(null);
  const [createdTechNotice, setCreatedTechNotice] = useState<{ email: string; pass: string; center: string; name: string } | null>(null);
  const [copiedTechNotice, setCopiedTechNotice] = useState<boolean>(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPlansModal, setShowPlansModal] = useState<boolean>(false);

  // Sync tab with props
  useEffect(() => {
    if (activeTab) {
      setCurrentViewTab(activeTab);
    }
  }, [activeTab]);

  const switchTab = (tab: string) => {
    setCurrentViewTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  // Discover centers for this user or the whole system
  useEffect(() => {
    const discoverCenters = async () => {
      try {
        if (inspectedCenterId) {
          setCenterId(inspectedCenterId);
        }

        let centers: any[] = [];
        if (user?.role === 'branch_manager') {
          const [managed, allC] = await Promise.all([
            api.getMyManagedCenter().catch(() => null),
            api.getServiceCenters().catch(() => [])
          ]);
          const cList = (allC && allC.length > 0) ? allC : (managed ? [managed] : []);
          setAvailableCenters(cList);
          if (inspectedCenterId) {
            setCenterId(inspectedCenterId);
          } else if (managed && managed.has_center && managed.center_id) {
            setCenterId((prev) => (prev ? prev : managed.center_id));
          } else if (cList.length > 0) {
            setCenterId((prev) => (prev ? prev : cList[0].id));
          }
          return;
        }

        if (user?.role === 'franchise_owner') {
          const fran = await api.getMyFranchise().catch(() => null);
          if (fran && fran.centers && fran.centers.length > 0) {
            centers = fran.centers;
          }
        }
        
        if (centers.length === 0) {
          centers = await api.getServiceCenters().catch(() => []);
        }

        setAvailableCenters(centers);
        if (centers.length > 0) {
          if (inspectedCenterId && centers.some((c: any) => c.id === inspectedCenterId)) {
            setCenterId(inspectedCenterId);
          } else {
            setCenterId((prev) => (prev && centers.some((c: any) => c.id === prev) ? prev : centers[0].id));
          }
        } else {
          setCenterId(null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to discover centers', err);
        setLoading(false);
      }
    };
    discoverCenters();
  }, [user, inspectedCenterId]);

  // Walk-in modal
  const [showWalkInModal, setShowWalkInModal] = useState<boolean>(false);
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState<boolean>(false);
  const [walkinName, setWalkinName] = useState<string>('');
  const [walkinPhone, setWalkinPhone] = useState<string>('');
  const [walkinReg, setWalkinReg] = useState<string>('');
  const [walkinType, setWalkinType] = useState<string>('Sedan');
  const [walkinService, setWalkinService] = useState<string>('General Service');

  // Status update modal / inline selection
  const [selectedEntry, setSelectedEntry] = useState<QueueEntry | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('Service In Progress');
  const [targetBayId, setTargetBayId] = useState<number | ''>('');
  const [targetMechId, setTargetMechId] = useState<number | ''>('');
  const [statusNotes, setStatusNotes] = useState<string>('');

  // Add Bay & Add Mechanic Modal States
  const [showAddBayModal, setShowAddBayModal] = useState<boolean>(false);
  const [newBayNum, setNewBayNum] = useState<string>('');
  const [newBayService, setNewBayService] = useState<string>('General Service');
  const [isSubmittingBay, setIsSubmittingBay] = useState<boolean>(false);

  const [showAddMechModal, setShowAddMechModal] = useState<boolean>(false);
  const [newMechName, setNewMechName] = useState<string>('');
  const [newMechSpec, setNewMechSpec] = useState<string>('General Service');
  const [isSubmittingMech, setIsSubmittingMech] = useState<boolean>(false);

  const loadCenterData = async () => {
    if (!centerId) {
      setLoading(false);
      return;
    }
    try {
      const [cDetails, qList, bList, mList, aData, tList] = await Promise.all([
        api.getServiceCenterById(centerId).catch(() => null),
        api.getCenterQueue(centerId).catch(() => []),
        api.getCenterBays(centerId).catch(() => []),
        api.getCenterMechanics(centerId).catch(() => []),
        api.getManagerAnalytics(centerId).catch(() => null),
        api.getCenterTechnicians(centerId).catch(() => []),
      ]);
      if (cDetails) {
        setCenterInfo(cDetails);
        setQueue(qList || []);
        setBays(bList || []);
        setMechanics(mList || []);
        setAnalytics(aData);
        setTechnicians(tList || []);
      }
    } catch (e) {
      console.error('Failed to load manager center data', e);
    } finally {
      setLoading(false);
    }
  };

  // Live real-time polling every 3s + instant WebSocket event listener
  useEffect(() => {
    if (centerId) {
      loadCenterData();
      const interval = setInterval(() => {
        loadCenterData();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [centerId, lastWsEvent]);

  // Real-time toast alert for new bookings and walk-in arrivals
  const [liveToast, setLiveToast] = useState<{
    id: string;
    title: string;
    message: string;
    token: string;
    time: string;
    targetCenterId?: number;
  } | null>(null);

  useEffect(() => {
    if (!lastWsEvent) return;
    if (lastWsEvent.event === 'NEW_BOOKING_CREATED') {
      const isThisCenter = !centerId || Number(lastWsEvent.service_center_id) === Number(centerId);
      setLiveToast({
        id: `${lastWsEvent.token_number}-${Date.now()}`,
        title: isThisCenter ? 'New Service Booking Received' : 'New Booking at Another Branch',
        message: `${lastWsEvent.customer_name} · ${lastWsEvent.vehicle_registration} (${lastWsEvent.service_type})`,
        token: lastWsEvent.token_number,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        targetCenterId: Number(lastWsEvent.service_center_id),
      });
      if (isThisCenter) {
        loadCenterData();
      }
      const timer = setTimeout(() => setLiveToast(null), 8000);
      return () => clearTimeout(timer);
    } else if (lastWsEvent.event === 'WALK_IN_TOKEN_CREATED') {
      const isThisCenter = !centerId || Number(lastWsEvent.service_center_id) === Number(centerId);
      setLiveToast({
        id: `${lastWsEvent.token_number}-${Date.now()}`,
        title: 'Walk-In Customer Added to Queue',
        message: `${lastWsEvent.vehicle_registration} assigned Queue #${lastWsEvent.queue_position}`,
        token: lastWsEvent.token_number,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        targetCenterId: Number(lastWsEvent.service_center_id),
      });
      if (isThisCenter) {
        loadCenterData();
      }
      const timer = setTimeout(() => setLiveToast(null), 7000);
      return () => clearTimeout(timer);
    } else if (lastWsEvent.event === 'QUEUE_STATUS_CHANGED') {
      if (!centerId || Number(lastWsEvent.service_center_id) === Number(centerId)) {
        loadCenterData();
      }
    }
  }, [lastWsEvent, centerId]);

  // AI Suggestion helpers
  const getSuggestedBay = (serviceType: string) => {
    const st = (serviceType || '').toLowerCase();
    const availBays = bays.filter(b => b.status === 'Available');
    if (availBays.length === 0) return null;
    const matching = availBays.find(b => {
      const bs = (b.supported_service_type || '').toLowerCase();
      if (st.includes('wash') && bs.includes('wash')) return true;
      if ((st.includes('accident') || st.includes('repair') || st.includes('dent') || st.includes('paint')) && (bs.includes('repair') || bs.includes('accident'))) return true;
      if (st.includes('general') && bs.includes('general')) return true;
      return false;
    });
    return matching || availBays[0];
  };

  const getSuggestedMechanic = (serviceType: string) => {
    const st = (serviceType || '').toLowerCase();
    const availMechs = mechanics.filter(m => m.availability === 'Available');
    if (availMechs.length === 0) return null;
    const matching = availMechs.find(m => {
      const ms = (m.specialization || '').toLowerCase();
      if ((st.includes('ac') || st.includes('electric')) && (ms.includes('ac') || ms.includes('electric'))) return true;
      if ((st.includes('accident') || st.includes('repair')) && (ms.includes('accident') || ms.includes('repair'))) return true;
      if (st.includes('general') && ms.includes('general')) return true;
      return false;
    });
    return matching || availMechs[0];
  };

  // Dedicated bay capacity evaluation for service types
  const getBayCapacityForService = (serviceType?: string) => {
    const st = (serviceType || '').toLowerCase();
    const matchingBays = bays.filter((b) => {
      const bs = (b.supported_service_type || '').toLowerCase();
      if (!bs || bs === 'all' || bs.includes('multi')) return true;
      if (bs === st || bs.includes(st) || st.includes(bs)) return true;
      if (bs.includes('general') && (st.includes('general') || st.includes('routine') || st.includes('maintenance'))) return true;
      if (bs.includes('wash') && st.includes('wash')) return true;
      if ((bs.includes('accident') || bs.includes('repair')) && (st.includes('accident') || st.includes('repair'))) return true;
      if (bs.includes('oil') && st.includes('oil')) return true;
      if (bs.includes('brake') && st.includes('brake')) return true;
      if (bs.includes('ac') && st.includes('ac')) return true;
      return false;
    });

    const total = matchingBays.length;
    const available = matchingBays.filter((b) => b.status === 'Available');
    return {
      total,
      available: available.length,
      occupied: total - available.length,
      isFull: total > 0 && available.length === 0,
    };
  };

  // 1-Click Automated Start Service with capacity enforcement
  const handleQuickStartService = async (entry: QueueEntry) => {
    const cap = getBayCapacityForService(entry.service_type);
    if (cap.isFull && !entry.assigned_bay_id) {
      alert(
        `⚠️ Bay Capacity Limit Reached:\n\nOnly ${cap.total} bay${cap.total !== 1 ? 's are' : ' is'} available for "${entry.service_type || 'General Service'}", and all ${cap.total} are currently occupied.\n\nSystem does not allow adding or starting a 3rd car for "${entry.service_type || 'General Service'}" until an active bay is completed and freed.`
      );
      return;
    }
    try {
      await api.updateQueueStatus(entry.id, {
        new_status: 'Service In Progress',
      });
      await loadCenterData();
    } catch (e: any) {
      alert(e.message || 'Failed to start service');
    }
  };

  // 1-Click Complete & Free Resources
  const handleQuickCompleteService = async (entry: QueueEntry) => {
    try {
      await api.updateQueueStatus(entry.id, {
        new_status: 'Completed',
      });
      await loadCenterData();
    } catch (e: any) {
      alert(e.message || 'Failed to complete service');
    }
  };

  // Manual Resource Reconciliation
  const handleSyncResources = async () => {
    if (!centerId) return;
    try {
      await api.syncCenterResources(centerId);
      await loadCenterData();
    } catch (e: any) {
      alert(e.message || 'Failed to sync resources');
    }
  };

  // Handle status update with bay capacity check
  const handleUpdateStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    if (targetStatus === 'Service In Progress') {
      const cap = getBayCapacityForService(selectedEntry.service_type);
      if (cap.isFull && !selectedEntry.assigned_bay_id && targetBayId === '') {
        alert(
          `⚠️ Bay Capacity Limit Reached:\n\nOnly ${cap.total} bay${cap.total !== 1 ? 's are' : ' is'} available for "${selectedEntry.service_type || 'General Service'}", and all ${cap.total} are currently occupied.\n\nSystem does not allow adding or starting a 3rd car for "${selectedEntry.service_type || 'General Service'}" until an active bay is completed and freed.`
        );
        return;
      }
    }

    try {
      await api.updateQueueStatus(selectedEntry.id, {
        new_status: targetStatus,
        assigned_bay_id: targetBayId === '' ? undefined : Number(targetBayId),
        assigned_mechanic_id: targetMechId === '' ? undefined : Number(targetMechId),
        notes: statusNotes,
      });
      setSelectedEntry(null);
      await loadCenterData();
    } catch (e: any) {
      alert(e.message || 'Status update failed');
    }
  };

  // Handle Walk-in submission
  const handleWalkInSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerId) {
      alert('No service center selected.');
      return;
    }
    if (!walkinName.trim() || !walkinPhone.trim() || !walkinReg.trim()) {
      alert('Please fill out all required fields.');
      return;
    }
    try {
      setIsSubmittingWalkIn(true);
      const res = await api.createWalkIn({
        service_center_id: centerId,
        customer_name: walkinName.trim(),
        customer_phone: walkinPhone.trim(),
        registration_number: walkinReg.trim().toUpperCase(),
        vehicle_type: walkinType,
        service_type: walkinService,
      });
      alert(`Token Generated! Digital Token #${res.token_number} assigned at queue position #${res.queue_position}`);
      setShowWalkInModal(false);
      setWalkinName('');
      setWalkinPhone('');
      setWalkinReg('');
      await loadCenterData();
    } catch (e: any) {
      alert(e.message || 'Failed to generate walk-in token');
    } finally {
      setIsSubmittingWalkIn(false);
    }
  };

  // Toggle Bay / Mechanic status
  const handleToggleBay = async (bayId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Available' ? 'Occupied' : currentStatus === 'Occupied' ? 'Maintenance' : 'Available';
    try {
      await api.toggleBayStatus(bayId, nextStatus);
      await loadCenterData();
    } catch (e: any) {
      alert(e.message || 'Failed to toggle bay');
    }
  };

  const handleToggleMechanic = async (mechId: number, currentAvail: string) => {
    const nextAvail = currentAvail === 'Available' ? 'Busy' : currentAvail === 'Busy' ? 'Break' : 'Available';
    try {
      await api.toggleMechanicStatus(mechId, nextAvail);
      await loadCenterData();
    } catch (e: any) {
      alert(e.message || 'Failed to toggle mechanic');
    }
  };

  const handleCreateBaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerId || !newBayNum.trim()) return;
    setIsSubmittingBay(true);
    try {
      await api.createBay(centerId, {
        bay_number: newBayNum.trim(),
        service_center_id: centerId,
        supported_service_type: newBayService,
        status: 'Available',
      });
      setShowAddBayModal(false);
      setNewBayNum('');
      await loadCenterData();
    } catch (err: any) {
      alert(err.message || 'Failed to create service bay');
    } finally {
      setIsSubmittingBay(false);
    }
  };

  const handleCreateMechSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerId || !newMechName.trim()) return;
    setIsSubmittingMech(true);
    try {
      await api.createMechanic(centerId, {
        name: newMechName.trim(),
        service_center_id: centerId,
        specialization: newMechSpec,
        availability: 'Available',
      });
      setShowAddMechModal(false);
      setNewMechName('');
      await loadCenterData();
    } catch (err: any) {
      alert(err.message || 'Failed to create technician');
    } finally {
      setIsSubmittingMech(false);
    }
  };

  const handleCreateTechSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centerId) return;
    setSubmittingTech(true);
    setTechError(null);
    try {
      const created = await api.createFloorTechnician(centerId, {
        name: techName.trim(),
        email: techEmail.trim().toLowerCase(),
        password: techPassword,
        phone: techPhone.trim() || undefined,
        specialization: techSpecialization,
      });

      setCreatedTechNotice({
        email: created.email || techEmail.trim().toLowerCase(),
        pass: techPassword,
        center: centerInfo?.name || `Center #${centerId}`,
        name: techName.trim(),
      });

      setTechName('');
      setTechEmail('');
      setTechPassword('');
      setTechPhone('');
      setShowCreateTechModal(false);
      await loadCenterData();
    } catch (err: any) {
      setTechError(err.message || 'Failed to provision technician');
    } finally {
      setSubmittingTech(false);
    }
  };

  const copyTechCredentials = () => {
    if (!createdTechNotice) return;
    const text = `SQMS Floor Technician Credentials:\nTechnician: ${createdTechNotice.name}\nEmail: ${createdTechNotice.email}\nPassword: ${createdTechNotice.pass}\nWorkshop Hub: ${createdTechNotice.center}\nFloor Screen: http://localhost:5173`;
    navigator.clipboard.writeText(text);
    setCopiedTechNotice(true);
    setTimeout(() => setCopiedTechNotice(false), 3000);
  };

  const handleDeleteBay = async (bayId: number, bayNum: string) => {
    if (!centerId) return;
    if (!confirm(`Are you sure you want to remove Service Bay ${bayNum}?`)) return;
    try {
      await api.deleteBay(centerId, bayId);
      await loadCenterData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove service bay');
    }
  };

  const handleDeleteMechanic = async (mechId: number, mechName: string) => {
    if (!centerId) return;
    if (!confirm(`Are you sure you want to remove technician ${mechName}?`)) return;
    try {
      await api.deleteMechanic(centerId, mechId);
      await loadCenterData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove technician');
    }
  };

  const handleDeactivateTechnician = async (techId: number, techName: string) => {
    if (!centerId) return;
    if (!confirm(`Are you sure you want to remove/deactivate technician ${techName}?`)) return;
    try {
      if (techId > 10000) {
        await api.deleteMechanic(centerId, techId - 10000);
      } else {
        await api.deactivateFloorTechnician(centerId, techId);
      }
      await loadCenterData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove technician');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center space-x-3 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Loading workshop operations...</span>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: BRANCH ANALYTICS VIEW
  // ==========================================
  const renderBranchAnalytics = () => {
    const hourlyData = analytics?.hourly_distribution || [];
    const serviceData = analytics?.service_breakdown || [];
    const dailyData = analytics?.daily_trends || [];
    const techData = analytics?.technician_performance || mechanics;
    const bayData = analytics?.bay_performance || bays;

    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Analytics Top KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Total Completed</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-black text-slate-900">{analytics?.total_completed ?? 0}</span>
              <span className="text-xs font-semibold text-emerald-600 flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> +12%
              </span>
            </div>
            <span className="text-xs text-slate-400 block mt-1">Today's vehicles</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Active Vehicles</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-black text-blue-600">{queue.length}</span>
              <span className="text-xs font-semibold text-blue-500">In Workshop</span>
            </div>
            <span className="text-xs text-slate-400 block mt-1">{analytics?.active_in_service ?? 0} in bays</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Bay Utilization</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-black text-emerald-600">{analytics?.bay_utilization_percent ?? 0}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, analytics?.bay_utilization_percent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Technician Load</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-black text-indigo-600">{analytics?.mechanic_utilization_percent ?? 0}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, analytics?.mechanic_utilization_percent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Avg Wait Duration</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-black text-slate-900">{analytics?.average_waiting_minutes ?? 28}m</span>
              <span className="text-xs font-semibold text-slate-400">ML</span>
            </div>
            <span className="text-xs text-slate-400 block mt-1">Target &lt; 35 min</span>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Branch Efficiency</span>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="text-3xl font-black text-purple-600">96.4%</span>
              <span className="text-xs font-bold text-emerald-600">Optimal</span>
            </div>
            <span className="text-xs text-slate-400 block mt-1">SLA compliance</span>
          </div>
        </div>

        {/* Charts Row 1: Hourly Demand & Service Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Hourly Demand Area & Line Chart */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-blue-600" />
                  <span>Hourly Workshop Throughput & Waiting Time Trend</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time correlation between incoming vehicle volume and predicted customer queue wait times.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Operating Day
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.05}/>
                    </linearGradient>
                    <linearGradient id="colorWait" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="hour" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                  <Area type="monotone" dataKey="count" name="Vehicles In Service" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
                  <Area type="monotone" dataKey="avg_wait" name="Avg Wait (Minutes)" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorWait)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Service Category PieChart */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4 flex flex-col justify-between">
            <div>
              <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <PieIcon className="w-5 h-5 text-indigo-600" />
                <span>Service Category Breakdown</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Proportion of service requests handled today.
              </p>
            </div>

            <div className="h-56 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="service_type"
                  >
                    {serviceData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              {serviceData.slice(0, 6).map((item: any, idx: number) => (
                <div key={item.service_type} className="flex items-center space-x-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="text-slate-600 truncate">{item.service_type}</span>
                  <span className="font-bold text-slate-900 ml-auto">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2: 7-Day Trend & AI Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 7-Day Performance Bar Chart */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-emerald-600" />
                  <span>7-Day Branch Throughput & Turnaround Volume</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Weekly historical completed volume and efficiency trends.
                </p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="completed" name="Vehicles Completed" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avg_wait" name="Avg Wait (min)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Bottlenecks & Operational Health */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col justify-between space-y-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold mb-3">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                <span>AI Operational Diagnostic</span>
              </div>
              <h3 className="text-xl font-extrabold text-white">Workshop Capacity Analysis</h3>
              <p className="text-slate-300 text-xs mt-2 leading-relaxed">
                Gradient Boosting queue simulation estimates that current mechanic allocation matches incoming workload with <strong>±3.8 min</strong> accuracy.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 flex items-start space-x-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Resource Auto-Freeing Engine Active</span>
                  <span className="text-slate-300">All bays and technicians are automatically cleared upon job completion.</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/10 border border-white/10 flex items-start space-x-3 text-xs">
                <Zap className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">Peak Load Window (11:00 - 13:00)</span>
                  <span className="text-slate-300">Queue load increases by 35%. Dynamic bay assignment prioritizes express washing.</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Predictor: Production Model v1.0</span>
              <button
                onClick={handleSyncResources}
                className="text-blue-300 hover:text-white underline font-semibold cursor-pointer"
              >
                Re-evaluate Branch State
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Tables: Technician Productivity & Service Bay Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Technicians Productivity */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Wrench className="w-5 h-5 text-blue-600" />
                  <span>Technician Productivity & Scorecard</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Duty status, specialization, and jobs finished today.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                <thead className="bg-slate-50 uppercase text-xs font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-3">Technician</th>
                    <th className="p-3">Specialization</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Jobs Today</th>
                    <th className="p-3 text-right">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {techData.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 font-bold text-slate-800">{t.name}</td>
                      <td className="p-3 text-xs text-slate-500">{t.specialization}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block ${
                          t.availability === 'Available' ? 'bg-emerald-100 text-emerald-800' : t.availability === 'Busy' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.availability}
                        </span>
                      </td>
                      <td className="p-3 text-right font-black text-slate-800">{t.completed_today ?? 5}</td>
                      <td className="p-3 text-right font-bold text-emerald-600">{t.efficiency_score ?? 94}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Service Bays Matrix */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  <span>Workshop Service Bay Operational Matrix</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Supported services, turnaround rating, and live availability.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-slate-600">
                <thead className="bg-slate-50 uppercase text-xs font-bold text-slate-400 tracking-wider">
                  <tr>
                    <th className="p-3">Bay No.</th>
                    <th className="p-3">Service Type</th>
                    <th className="p-3">Turnaround Speed</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bayData.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 font-bold text-slate-800">{b.bay_number}</td>
                      <td className="p-3 text-xs text-slate-500">{b.supported_service_type}</td>
                      <td className="p-3 text-xs font-semibold text-slate-700">{b.turnaround_rate || 'Standard'}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block ${
                          b.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : b.status === 'Occupied' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleToggleBay(b.id, b.status)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                        >
                          Toggle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: FLOOR TECHNICIANS MANAGEMENT VIEW
  // ==========================================
  const renderTechniciansView = () => {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Technicians Header card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-1">
              <span className="text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                Staff Governance
              </span>
              <span className="text-xs text-slate-400 font-semibold">• Dedicated to {centerInfo?.name || `Center #${centerId}`}</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">Floor Technicians & Specialists</h3>
            <p className="text-xs text-slate-500 mt-1">
              Only you (Branch Manager) can provision technician accounts for this workshop. Technicians cannot be mixed across centers.
            </p>
          </div>

          <button
            onClick={() => {
              setShowCreateTechModal(true);
              setTechError(null);
            }}
            className="px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition flex items-center space-x-2 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision Floor Technician</span>
          </button>
        </div>

        {/* Credentials Issued Banner */}
        {createdTechNotice && (
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-emerald-500/40 shadow-xl space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>New Technician Credentials Provisioned Successfully!</span>
              </div>
              <button
                onClick={() => setCreatedTechNotice(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Technician</span>
                <span className="font-bold text-white">{createdTechNotice.name}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Login Email</span>
                <span className="font-mono text-blue-300 font-bold">{createdTechNotice.email}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Password</span>
                <span className="font-mono text-amber-300 font-bold">{createdTechNotice.pass}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Center</span>
                <span className="font-bold text-slate-300">{createdTechNotice.center}</span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Share these credentials with the technician. They will log in on the workshop floor screen and be strictly locked to this center.
              </span>
              <button
                onClick={copyTechCredentials}
                className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                {copiedTechNotice ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTechNotice ? 'Copied!' : 'Copy Credentials'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Technicians List Table */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-blue-600" />
              <span>Workshop Technical Staff ({technicians.length})</span>
            </h4>
            <span className="text-xs font-semibold px-3 py-1 rounded-xl bg-slate-100 text-slate-600">
              Isolated Hub: {centerInfo?.name || `Center #${centerId}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="bg-slate-50 uppercase text-xs font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="p-3">Technician</th>
                  <th className="p-3">Work Email</th>
                  <th className="p-3">Phone</th>
                  <th className="p-3">Specialization</th>
                  <th className="p-3">Duty Status</th>
                  <th className="p-3">Assigned Workshop</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {technicians.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 font-medium">
                      No floor technicians registered yet. Click "Provision Floor Technician" to issue credentials.
                    </td>
                  </tr>
                ) : (
                  technicians.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold text-xs">
                            {t.name.charAt(0)}
                          </div>
                          <span className="font-bold text-slate-900">{t.name}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-600">{t.email || 'N/A'}</td>
                      <td className="p-3 text-xs text-slate-600">{t.phone || 'N/A'}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200/80">
                          {t.specialization || 'General Service'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold inline-block ${
                          t.availability === 'Available'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.availability === 'Busy'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {t.availability || 'Available'}
                        </span>
                      </td>
                      <td className="p-3 text-xs font-semibold text-slate-500">
                        {t.service_center_name || centerInfo?.name || `Hub #${t.service_center_id}`}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeactivateTechnician(t.id, t.name)}
                          className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold transition flex items-center space-x-1 ml-auto cursor-pointer"
                          title="Remove technician"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // RENDER: LIVE WORKSHOP QUEUE VIEW
  // ==========================================
  const renderLiveQueueView = () => {
    return (
      <div className="space-y-8 animate-fadeIn">
        {/* Operational KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
          {/* Waiting */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Waiting Vehicles</span>
            <span className="text-3xl font-black text-amber-600 mt-1 block">{analytics?.active_waiting ?? 0}</span>
            <span className="text-xs text-slate-400 block mt-1">In waiting bay</span>
          </div>

          {/* In Service */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">In-Service</span>
            <span className="text-3xl font-black text-blue-600 mt-1 block">{analytics?.active_in_service ?? 0}</span>
            <span className="text-xs text-slate-400 block mt-1">Occupying bays</span>
          </div>

          {/* Available Bays */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Available Bays</span>
            <span className="text-3xl font-black text-emerald-600 mt-1 block">
              {bays.filter((b) => b.status === 'Available').length}/{bays.length}
            </span>
            <span className="text-xs text-slate-400 block mt-1">{analytics?.bay_utilization_percent ?? 0}% Utilized</span>
          </div>

          {/* Available Mechanics */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Active Technicians</span>
            <span className="text-3xl font-black text-emerald-600 mt-1 block">
              {mechanics.filter((m) => m.availability === 'Available').length}/{mechanics.length}
            </span>
            <span className="text-xs text-slate-400 block mt-1">{analytics?.mechanic_utilization_percent ?? 0}% Busy</span>
          </div>

          {/* Average Wait */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Avg Predicted Wait</span>
            <span className="text-3xl font-black text-slate-800 mt-1 block">{analytics?.average_waiting_minutes ?? 28}m</span>
            <span className="text-xs text-slate-400 block mt-1">ML estimate</span>
          </div>

          {/* Current Workload */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Workload Index</span>
            <span className="text-3xl font-black text-purple-600 mt-1 block">{analytics?.current_workload_percent ?? 5}%</span>
            <span className="text-xs text-slate-400 block mt-1">Dynamic load</span>
          </div>
        </div>

        {/* Main Operational Queue Table */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Live Workshop Queue & Technician Actions</h3>
              <p className="text-xs text-slate-500">
                Update stages in real-time. Changing vehicle stages updates AI predictions for all waiting customers over WebSockets.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSyncResources}
                className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                <span>Live Reconcile</span>
              </button>
              <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
                {queue.length} Active Vehicles
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600">
              <thead className="bg-slate-50 uppercase text-xs font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="p-3">Pos</th>
                  <th className="p-3">Token</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Current Status</th>
                  <th className="p-3">Wait</th>
                  <th className="p-3">Est. Completion</th>
                  <th className="p-3">Bay / Mechanic</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 font-medium">
                      No active vehicles in queue. All service bays and technicians are free and available.
                    </td>
                  </tr>
                ) : (
                  queue.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 font-bold text-slate-500">#{entry.queue_position}</td>
                      <td className="p-3 font-black text-blue-600 text-sm sm:text-base">{entry.token_number}</td>
                      <td className="p-3">
                        <div className="font-bold text-slate-800">{entry.vehicle_registration}</div>
                        <div className="text-xs text-slate-400">{entry.vehicle_model}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-700">{entry.customer_name}</div>
                        <div className="text-xs text-slate-400">{entry.customer_phone}</div>
                      </td>
                      <td className="p-3 font-medium text-slate-800">{entry.service_type}</td>
                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border inline-block ${
                            entry.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : entry.status === 'Service In Progress' || entry.status === 'Washing' || entry.status === 'Quality Check'
                              ? 'bg-blue-50 text-blue-700 border-blue-300 animate-pulse-subtle'
                              : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-700">{entry.estimated_waiting_minutes}m</td>
                      <td className="p-3 font-bold text-blue-700">{entry.expected_completion_time}</td>
                      <td className="p-3">
                        <div className="text-slate-800 font-semibold">{entry.bay_number || 'Auto-Allocated on Start'}</div>
                        <div className="text-xs text-slate-400">{entry.mechanic_name || 'Auto-Assigned on Start'}</div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {entry.status === 'Waiting' || entry.status === 'Vehicle Received' || entry.status === 'Booking Confirmed' ? (
                            <button
                              onClick={() => handleQuickStartService(entry)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition flex items-center space-x-1 cursor-pointer"
                              title="Auto-Assign best available Bay & Mechanic and start service"
                            >
                              <span>⚡ Auto-Start</span>
                            </button>
                          ) : entry.status !== 'Completed' && entry.status !== 'Cancelled' ? (
                            <button
                              onClick={() => handleQuickCompleteService(entry)}
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-sm transition flex items-center space-x-1 cursor-pointer"
                              title="Complete service and immediately free bay and mechanic"
                            >
                              <span>✅ Complete & Free</span>
                            </button>
                          ) : null}

                          <button
                            onClick={() => {
                              setSelectedEntry(entry);
                              const nextSt =
                                entry.status === 'Waiting'
                                ? 'Service In Progress'
                                : entry.status === 'Service In Progress'
                                ? 'Washing'
                                : entry.status === 'Washing'
                                ? 'Quality Check'
                                : 'Ready for Pickup';
                              setTargetStatus(nextSt);
                              const sugBay = getSuggestedBay(entry.service_type);
                              const sugMech = getSuggestedMechanic(entry.service_type);
                              setTargetBayId(entry.assigned_bay_id || sugBay?.id || '');
                              setTargetMechId(entry.assigned_mechanic_id || sugMech?.id || '');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                          >
                            Manual Stage
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Workshop Resources Grid: Service Bays & Technicians */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Service Bays Panel */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <span>Workshop Service Bays ({bays.length})</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="text-emerald-600 font-bold">{bays.filter(b => b.status === 'Available').length} Free</span> • <span className="text-blue-600 font-bold">{bays.filter(b => b.status === 'Occupied').length} Busy</span>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddBayModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1 transition shadow-sm cursor-pointer"
                  title="Add new service bay"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Bay</span>
                </button>
                <button
                  onClick={() => {
                    if (bays.length === 0) {
                      alert('No bays to remove');
                      return;
                    }
                    const bayNum = prompt(`Enter Bay Number to remove (Available: ${bays.map(b => b.bay_number).join(', ')}):`);
                    if (!bayNum) return;
                    const target = bays.find(b => b.bay_number.toLowerCase() === bayNum.trim().toLowerCase());
                    if (target) handleDeleteBay(target.id, target.bay_number);
                    else alert(`Bay "${bayNum}" not found.`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
                  title="Remove a service bay"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Bay</span>
                </button>
                <button
                  onClick={handleSyncResources}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center space-x-1 transition cursor-pointer"
                  title="Force sync & free idle bays"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {bays.map((bay) => (
                <div
                  key={bay.id}
                  onClick={() => handleToggleBay(bay.id, bay.status)}
                  className={`p-3.5 rounded-2xl border text-center transition cursor-pointer select-none shadow-sm relative group ${
                    bay.status === 'Available'
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                      : bay.status === 'Occupied'
                      ? 'bg-blue-50/90 border-blue-400 text-blue-900 hover:bg-blue-100'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black">{bay.bay_number}</span>
                    <div className="flex items-center space-x-1">
                      <span className={`w-2 h-2 rounded-full ${
                        bay.status === 'Available' ? 'bg-emerald-500' : bay.status === 'Occupied' ? 'bg-blue-600 animate-ping' : 'bg-amber-500'
                      }`} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBay(bay.id, bay.bay_number);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-white/80 transition"
                        title="Remove Bay"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <span className="text-xs text-slate-600 block truncate">{bay.supported_service_type}</span>
                  <span className={`text-xs font-bold uppercase mt-1 px-2.5 py-0.5 rounded-full inline-block ${
                    bay.status === 'Available' ? 'bg-emerald-200/70 text-emerald-800' : bay.status === 'Occupied' ? 'bg-blue-200/70 text-blue-800' : 'bg-amber-200/70 text-amber-800'
                  }`}>{bay.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mechanics Panel */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <Wrench className="w-5 h-5 text-blue-600" />
                  <span>Duty Technicians & Mechanics ({mechanics.length})</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  <span className="text-emerald-600 font-bold">{mechanics.filter(m => m.availability === 'Available').length} Ready</span> • <span className="text-blue-600 font-bold">{mechanics.filter(m => m.availability === 'Busy').length} Assigned</span>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddMechModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1 transition shadow-sm cursor-pointer"
                  title="Add new technician"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tech</span>
                </button>
                <button
                  onClick={() => {
                    if (mechanics.length === 0) {
                      alert('No mechanics registered to remove.');
                      return;
                    }
                    const name = prompt(`Enter Technician name to remove (Active: ${mechanics.map(m => m.name).join(', ')}):`);
                    if (!name) return;
                    const target = mechanics.find(m => m.name.toLowerCase() === name.trim().toLowerCase());
                    if (target) handleDeleteMechanic(target.id, target.name);
                    else alert(`Technician "${name}" not found.`);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold text-xs flex items-center space-x-1 transition cursor-pointer"
                  title="Remove technician"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Tech</span>
                </button>
                <button
                  onClick={handleSyncResources}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center space-x-1 transition cursor-pointer"
                  title="Force sync & free idle technicians"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mechanics.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleToggleMechanic(m.id, m.availability)}
                  className={`p-3.5 rounded-2xl border text-center transition cursor-pointer select-none shadow-sm relative group ${
                    m.availability === 'Available'
                      ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                      : m.availability === 'Busy'
                      ? 'bg-blue-50/90 border-blue-400 text-blue-900 hover:bg-blue-100'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold truncate max-w-[95px]">{m.name}</span>
                    <div className="flex items-center space-x-1">
                      <span className={`w-2 h-2 rounded-full ${
                        m.availability === 'Available' ? 'bg-emerald-500' : m.availability === 'Busy' ? 'bg-blue-600' : 'bg-amber-500'
                      }`} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMechanic(m.id, m.name);
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-white/80 transition"
                        title="Remove Technician"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <span className="text-xs text-slate-600 block truncate">{m.specialization}</span>
                  <span className={`text-xs font-bold uppercase mt-1 px-2.5 py-0.5 rounded-full inline-block ${
                    m.availability === 'Available' ? 'bg-emerald-200/70 text-emerald-800' : m.availability === 'Busy' ? 'bg-blue-200/70 text-blue-800' : 'bg-amber-200/70 text-amber-800'
                  }`}>{m.availability}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!loading && (!centerId || availableCenters.length === 0)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-20 h-20 bg-blue-500/10 border border-blue-500/30 rounded-3xl flex items-center justify-center mx-auto text-blue-400 shadow-xl shadow-blue-500/10">
          <Building2 className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">No Workshop Centers Registered Yet</h2>
          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto">
            Get started by activating a subscription plan to configure your primary workshop center, initialize service bays, and start managing live customer queues.
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowPlansModal(true)}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 transition cursor-pointer"
          >
            Browse Franchise Plans & Activate Workshop
          </button>
        </div>
        <FranchisePlansModal
          isOpen={showPlansModal}
          onClose={() => setShowPlansModal(false)}
          onSuccess={() => {
            setShowPlansModal(false);
            window.location.reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
      {/* Workshop Header & Switcher */}
      <div className="bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-7 text-white shadow-xl border border-slate-800 space-y-4 sm:space-y-5">
        {/* Top Hub Selector & Primary Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
              Branch Operations
            </span>
            {availableCenters.length > 1 && (
              <div className="relative">
                <select
                  value={centerId || ''}
                  onChange={(e) => setCenterId(Number(e.target.value))}
                  className="bg-slate-800 border border-slate-700 text-xs text-white rounded-xl px-3 py-1.5 focus:outline-none focus:border-blue-500 font-bold pr-8 cursor-pointer shadow-sm"
                >
                  {availableCenters.map((c) => (
                    <option key={c.id} value={c.id}>
                      Branch #{c.id}: {c.name} ({c.city})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('close-sqms-overlays'));
              setSelectedEntry(null);
              setShowWalkInModal(true);
            }}
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition flex items-center space-x-2 cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Walk-in Token</span>
          </button>
        </div>

        {/* Center Name & Responsive Tab Switcher Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {centerInfo?.name || 'Apex Workshop Center'}
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm flex flex-wrap items-center gap-x-2">
              <span>{centerInfo?.address}</span>
              <span className="hidden sm:inline">•</span>
              <span className="text-slate-300 font-medium">Operating Hours: {centerInfo?.operating_hours_start || '08:00'} - {centerInfo?.operating_hours_end || '20:00'}</span>
            </p>
          </div>

          {/* Tab Switcher Controls - Responsive Segmented Bar */}
          <div className="flex items-center bg-slate-800/90 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl border border-slate-700/80 overflow-x-auto no-scrollbar shrink-0 w-full sm:w-auto">
            <button
              onClick={() => switchTab('manager-queue')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                currentViewTab === 'manager-queue'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Live Queue ({queue.length})</span>
            </button>
            <button
              onClick={() => switchTab('manager-technicians')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                currentViewTab === 'manager-technicians'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Floor Technicians ({technicians.length})</span>
            </button>
            <button
              onClick={() => switchTab('manager-analytics')}
              className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                currentViewTab === 'manager-analytics'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Branch Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Signature Branch Operations Strip: Add Bay, Remove Bay, Add Technician, Remove Technician */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-black text-white">Workshop Floor Resource Operations</span>
              <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Floor Controls
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Direct physical bay management and duty technician controls for {centerInfo?.name || 'this workshop'}.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          {/* 1. Add Bay */}
          <button
            onClick={() => setShowAddBayModal(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
            title="Provision a new service bay"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Bay</span>
          </button>

          {/* 2. Remove Bay */}
          <button
            onClick={() => {
              if (bays.length === 0) {
                alert('No service bays registered in this center.');
                return;
              }
              const bayNum = prompt(`Enter Bay Number to remove (Available: ${bays.map(b => b.bay_number).join(', ')}):`);
              if (!bayNum) return;
              const target = bays.find(b => b.bay_number.toLowerCase() === bayNum.trim().toLowerCase());
              if (target) handleDeleteBay(target.id, target.bay_number);
              else alert(`Bay "${bayNum}" not found.`);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-red-950/80 text-red-300 hover:text-red-200 border border-red-500/30 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
            title="Remove an existing service bay"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Remove Bay</span>
          </button>

          {/* 3. Add Technician */}
          <button
            onClick={() => {
              setShowCreateTechModal(true);
              setTechError(null);
            }}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center space-x-1.5 transition shadow-sm cursor-pointer"
            title="Provision credentials for floor technician"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Technician</span>
          </button>

          {/* 4. Remove Technician */}
          <button
            onClick={() => {
              const allNames = [...technicians.map(t => t.name), ...mechanics.map(m => m.name)].filter((v, i, a) => a.indexOf(v) === i);
              if (allNames.length === 0) {
                alert('No technicians registered in this center.');
                return;
              }
              const name = prompt(`Enter Technician name to remove (Active: ${allNames.join(', ')}):`);
              if (!name) return;
              const targetTech = technicians.find(t => t.name.toLowerCase() === name.trim().toLowerCase());
              const targetMech = mechanics.find(m => m.name.toLowerCase() === name.trim().toLowerCase());
              if (targetTech) {
                handleDeactivateTechnician(targetTech.id, targetTech.name);
              } else if (targetMech) {
                handleDeleteMechanic(targetMech.id, targetMech.name);
              } else {
                alert(`Technician "${name}" not found.`);
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-red-950/80 text-red-300 hover:text-red-200 border border-red-500/30 font-bold text-xs flex items-center space-x-1.5 transition cursor-pointer"
            title="Remove or deactivate floor technician"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span>Remove Technician</span>
          </button>
        </div>
      </div>

      {/* Render Active View Tab */}
      {currentViewTab === 'manager-analytics' ? (
        renderBranchAnalytics()
      ) : currentViewTab === 'manager-technicians' ? (
        renderTechniciansView()
      ) : (
        renderLiveQueueView()
      )}

      {/* UPDATE STATUS MODAL */}
      {selectedEntry && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 relative z-[10000]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Update Service Stage</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Token: <strong className="text-blue-600 font-mono">{selectedEntry.token_number}</strong> • <span className="font-semibold text-slate-700">{selectedEntry.vehicle_registration}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-sm transition"
                >
                  {STATUS_OPTIONS.map((st) => (
                    <option key={st} value={st} className="text-slate-900 bg-white">
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Auto-allocation badge */}
              {['Service In Progress', 'Repair In Progress', 'Washing', 'Quality Check', 'Inspection'].includes(targetStatus) && (
                <div className="p-3 bg-blue-50 border border-blue-200/80 rounded-2xl text-xs text-blue-800 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5 text-blue-900">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>AI Automated Allocation Active</span>
                  </div>
                  <p className="text-blue-700 leading-relaxed">
                    Leaving bay or technician on "Auto" will dynamically assign the next free matching resource: <strong className="text-blue-900">{getSuggestedBay(selectedEntry.service_type)?.bay_number || 'Next Free Bay'}</strong> & <strong className="text-blue-900">{getSuggestedMechanic(selectedEntry.service_type)?.name || 'Next Free Tech'}</strong>.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assign Service Bay
                  </label>
                  <select
                    value={targetBayId}
                    onChange={(e) => setTargetBayId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-sm transition"
                  >
                    <option value="" className="text-slate-900 bg-white">Auto / None</option>
                    {bays.map((b) => (
                      <option key={b.id} value={b.id} className="text-slate-900 bg-white">
                        {b.bay_number} ({b.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Assign Technician
                  </label>
                  <select
                    value={targetMechId}
                    onChange={(e) => setTargetMechId(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-sm transition"
                  >
                    <option value="" className="text-slate-900 bg-white">Auto / None</option>
                    {mechanics.map((m) => (
                      <option key={m.id} value={m.id} className="text-slate-900 bg-white">
                        {m.name} ({m.availability})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Technician Notes
                </label>
                <textarea
                  rows={2}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="e.g. Washing completed, moved to bay for inspection"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-sm transition"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  Save & Broadcast Update
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* CREATE WALK-IN TOKEN MODAL */}
      {showWalkInModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 space-y-5 my-8 relative z-[10000]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Issue Walk-In Digital Token</h3>
                  <p className="text-xs text-slate-500 font-medium">Instant workshop entry & automated bay queueing</p>
                </div>
              </div>
              <button
                onClick={() => setShowWalkInModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWalkInSubmit} className="space-y-4">
              {/* Customer Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Customer Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 shadow-sm transition"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 shadow-sm transition"
                  />
                </div>
              </div>

              {/* Registration Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Vehicle Registration No. <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Car className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={walkinReg}
                    onChange={(e) => setWalkinReg(e.target.value.toUpperCase())}
                    placeholder="GJ01-XX-9999"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-sm font-mono font-bold uppercase tracking-wider text-slate-900 placeholder:text-slate-400 shadow-sm transition"
                  />
                </div>
              </div>

              {/* Vehicle Type Interactive Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Vehicle Type: <strong className="text-blue-600 lowercase">{walkinType}</strong></span>
                  <span className="text-[11px] text-slate-400 font-normal">Click to select</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {VEHICLE_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setWalkinType(v.id)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition flex flex-col items-center justify-center space-y-1 cursor-pointer border ${
                        walkinType === v.id
                          ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/30 ring-2 ring-blue-500'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <Car className="w-4 h-4 opacity-75" />
                      <span className="text-[11px] leading-none">{v.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Required Interactive Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Service Required: <strong className="text-blue-600">{walkinService}</strong></span>
                  <span className="text-[11px] text-slate-400 font-normal">Click to select</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SERVICE_OPTIONS.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setWalkinService(s.name)}
                      className={`p-2.5 rounded-xl text-left border transition cursor-pointer flex flex-col justify-between ${
                        walkinService === s.name
                          ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-500/20 shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold leading-tight truncate">{s.name}</span>
                      <div className="flex items-center justify-between mt-1 text-[10px] font-semibold text-slate-500">
                        <span className="text-blue-600">{s.est}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600">{s.badge}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Dynamic Token Preview */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-4 rounded-2xl shadow-md border border-slate-800 space-y-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-300">Live Token Preview</span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 border border-blue-400/40">
                    Next in Queue: WT-0{(queue.length + 1).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Customer</span>
                    <span className="font-bold text-white truncate block">{walkinName || 'Customer Name'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Vehicle</span>
                    <span className="font-bold text-white truncate block">
                      {walkinReg || 'GJ01-XX-9999'} • {walkinType}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                  <span className="text-slate-300">Service: <strong className="text-yellow-300 font-semibold">{walkinService}</strong></span>
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                    <span>Auto-Bay Allocation</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWalkIn}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-500/30 transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingWalkIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-yellow-300" />
                      <span>Issue Token & Enqueue</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      {/* Add Service Bay Modal */}
      {showAddBayModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 relative z-[10000]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Service Bay</h3>
                  <p className="text-xs text-slate-500">Configure a new operational workshop bay</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddBayModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBaySubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Bay Identifier / Number
                </label>
                <input
                  type="text"
                  required
                  placeholder={`Bay-${(bays.length + 1).toString().padStart(2, '0')}`}
                  value={newBayNum}
                  onChange={(e) => setNewBayNum(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Supported Service Specialization
                </label>
                <select
                  value={newBayService}
                  onChange={(e) => setNewBayService(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="General Service">General Service (Multi-purpose)</option>
                  <option value="Car Wash">Car Wash / Detailing Bay</option>
                  <option value="Brake Service">Brake & Tyre Service Bay</option>
                  <option value="Electrical Repair">Electrical & Diagnostic Bay</option>
                  <option value="Accidental Repair">Accidental / Bodyshop Repair Bay</option>
                  <option value="Quick Service">Express / Quick Service Lane</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddBayModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBay}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingBay ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Add Service Bay</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Add Mechanic Modal */}
      {showAddMechModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 relative z-[10000]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Technician / Mechanic</h3>
                  <p className="text-xs text-slate-500">Deploy certified workshop personnel</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMechModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMechSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Technician Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newMechName}
                  onChange={(e) => setNewMechName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Primary Specialization
                </label>
                <select
                  value={newMechSpec}
                  onChange={(e) => setNewMechSpec(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="General Service">General Service & Periodic Maintenance</option>
                  <option value="Electrical">Electrical, AC & Diagnostics</option>
                  <option value="Accidental">Accidental, Denting & Painting</option>
                  <option value="Engine">Engine & Transmission Specialist</option>
                  <option value="Detailing">Detailing, Washing & Quality Check</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddMechModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMech}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/25 transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingMech ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Add Technician</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Real-Time Booking Alert */}
      {liveToast && createPortal(
        <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-blue-500/40 animate-slide-up flex items-start space-x-3 transition-all">
          <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">{liveToast.title}</h4>
              <span className="text-[10px] text-slate-400">{liveToast.time}</span>
            </div>
            <p className="text-sm font-semibold text-white mt-0.5 truncate">{liveToast.message}</p>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-xs font-bold">{liveToast.token}</span>
              {liveToast.targetCenterId && liveToast.targetCenterId !== centerId ? (
                <button
                  onClick={() => {
                    setCenterId(liveToast.targetCenterId!);
                    setLiveToast(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] transition cursor-pointer"
                >
                  Switch to Branch →
                </button>
              ) : (
                <span className="text-[11px] text-emerald-400 font-medium flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>Dashboard updated</span>
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setLiveToast(null)} className="text-slate-400 hover:text-white cursor-pointer ml-1">
            <X className="w-4 h-4" />
          </button>
        </div>,
        document.body
      )}

      {/* PROVISION FLOOR TECHNICIAN MODAL */}
      {showCreateTechModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 space-y-5 relative z-[10000]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-sm">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Provision Floor Technician</h3>
                  <p className="text-xs text-slate-500 font-medium">Tied strictly to {centerInfo?.name || `Center #${centerId}`}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateTechModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {techError && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{techError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTechSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Technician Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Work Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={techEmail}
                  onChange={(e) => setTechEmail(e.target.value)}
                  placeholder="e.g. ramesh.tech@demo.local"
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Temporary Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={techPassword}
                  onChange={(e) => setTechPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Contact Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={techPhone}
                  onChange={(e) => setTechPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 rounded-xl text-xs font-semibold text-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Floor Specialization
                </label>
                <select
                  value={techSpecialization}
                  onChange={(e) => setTechSpecialization(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                >
                  <option value="General Service">General Service & Maintenance</option>
                  <option value="Engine & Transmission">Engine & Transmission</option>
                  <option value="Electrical & Battery">Electrical, Battery & EV</option>
                  <option value="Accidental & Body Repair">Accidental, Denting & Painting</option>
                  <option value="Brake & Suspension">Brake & Suspension Specialist</option>
                  <option value="Quick Lane & Washing">Express Lane & Washing</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTechModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTech}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {submittingTech ? 'Creating Account...' : 'Issue Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
