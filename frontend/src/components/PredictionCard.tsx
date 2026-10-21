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
    <div className="bg-white text-[#1d1d1f] rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#d6d6d6] pb-4 mb-5 gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#f5f5f7] border border-[#d6d6d6] flex items-center justify-center text-[#0071e3]">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-semibold text-[#1d1d1f] tracking-tight">AI Turnaround Prediction</h3>
            <p className="text-[13px] text-[#707070]">Real-time Bayesian ML Regression & Dynamic Queue Telemetry</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`px-3 py-1 rounded-full text-[12px] font-medium border ${
              isML
                ? 'bg-[#f5f5f7] text-[#0066cc] border-[#d6d6d6]'
                : 'bg-[#f5f5f7] text-[#b64400] border-[#d6d6d6]'
            }`}
          >
            {prediction.prediction_source} ({prediction.model_version})
          </span>
        </div>
      </div>

      {/* Real-time Dynamic Clock Strip */}
      <div className="bg-[#f5f5f7] border border-[#d6d6d6] rounded-[20px] p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[13px]">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[#707070]">
            Live Workshop Clock: <strong className="text-[#1d1d1f] font-mono font-semibold">{formatClockTime(currentTime)}</strong>
          </span>
        </div>
        <div className="flex items-center space-x-3 text-[13px] text-[#707070] flex-wrap gap-y-1">
          <span>
            Expected Turn: <strong className="text-[#b64400] font-semibold">{turnTime}</strong> (~{prediction.waiting_time_minutes}m wait)
          </span>
          <span className="hidden sm:inline text-[#d6d6d6]">•</span>
          <span>
            Service Completion: <strong className="text-emerald-700 font-semibold">{completionTime}</strong> (~{prediction.total_turnaround_minutes}m total)
          </span>
        </div>
      </div>

      {/* 3 Main Predicted Values */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Waiting Time / Expected Turn */}
        <div className="bg-[#f5f5f7] border border-[#d6d6d6] rounded-[20px] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#707070] text-[12px] font-medium">
            <span>Your Turn Arrives</span>
            <Clock className="w-4 h-4 text-[#b64400]" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] tracking-tight">{turnTime}</span>
          </div>
          <span className="text-[12px] text-[#707070] mt-1.5">
            Starts in ~{prediction.waiting_time_minutes} mins (bay allocation)
          </span>
        </div>

        {/* Service Duration */}
        <div className="bg-[#f5f5f7] border border-[#d6d6d6] rounded-[20px] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#707070] text-[12px] font-medium">
            <span>Service Duration</span>
            <Gauge className="w-4 h-4 text-[#0066cc]" />
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] tracking-tight">{prediction.service_duration_minutes}</span>
            <span className="text-[13px] text-[#707070]">minutes</span>
          </div>
          <span className="text-[12px] text-[#707070] mt-1.5">Active bay servicing</span>
        </div>

        {/* Expected Completion */}
        <div className="bg-[#f5f5f7] border border-[#d6d6d6] rounded-[20px] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#707070] text-[12px] font-medium">
            <span>Expected Completion</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2.5">
            <span className="text-2xl sm:text-3xl font-semibold text-emerald-700 tracking-tight">
              {completionTime}
            </span>
          </div>
          <span className="text-[12px] text-[#707070] mt-1.5">Ready for pickup in ~{prediction.total_turnaround_minutes} mins</span>
        </div>
      </div>

      {/* Contributing Factors & Explainability (Only if explicitly enabled) */}
      {showExplanation && (
        <div className="bg-[#fafafc] rounded-[20px] p-5 border border-[#d6d6d6] mt-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-[#0071e3]" />
              <span>AI Contributing Explanatory Conditions</span>
            </span>
            <span className="text-[11px] text-[#86868b]">Updated: {lastUpdated}</span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] text-[#707070]">
            {prediction.contributing_factors.map((factor, idx) => (
              <li key={idx} className="flex items-center space-x-2 bg-white px-3 py-2 rounded-[12px] border border-[#d6d6d6]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0071e3] shrink-0" />
                <span className="truncate text-[#1d1d1f]">{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
