import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { QueueEntry, ServiceBay, Mechanic } from '../types';
import {
  Smartphone, RefreshCw, Search, CheckCircle2, Clock, Wrench, Sparkles,
  ArrowRight, ShieldCheck, Car, Phone, Filter, ChevronRight, X, Plus,
  Layers, Check, AlertCircle, Volume2, VolumeX, Eye, ArrowLeft, Building2, Lock
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
    color: 'bg-[#f5f5f7] text-[#1d1d1f] border-[#d6d6d6]',
    nextStage: 'Vehicle Received',
    nextAction: 'Mark Vehicle Received',
  },
  'Vehicle Received': {
    label: 'Vehicle Received',
    color: 'bg-blue-50 text-[#0071e3] border-blue-200',
    nextStage: 'Service In Progress',
    nextAction: 'Move to Bay & Start Service',
  },
  'Waiting': {
    label: 'Waiting in Driveway',
    color: 'bg-amber-50 text-amber-900 border-amber-200',
    nextStage: 'Service In Progress',
    nextAction: 'Assign Bay & Start Service',
  },
  'Waiting for Bay': {
    label: 'Waiting for Bay',
    color: 'bg-amber-50 text-amber-900 border-amber-200',
    nextStage: 'Service In Progress',
    nextAction: 'Assign Bay & Start Service',
  },
  'Service In Progress': {
    label: 'In Service Bay',
    color: 'bg-indigo-50 text-indigo-900 border-indigo-200',
    nextStage: 'Washing',
    nextAction: 'Service Done → Send to Washing',
  },
  'Washing': {
    label: 'Washing Bay',
    color: 'bg-cyan-50 text-cyan-900 border-cyan-200',
    nextStage: 'Quality Check',
    nextAction: 'Washing Done → Send to QC',
  },
  'Quality Check': {
    label: 'Quality Check Inspection',
    color: 'bg-purple-50 text-purple-900 border-purple-200',
    nextStage: 'Ready for Pickup',
    nextAction: 'Pass QC → Mark Ready for Pickup',
  },
  'Ready for Pickup': {
    label: 'Ready for Pickup',
    color: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    nextStage: 'Completed',
    nextAction: 'Customer Handover (Complete)',
  },
  'Completed': {
    label: 'Service Completed',
    color: 'bg-emerald-50 text-emerald-800 border-emerald-300',
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

  // Poll with 20s background sync + auto-trigger on WebSocket message
  useEffect(() => {
    loadFloorData();
    const interval = setInterval(loadFloorData, 20000); // 20s background sync
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

  // Helper to check dedicated bay capacity for a specific service type
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
    const occupied = matchingBays.filter((b) => b.status === 'Occupied');
    return {
      total,
      available: available.length,
      occupied: occupied.length,
      isFull: total > 0 && available.length === 0,
      availableBays: available,
    };
  };

  // Handle 1-Tap Quick Advance with strict bay capacity enforcement
  const handleQuickAdvance = async (entry: QueueEntry) => {
    const cfg = STAGE_CONFIG[entry.status];
    if (!cfg) return;

    const nextStatus = cfg.nextStage;
    if (!nextStatus) return;

    // Strict bay capacity check for In Service transition
    if (nextStatus === 'Service In Progress') {
      const cap = getBayCapacityForService(entry.service_type);
      if (cap.isFull && !entry.assigned_bay_id) {
        alert(
          `⚠️ Bay Capacity Limit Reached:\n\nOnly ${cap.total} bay${cap.total !== 1 ? 's are' : ' is'} available for "${entry.service_type || 'General Service'}", and all ${cap.total} are currently occupied.\n\nSystem does not allow adding or starting a 3rd car for "${entry.service_type || 'General Service'}" until an active bay is completed and freed.`
        );
        return;
      }
    }

    setUpdatingEntryId(entry.id);

    // Auto-pick available matching bay if going into service
    let bayId = entry.assigned_bay_id;
    if (!bayId && nextStatus === 'Service In Progress') {
      const cap = getBayCapacityForService(entry.service_type);
      if (cap.availableBays.length > 0) {
        bayId = cap.availableBays[0].id;
      }
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

  // Handle custom status update from modal with capacity check
  const handleCustomUpdate = async (newStatus: string, bayId?: number, mechId?: number) => {
    if (!editEntry) return;

    if (newStatus === 'Service In Progress') {
      const cap = getBayCapacityForService(editEntry.service_type);
      if (cap.isFull && !editEntry.assigned_bay_id && !bayId) {
        alert(
          `⚠️ Bay Capacity Limit Reached:\n\nOnly ${cap.total} bay${cap.total !== 1 ? 's are' : ' is'} available for "${editEntry.service_type || 'General Service'}", and all ${cap.total} are currently occupied.\n\nSystem does not allow adding or starting a 3rd car for "${editEntry.service_type || 'General Service'}" until an active bay is completed and freed.`
        );
        return;
      }
    }

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
    <div className="min-h-screen bg-white text-[#1d1d1f] flex flex-col font-sans pb-24 selection:bg-[#0071e3] selection:text-white">
      {/* 1. TOP MOBILE HEADER */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-[#e6e6e8] px-4 py-3 shadow-none">
        <div className="max-w-7xl mx-auto w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#f5f5f7] border border-[#d6d6d6] flex items-center justify-center p-1">
                <img src="/logo-icon.png" alt="DriveOps" className="w-6 h-6 object-contain" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-semibold text-sm text-[#1d1d1f] tracking-tight">DriveOps Floor</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#f5f5f7] text-[#707070] border border-[#d6d6d6] text-[10px] font-medium">
                    {isTechnician ? 'ASSIGNED HUB ONLY' : 'MOBILE SCREEN'}
                  </span>
                </div>
                <div className="flex items-center space-x-1 text-[11px] text-[#707070]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-emerald-600">Live WS Sync</span>
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
                className={`p-2 rounded-full border text-xs transition cursor-pointer ${
                  soundEnabled
                    ? 'bg-[#f5f5f7] text-[#0071e3] border-[#d6d6d6]'
                    : 'bg-white text-[#86868b] border-[#e6e6e8]'
                }`}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {onSwitchToDesktop && (
                <button
                  onClick={onSwitchToDesktop}
                  className="px-3 py-1.5 rounded-full bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-medium flex items-center space-x-1.5 border border-[#d6d6d6] transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-[#0071e3]" />
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
                className="bg-white border border-[#d6d6d6] text-xs rounded-full px-3 py-2 text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] font-medium max-w-[140px] sm:max-w-[200px] truncate"
              >
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            {isTechnician && (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-xs font-semibold text-[#1d1d1f] shrink-0">
                <Building2 className="w-3.5 h-3.5 text-[#0071e3] shrink-0" />
                <span className="truncate max-w-[130px] sm:max-w-[200px]">{activeCenter?.name || `Assigned Hub #${centerId}`}</span>
              </div>
            )}

            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#86868b]" />
              <input
                type="text"
                placeholder="Search Token (T-01), Plate, Customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-8 py-2 bg-[#f5f5f7] border border-[#e6e6e8] rounded-full text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] focus:bg-white transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-[#86868b] hover:text-[#1d1d1f]"
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
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                selectedFilter === 'all'
                  ? 'bg-[#1d1d1f] text-white shadow-none'
                  : 'bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#707070] hover:text-[#1d1d1f] border border-[#e6e6e8]'
              }`}
            >
              <span>All</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${selectedFilter === 'all' ? 'bg-white/20 text-white' : 'bg-black/5 text-[#707070]'}`}>{counts.all}</span>
            </button>

            <button
              onClick={() => setSelectedFilter('waiting')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                selectedFilter === 'waiting'
                  ? 'bg-[#1d1d1f] text-white shadow-none'
                  : 'bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#707070] hover:text-[#1d1d1f] border border-[#e6e6e8]'
              }`}
            >
              <span>Waiting</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${selectedFilter === 'waiting' ? 'bg-white/20 text-white' : 'bg-black/5 text-[#707070]'}`}>{counts.waiting}</span>
            </button>

            <button
              onClick={() => setSelectedFilter('in_service')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                selectedFilter === 'in_service'
                  ? 'bg-[#0071e3] text-white shadow-none'
                  : 'bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#707070] hover:text-[#1d1d1f] border border-[#e6e6e8]'
              }`}
            >
              <span>In Service</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${selectedFilter === 'in_service' ? 'bg-white/20 text-white' : 'bg-black/5 text-[#707070]'}`}>{counts.in_service}</span>
            </button>

            <button
              onClick={() => setSelectedFilter('washing')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                selectedFilter === 'washing'
                  ? 'bg-[#1d1d1f] text-white shadow-none'
                  : 'bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#707070] hover:text-[#1d1d1f] border border-[#e6e6e8]'
              }`}
            >
              <span>Washing</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${selectedFilter === 'washing' ? 'bg-white/20 text-white' : 'bg-black/5 text-[#707070]'}`}>{counts.washing}</span>
            </button>

            <button
              onClick={() => setSelectedFilter('qc')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                selectedFilter === 'qc'
                  ? 'bg-[#1d1d1f] text-white shadow-none'
                  : 'bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#707070] hover:text-[#1d1d1f] border border-[#e6e6e8]'
              }`}
            >
              <span>QC Inspection</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${selectedFilter === 'qc' ? 'bg-white/20 text-white' : 'bg-black/5 text-[#707070]'}`}>{counts.qc}</span>
            </button>

            <button
              onClick={() => setSelectedFilter('ready')}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition cursor-pointer flex items-center space-x-1.5 ${
                selectedFilter === 'ready'
                  ? 'bg-[#10b981] text-white shadow-none'
                  : 'bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#707070] hover:text-[#1d1d1f] border border-[#e6e6e8]'
              }`}
            >
              <span>Ready</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${selectedFilter === 'ready' ? 'bg-white/20 text-white' : 'bg-black/5 text-[#707070]'}`}>{counts.ready}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN VEHICLE CARD STREAM - RESPONSIVE SIDE-BY-SIDE GRID */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto w-full">
        {loading && queue.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#0071e3] animate-spin mx-auto" />
            <p className="text-sm font-medium text-[#707070]">Loading Floor Vehicles...</p>
          </div>
        ) : filteredQueue.length === 0 ? (
          <div className="py-16 text-center bg-[#fafafc] border border-[#d6d6d6] rounded-[28px] p-8 space-y-3 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] border border-[#e6e6e8] flex items-center justify-center mx-auto text-[#0071e3]">
              <CheckCircle2 className="w-6 h-6 text-[#10b981]" />
            </div>
            <h3 className="font-semibold text-[#1d1d1f] text-base">No Vehicles in this Section</h3>
            <p className="text-xs text-[#707070] max-w-xs mx-auto leading-relaxed">
              {searchQuery
                ? `No vehicles match "${searchQuery}". Clear search to view all.`
                : 'All bays and stages are cleared. New online bookings or walk-ins will appear live.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-white border border-[#d6d6d6] text-[#0071e3] text-xs font-medium rounded-full mt-2 cursor-pointer hover:bg-[#f5f5f7]"
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
                  className="bg-white border border-[#d6d6d6] rounded-[28px] p-5 shadow-none transition-all duration-200 relative overflow-hidden flex flex-col justify-between hover:border-[#86868b]"
                >
                  <div className="space-y-3">
                    {/* Card Top: Token, Status & Position */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        {/* Token Badge */}
                        <div className="px-3 py-1.5 rounded-xl bg-[#0071e3] text-white font-mono font-semibold text-base shadow-none tracking-tight">
                          {entry.token_number}
                        </div>

                        <div>
                          {/* Vehicle Registration Plate */}
                          <div className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#fafafc] border border-[#d6d6d6] text-[#1d1d1f] font-mono text-xs font-bold tracking-wider">
                            <span className="text-[9px] text-[#86868b] font-sans mr-1 font-semibold">IND</span>
                            {entry.vehicle_registration || 'NO PLATE'}
                          </div>
                          <div className="text-[11px] text-[#707070] font-medium mt-0.5 truncate max-w-[170px] sm:max-w-[210px]">
                            {entry.vehicle_model} • {entry.vehicle_type}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-semibold text-[#1d1d1f] block">
                          Queue #{entry.queue_position}
                        </span>
                        <span className="text-[10px] text-[#707070] font-medium">
                          Wait: ~{entry.estimated_waiting_minutes}m
                        </span>
                      </div>
                    </div>

                    {/* Customer & Service Info Bar */}
                    <div className="pt-2.5 border-t border-[#e6e6e8] flex items-center justify-between text-xs">
                      <div className="text-[#1d1d1f] truncate max-w-[180px]">
                        <span className="font-semibold text-[#1d1d1f] block truncate">{entry.customer_name}</span>
                        <span className="text-[#707070] text-[11px] block">{entry.customer_phone}</span>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#1d1d1f] font-medium text-[11px] inline-block border border-[#e6e6e8]">
                          {entry.service_type}
                        </span>
                      </div>
                    </div>

                    {/* Bay & Mechanic Allocation Bar */}
                    <div className="flex items-center justify-between text-xs bg-[#fafafc] rounded-xl p-2.5 border border-[#e6e6e8]">
                      <div className="flex items-center space-x-1.5 text-[#707070]">
                        <span>Bay:</span>
                        <span className="font-semibold text-[#1d1d1f]">
                          {entry.bay_number ? `Bay ${entry.bay_number}` : 'Unassigned'}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-[#707070]">
                        <span>Tech:</span>
                        <span className="font-semibold text-[#0071e3] truncate max-w-[130px]">
                          {entry.mechanic_name || 'Floor Pool'}
                        </span>
                      </div>
                    </div>

                    {/* Current Stage Indicator */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>

                      <button
                        onClick={() => setEditEntry(entry)}
                        className="text-[11px] font-medium text-[#0066cc] hover:underline cursor-pointer"
                      >
                        Change Stage...
                      </button>
                    </div>
                  </div>

                  {/* 3. GIANT 1-TAP ACTION BUTTON WITH CAPACITY LIMIT CHECK */}
                  <div className="pt-3">
                    {cfg.nextStage ? (() => {
                      const isStartingService = cfg.nextStage === 'Service In Progress';
                      const bayCap = isStartingService ? getBayCapacityForService(entry.service_type) : null;
                      const isBayBlocked = isStartingService && bayCap && bayCap.isFull && !entry.assigned_bay_id;

                      if (isBayBlocked) {
                        return (
                          <div className="space-y-1.5">
                            <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-tight flex items-center space-x-2">
                              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                              <span>
                                Only <strong>{bayCap?.total} bays</strong> available for {entry.service_type || 'General Service'} (all {bayCap?.total} busy). System cannot start 3rd vehicle until an active bay finishes.
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                alert(
                                  `⚠️ Bay Capacity Reached:\n\nOnly ${bayCap?.total} bays are available for "${entry.service_type || 'General Service'}", and all ${bayCap?.total} are currently occupied.\n\nSystem does not allow adding or starting a 3rd car for "${entry.service_type || 'General Service'}" until an active bay is completed and freed.`
                                );
                              }}
                              className="w-full py-3 rounded-full font-medium text-xs tracking-wide border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 flex items-center justify-center space-x-2 cursor-pointer transition shadow-none"
                            >
                              <Lock className="w-4 h-4 text-amber-600" />
                              <span>Bays Full ({bayCap?.total}/{bayCap?.total} {entry.service_type || 'General Service'} In Use)</span>
                            </button>
                          </div>
                        );
                      }

                      return (
                        <button
                          onClick={() => handleQuickAdvance(entry)}
                          disabled={isUpdating}
                          className="w-full py-3 rounded-full font-medium text-xs sm:text-sm tracking-normal shadow-none transition-all flex items-center justify-center space-x-2 cursor-pointer bg-[#0071e3] hover:bg-[#0077ed] text-white active:scale-[0.99]"
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
                      );
                    })() : (
                      <div className="w-full py-2.5 rounded-full bg-emerald-50 border border-emerald-200 text-center text-xs font-semibold text-emerald-800 flex items-center justify-center space-x-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/90 backdrop-blur-xl border-t border-[#e6e6e8] px-4 py-2.5 shadow-none">
        <div className="max-w-4xl mx-auto flex items-center justify-around sm:justify-center sm:gap-16">
          <button
            onClick={() => {
              setSelectedFilter('all');
              setSearchQuery('');
            }}
            className={`flex flex-col items-center space-y-1 transition cursor-pointer ${
              selectedFilter === 'all' && !searchQuery ? 'text-[#0071e3] font-semibold' : 'text-[#707070] hover:text-[#1d1d1f]'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px]">Queue ({queue.length})</span>
          </button>

          {/* Quick Walk-In Button */}
          <button
            onClick={() => setShowWalkInModal(true)}
            className="flex items-center space-x-1.5 px-5 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs shadow-none transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>+ Walk-In Token</span>
          </button>

          {/* Bays Occupancy Button */}
          <button
            onClick={() => setShowBaysDrawer(true)}
            className="flex flex-col items-center space-y-1 text-[#707070] hover:text-[#1d1d1f] transition cursor-pointer"
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
        <div className="fixed top-20 inset-x-4 max-w-sm mx-auto z-50 bg-white/95 backdrop-blur-md text-[#1d1d1f] p-4 rounded-2xl shadow-xl border border-[#d6d6d6] animate-slide-up flex items-start space-x-3">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-semibold text-[#1d1d1f] uppercase tracking-wider">{toastMessage.title}</h4>
            <p className="text-xs text-[#707070] mt-0.5 leading-relaxed">{toastMessage.desc}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-[#86868b] hover:text-[#1d1d1f] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 6. MODAL: WALK-IN TOKEN REGISTRATION */}
      {showWalkInModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white border border-[#d6d6d6] w-full max-w-md rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl space-y-4 text-[#1d1d1f]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e6e8]">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-[#f5f5f7] text-[#0071e3]">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-[#1d1d1f]">Create Floor Walk-In Token</h3>
                  <p className="text-xs text-[#707070]">Vehicle arrived at workshop driveway</p>
                </div>
              </div>
              <button
                onClick={() => setShowWalkInModal(false)}
                className="w-8 h-8 rounded-full bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#707070] hover:text-[#1d1d1f] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWalkIn} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#707070] uppercase tracking-wider mb-1">
                  Vehicle Registration Plate *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GJ 01 AB 1234"
                  value={walkinReg}
                  onChange={(e) => setWalkinReg(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-sm font-mono uppercase text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] font-semibold shadow-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#707070] uppercase tracking-wider mb-1">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] shadow-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#707070] uppercase tracking-wider mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3] font-mono shadow-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#707070] uppercase tracking-wider mb-1">
                    Vehicle Type
                  </label>
                  <select
                    value={walkinType}
                    onChange={(e) => setWalkinType(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
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
                  <label className="block text-[11px] font-semibold text-[#707070] uppercase tracking-wider mb-1">
                    Service Required
                  </label>
                  <select
                    value={walkinService}
                    onChange={(e) => setWalkinService(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#d6d6d6] rounded-xl text-xs text-[#1d1d1f] focus:outline-none focus:border-[#0071e3]"
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

              {/* Real-time Bay Capacity Indicator for Selected Walk-In Service */}
              {(() => {
                const wCap = getBayCapacityForService(walkinService);
                if (wCap.isFull) {
                  return (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed flex items-start space-x-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">Only {wCap.total} bays configured for {walkinService} (All {wCap.total} Occupied)</strong>
                        <span>System cannot start service immediately. This vehicle will join the driveway waiting queue until an active bay finishes.</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center space-x-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span><strong>{wCap.available} of {wCap.total} bays</strong> available for {walkinService}.</span>
                  </div>
                );
              })()}

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="px-4 py-2 rounded-full border border-[#86868b] text-xs font-medium text-[#1d1d1f] hover:bg-[#f5f5f7] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWalkIn}
                  className="px-5 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-medium text-xs shadow-none cursor-pointer disabled:opacity-50 flex items-center space-x-1.5"
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white border border-[#d6d6d6] w-full max-w-md rounded-t-[28px] sm:rounded-[28px] p-6 shadow-2xl space-y-4 text-[#1d1d1f]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e6e8]">
              <div>
                <span className="text-xs font-mono font-semibold text-[#0071e3]">Token {editEntry.token_number}</span>
                <h3 className="text-base font-semibold text-[#1d1d1f]">Change Vehicle Stage</h3>
                <p className="text-xs text-[#707070]">{editEntry.vehicle_registration} • {editEntry.customer_name}</p>
              </div>
              <button
                onClick={() => setEditEntry(null)}
                className="w-8 h-8 rounded-full bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#707070] hover:text-[#1d1d1f] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-[#707070] uppercase tracking-wider">
                Select Target Stage
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {STAGE_SEQUENCE.map((stage) => {
                  const isCurrent = editEntry.status === stage;
                  return (
                    <button
                      key={stage}
                      onClick={() => handleCustomUpdate(stage)}
                      className={`p-2.5 rounded-xl text-left text-xs font-medium transition flex items-center space-x-2 cursor-pointer border ${
                        isCurrent
                          ? 'bg-[#0071e3] text-white border-[#0071e3]'
                          : 'bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#1d1d1f] border-[#e6e6e8]'
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
                className="w-full py-2.5 rounded-full border border-[#86868b] text-[#1d1d1f] hover:bg-[#f5f5f7] text-xs font-medium transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. DRAWER: BAYS OVERVIEW */}
      {showBaysDrawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border-t border-[#d6d6d6] w-full max-w-xl rounded-t-[28px] p-6 shadow-2xl space-y-4 max-h-[80vh] overflow-y-auto text-[#1d1d1f]">
            <div className="flex items-center justify-between pb-3 border-b border-[#e6e6e8]">
              <div className="flex items-center space-x-2">
                <Wrench className="w-5 h-5 text-[#0071e3]" />
                <h3 className="text-base font-semibold text-[#1d1d1f]">Workshop Bays Status</h3>
              </div>
              <button
                onClick={() => setShowBaysDrawer(false)}
                className="w-8 h-8 rounded-full bg-[#f5f5f7] hover:bg-[#e6e6e8] text-[#707070] hover:text-[#1d1d1f] flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {bays.map((bay) => (
                <div
                  key={bay.id}
                  className={`p-3 rounded-2xl border text-xs space-y-1 ${
                    bay.status === 'Available'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-blue-50 border-blue-200 text-blue-900'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">Bay {bay.bay_number}</span>
                    <span
                      className={`px-2 py-0.2 rounded-full text-[10px] font-medium ${
                        bay.status === 'Available' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {bay.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#707070] truncate">{bay.supported_service_type}</div>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowBaysDrawer(false)}
                className="w-full py-2.5 rounded-full border border-[#86868b] text-[#1d1d1f] hover:bg-[#f5f5f7] text-xs font-medium cursor-pointer"
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
