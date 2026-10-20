import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../services/api';
import {
  X, Play, Zap, Flame, ShieldAlert, RefreshCw, PlusCircle, CheckCircle2, Sliders, ArrowRight
} from 'lucide-react';

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden text-white relative z-[10000]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Live Demonstration & Scenario Controls</h2>
              <p className="text-xs text-slate-400">Trigger live workshop workload surges and queue recalculations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border flex items-center space-x-2 ${
                message.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/60 border-red-500/40 text-red-300'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{message.text}</span>
            </div>
          )}

          {/* Select Target Service Center */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Target Service Center for Simulation
            </label>
            <select
              value={centerId}
              onChange={(e) => setCenterId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value={1}>Center 01 — Apex Central Hub (Ahmedabad Navrangpura)</option>
              <option value={2}>Center 02 — Apex West Express (Bodakdev)</option>
              <option value={3}>Center 03 — Apex South Bay (Maninagar)</option>
              <option value={4}>Center 04 — Apex Ring Road Facility (SG Highway)</option>
              <option value={8}>Center 08 — Horizon Motors Gota</option>
              <option value={11}>Center 11 — Apex Prime Gandhinagar (Infocity)</option>
            </select>
          </div>

          {/* Section 1: Workload Simulation */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Workload & Traffic Simulation
            </span>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                disabled={loading}
                onClick={() => handleSetWorkload('normal')}
                className="flex flex-col items-center p-3 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700/80 transition text-center group"
              >
                <Zap className="w-5 h-5 text-emerald-400 mb-1 group-hover:scale-110 transition" />
                <span className="text-xs font-bold text-slate-200">Normal</span>
                <span className="text-[10px] text-slate-400">~40% load / bays open</span>
              </button>

              <button
                disabled={loading}
                onClick={() => handleSetWorkload('high')}
                className="flex flex-col items-center p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 transition text-center group"
              >
                <Flame className="w-5 h-5 text-amber-400 mb-1 group-hover:scale-110 transition" />
                <span className="text-xs font-bold text-amber-300">High Workload</span>
                <span className="text-[10px] text-amber-200/70">~75% load / queue delay</span>
              </button>

              <button
                disabled={loading}
                onClick={() => handleSetWorkload('peak')}
                className="flex flex-col items-center p-3 rounded-xl border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 transition text-center group"
              >
                <ShieldAlert className="w-5 h-5 text-red-400 mb-1 group-hover:scale-110 transition" />
                <span className="text-xs font-bold text-red-300">Peak Surge</span>
                <span className="text-[10px] text-red-200/70">~92% load / bays full</span>
              </button>
            </div>
          </div>

          {/* Section 2: Queue Dynamics & Fast Forward */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Live Queue Ingestion & Progression
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                disabled={loading}
                onClick={() => handleAddBatch(3)}
                className="flex items-center justify-center space-x-2 p-3 rounded-xl border border-blue-500/30 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 text-xs font-semibold transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Inject 3 Walk-in Vehicles</span>
              </button>

              <button
                disabled={loading}
                onClick={handleAdvanceStatus}
                className="flex items-center justify-center space-x-2 p-3 rounded-xl border border-purple-500/30 bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold transition"
              >
                <Play className="w-4 h-4" />
                <span>Advance Vehicle Stage</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 italic">
              Demonstrates real-time update: When a technician advances a vehicle (e.g. Washing → Completed), subsequent waiting vehicles immediately receive recalculations over WebSockets without a page refresh!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
