import React from 'react';
import { Building2, MapPin, Clock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import type { CenterRecommendationItem } from '../types';
import { calculateTurnTime, calculateCompletionTime } from '../utils/formatters';

interface RecommendationCardProps {
  recommended: CenterRecommendationItem;
  alternatives: CenterRecommendationItem[];
  onSelectCenter: (centerId: number) => void;
  selectedCenterId?: number;
}

export const RecommendationCard: React.FC<RecommendationCardProps> = ({
  recommended,
  alternatives,
  onSelectCenter,
  selectedCenterId,
}) => {
  return (
    <div className="space-y-4">
      {/* Top Recommended Banner Card */}
      <div
        className={`bg-white rounded-2xl p-6 border transition shadow-sm ${
          selectedCenterId === recommended.service_center_id
            ? 'border-blue-600 ring-4 ring-blue-500/10'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60">
                  Recommended Choice
                </span>
                <span className="text-xs font-semibold text-slate-400">Score: {recommended.recommendation_score}/100</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mt-0.5">{recommended.name}</h3>
              <p className="text-xs text-slate-500 flex items-center mt-0.5">
                {recommended.address} •{' '}
                <strong className={`ml-1 font-semibold ${recommended.distance_km <= 4.0 ? 'text-emerald-700' : 'text-slate-700'}`}>
                  {recommended.distance_km} km away {recommended.distance_km <= 4.0 ? '(Nearby Proximity)' : ''}
                </strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => onSelectCenter(recommended.service_center_id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer ${
              selectedCenterId === recommended.service_center_id
                ? 'bg-emerald-600 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {selectedCenterId === recommended.service_center_id ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Selected Center</span>
              </>
            ) : (
              <>
                <span>Select This Center</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        {/* Prediction Metrics row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl mb-3 border border-slate-100">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Estimated Wait</span>
            <span className="text-base font-bold text-slate-800">{recommended.predicted_waiting_minutes} mins</span>
            <span className="text-[10px] text-amber-700 block font-semibold">
              Turn: {calculateTurnTime(new Date(), recommended.predicted_waiting_minutes)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Service Duration</span>
            <span className="text-base font-bold text-slate-800">{recommended.predicted_service_minutes} mins</span>
            <span className="text-[10px] text-slate-500 block">Bay servicing</span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Expected Completion</span>
            <span className="text-base font-bold text-blue-600">{recommended.predicted_completion_time}</span>
            <span className="text-[10px] text-emerald-700 block font-semibold">
              Ready: {calculateCompletionTime(new Date(), recommended.predicted_waiting_minutes + recommended.predicted_service_minutes)}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Live Capacity</span>
            <span className="text-xs font-bold text-slate-700">
              {recommended.available_bays} bays / {recommended.available_mechanics} mechs free
            </span>
          </div>
        </div>

        {/* Feasibility Indicator */}
        <div className="flex items-center space-x-2 text-xs font-semibold">
          {recommended.is_time_feasible ? (
            <span className="flex items-center text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
              {recommended.feasibility_status}
            </span>
          ) : (
            <span className="flex items-center text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-amber-600 shrink-0" />
              {recommended.feasibility_status}
            </span>
          )}
        </div>
      </div>

      {/* Alternative Options */}
      {alternatives.length > 0 && (
        <div className="mt-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            Alternative Service Centers ({alternatives.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alternatives.map((alt) => (
              <div
                key={alt.service_center_id}
                onClick={() => onSelectCenter(alt.service_center_id)}
                className={`p-4 rounded-xl border transition cursor-pointer bg-white flex flex-col justify-between ${
                  selectedCenterId === alt.service_center_id
                    ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="text-sm font-bold text-slate-900">{alt.name}</h5>
                      <p className="text-[11px] text-slate-500 flex items-center mt-0.5">
                        <MapPin className="w-3 h-3 mr-1 text-slate-400" />
                        {alt.distance_km} km away • {alt.workload_label} Workload ({Math.round(alt.current_workload * 100)}%)
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                      Score: {alt.recommendation_score}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 text-xs bg-slate-50 p-2 rounded-lg text-center">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Wait</span>
                      <span className="font-bold text-slate-700">{alt.predicted_waiting_minutes}m</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Duration</span>
                      <span className="font-bold text-slate-700">{alt.predicted_service_minutes}m</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase">Completion</span>
                      <span className="font-bold text-blue-600">{alt.predicted_completion_time}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] pt-2 border-t border-slate-100">
                  <span className={alt.is_time_feasible ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                    {alt.is_time_feasible ? '● Likely in time' : '▲ Deadline tight'}
                  </span>
                  <button className="text-blue-600 font-semibold hover:underline flex items-center">
                    Select <ArrowRight className="w-3 h-3 ml-0.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
