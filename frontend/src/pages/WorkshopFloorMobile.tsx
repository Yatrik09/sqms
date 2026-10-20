import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { QueueEntry, ServiceBay, Mechanic } from '../types';
import {
  Smartphone, RefreshCw, Search, CheckCircle2, Clock, Wrench, Sparkles,
  ArrowRight, ShieldCheck, Car, Phone, Filter, ChevronRight, X, Plus,
  Layers, Check, AlertCircle, Volume2, VolumeX, Eye, ArrowLeft, Building2
} from 'lucide-react';

interface WorkshopFloorMobileProps {
  onSwitchToDesktop?: () => void;
}

const STAGE_SEQUENCE = [
  'Booking Confirmed',
  'Vehicle Received',
  'Waiting for Bay',
  'Service In Progress',
  'Washing',
  'Quality Check',
  'Ready for Pickup',
  'Completed',
];

const STAGE_CONFIG: Record<string, { label: string; color: string; nextStage?: string; nextAction: string }> = {
  'Booking Confirmed': {
    label: 'Booking Confirmed',
    color: 'bg-slate-800 text-slate-200 border-slate-700',
    nextStage: 'Vehicle Received',
    nextAction: 'Mark Vehicle Received',
  },
  'Vehicle Received': {
    label: 'Vehicle Received',
    color: 'bg-indigo-950/80 text-indigo-300 border-indigo-700/50',
    nextStage: 'Service In Progress',
    nextAction: 'Move to Bay & Start Service',
  },
  'Waiting': {
    label: 'Waiting in Driveway',
    color: 'bg-amber-950/80 text-amber-300 border-amber-700/50',
    nextStage: 'Service In Progress',
    nextAction: 'Assign Bay & Start Service',
  },
  'Waiting for Bay': {
    label: 'Waiting for Bay',
    color: 'bg-amber-950/80 text-amber-300 border-amber-700/50',
    nextStage: 'Service In Progress',
    nextAction: 'Assign Bay & Start Service',
  },
  'Service In Progress': {
    label: 'In Service Bay',
    color: 'bg-blue-950/80 text-blue-300 border-blue-700/50',
    nextStage: 'Washing',
    nextAction: 'Service Done → Send to Washing',
  },
  'Washing': {
    label: 'Washing Bay',
    color: 'bg-cyan-950/80 text-cyan-300 border-cyan-700/50',
    nextStage: 'Quality Check',
    nextAction: 'Washing Done → Send to QC',
  },
  'Quality Check': {
    label: 'Quality Check Inspection',
    color: 'bg-purple-950/80 text-purple-300 border-purple-700/50',
    nextStage: 'Ready for Pickup',
    nextAction: 'Pass QC → Mark Ready for Pickup',
  },
  'Ready for Pickup': {
    label: 'Ready for Pickup',
    color: 'bg-emerald-950/80 text-emerald-300 border-emerald-700/50',
    nextStage: 'Completed',
    nextAction: 'Customer Handover (Complete)',
  },
  'Completed': {
    label: 'Service Completed',
    color: 'bg-emerald-900/60 text-emerald-400 border-emerald-800',
    nextAction: 'Completed',
  },
};

// Simple web audio chime for tactile feedback
function playChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // audio context muted or restricted
  }
}

export const WorkshopFloorMobile: React.FC<WorkshopFloorMobileProps> = ({ onSwitchToDesktop }) => {
  const { user, lastWsEvent } = useAuth();

  const [centerId, setCenterId] = useState<number>(1);
  const [centers, setCenters] = useState<any[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [bays, setBays] = useState<ServiceBay[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingEntryId, setUpdatingEntryId] = useState<number | null>(null);

  // Filters & Search
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Modals & Panels
  const [showWalkInModal, setShowWalkInModal] = useState<boolean>(false);
  const [showBaysDrawer, setShowBaysDrawer] = useState<boolean>(false);
  const [editEntry, setEditEntry] = useState<QueueEntry | null>(null);

  // Walk-in form state
  const [walkinName, setWalkinName] = useState<string>('');
  const [walkinPhone, setWalkinPhone] = useState<string>('');
  const [walkinReg, setWalkinReg] = useState<string>('');
  const [walkinType, setWalkinType] = useState<string>('Sedan');
  const [walkinService, setWalkinService] = useState<string>('General Service');
  const [isSubmittingWalkIn, setIsSubmittingWalkIn] = useState<boolean>(false);

  // Feedback Toast
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type: 'success' | 'info' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ title, desc, type });
    if (soundEnabled && type === 'success') {
      playChime();
    }
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const isTechnician = user?.role === 'technician';

  // 1. Initial Load of Centers
  useEffect(() => {
    const fetchCenters = async () => {
      try {
        const cList = await api.getServiceCenters();
        setCenters(cList);
        if (cList.length > 0) {
          if (isTechnician && user?.service_center_id) {
            setCenterId(Number(user.service_center_id));
          } else {
            // If manager has assigned center, use it
            const managed = await api.getMyManagedCenter().catch(() => null);
            if (managed && managed.has_center && managed.center_id) {
              setCenterId(managed.center_id);
            } else {
              setCenterId(cList[0].id);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load centers for mobile floor', err);
      }
    };
    fetchCenters();
  }, [user?.id, user?.service_center_id, isTechnician]);

  // 2. Fetch Center Queue & Data
  const loadFloorData = async () => {
    if (!centerId) return;
    try {
      const [qList, bList, mList] = await Promise.all([
        api.getCenterQueue(centerId).catch(() => []),
        api.getCenterBays(centerId).catch(() => []),
        api.getCenterMechanics(centerId).catch(() => []),
      ]);
      setQueue(qList || []);
      setBays(bList || []);
      setMechanics(mList || []);
    } catch (err) {
      console.error('Failed to load queue in mobile floor', err);
    } finally {
      setLoading(false);
    }
  };

  // Poll every 2.5s + auto-trigger on WebSocket message
  useEffect(() => {
    loadFloorData();
    const interval = setInterval(loadFloorData, 2500);
    return () => clearInterval(interval);
  }, [centerId, lastWsEvent]);

  // Instant notification and sync on WebSocket events
  useEffect(() => {
    if (!lastWsEvent) return;
    if (lastWsEvent.event === 'NEW_BOOKING_CREATED') {
      const isCurrentCenter = Number(lastWsEvent.service_center_id) === Number(centerId);
      if (isCurrentCenter) {
        loadFloorData();
        showToast(
          `New Booking: ${lastWsEvent.token_number}`,
          `${lastWsEvent.customer_name} (${lastWsEvent.vehicle_registration}) queued for ${lastWsEvent.service_type}.`
        );
      }
    } else if (lastWsEvent.event === 'QUEUE_STATUS_CHANGED') {
      if (Number(lastWsEvent.service_center_id) === Number(centerId)) {
        loadFloorData();
      }
    }
  }, [lastWsEvent, centerId]);

  // Handle instant stage advance (1-Tap!)
  const handleQuickAdvance = async (entry: QueueEntry) => {
    const cfg = STAGE_CONFIG[entry.status] || STAGE_CONFIG['Waiting'];
    const nextStatus = cfg.nextStage;
    if (!nextStatus) return;

    setUpdatingEntryId(entry.id);

    // Auto-pick available bay if going into service
    let bayId = entry.assigned_bay_id;
    if (!bayId && nextStatus === 'Service In Progress') {
      const freeBay = bays.find((b) => b.status === 'Available');
      if (freeBay) bayId = freeBay.id;
    }

    // Auto-pick available mechanic
    let mechId = entry.assigned_mechanic_id;
    if (!mechId && nextStatus === 'Service In Progress') {
      const freeMech = mechanics.find((m) => m.availability === 'Available');
      if (freeMech) mechId = freeMech.id;
    }

    try {
      await api.updateQueueStatus(entry.id, {
        new_status: nextStatus,
        assigned_bay_id: bayId || undefined,
        assigned_mechanic_id: mechId || undefined,
        notes: `Advanced to ${nextStatus} via Workshop Floor Screen`,
      });

      showToast(
        `Token ${entry.token_number} Updated!`,
        `Advanced to "${nextStatus}". Customer & Manager notified live via WebSocket.`
      );
      await loadFloorData();
    } catch (err: any) {
      alert(err.message || 'Failed to update vehicle status.');
    } finally {
      setUpdatingEntryId(null);
    }
  };

  // Handle custom status update from modal
  const handleCustomUpdate = async (newStatus: string, bayId?: number, mechId?: number) => {
    if (!editEntry) return;
    setUpdatingEntryId(editEntry.id);
    try {
      await api.updateQueueStatus(editEntry.id, {
        new_status: newStatus,
        assigned_bay_id: bayId || undefined,
        assigned_mechanic_id: mechId || undefined,
        notes: `Manual stage override via Workshop Floor Screen`,
      });
      showToast(
        `Token ${editEntry.token_number} → ${newStatus}`,
        `Stage updated successfully.`
      );
      setEditEntry(null);
      await loadFloorData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setUpdatingEntryId(null);
    }
  };

  // Handle Walk-in submission
  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinReg.trim()) return;
    setIsSubmittingWalkIn(true);
    try {
      const res = await api.createWalkIn({
        service_center_id: centerId,
        customer_name: walkinName.trim() || 'Walk-In Customer',
        customer_phone: walkinPhone.trim() || '+91 99999 00000',
        registration_number: walkinReg.trim().toUpperCase(),
        vehicle_type: walkinType,
        service_type: walkinService,
      });

      showToast(
        `Token ${res.token_number} Generated!`,
        `Queue #${res.queue_position} · ETA ~${res.waiting_time_minutes}m. Added to live queue.`
      );
      setShowWalkInModal(false);
      setWalkinReg('');
      setWalkinName('');
      setWalkinPhone('');
      await loadFloorData();
    } catch (err: any) {
      alert(err.message || 'Failed to create walk-in token.');
    } finally {
      setIsSubmittingWalkIn(false);
    }
  };

  // Filter and search queue
  const filteredQueue = useMemo(() => {
    return queue.filter((entry) => {
      // Filter by chip
      if (selectedFilter === 'waiting') {
        if (!['Waiting', 'Waiting for Bay', 'Booking Confirmed', 'Vehicle Received'].includes(entry.status)) return false;
      } else if (selectedFilter === 'in_service') {
        if (entry.status !== 'Service In Progress') return false;
      } else if (selectedFilter === 'washing') {
        if (entry.status !== 'Washing') return false;
      } else if (selectedFilter === 'qc') {
        if (entry.status !== 'Quality Check') return false;
      } else if (selectedFilter === 'ready') {
        if (entry.status !== 'Ready for Pickup') return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const tokenMatch = (entry.token_number || '').toLowerCase().includes(q);
        const regMatch = (entry.vehicle_registration || '').toLowerCase().includes(q);
        const nameMatch = (entry.customer_name || '').toLowerCase().includes(q);
        const serviceMatch = (entry.service_type || '').toLowerCase().includes(q);
        return tokenMatch || regMatch || nameMatch || serviceMatch;
      }

      return true;
    });
  }, [queue, selectedFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: queue.length,
      waiting: queue.filter((e) => ['Waiting', 'Waiting for Bay', 'Booking Confirmed', 'Vehicle Received'].includes(e.status)).length,
      in_service: queue.filter((e) => e.status === 'Service In Progress').length,
      washing: queue.filter((e) => e.status === 'Washing').length,
      qc: queue.filter((e) => e.status === 'Quality Check').length,
      ready: queue.filter((e) => e.status === 'Ready for Pickup').length,
    };
  }, [queue]);

  const activeCenter = centers.find((c) => c.id === centerId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-24 selection:bg-blue-600 selection:text-white">
      {/* 1. TOP MOBILE HEADER */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 shadow-lg">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center shadow-md shadow-amber-500/30">
              <Smartphone className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-black text-sm text-white tracking-tight">Workshop Floor</span>
                <span className="px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                  {isTechnician ? 'ASSIGNED HUB ONLY' : 'MOBILE SCREEN'}
                </span>
              </div>
              <div className="flex items-center space-x-1 text-[11px] text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-semibold text-emerald-400">Live WS Sync</span>
                <span>•</span>
                <span className="truncate max-w-[150px] sm:max-w-[220px]">
                  {activeCenter?.name || `Center #${centerId}`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Chimes' : 'Enable Chimes'}
              className={`p-2 rounded-xl border text-xs transition cursor-pointer ${
                soundEnabled
                  ? 'bg-slate-800 text-amber-400 border-amber-500/30'
                  : 'bg-slate-900 text-slate-500 border-slate-800'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {onSwitchToDesktop && (
              <button
                onClick={onSwitchToDesktop}
                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center space-x-1 border border-slate-700 transition cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop View</span>
              </button>
            )}
          </div>
        </div>

        {/* Center Switcher + Quick Search Bar */}
        <div className="mt-3 flex items-center space-x-2">
          {!isTechnician && centers.length > 1 && (
            <select
              value={centerId}
              onChange={(e) => setCenterId(Number(e.target.value))}
              className="bg-slate-800/90 border border-slate-700 text-xs rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-amber-500 font-medium max-w-[130px] sm:max-w-[180px] truncate"
            >
              {centers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {isTechnician && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 border border-amber-500/30 text-xs font-semibold text-amber-300 shrink-0">
              <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate max-w-[130px] sm:max-w-[200px]">{activeCenter?.name || `Assigned Hub #${centerId}`}</span>
            </div>
          )}

          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search Token (T-01), Plate, Customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Horizontally Scrollable Stage Filter Chips */}
        <div className="mt-2.5 flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1 ${
              selectedFilter === 'all'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/90 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <span>All</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-black">{counts.all}</span>
          </button>

          <button
            onClick={() => setSelectedFilter('waiting')}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1 ${
              selectedFilter === 'waiting'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800/90 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <span>Waiting</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-black">{counts.waiting}</span>
          </button>

          <button
            onClick={() => setSelectedFilter('in_service')}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1 ${
              selectedFilter === 'in_service'
                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-800/90 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <span>In Service</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-black">{counts.in_service}</span>
          </button>

          <button
            onClick={() => setSelectedFilter('washing')}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1 ${
              selectedFilter === 'washing'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-slate-800/90 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <span>Washing</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-black">{counts.washing}</span>
          </button>

          <button
            onClick={() => setSelectedFilter('qc')}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1 ${
              selectedFilter === 'qc'
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                : 'bg-slate-800/90 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <span>QC Inspection</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-black">{counts.qc}</span>
          </button>

          <button
            onClick={() => setSelectedFilter('ready')}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center space-x-1 ${
              selectedFilter === 'ready'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/90 text-slate-400 hover:text-white border border-slate-700/60'
            }`}
          >
            <span>Ready</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px] font-black">{counts.ready}</span>
          </button>
        </div>
      </div>
      </header>

      {/* 2. MAIN VEHICLE CARD STREAM - RESPONSIVE SIDE-BY-SIDE GRID */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">
        {loading && queue.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-400">Loading Floor Vehicles...</p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="py-16 text-center bg-slate-900/60 border border-slate-800/80 rounded-3xl p-8 space-y-3 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h3 className="font-bold text-white text-base">No Vehicles in this Section</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              {searchQuery
                ? `No vehicles match "${searchQuery}". Clear search to view all.`
                : 'All bays and stages are cleared. New online bookings or walk-ins will appear live.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-slate-800 text-amber-400 text-xs font-bold rounded-xl mt-2 cursor-pointer"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch w-full">
            {filteredQueue.map((entry) => {
              const cfg = STAGE_CONFIG[entry.status] || STAGE_CONFIG['Waiting'];
              const isUpdating = updatingEntryId === entry.id;

              return (
                <div
                  key={entry.id}
                  className={`bg-slate-900/90 border rounded-2xl p-4 sm:p-5 shadow-xl transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                    entry.status === 'Ready for Pickup'
                      ? 'border-emerald-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20'
                      : entry.status === 'Service In Progress'
                      ? 'border-blue-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950/20'
                      : entry.status === 'Washing'
                      ? 'border-cyan-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/20'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Card Top: Token, Status & Position */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        {/* Token Badge */}
                        <div className="px-3 py-1.5 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-mono font-black text-base shadow-md shadow-blue-600/30 tracking-tight">
                          {entry.token_number}
                        </div>

                        <div>
                          {/* Vehicle Registration Plate */}
                          <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-yellow-400/10 border border-yellow-400/30 text-yellow-300 font-mono text-xs font-black tracking-wider">
                            <span className="text-[9px] text-yellow-500 font-sans mr-1">IND</span>
                            {entry.vehicle_registration || 'NO PLATE'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate max-w-[170px] sm:max-w-[210px]">
                            {entry.vehicle_model} • {entry.vehicle_type}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-bold text-slate-400 block">
                          Queue #{entry.queue_position}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Wait: ~{entry.estimated_waiting_minutes}m
                        </span>
                      </div>
                    </div>

                    {/* Customer & Service Info Bar */}
                    <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="text-slate-300 truncate max-w-[180px]">
                        <span className="font-semibold text-white block truncate">{entry.customer_name}</span>
                        <span className="text-slate-500 text-[11px] block">{entry.customer_phone}</span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium text-[11px] inline-block border border-slate-700">
                          {entry.service_type}
                        </span>
                      </div>
                    </div>

                    {/* Bay & Mechanic Allocation Bar */}
                    <div className="flex items-center justify-between text-xs bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60">
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <span className="text-slate-500">Bay:</span>
                        <span className="font-bold text-white">
                          {entry.bay_number ? `Bay ${entry.bay_number}` : 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-400">
                        <span className="text-slate-500">Tech:</span>
                        <span className="font-bold text-amber-400 truncate max-w-[130px]">
                          {entry.mechanic_name || 'Floor Pool'}
                        </span>
                      </div>
                    </div>

                    {/* Current Stage Indicator */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>

                      <button
                        onClick={() => setEditEntry(entry)}
                        className="text-[11px] font-bold text-slate-400 hover:text-white underline underline-offset-2 cursor-pointer"
                      >
                        Change Stage...
                      </button>
                    </div>
                  </div>

                  {/* 3. GIANT 1-TAP ACTION BUTTON */}
                  <div className="pt-3">
                    {cfg.nextStage ? (
                      <button
                        onClick={() => handleQuickAdvance(entry)}
                        disabled={isUpdating}
                        className={`w-full py-3 rounded-xl font-black text-sm tracking-wide shadow-lg transition-all flex items-center justify-center space-x-2 cursor-pointer active:scale-[0.98] ${
                          cfg.nextStage === 'Completed'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/30'
                            : cfg.nextStage === 'Ready for Pickup'
                            ? 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white shadow-emerald-600/30'
                            : cfg.nextStage === 'Washing'
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/30'
                            : cfg.nextStage === 'Quality Check'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/30'
                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-600/30'
                        }`}
                      >
                        {isUpdating ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Updating Stage...</span>
                          </>
                        ) : (
                          <>
                            <span>{cfg.nextAction}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="w-full py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/60 text-center text-xs font-bold text-emerald-400 flex items-center justify-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>Service Fully Completed</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* 4. STICKY BOTTOM BAR */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 px-4 py-2.5 shadow-2xl">
        <div className="max-w-4xl mx-auto flex items-center justify-around sm:justify-center sm:gap-16">
          <button
            onClick={() => {
              setSelectedFilter('all');
              setSearchQuery('');
            }}
            className={`flex flex-col items-center space-y-1 transition cursor-pointer ${
              selectedFilter === 'all' && !searchQuery ? 'text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px]">Queue ({queue.length})</span>
          </button>

          {/* Quick Walk-In Button */}
          <button
            onClick={() => setShowWalkInModal(true)}
            className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Walk-In Token</span>
          </button>

          {/* Bays Occupancy Button */}
          <button
            onClick={() => setShowBaysDrawer(true)}
            className="flex flex-col items-center space-y-1 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <Wrench className="w-5 h-5" />
            <span className="text-[10px]">
              Bays ({bays.filter((b) => b.status === 'Available').length}/{bays.length})
            </span>
          </button>
        </div>
      </nav>

      {/* 5. FLOATING CONFIRMATION TOAST */}
      {toastMessage && (
        <div className="fixed top-20 inset-x-4 max-w-sm mx-auto z-50 bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-amber-500/40 animate-slide-up flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">{toastMessage.title}</h4>
            <p className="text-xs text-slate-200 mt-0.5 leading-relaxed">{toastMessage.desc}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 6. MODAL: WALK-IN TOKEN REGISTRATION */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create Floor Walk-In Token</h3>
                  <p className="text-xs text-slate-400">Vehicle arrived at workshop driveway</p>
                </div>
              </div>
              <button
                onClick={() => setShowWalkInModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateWalkIn} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Vehicle Registration Plate *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GJ 01 AB 1234"
                  value={walkinReg}
                  onChange={(e) => setWalkinReg(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono uppercase text-yellow-300 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={walkinType}
                    onChange={(e) => setWalkinType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Sedan">Sedan</option>
                    <option value="SUV">SUV</option>
                    <option value="Hatchback">Hatchback</option>
                    <option value="Luxury">Luxury</option>
                    <option value="EV">Electric (EV)</option>
                    <option value="Bike">Bike / Two-Wheeler</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Service Required
                  </label>
                  <select
                    value={walkinService}
                    onChange={(e) => setWalkinService(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="General Service">General Service (~60m)</option>
                    <option value="Oil Change">Oil Change Fast (~30m)</option>
                    <option value="Car Wash">Car Wash & Vacuum (~25m)</option>
                    <option value="Brake Service">Brake Service (~45m)</option>
                    <option value="AC Service">AC Service (~40m)</option>
                    <option value="Minor Accident Repair">Minor Repair (~90m)</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWalkIn}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/25 cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {isSubmittingWalkIn ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Generate Token</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. MODAL: STAGE OVERRIDE / CUSTOM REASSIGNMENT */}
      {editEntry && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono font-bold text-amber-400">Token {editEntry.token_number}</span>
                <h3 className="text-base font-bold text-white">Change Vehicle Stage</h3>
                <p className="text-xs text-slate-400">{editEntry.vehicle_registration} • {editEntry.customer_name}</p>
              </div>
              <button onClick={() => setEditEntry(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Select Target Stage
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {STAGE_SEQUENCE.map((stage) => {
                  const isCurrent = editEntry.status === stage;
                  return (
                    <button
                      key={stage}
                      onClick={() => handleCustomUpdate(stage)}
                      className={`p-2.5 rounded-xl text-left text-xs font-bold transition flex items-center space-x-2 cursor-pointer border ${
                        isCurrent
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700/60'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
                      <span className="truncate">{stage}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setEditEntry(null)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. DRAWER: BAYS OVERVIEW */}
      {showBaysDrawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border-t border-slate-800 w-full max-w-xl rounded-t-3xl p-6 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Wrench className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Workshop Bays Status</h3>
              </div>
              <button onClick={() => setShowBaysDrawer(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {bays.map((bay) => (
                <div
                  key={bay.id}
                  className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    bay.status === 'Available'
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                      : 'bg-blue-950/30 border-blue-500/40 text-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-sm">Bay {bay.bay_number}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        bay.status === 'Available' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                      }`}
                    >
                      {bay.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">{bay.supported_service_type}</div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowBaysDrawer(false)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
