import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, Cpu, Gauge, Layers, Sparkles } from 'lucide-react';
import type { PredictionResult } from '../types';
import { calculateTurnTime, calculateCompletionTime, formatClockTime } from '../utils/formatters';

interface PredictionCardProps {
  prediction: PredictionResult;
  lastUpdated?: string;
  showExplanation?: boolean;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({
  prediction,
  lastUpdated = 'Just now',
  showExplanation = false,
}) => {
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // Dynamic real-time clock ticker updating every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const isML = prediction.prediction_source?.includes('ML');
  const turnTime = calculateTurnTime(currentTime, prediction.waiting_time_minutes);
  const completionTime = calculateCompletionTime(currentTime, prediction.total_turnaround_minutes);

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white rounded-2xl p-6 border border-slate-700 shadow-xl relative overflow-hidden">
      {/* Background glowing ambient element */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-700/60 pb-4 mb-4 gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide uppercase">AI Turnaround Prediction</h3>
            <p className="text-[11px] text-slate-400">Real-time Bayesian ML Regression & Dynamic Queue Forecasting</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              isML
                ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
            }`}
          >
            {prediction.prediction_source} ({prediction.model_version})
          </span>
        </div>
      </div>

      {/* Real-time Dynamic Clock Strip */}
      <div className="bg-slate-950/60 border border-blue-500/30 rounded-xl p-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-semibold">
            Live Clock: <strong className="text-white font-mono">{formatClockTime(currentTime)}</strong>
          </span>
        </div>
        <div className="flex items-center space-x-3 text-xs font-semibold text-slate-200 flex-wrap gap-y-1">
          <span>
            Expected Turn: <strong className="text-amber-300 font-bold">{turnTime}</strong> (~{prediction.waiting_time_minutes}m wait)
          </span>
          <span className="hidden sm:inline">•</span>
          <span>
            Service Completion: <strong className="text-emerald-400 font-bold">{completionTime}</strong> (~{prediction.total_turnaround_minutes}m total)
          </span>
        </div>
      </div>

      {/* 3 Main Predicted Values */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Waiting Time / Expected Turn */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Your Turn Arrives</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-300 tracking-tight">{turnTime}</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 font-medium">
            Starts in ~{prediction.waiting_time_minutes} mins (bay allocation)
          </span>
        </div>

        {/* Service Duration */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Service Duration</span>
            <Gauge className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{prediction.service_duration_minutes}</span>
            <span className="text-xs text-slate-400 font-semibold">minutes</span>
          </div>
          <span className="text-[11px] text-slate-400 mt-1 font-medium">Active bay servicing</span>
        </div>

        {/* Expected Completion */}
        <div className="bg-gradient-to-br from-blue-900/60 to-indigo-900/60 border border-blue-500/40 rounded-xl p-3.5 flex flex-col justify-between shadow-inner">
          <div className="flex items-center justify-between text-blue-200 text-xs font-medium">
            <span>Expected Completion</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-300 tracking-tight">
              {completionTime}
            </span>
          </div>
          <span className="text-[11px] text-blue-300 mt-1 font-medium">Ready for pickup in ~{prediction.total_turnaround_minutes} mins</span>
        </div>
      </div>

      {/* Contributing Factors & Explainability (Only if explicitly enabled) */}
      {showExplanation && (
        <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800/80 mt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-400" />
              <span>AI Contributing Explanatory Conditions</span>
            </span>
            <span className="text-[10px] text-slate-400">Updated: {lastUpdated}</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
            {prediction.contributing_factors.map((factor, idx) => (
              <li key={idx} className="flex items-center space-x-2 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                <span className="truncate">{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
