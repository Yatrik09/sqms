import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
import { SelectDropdown } from './SelectDropdown';
import {
  X, Play, Zap, Flame, ShieldAlert, RefreshCw, PlusCircle, CheckCircle2, Sliders, ArrowRight
} from 'lucide-react';

const CENTER_OPTIONS = [
  { value: 1, label: 'Center 01 — Apex Central Hub (Navrangpura)' },
  { value: 2, label: 'Center 02 — Apex West Express (Bodakdev)' },
  { value: 3, label: 'Center 03 — Apex South Bay (Maninagar)' },
  { value: 4, label: 'Center 04 — Apex Ring Road Facility (SG Highway)' },
  { value: 8, label: 'Center 08 — Horizon Motors Gota' },
  { value: 11, label: 'Center 11 — Apex Prime Gandhinagar (Infocity)' },
];

interface DemoControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCenterId?: number;
}

export const DemoControlsModal: React.FC<DemoControlsModalProps> = ({
  isOpen,
  onClose,
  selectedCenterId = 1,
}) => {
  useLockBodyScroll(isOpen);
  const [centerId, setCenterId] = useState<number>(selectedCenterId);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSetWorkload = async (level: 'normal' | 'high' | 'peak') => {
    setLoading(true);
    try {
      const res = await api.setDemoWorkload(centerId, level);
      showFeedback(`Workload set to ${level.toUpperCase()} (${(res.new_workload * 100).toFixed(0)}%). Queue predictions recalculated!`);
    } catch (e: any) {
      showFeedback(e.message || 'Failed to set workload', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddBatch = async (count: number) => {
    setLoading(true);
    try {
      const res = await api.addBatchQueue(centerId, count);
      showFeedback(`Added ${count} walk-in vehicles into the live queue: ${res.tokens_added.join(', ')}`);
    } catch (e: any) {
      showFeedback(e.message || 'Failed to add batch vehicles', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStatus = async () => {
    setLoading(true);
    try {
      const res = await api.advanceFirstVehicle(centerId);
      if (res.success) {
        showFeedback(`Vehicle ${res.token_number} transitioned to '${res.status}'. Real-time predictions updated across all clients!`);
      } else {
        showFeedback(res.message || 'No vehicles to advance', 'error');
      }
    } catch (e: any) {
      showFeedback(e.message || 'Failed to advance status', 'error');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200">
      <div className="bg-white border border-[#d6d6d6] w-full max-w-xl rounded-[28px] shadow-2xl overflow-hidden text-[#1d1d1f] relative z-[10000] max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e6e6e8] flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#f5f5f7] text-[#1d1d1f] flex items-center justify-center border border-[#d6d6d6]">
              <Sliders className="w-4 h-4 text-[#0071e3]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#1d1d1f]">Live Demonstration & Scenario Controls</h2>
              <p className="text-xs text-[#707070]">Trigger live workshop workload surges and queue recalculations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#707070] hover:text-[#1d1d1f] hover:bg-[#f5f5f7] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 overflow-y-auto overscroll-contain flex-1">
          {message && (
            <div
              className={`p-3.5 rounded-[20px] text-xs font-medium border flex items-center space-x-2 ${
                message.type === 'success'
                  ? 'bg-[#f5f5f7] border-[#d6d6d6] text-[#1d1d1f]'
                  : 'bg-[#f5f5f7] border-[#b64400] text-[#b64400]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{message.text}</span>
            </div>
          )}

          {/* Select Target Service Center with Design System Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-[#707070] mb-1.5 uppercase tracking-wider">
              Target Service Center for Simulation
            </label>
            <SelectDropdown
              value={centerId}
              onChange={(val) => setCenterId(Number(val))}
              options={CENTER_OPTIONS}
              size="md"
            />
          </div>

          {/* Section 1: Workload Simulation */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#707070] uppercase tracking-wider block">
              Workload & Traffic Simulation
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                disabled={loading}
                onClick={() => handleSetWorkload('normal')}
                className="flex flex-col items-center p-3.5 rounded-[20px] border border-[#d6d6d6] bg-[#f5f5f7] hover:bg-[#e6e6e8] transition text-center cursor-pointer"
              >
                <Zap className="w-5 h-5 text-emerald-600 mb-1" />
                <span className="text-xs font-semibold text-[#1d1d1f]">Normal</span>
                <span className="text-[10px] text-[#707070]">~40% load / bays open</span>
              </button>

              <button
                disabled={loading}
                onClick={() => handleSetWorkload('high')}
                className="flex flex-col items-center p-3.5 rounded-[20px] border border-[#d6d6d6] bg-[#f5f5f7] hover:bg-[#e6e6e8] transition text-center cursor-pointer"
              >
                <Flame className="w-5 h-5 text-[#b64400] mb-1" />
                <span className="text-xs font-semibold text-[#1d1d1f]">High Workload</span>
                <span className="text-[10px] text-[#707070]">~75% load / queue delay</span>
              </button>

              <button
                disabled={loading}
                onClick={() => handleSetWorkload('peak')}
                className="flex flex-col items-center p-3.5 rounded-[20px] border border-[#d6d6d6] bg-[#f5f5f7] hover:bg-[#e6e6e8] transition text-center cursor-pointer"
              >
                <ShieldAlert className="w-5 h-5 text-[#b64400] mb-1" />
                <span className="text-xs font-semibold text-[#b64400]">Peak Surge</span>
                <span className="text-[10px] text-[#707070]">~92% load / bays full</span>
              </button>
            </div>
          </div>

          {/* Section 2: Queue Dynamics & Fast Forward */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#707070] uppercase tracking-wider block">
              Live Queue Ingestion & Progression
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                disabled={loading}
                onClick={() => handleAddBatch(3)}
                className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-full border border-[#86868b] hover:bg-[#f5f5f7] text-[#1d1d1f] text-xs font-medium transition cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-[#0071e3]" />
                <span>Inject 3 Walk-in Vehicles</span>
              </button>

              <button
                disabled={loading}
                onClick={handleAdvanceStatus}
                className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium transition shadow-none cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Advance Vehicle Stage</span>
              </button>
            </div>
            <p className="text-[11px] text-[#707070] pt-1">
              Demonstrates real-time update: When a technician advances a vehicle, subsequent waiting vehicles immediately receive recalculations over WebSockets without a page refresh.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#e6e6e8] bg-white flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full border border-[#d6d6d6] hover:bg-[#f5f5f7] text-xs font-medium text-[#707070] hover:text-[#1d1d1f] transition cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
