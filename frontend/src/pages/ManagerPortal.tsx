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
import { SelectDropdown } from '../components/SelectDropdown';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
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
  const [loading, setLoading] = useState<boolean>(false);
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

  // Remove Bay & Remove Technician Modal States
  const [showRemoveBayModal, setShowRemoveBayModal] = useState<boolean>(false);
  const [selectedRemoveBayId, setSelectedRemoveBayId] = useState<number | ''>('');
  const [showRemoveTechModal, setShowRemoveTechModal] = useState<boolean>(false);
  const [selectedRemoveTechId, setSelectedRemoveTechId] = useState<string>('');

  const isAnyModalOpen = Boolean(
    selectedEntry ||
    showWalkInModal ||
    showAddBayModal ||
    showAddMechModal ||
    showCreateTechModal ||
    showRemoveBayModal ||
    showRemoveTechModal ||
    showPlansModal
  );
  useLockBodyScroll(isAnyModalOpen);

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

  // Live real-time sync with 20s background interval + instant WebSocket event listener
  useEffect(() => {
    if (centerId) {
      loadCenterData();
      const interval = setInterval(() => {
        loadCenterData();
      }, 20000); // 20s background sync to prevent screen flickering
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
        `Bay Capacity Limit Reached:\n\nOnly ${cap.total} bay${cap.total !== 1 ? 's are' : ' is'} available for "${entry.service_type || 'General Service'}", and all ${cap.total} are currently occupied.\n\nSystem does not allow adding or starting a 3rd car for "${entry.service_type || 'General Service'}" until an active bay is completed and freed.`
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
          `Bay Capacity Limit Reached:\n\nOnly ${cap.total} bay${cap.total !== 1 ? 's are' : ' is'} available for "${selectedEntry.service_type || 'General Service'}", and all ${cap.total} are currently occupied.\n\nSystem does not allow adding or starting a 3rd car for "${selectedEntry.service_type || 'General Service'}" until an active bay is completed and freed.`
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
    const text = `DriveOps Floor Technician Credentials:\nTechnician: ${createdTechNotice.name}\nEmail: ${createdTechNotice.email}\nPassword: ${createdTechNotice.pass}\nWorkshop Hub: ${createdTechNotice.center}\nFloor Screen: http://localhost:5173`;
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

  if (loading && !centerInfo && queue.length === 0) {
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
          <div className="bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none">
            <span className="text-xs font-medium uppercase tracking-wider text-[#707070] block">Total Completed</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-3xl font-semibold text-[#1d1d1f]">{analytics?.total_completed ?? 0}</span>
              <span className="text-xs font-medium text-[#10b981] flex items-center">
                <ArrowUpRight className="w-3.5 h-3.5" /> +12%
              </span>
            </div>
            <span className="text-xs text-[#707070] block mt-1">Today's vehicles</span>
          </div>

          <div className="bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none">
            <span className="text-xs font-medium uppercase tracking-wider text-[#707070] block">Active Vehicles</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-3xl font-semibold text-[#0071e3]">{queue.length}</span>
              <span className="text-xs font-medium text-[#707070]">In Workshop</span>
            </div>
            <span className="text-xs text-[#707070] block mt-1">{analytics?.active_in_service ?? 0} in bays</span>
          </div>

          <div className="bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none">
            <span className="text-xs font-medium uppercase tracking-wider text-[#707070] block">Bay Utilization</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-3xl font-semibold text-[#1d1d1f]">{analytics?.bay_utilization_percent ?? 0}%</span>
            </div>
            <div className="w-full bg-[#f5f5f7] rounded-full h-1.5 mt-3 border border-[#e6e6e8]">
              <div
                className="bg-[#0071e3] h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, analytics?.bay_utilization_percent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none">
            <span className="text-xs font-medium uppercase tracking-wider text-[#707070] block">Technician Load</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-3xl font-semibold text-[#1d1d1f]">{analytics?.mechanic_utilization_percent ?? 0}%</span>
            </div>
            <div className="w-full bg-[#f5f5f7] rounded-full h-1.5 mt-3 border border-[#e6e6e8]">
              <div
                className="bg-[#1d1d1f] h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, analytics?.mechanic_utilization_percent ?? 0)}%` }}
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none">
            <span className="text-xs font-medium uppercase tracking-wider text-[#707070] block">Avg Wait Duration</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-3xl font-semibold text-[#1d1d1f]">{analytics?.average_waiting_minutes ?? 28}m</span>
              <span className="text-xs font-medium text-[#707070]">ML</span>
            </div>
            <span className="text-xs text-[#707070] block mt-1">Target &lt; 35 min</span>
          </div>

          <div className="bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none">
            <span className="text-xs font-medium uppercase tracking-wider text-[#707070] block">Branch Efficiency</span>
            <div className="flex items-baseline space-x-2 mt-2">
              <span className="text-3xl font-semibold text-[#10b981]">96.4%</span>
              <span className="text-xs font-medium text-[#10b981]">Optimal</span>
            </div>
            <span className="text-xs text-[#707070] block mt-1">SLA compliance</span>
          </div>
        </div>

        {/* Charts Row 1: Hourly Demand & Service Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* Hourly Demand Area & Line Chart */}
          <div className="lg:col-span-8 bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-[#1d1d1f] flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-[#0071e3]" />
                  <span>Hourly Workshop Throughput & Waiting Time Trend</span>
                </h4>
                <p className="text-xs text-[#707070] mt-0.5">
                  Real-time correlation between incoming vehicle volume and predicted customer queue wait times.
                </p>
              </div>
              <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
                Operating Day
              </span>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0071e3" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#0071e3" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorWait" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#b64400" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#b64400" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f2" />
                  <XAxis dataKey="hour" stroke="#86868b" fontSize={12} />
                  <YAxis stroke="#86868b" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #d6d6d6', color: '#1d1d1f', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', color: '#1d1d1f' }} />
                  <Area type="monotone" dataKey="count" name="Vehicles In Service" stroke="#0071e3" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
                  <Area type="monotone" dataKey="avg_wait" name="Avg Wait (Minutes)" stroke="#b64400" strokeWidth={2} fillOpacity={1} fill="url(#colorWait)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Service Category PieChart */}
          <div className="lg:col-span-4 bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-4 flex flex-col justify-between">
            <div>
              <h4 className="text-base font-semibold text-[#1d1d1f] flex items-center space-x-2">
                <PieIcon className="w-5 h-5 text-[#0071e3]" />
                <span>Service Category Breakdown</span>
              </h4>
              <p className="text-xs text-[#707070] mt-0.5">
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
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #d6d6d6', color: '#1d1d1f', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#f0f0f2]">
              {serviceData.slice(0, 6).map((item: any, idx: number) => (
                <div key={item.service_type} className="flex items-center space-x-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="text-[#707070] truncate">{item.service_type}</span>
                  <span className="font-semibold text-[#1d1d1f] ml-auto">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Charts Row 2: 7-Day Trend & AI Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
          {/* 7-Day Performance Bar Chart */}
          <div className="lg:col-span-7 bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-[#1d1d1f] flex items-center space-x-2">
                  <BarChart3 className="w-5 h-5 text-[#0071e3]" />
                  <span>7-Day Branch Throughput & Turnaround Volume</span>
                </h4>
                <p className="text-xs text-[#707070] mt-0.5">
                  Weekly historical completed volume and efficiency trends.
                </p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f2" />
                  <XAxis dataKey="day" stroke="#86868b" fontSize={12} />
                  <YAxis stroke="#86868b" fontSize={12} />
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '16px', border: '1px solid #d6d6d6', color: '#1d1d1f', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', color: '#1d1d1f' }} />
                  <Bar dataKey="completed" name="Vehicles Completed" fill="#0071e3" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="avg_wait" name="Avg Wait (min)" fill="#b64400" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Bottlenecks & Operational Health */}
          <div className="lg:col-span-5 bg-[#f5f5f7] border border-[#d6d6d6] rounded-[28px] p-6 sm:p-8 shadow-none flex flex-col justify-between space-y-6 text-[#1d1d1f]">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white text-[#1d1d1f] border border-[#d6d6d6] text-xs font-medium mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>AI Operational Diagnostic</span>
              </div>
              <h3 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">Workshop Capacity Analysis</h3>
              <p className="text-[#707070] text-xs mt-2 leading-relaxed">
                Gradient Boosting queue simulation estimates that current mechanic allocation matches incoming workload with <strong>±3.8 min</strong> accuracy.
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white border border-[#d6d6d6] flex items-start space-x-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-[#10b981] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#1d1d1f] block">Resource Auto-Freeing Engine Active</span>
                  <span className="text-[#707070]">All bays and technicians are automatically cleared upon job completion.</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#d6d6d6] flex items-start space-x-3 text-xs">
                <Zap className="w-4 h-4 text-[#b64400] shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-[#1d1d1f] block">Peak Load Window (11:00 - 13:00)</span>
                  <span className="text-[#707070]">Queue load increases by 35%. Dynamic bay assignment prioritizes express washing.</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#d6d6d6] flex items-center justify-between text-xs text-[#707070]">
              <span>Predictor: Production Model v1.0</span>
              <button
                onClick={handleSyncResources}
                className="text-[#0066cc] hover:underline font-medium cursor-pointer"
              >
                Re-evaluate Branch State
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Tables: Technician Productivity & Service Bay Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          {/* Technicians Productivity */}
          <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-[#1d1d1f] flex items-center space-x-2">
                  <Wrench className="w-5 h-5 text-[#0071e3]" />
                  <span>Technician Productivity & Scorecard</span>
                </h4>
                <p className="text-xs text-[#707070] mt-0.5">
                  Duty status, specialization, and jobs finished today.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-[#707070]">
                <thead className="bg-[#f5f5f7] uppercase text-[11px] font-semibold text-[#707070] tracking-wider">
                  <tr>
                    <th className="p-3">Technician</th>
                    <th className="p-3">Specialization</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Jobs Today</th>
                    <th className="p-3 text-right">Efficiency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f2]">
                  {techData.map((t: any) => (
                    <tr key={t.id} className="hover:bg-[#fafafc] transition">
                      <td className="p-3 font-semibold text-[#1d1d1f]">{t.name}</td>
                      <td className="p-3 text-xs text-[#707070]">{t.specialization}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-block border ${
                          t.availability === 'Available' ? 'bg-[#f5f5f7] text-[#10b981] border-[#10b981]/30' : t.availability === 'Busy' ? 'bg-blue-50 text-[#0071e3] border-[#0071e3]/30' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {t.availability}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold text-[#1d1d1f]">{t.completed_today ?? 5}</td>
                      <td className="p-3 text-right font-semibold text-[#10b981]">{t.efficiency_score ?? 94}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Service Bays Matrix */}
          <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-[#1d1d1f] flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-[#0071e3]" />
                  <span>Workshop Service Bay Operational Matrix</span>
                </h4>
                <p className="text-xs text-[#707070] mt-0.5">
                  Supported services, turnaround rating, and live availability.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm text-[#707070]">
                <thead className="bg-[#f5f5f7] uppercase text-[11px] font-semibold text-[#707070] tracking-wider">
                  <tr>
                    <th className="p-3">Bay No.</th>
                    <th className="p-3">Service Type</th>
                    <th className="p-3">Turnaround Speed</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0f0f2]">
                  {bayData.map((b: any) => (
                    <tr key={b.id} className="hover:bg-[#fafafc] transition">
                      <td className="p-3 font-semibold text-[#1d1d1f]">{b.bay_number}</td>
                      <td className="p-3 text-xs text-[#707070]">{b.supported_service_type}</td>
                      <td className="p-3 text-xs font-medium text-[#707070]">{b.turnaround_rate || 'Standard'}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-block border ${
                          b.status === 'Available' ? 'bg-[#f5f5f7] text-[#10b981] border-[#10b981]/30' : b.status === 'Occupied' ? 'bg-blue-50 text-[#0071e3] border-[#0071e3]/30' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleToggleBay(b.id, b.status)}
                          className="px-3 py-1 rounded-full border border-[#86868b] hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-medium transition cursor-pointer"
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
        <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5 mb-1">
              <span className="text-xs font-medium uppercase tracking-wider px-3 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
                Staff Governance
              </span>
              <span className="text-xs text-[#707070] font-medium">• Dedicated to {centerInfo?.name || `Center #${centerId}`}</span>
            </div>
            <h3 className="text-xl font-semibold text-[#1d1d1f] tracking-tight">Floor Technicians & Specialists</h3>
            <p className="text-xs text-[#707070] mt-1">
              Only you (Branch Manager) can provision technician accounts for this workshop. Technicians cannot be mixed across centers.
            </p>
          </div>

          <button
            onClick={() => {
              setShowCreateTechModal(true);
              setTechError(null);
            }}
            className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs sm:text-sm shadow-none transition flex items-center space-x-2 cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision Floor Technician</span>
          </button>
        </div>

        {/* Credentials Issued Banner */}
        {createdTechNotice && (
          <div className="bg-[#f5f5f7] text-[#1d1d1f] rounded-[28px] p-6 border border-[#d6d6d6] shadow-none space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[#10b981] font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>New Technician Credentials Provisioned Successfully!</span>
              </div>
              <button
                onClick={() => setCreatedTechNotice(null)}
                className="text-[#707070] hover:text-[#1d1d1f] p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-[#d6d6d6] text-xs">
              <div>
                <span className="text-[#707070] block text-[10px] uppercase font-medium">Technician</span>
                <span className="font-semibold text-[#1d1d1f]">{createdTechNotice.name}</span>
              </div>
              <div>
                <span className="text-[#707070] block text-[10px] uppercase font-medium">Login Email</span>
                <span className="font-mono text-[#0071e3] font-semibold">{createdTechNotice.email}</span>
              </div>
              <div>
                <span className="text-[#707070] block text-[10px] uppercase font-medium">Password</span>
                <span className="font-mono text-[#b64400] font-semibold">{createdTechNotice.pass}</span>
              </div>
              <div>
                <span className="text-[#707070] block text-[10px] uppercase font-medium">Assigned Center</span>
                <span className="font-semibold text-[#707070]">{createdTechNotice.center}</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <span className="text-[11px] text-[#707070]">
                Share these credentials with the technician. They will log in on the workshop floor screen and be strictly locked to this center.
              </span>
              <button
                onClick={copyTechCredentials}
                className="px-4 py-2 rounded-full bg-[#1d1d1f] hover:bg-black text-white text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer shadow-none shrink-0"
              >
                {copiedTechNotice ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedTechNotice ? 'Copied!' : 'Copy Credentials'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Technicians List Table */}
        <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-semibold text-[#1d1d1f] flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-[#0071e3]" />
              <span>Workshop Technical Staff ({technicians.length})</span>
            </h4>
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#f5f5f7] text-[#707070] border border-[#d6d6d6]">
              Isolated Hub: {centerInfo?.name || `Center #${centerId}`}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-[#707070]">
              <thead className="bg-[#f5f5f7] uppercase text-[11px] font-semibold text-[#707070] tracking-wider">
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
              <tbody className="divide-y divide-[#f0f0f2]">
                {technicians.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#707070] font-medium">
                      No floor technicians registered yet. Click "Provision Floor Technician" to issue credentials.
                    </td>
                  </tr>
                ) : (
                  technicians.map((t) => (
                    <tr key={t.id} className="hover:bg-[#fafafc] transition">
                      <td className="p-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#f5f5f7] text-[#0071e3] border border-[#d6d6d6] flex items-center justify-center font-semibold text-xs">
                            {t.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-[#1d1d1f]">{t.name}</span>
                        </div>
                      </td>
                      <td className="p-3 font-mono text-xs text-[#707070]">{t.email || 'N/A'}</td>
                      <td className="p-3 text-xs text-[#707070]">{t.phone || 'N/A'}</td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] font-medium text-xs border border-[#d6d6d6]">
                          {t.specialization || 'General Service'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium inline-block border ${
                          t.availability === 'Available'
                            ? 'bg-[#f5f5f7] text-[#10b981] border-[#10b981]/30'
                            : t.availability === 'Busy'
                            ? 'bg-blue-50 text-[#0071e3] border-[#0071e3]/30'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {t.availability || 'Available'}
                        </span>
                      </td>
                      <td className="p-3 text-xs font-medium text-[#707070]">
                        {t.service_center_name || centerInfo?.name || `Hub #${t.service_center_id}`}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeactivateTechnician(t.id, t.name)}
                          className="px-3 py-1 rounded-full bg-white hover:bg-red-50 text-[#b64400] border border-[#d6d6d6] text-xs font-medium transition flex items-center space-x-1 ml-auto cursor-pointer"
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Waiting */}
          <div className="bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none">
            <span className="text-xs font-medium uppercase tracking-wider text-[#707070] block">Waiting Vehicles</span>
            <span className="text-3xl font-semibold text-[#b64400] mt-2 block">{analytics?.active_waiting ?? 0}</span>
            <span className="text-xs text-[#707070] block mt-1">In waiting bay</span>
          </div>

          {/* In Service */}
          <div className="bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none">
            <span className="text-xs font-medium uppercase tracking-wider text-[#707070] block">In-Service</span>
            <span className="text-3xl font-semibold text-[#0071e3] mt-2 block">{analytics?.active_in_service ?? 0}</span>
            <span className="text-xs text-[#707070] block mt-1">Occupying bays</span>
          </div>

          {/* Available Bays */}
          <div className="bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none">
            <span className="text-xs font-medium uppercase tracking-wider text-[#707070] block">Available Bays</span>
            <span className="text-3xl font-semibold text-[#10b981] mt-2 block">
              {bays.filter((b) => b.status === 'Available').length}/{bays.length}
            </span>
            <span className="text-xs text-[#707070] block mt-1">{analytics?.bay_utilization_percent ?? 0}% Utilized</span>
          </div>

          {/* Available Mechanics */}
          <div className="bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none">
            <span className="text-xs font-medium uppercase tracking-wider text-[#707070] block">Active Technicians</span>
            <span className="text-3xl font-semibold text-[#10b981] mt-2 block">
              {mechanics.filter((m) => m.availability === 'Available').length}/{mechanics.length}
            </span>
            <span className="text-xs text-[#707070] block mt-1">{analytics?.mechanic_utilization_percent ?? 0}% Busy</span>
          </div>

          {/* Average Wait */}
          <div className="bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none">
            <span className="text-xs font-medium uppercase tracking-wider text-[#707070] block">Avg Predicted Wait</span>
            <span className="text-3xl font-semibold text-[#1d1d1f] mt-2 block">{analytics?.average_waiting_minutes ?? 28}m</span>
            <span className="text-xs text-[#707070] block mt-1">ML estimate</span>
          </div>

          {/* Current Workload */}
          <div className="bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none">
            <span className="text-xs font-medium uppercase tracking-wider text-[#707070] block">Workload Index</span>
            <span className="text-3xl font-semibold text-[#1d1d1f] mt-2 block">{analytics?.current_workload_percent ?? 5}%</span>
            <span className="text-xs text-[#707070] block mt-1">Dynamic load</span>
          </div>
        </div>

        {/* Main Operational Queue Table */}
        <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#1d1d1f]">Live Workshop Queue & Technician Actions</h3>
              <p className="text-xs text-[#707070]">
                Update stages in real-time. Changing vehicle stages updates AI predictions for all waiting customers over WebSockets.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleSyncResources}
                className="px-3.5 py-1.5 rounded-full border border-[#86868b] hover:bg-[#f5f5f7] text-[#1d1d1f] font-medium text-xs flex items-center space-x-1.5 transition cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>Live Reconcile</span>
              </button>
              <span className="text-xs font-medium px-3.5 py-1.5 rounded-full bg-[#f5f5f7] text-[#0071e3] border border-[#d6d6d6]">
                {queue.length} Active Vehicles
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-[#707070]">
              <thead className="bg-[#f5f5f7] uppercase text-[11px] font-semibold text-[#707070] tracking-wider">
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
              <tbody className="divide-y divide-[#f0f0f2]">
                {queue.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-[#707070] font-medium">
                      No active vehicles in queue. All service bays and technicians are free and available.
                    </td>
                  </tr>
                ) : (
                  queue.map((entry) => (
                    <tr key={entry.id} className="hover:bg-[#fafafc] transition">
                      <td className="p-3 font-semibold text-[#707070]">#{entry.queue_position}</td>
                      <td className="p-3 font-semibold text-[#0071e3] text-sm sm:text-base">{entry.token_number}</td>
                      <td className="p-3">
                        <div className="font-semibold text-[#1d1d1f]">{entry.vehicle_registration}</div>
                        <div className="text-xs text-[#707070]">{entry.vehicle_model}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-[#1d1d1f]">{entry.customer_name}</div>
                        <div className="text-xs text-[#707070]">{entry.customer_phone}</div>
                      </td>
                      <td className="p-3 font-medium text-[#1d1d1f]">{entry.service_type}</td>
                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border inline-block ${
                            entry.status === 'Completed'
                              ? 'bg-[#f5f5f7] text-[#10b981] border-[#10b981]/30'
                              : entry.status === 'Service In Progress' || entry.status === 'Washing' || entry.status === 'Quality Check'
                              ? 'bg-blue-50 text-[#0071e3] border-[#0071e3]/30'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-[#1d1d1f]">{entry.estimated_waiting_minutes}m</td>
                      <td className="p-3 font-semibold text-[#0071e3]">{entry.expected_completion_time}</td>
                      <td className="p-3">
                        <div className="text-[#1d1d1f] font-medium">{entry.bay_number || 'Auto-Allocated on Start'}</div>
                        <div className="text-xs text-[#707070]">{entry.mechanic_name || 'Auto-Assigned on Start'}</div>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {entry.status === 'Waiting' || entry.status === 'Vehicle Received' || entry.status === 'Booking Confirmed' ? (
                            <button
                              onClick={() => handleQuickStartService(entry)}
                              className="px-3.5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs shadow-none transition flex items-center space-x-1 cursor-pointer"
                              title="Auto-Assign best available Bay & Mechanic and start service"
                            >
                              <Zap className="w-3.5 h-3.5" />
                              <span>Auto-Start</span>
                            </button>
                          ) : entry.status !== 'Completed' && entry.status !== 'Cancelled' ? (
                            <button
                              onClick={() => handleQuickCompleteService(entry)}
                              className="px-3.5 py-1.5 rounded-full bg-[#1d1d1f] hover:bg-black text-white font-medium text-xs shadow-none transition flex items-center space-x-1 cursor-pointer"
                              title="Complete service and immediately free bay and mechanic"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Complete & Free</span>
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
                            className="px-3 py-1.5 rounded-full border border-[#86868b] hover:bg-[#f5f5f7] text-[#1d1d1f] font-medium text-xs transition cursor-pointer"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Service Bays Panel */}
          <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-[#1d1d1f] flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-[#0071e3]" />
                  <span>Workshop Service Bays ({bays.length})</span>
                </h4>
                <p className="text-xs text-[#707070] mt-0.5">
                  <span className="text-[#10b981] font-semibold">{bays.filter(b => b.status === 'Available').length} Free</span> • <span className="text-[#0071e3] font-semibold">{bays.filter(b => b.status === 'Occupied').length} Busy</span>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddBayModal(true)}
                  className="px-3.5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs flex items-center space-x-1 transition shadow-none cursor-pointer"
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
                  className="px-3.5 py-1.5 rounded-full bg-white hover:bg-red-50 text-[#b64400] border border-[#d6d6d6] font-medium text-xs flex items-center space-x-1 transition cursor-pointer"
                  title="Remove a service bay"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Bay</span>
                </button>
                <button
                  onClick={handleSyncResources}
                  className="p-1.5 rounded-full border border-[#86868b] hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs transition cursor-pointer"
                  title="Force sync & free idle bays"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#0071e3]" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {bays.map((bay) => (
                <div
                  key={bay.id}
                  onClick={() => handleToggleBay(bay.id, bay.status)}
                  className={`p-4 rounded-2xl border text-center transition cursor-pointer select-none relative group ${
                    bay.status === 'Available'
                      ? 'bg-[#f5f5f7] border-[#d6d6d6] text-[#1d1d1f] hover:bg-white'
                      : bay.status === 'Occupied'
                      ? 'bg-blue-50/70 border-[#0071e3]/40 text-[#1d1d1f] hover:bg-blue-50'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{bay.bay_number}</span>
                    <div className="flex items-center space-x-1">
                      <span className={`w-2 h-2 rounded-full ${
                        bay.status === 'Available' ? 'bg-[#10b981]' : bay.status === 'Occupied' ? 'bg-[#0071e3] animate-ping' : 'bg-amber-500'
                      }`} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteBay(bay.id, bay.bay_number);
                        }}
                        className="p-1 rounded-md text-[#707070] hover:text-[#b64400] hover:bg-white transition"
                        title="Remove Bay"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <span className="text-xs text-[#707070] block truncate">{bay.supported_service_type}</span>
                  <span className={`text-[11px] font-medium uppercase mt-2 px-2.5 py-0.5 rounded-full inline-block border ${
                    bay.status === 'Available' ? 'bg-white text-[#10b981] border-[#10b981]/30' : bay.status === 'Occupied' ? 'bg-white text-[#0071e3] border-[#0071e3]/30' : 'bg-white text-amber-800 border-amber-200'
                  }`}>{bay.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mechanics Panel */}
          <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-base font-semibold text-[#1d1d1f] flex items-center space-x-2">
                  <Wrench className="w-5 h-5 text-[#0071e3]" />
                  <span>Duty Technicians & Mechanics ({mechanics.length})</span>
                </h4>
                <p className="text-xs text-[#707070] mt-0.5">
                  <span className="text-[#10b981] font-semibold">{mechanics.filter(m => m.availability === 'Available').length} Ready</span> • <span className="text-[#0071e3] font-semibold">{mechanics.filter(m => m.availability === 'Busy').length} Assigned</span>
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddMechModal(true)}
                  className="px-3.5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs flex items-center space-x-1 transition shadow-none cursor-pointer"
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
                  className="px-3.5 py-1.5 rounded-full bg-white hover:bg-red-50 text-[#b64400] border border-[#d6d6d6] font-medium text-xs flex items-center space-x-1 transition cursor-pointer"
                  title="Remove technician"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Tech</span>
                </button>
                <button
                  onClick={handleSyncResources}
                  className="p-1.5 rounded-full border border-[#86868b] hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs transition cursor-pointer"
                  title="Force sync & free idle technicians"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#0071e3]" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mechanics.map((m) => (
                <div
                  key={m.id}
                  onClick={() => handleToggleMechanic(m.id, m.availability)}
                  className={`p-4 rounded-2xl border text-center transition cursor-pointer select-none relative group ${
                    m.availability === 'Available'
                      ? 'bg-[#f5f5f7] border-[#d6d6d6] text-[#1d1d1f] hover:bg-white'
                      : m.availability === 'Busy'
                      ? 'bg-blue-50/70 border-[#0071e3]/40 text-[#1d1d1f] hover:bg-blue-50'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold truncate max-w-[95px]">{m.name}</span>
                    <div className="flex items-center space-x-1">
                      <span className={`w-2 h-2 rounded-full ${
                        m.availability === 'Available' ? 'bg-[#10b981]' : m.availability === 'Busy' ? 'bg-[#0071e3]' : 'bg-amber-500'
                      }`} />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMechanic(m.id, m.name);
                        }}
                        className="p-1 rounded-md text-[#707070] hover:text-[#b64400] hover:bg-white transition"
                        title="Remove Technician"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <span className="text-xs text-[#707070] block truncate">{m.specialization}</span>
                  <span className={`text-[11px] font-medium uppercase mt-2 px-2.5 py-0.5 rounded-full inline-block border ${
                    m.availability === 'Available' ? 'bg-white text-[#10b981] border-[#10b981]/30' : m.availability === 'Busy' ? 'bg-white text-[#0071e3] border-[#0071e3]/30' : 'bg-white text-amber-800 border-amber-200'
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
        <div className="w-20 h-20 bg-[#f5f5f7] border border-[#d6d6d6] rounded-full flex items-center justify-center mx-auto text-[#0071e3]">
          <Building2 className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] tracking-tight">No Workshop Centers Registered Yet</h2>
          <p className="text-sm text-[#707070] mt-2 max-w-lg mx-auto">
            Get started by activating a subscription plan to configure your primary workshop center, initialize service bays, and start managing live customer queues.
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowPlansModal(true)}
            className="px-6 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-sm transition shadow-none cursor-pointer"
          >
            Browse Franchise Plans & Activate Workshop
          </button>
        </div>
        <FranchisePlansModal
          isOpen={showPlansModal}
          onClose={() => setShowPlansModal(false)}
          onSuccess={() => {
            setShowPlansModal(false);
            loadCenterData();
          }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2 sm:pb-4 space-y-5 sm:space-y-8">
      {/* Workshop Header & Switcher */}
      <div className="bg-white rounded-[28px] border border-[#d6d6d6] shadow-none p-6 sm:p-8 space-y-5 text-[#1d1d1f]">
        {/* Top Hub Selector & Primary Action Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#f0f0f2]">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-medium uppercase tracking-wider px-3 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
              Branch Operations
            </span>
            {availableCenters.length > 1 && (
              <div className="min-w-[220px]">
                <SelectDropdown
                  value={centerId || ''}
                  onChange={(val) => {
                    const cid = Number(val);
                    setCenterId(cid);
                    localStorage.setItem('manager_preferred_center', String(cid));
                  }}
                  options={availableCenters.map((c) => ({
                    value: c.id,
                    label: `Branch #${c.id}: ${c.name}`,
                    sublabel: c.city,
                  }))}
                  size="sm"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('close-sqms-overlays'));
              setSelectedEntry(null);
              setShowWalkInModal(true);
            }}
            className="self-start sm:self-auto px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs sm:text-sm shadow-none transition flex items-center space-x-2 cursor-pointer active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Walk-in Token</span>
          </button>
        </div>

        {/* Center Name & Responsive Tab Switcher Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] tracking-tight">
              {centerInfo?.name || 'Apex Workshop Center'}
            </h1>
            <p className="text-[#707070] text-xs sm:text-sm flex flex-wrap items-center gap-x-2">
              <span>{centerInfo?.address}</span>
              <span className="hidden sm:inline">•</span>
              <span className="text-[#1d1d1f] font-medium">Operating Hours: {centerInfo?.operating_hours_start || '08:00'} - {centerInfo?.operating_hours_end || '20:00'}</span>
            </p>
          </div>

          {/* Tab Switcher Controls - Responsive Segmented Bar */}
          <div className="flex items-center bg-[#f5f5f7] p-1 rounded-full border border-[#d6d6d6] overflow-x-auto no-scrollbar shrink-0 w-full sm:w-auto">
            <button
              onClick={() => switchTab('manager-queue')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                currentViewTab === 'manager-queue'
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Live Queue ({queue.length})</span>
            </button>
            <button
              onClick={() => switchTab('manager-technicians')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                currentViewTab === 'manager-technicians'
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Floor Technicians ({technicians.length})</span>
            </button>
            <button
              onClick={() => switchTab('manager-analytics')}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition flex items-center space-x-2 whitespace-nowrap cursor-pointer ${
                currentViewTab === 'manager-analytics'
                  ? 'bg-white text-[#1d1d1f] shadow-sm'
                  : 'text-[#707070] hover:text-[#1d1d1f]'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Branch Analytics</span>
            </button>
          </div>
        </div>
      </div>

      {/* Signature Branch Operations Strip: Add Bay, Remove Bay, Add Technician, Remove Technician */}
      <div className="bg-[#f5f5f7] border border-[#d6d6d6] rounded-[28px] p-5 sm:p-6 text-[#1d1d1f] shadow-none flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-full bg-white border border-[#d6d6d6] flex items-center justify-center text-[#0071e3] shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-[#1d1d1f]">Workshop Floor Resource Operations</span>
              <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-white text-[#1d1d1f] border border-[#d6d6d6]">
                Floor Controls
              </span>
            </div>
            <p className="text-xs text-[#707070] mt-0.5">
              Direct physical bay management and duty technician controls for {centerInfo?.name || 'this workshop'}.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 w-full lg:w-auto shrink-0 items-center">
          {/* 1. Add Bay */}
          <button
            onClick={() => setShowAddBayModal(true)}
            className="h-9 px-4 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition shadow-none cursor-pointer whitespace-nowrap text-center"
            title="Provision a new service bay"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Add Bay</span>
          </button>

          {/* 2. Remove Bay */}
          <button
            onClick={() => setShowRemoveBayModal(true)}
            className="h-9 px-4 rounded-full bg-white hover:bg-[#fafafc] text-[#b64400] hover:text-[#903600] border border-[#d6d6d6] hover:border-[#b64400]/40 font-medium text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer whitespace-nowrap text-center"
            title="Remove an existing service bay"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
            <span>Remove Bay</span>
          </button>

          {/* 3. Add Technician */}
          <button
            onClick={() => {
              setShowCreateTechModal(true);
              setTechError(null);
            }}
            className="h-9 px-4 rounded-full bg-[#1d1d1f] hover:bg-black text-white font-medium text-xs flex items-center justify-center space-x-1.5 transition shadow-none cursor-pointer whitespace-nowrap text-center"
            title="Provision credentials for floor technician"
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span>Add Technician</span>
          </button>

          {/* 4. Remove Technician */}
          <button
            onClick={() => setShowRemoveTechModal(true)}
            className="h-9 px-4 rounded-full bg-white hover:bg-[#fafafc] text-[#b64400] hover:text-[#903600] border border-[#d6d6d6] hover:border-[#b64400]/40 font-medium text-xs flex items-center justify-center space-x-1.5 transition cursor-pointer whitespace-nowrap text-center"
            title="Remove or deactivate floor technician"
          >
            <Trash2 className="w-3.5 h-3.5 shrink-0" />
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#d6d6d6] space-y-5 relative z-[10000] text-[#1d1d1f] max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between border-b border-[#f0f0f2] pb-4">
              <div>
                <h3 className="text-base font-semibold text-[#1d1d1f] tracking-tight">Update Service Stage</h3>
                <p className="text-xs text-[#707070] mt-0.5">
                  Token: <strong className="text-[#0071e3] font-mono">{selectedEntry.token_number}</strong> • <span className="font-semibold text-[#1d1d1f]">{selectedEntry.vehicle_registration}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateStatusSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1.5">
                  New Status
                </label>
                <SelectDropdown
                  value={targetStatus}
                  onChange={(val) => setTargetStatus(val)}
                  options={STATUS_OPTIONS}
                  size="md"
                />
              </div>

              {/* AI Auto-allocation badge */}
              {['Service In Progress', 'Repair In Progress', 'Washing', 'Quality Check', 'Inspection'].includes(targetStatus) && (
                <div className="p-3.5 bg-[#f5f5f7] border border-[#d6d6d6] rounded-2xl text-xs text-[#1d1d1f] space-y-1">
                  <div className="font-semibold flex items-center space-x-1.5 text-[#1d1d1f]">
                    <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                    <span>AI Automated Allocation Active</span>
                  </div>
                  <p className="text-[#707070] leading-relaxed">
                    Leaving bay or technician on "Auto" will dynamically assign the next free matching resource: <strong className="text-[#1d1d1f]">{getSuggestedBay(selectedEntry.service_type)?.bay_number || 'Next Free Bay'}</strong> & <strong className="text-[#1d1d1f]">{getSuggestedMechanic(selectedEntry.service_type)?.name || 'Next Free Tech'}</strong>.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1">
                    Assign Service Bay
                  </label>
                  <SelectDropdown
                    value={targetBayId}
                    onChange={(val) => setTargetBayId(val === '' ? '' : Number(val))}
                    options={[
                      { value: '', label: 'Auto / None' },
                      ...bays.map((b) => ({
                        value: b.id,
                        label: b.bay_number,
                        badge: b.status,
                      })),
                    ]}
                    size="md"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1">
                    Assign Technician
                  </label>
                  <SelectDropdown
                    value={targetMechId}
                    onChange={(val) => setTargetMechId(val === '' ? '' : Number(val))}
                    options={[
                      { value: '', label: 'Auto / None' },
                      ...mechanics.map((m) => ({
                        value: m.id,
                        label: m.name,
                        badge: m.availability,
                      })),
                    ]}
                    size="md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1">
                  Technician Notes
                </label>
                <textarea
                  rows={2}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="e.g. Washing completed, moved to bay for inspection"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs font-medium text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 shadow-none transition"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedEntry(null)}
                  className="px-4 py-2 border border-[#86868b] rounded-full text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] cursor-pointer transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-medium shadow-none transition cursor-pointer"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#d6d6d6] space-y-5 my-8 relative z-[10000] text-[#1d1d1f] max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between border-b border-[#f0f0f2] pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] flex items-center justify-center text-[#0071e3]">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1d1d1f] tracking-tight">Issue Walk-In Digital Token</h3>
                  <p className="text-xs text-[#707070] font-medium">Instant workshop entry & automated bay queueing</p>
                </div>
              </div>
              <button
                onClick={() => setShowWalkInModal(false)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWalkInSubmit} className="space-y-4">
              {/* Customer Full Name */}
              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1.5">
                  Customer Full Name <span className="text-[#b64400]">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#d6d6d6] focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 rounded-xl text-sm font-medium text-[#1d1d1f] placeholder:text-[#86868b] shadow-none transition"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1.5">
                  Phone Number <span className="text-[#b64400]">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3.5" />
                  <input
                    type="tel"
                    required
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#d6d6d6] focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 rounded-xl text-sm font-medium text-[#1d1d1f] placeholder:text-[#86868b] shadow-none transition"
                  />
                </div>
              </div>

              {/* Registration Number */}
              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1.5">
                  Vehicle Registration No. <span className="text-[#b64400]">*</span>
                </label>
                <div className="relative">
                  <Car className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={walkinReg}
                    onChange={(e) => setWalkinReg(e.target.value.toUpperCase())}
                    placeholder="GJ01-XX-9999"
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#d6d6d6] focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 rounded-xl text-sm font-mono font-semibold uppercase tracking-wider text-[#1d1d1f] placeholder:text-[#86868b] shadow-none transition"
                  />
                </div>
              </div>

              {/* Vehicle Type Interactive Selector */}
              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Vehicle Type: <strong className="text-[#0071e3] lowercase">{walkinType}</strong></span>
                  <span className="text-[11px] text-[#707070] font-normal">Click to select</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {VEHICLE_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setWalkinType(v.id)}
                      className={`py-2 px-1 rounded-xl text-xs font-medium transition flex flex-col items-center justify-center space-y-1 cursor-pointer border ${
                        walkinType === v.id
                          ? 'bg-[#0071e3] border-[#0071e3] text-white shadow-none'
                          : 'bg-[#f5f5f7] border-[#d6d6d6] text-[#1d1d1f] hover:bg-white'
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
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Service Required: <strong className="text-[#0071e3]">{walkinService}</strong></span>
                  <span className="text-[11px] text-[#707070] font-normal">Click to select</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {SERVICE_OPTIONS.map((s) => (
                    <button
                      key={s.name}
                      type="button"
                      onClick={() => setWalkinService(s.name)}
                      className={`p-3 rounded-2xl text-left border transition cursor-pointer flex flex-col justify-between ${
                        walkinService === s.name
                          ? 'bg-blue-50 border-[#0071e3] text-[#0071e3]'
                          : 'bg-[#f5f5f7] border-[#d6d6d6] text-[#1d1d1f] hover:bg-white'
                      }`}
                    >
                      <span className="text-xs font-semibold leading-tight truncate">{s.name}</span>
                      <div className="flex items-center justify-between mt-1.5 text-[10px] font-medium text-[#707070]">
                        <span className="text-[#0071e3] font-semibold">{s.est}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white border border-[#d6d6d6] text-[#707070]">{s.badge}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Dynamic Token Preview */}
              <div className="bg-[#f5f5f7] text-[#1d1d1f] p-4 rounded-2xl border border-[#d6d6d6] space-y-2">
                <div className="flex items-center justify-between border-b border-[#d6d6d6] pb-2">
                  <div className="flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
                    <span className="text-[10px] uppercase font-medium tracking-wider text-[#707070]">Live Token Preview</span>
                  </div>
                  <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-white text-[#0071e3] border border-[#d6d6d6]">
                    Next in Queue: WT-0{(queue.length + 1).toString().padStart(2, '0')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#707070] uppercase block">Customer</span>
                    <span className="font-semibold text-[#1d1d1f] truncate block">{walkinName || 'Customer Name'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#707070] uppercase block">Vehicle</span>
                    <span className="font-semibold text-[#1d1d1f] truncate block">
                      {walkinReg || 'GJ01-XX-9999'} • {walkinType}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-[#d6d6d6] text-[11px]">
                  <span className="text-[#707070]">Service: <strong className="text-[#1d1d1f] font-semibold">{walkinService}</strong></span>
                  <span className="text-[#10b981] font-medium flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3 text-[#10b981]" />
                    <span>Auto-Bay Allocation</span>
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-5 py-2.5 border border-[#86868b] rounded-full text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWalkIn}
                  className="px-6 py-2.5 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-medium shadow-none transition flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingWalkIn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-white" />
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm overflow-y-auto overscroll-contain animate-fadeIn">
          <div className="bg-white rounded-[28px] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#d6d6d6] relative z-[10000] text-[#1d1d1f] max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f2]">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#0071e3] flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1d1d1f]">Add Service Bay</h3>
                  <p className="text-xs text-[#707070]">Configure a new operational workshop bay</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddBayModal(false)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBaySubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1">
                  Bay Identifier / Number
                </label>
                <input
                  type="text"
                  required
                  placeholder={`Bay-${(bays.length + 1).toString().padStart(2, '0')}`}
                  value={newBayNum}
                  onChange={(e) => setNewBayNum(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1">
                  Supported Service Specialization
                </label>
                <SelectDropdown
                  value={newBayService}
                  onChange={(val) => setNewBayService(val)}
                  options={[
                    { value: 'General Service', label: 'General Service (Multi-purpose)' },
                    { value: 'Car Wash', label: 'Car Wash / Detailing Bay' },
                    { value: 'Brake Service', label: 'Brake & Tyre Service Bay' },
                    { value: 'Electrical Repair', label: 'Electrical & Diagnostic Bay' },
                    { value: 'Accidental Repair', label: 'Accidental / Bodyshop Repair Bay' },
                    { value: 'Quick Service', label: 'Express / Quick Service Lane' },
                  ]}
                  size="md"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddBayModal(false)}
                  className="px-4 py-2 border border-[#86868b] rounded-full text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBay}
                  className="px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-medium shadow-none transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm overflow-y-auto overscroll-contain animate-fadeIn">
          <div className="bg-white rounded-[28px] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#d6d6d6] relative z-[10000] text-[#1d1d1f] max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f2]">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#0071e3] flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1d1d1f]">Add Technician / Mechanic</h3>
                  <p className="text-xs text-[#707070]">Deploy certified workshop personnel</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddMechModal(false)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMechSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1">
                  Technician Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={newMechName}
                  onChange={(e) => setNewMechName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-sm text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1">
                  Primary Specialization
                </label>
                <SelectDropdown
                  value={newMechSpec}
                  onChange={(val) => setNewMechSpec(val)}
                  options={[
                    { value: 'General Service', label: 'General Service & Periodic Maintenance' },
                    { value: 'Electrical', label: 'Electrical, AC & Diagnostics' },
                    { value: 'Accidental', label: 'Accidental, Denting & Painting' },
                    { value: 'Engine', label: 'Engine & Transmission Specialist' },
                    { value: 'Detailing', label: 'Detailing, Washing & Quality Check' },
                  ]}
                  size="md"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddMechModal(false)}
                  className="px-4 py-2 border border-[#86868b] rounded-full text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMech}
                  className="px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-medium shadow-none transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
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
        <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full bg-white/95 backdrop-blur-md text-[#1d1d1f] p-4 rounded-2xl shadow-xl border border-[#d6d6d6] animate-slide-up flex items-start space-x-3 transition-all">
          <div className="p-2 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#0071e3] shrink-0 mt-0.5">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-medium text-[#0071e3] uppercase tracking-wider">{liveToast.title}</h4>
              <span className="text-[10px] text-[#707070]">{liveToast.time}</span>
            </div>
            <p className="text-sm font-semibold text-[#1d1d1f] mt-0.5 truncate">{liveToast.message}</p>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0071e3] text-white font-mono text-xs font-semibold">{liveToast.token}</span>
              {liveToast.targetCenterId && liveToast.targetCenterId !== centerId ? (
                <button
                  onClick={() => {
                    setCenterId(liveToast.targetCenterId!);
                    setLiveToast(null);
                  }}
                  className="px-3 py-1 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-[11px] transition cursor-pointer shadow-none"
                >
                  Switch to Branch →
                </button>
              ) : (
                <span className="text-[11px] text-[#10b981] font-medium flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-ping inline-block" />
                  <span>Dashboard updated</span>
                </span>
              )}
            </div>
          </div>
          <button onClick={() => setLiveToast(null)} className="text-[#707070] hover:text-[#1d1d1f] cursor-pointer ml-1 p-1">
            <X className="w-4 h-4" />
          </button>
        </div>,
        document.body
      )}

      {/* PROVISION FLOOR TECHNICIAN MODAL */}
      {showCreateTechModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200">
          <div className="bg-white rounded-[28px] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#d6d6d6] space-y-5 relative z-[10000] text-[#1d1d1f] max-h-[90vh] overflow-y-auto overscroll-contain">
            <div className="flex items-center justify-between border-b border-[#f0f0f2] pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] flex items-center justify-center text-[#0071e3]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1d1d1f] tracking-tight">Provision Floor Technician</h3>
                  <p className="text-xs text-[#707070] font-medium">Tied strictly to {centerInfo?.name || `Center #${centerId}`}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateTechModal(false)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {techError && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-[#b64400] font-medium flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-[#b64400] shrink-0" />
                <span>{techError}</span>
              </div>
            )}

            <form onSubmit={handleCreateTechSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1.5">
                  Technician Full Name <span className="text-[#b64400]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={techName}
                  onChange={(e) => setTechName(e.target.value)}
                  placeholder="e.g. Ramesh Patel"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 rounded-xl text-xs font-medium text-[#1d1d1f] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1.5">
                  Work Email Address <span className="text-[#b64400]">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={techEmail}
                  onChange={(e) => setTechEmail(e.target.value)}
                  placeholder="e.g. ramesh.tech@demo.local"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 rounded-xl text-xs font-medium text-[#1d1d1f] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1.5">
                  Temporary Password <span className="text-[#b64400]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={techPassword}
                  onChange={(e) => setTechPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 rounded-xl text-xs font-medium text-[#1d1d1f] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1.5">
                  Contact Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={techPhone}
                  onChange={(e) => setTechPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] focus:border-[#0071e3] focus:ring-2 focus:ring-[#0071e3]/20 rounded-xl text-xs font-medium text-[#1d1d1f] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1.5">
                  Floor Specialization
                </label>
                <SelectDropdown
                  value={techSpecialization}
                  onChange={(val) => setTechSpecialization(val)}
                  options={[
                    { value: 'General Service', label: 'General Service & Maintenance' },
                    { value: 'Engine & Transmission', label: 'Engine & Transmission' },
                    { value: 'Electrical & Battery', label: 'Electrical, Battery & EV' },
                    { value: 'Accidental & Body Repair', label: 'Accidental, Denting & Painting' },
                    { value: 'Brake & Suspension', label: 'Brake & Suspension Specialist' },
                    { value: 'Quick Lane & Washing', label: 'Express Lane & Washing' },
                  ]}
                  size="md"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateTechModal(false)}
                  className="px-4 py-2 border border-[#86868b] rounded-full text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTech}
                  className="px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-xs font-medium shadow-none transition cursor-pointer disabled:opacity-50"
                >
                  {submittingTech ? 'Creating Account...' : 'Issue Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Remove Service Bay Modal */}
      {showRemoveBayModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm overflow-y-auto overscroll-contain animate-fadeIn">
          <div className="bg-white rounded-[28px] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#d6d6d6] relative z-[10000] text-[#1d1d1f] max-h-[90vh] overflow-y-auto overscroll-contain space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f2]">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 text-[#b64400] flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1d1d1f]">Remove Service Bay</h3>
                  <p className="text-xs text-[#707070]">De-provision an existing workshop bay</p>
                </div>
              </div>
              <button
                onClick={() => setShowRemoveBayModal(false)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bays.length === 0 ? (
              <p className="text-xs text-[#707070] py-4 text-center">No service bays currently registered in this center.</p>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedRemoveBayId) return;
                  const target = bays.find(b => b.id === Number(selectedRemoveBayId));
                  if (target) {
                    await handleDeleteBay(target.id, target.bay_number);
                    setShowRemoveBayModal(false);
                    setSelectedRemoveBayId('');
                  }
                }}
                className="space-y-4 pt-2"
              >
                <div>
                  <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1.5">
                    Select Bay to Remove
                  </label>
                  <SelectDropdown
                    value={selectedRemoveBayId}
                    onChange={(val) => setSelectedRemoveBayId(Number(val))}
                    options={bays.map(b => ({
                      value: b.id,
                      label: `${b.bay_number} (${b.status})`,
                      badge: b.status,
                    }))}
                    placeholder="Choose bay..."
                    size="md"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setShowRemoveBayModal(false)}
                    className="px-4 py-2 border border-[#86868b] rounded-full text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedRemoveBayId}
                    className="px-5 py-2 bg-[#b64400] hover:bg-[#903600] text-white rounded-full text-xs font-medium shadow-none transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Remove Bay</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Remove Floor Technician Modal */}
      {showRemoveTechModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm overflow-y-auto overscroll-contain animate-fadeIn">
          <div className="bg-white rounded-[28px] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#d6d6d6] relative z-[10000] text-[#1d1d1f] max-h-[90vh] overflow-y-auto overscroll-contain space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f2]">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 text-[#b64400] flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1d1d1f]">Remove Floor Technician</h3>
                  <p className="text-xs text-[#707070]">De-provision technician credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowRemoveTechModal(false)}
                className="p-1.5 rounded-full text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {technicians.length === 0 && mechanics.length === 0 ? (
              <p className="text-xs text-[#707070] py-4 text-center">No technicians currently registered in this center.</p>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedRemoveTechId) return;
                  const [type, idStr] = selectedRemoveTechId.split(':');
                  const targetId = Number(idStr);
                  if (type === 'tech') {
                    const targetTech = technicians.find(t => t.id === targetId);
                    if (targetTech) await handleDeactivateTechnician(targetTech.id, targetTech.name);
                  } else {
                    const targetMech = mechanics.find(m => m.id === targetId);
                    if (targetMech) await handleDeleteMechanic(targetMech.id, targetMech.name);
                  }
                  setShowRemoveTechModal(false);
                  setSelectedRemoveTechId('');
                }}
                className="space-y-4 pt-2"
              >
                <div>
                  <label className="block text-xs font-medium text-[#707070] uppercase tracking-wider mb-1.5">
                    Select Technician to Remove
                  </label>
                  <SelectDropdown
                    value={selectedRemoveTechId}
                    onChange={(val) => setSelectedRemoveTechId(String(val))}
                    options={[
                      ...technicians.map(t => ({
                        value: `tech:${t.id}`,
                        label: t.name,
                        sublabel: t.email,
                        badge: 'Floor Technician',
                      })),
                      ...mechanics.filter(m => !technicians.some(t => t.name === m.name)).map(m => ({
                        value: `mech:${m.id}`,
                        label: m.name,
                        badge: m.specialization || 'Mechanic',
                      })),
                    ]}
                    placeholder="Choose technician..."
                    size="md"
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2.5">
                  <button
                    type="button"
                    onClick={() => setShowRemoveTechModal(false)}
                    className="px-4 py-2 border border-[#86868b] rounded-full text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!selectedRemoveTechId}
                    className="px-5 py-2 bg-[#b64400] hover:bg-[#903600] text-white rounded-full text-xs font-medium shadow-none transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Remove Tech</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
