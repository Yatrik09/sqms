import React from 'react';
import { Building2, MapPin, Clock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import type { CenterRecommendationItem } from '../types';

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
    <div className="space-y-5">
      {/* Top Recommended Banner Card */}
      <div
        className={`bg-white rounded-[28px] p-6 sm:p-7 border transition shadow-none ${
          selectedCenterId === recommended.service_center_id
            ? 'border-2 border-[#0071e3] ring-1 ring-[#0071e3]'
            : 'border-[#d6d6d6] hover:border-[#86868b]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#d6d6d6] pb-4 mb-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6] flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#f5f5f7] text-[#0071e3] border border-[#d6d6d6]">
                  Recommended Choice
                </span>
                {recommended.distance_km <= 4.0 && (
                  <span className="text-[11px] font-medium uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#f0f9eb] text-emerald-800 border border-[#c2e7b0] flex items-center">
                    <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
                    Nearest Workshop
                  </span>
                )}
                <span className="text-[12px] font-normal text-[#707070]">Score: {recommended.recommendation_score}/100</span>
              </div>
              <h3 className="text-[18px] font-semibold text-[#1d1d1f] tracking-tight mt-0.5">{recommended.name}</h3>
              <p className="text-[13px] text-[#707070] flex items-center mt-0.5">
                {recommended.address} •{' '}
                <strong className={`ml-1 font-medium ${recommended.distance_km <= 4.0 ? 'text-emerald-700' : 'text-[#1d1d1f]'}`}>
                  {recommended.distance_km} km away {recommended.distance_km <= 4.0 ? '(Closest Proximity)' : ''}
                </strong>
              </p>
            </div>
          </div>

          <button
            onClick={() => onSelectCenter(recommended.service_center_id)}
            className={`px-5 py-2.5 rounded-full text-[12px] font-normal transition flex items-center justify-center space-x-1.5 shadow-none cursor-pointer ${
              selectedCenterId === recommended.service_center_id
                ? 'bg-emerald-600 text-white'
                : 'bg-[#0071e3] hover:bg-[#0077ed] text-white'
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#f5f5f7] p-4 rounded-[20px] mb-3 border border-[#d6d6d6]">
          <div>
            <span className="text-[11px] font-medium text-[#707070] uppercase tracking-wider block">Estimated Wait</span>
            <span className="text-[16px] font-semibold text-[#1d1d1f]">{recommended.predicted_waiting_minutes} mins</span>
            <span className="text-[11px] text-[#b64400] block font-medium">
              Queue turnaround
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#707070] uppercase tracking-wider block">Service Duration</span>
            <span className="text-[16px] font-semibold text-[#1d1d1f]">{recommended.predicted_service_minutes} mins</span>
            <span className="text-[11px] text-[#707070] block">Bay servicing</span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#707070] uppercase tracking-wider block">Expected Completion</span>
            <span className="text-[16px] font-semibold text-[#0066cc]">{recommended.predicted_completion_time}</span>
            <span className="text-[11px] text-emerald-700 block font-medium">
              Ready by {recommended.predicted_completion_time}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#707070] uppercase tracking-wider block">Live Capacity</span>
            <span className="text-[13px] font-medium text-[#1d1d1f]">
              {recommended.available_bays} bays / {recommended.available_mechanics} mechs free
            </span>
          </div>
        </div>

        {/* Slot Feasibility & Capacity Indicator */}
        <div className="flex flex-wrap items-center gap-2 text-[12px] font-medium">
          {recommended.is_time_feasible ? (
            <span className="flex items-center text-emerald-800 bg-[#f0f9eb] px-3.5 py-1.5 rounded-full border border-[#c2e7b0]">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0" />
              {recommended.slot_availability_status || recommended.feasibility_status}
            </span>
          ) : (
            <span className="flex items-center text-[#cf1322] bg-[#fff1f0] px-3.5 py-1.5 rounded-full border border-[#ffccc7]">
              <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-[#cf1322] shrink-0" />
              {recommended.slot_availability_status || recommended.feasibility_status}
            </span>
          )}
        </div>
      </div>

      {/* Alternative Options */}
      {alternatives.length > 0 && (
        <div className="mt-6">
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-3">
            Alternative Service Centers ({alternatives.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {alternatives.map((alt) => (
              <div
                key={alt.service_center_id}
                onClick={() => onSelectCenter(alt.service_center_id)}
                className={`p-5 rounded-[24px] border transition cursor-pointer bg-white flex flex-col justify-between shadow-none ${
                  selectedCenterId === alt.service_center_id
                    ? 'border-2 border-[#0071e3] ring-1 ring-[#0071e3]'
                    : 'border-[#d6d6d6] hover:border-[#86868b]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="text-[15px] font-semibold text-[#1d1d1f]">{alt.name}</h5>
                      <p className="text-[12px] text-[#707070] flex items-center mt-0.5">
                        <MapPin className="w-3.5 h-3.5 mr-1 text-[#86868b]" />
                        {alt.distance_km} km away • {alt.workload_label} Workload
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-[#1d1d1f] bg-[#f5f5f7] border border-[#d6d6d6] px-2.5 py-0.5 rounded-full">
                      Score: {alt.recommendation_score}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3.5 text-[12px] bg-[#f5f5f7] p-2.5 rounded-[14px] text-center border border-[#d6d6d6]">
                    <div>
                      <span className="text-[10px] text-[#707070] block uppercase">Wait</span>
                      <span className="font-semibold text-[#1d1d1f]">{alt.predicted_waiting_minutes}m</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#707070] block uppercase">Duration</span>
                      <span className="font-semibold text-[#1d1d1f]">{alt.predicted_service_minutes}m</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#707070] block uppercase">Ready Time</span>
                      <span className="font-semibold text-[#0066cc]">{alt.predicted_completion_time}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center justify-between text-[12px] pt-2.5 border-t border-[#d6d6d6]">
                  <span className={alt.is_time_feasible ? 'text-emerald-700 font-medium flex items-center' : 'text-[#b64400] font-medium flex items-center'}>
                    {alt.is_time_feasible ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" />
                        <span>Slot Open ({alt.distance_km} km)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 mr-1 text-[#b64400] shrink-0" />
                        <span>At Capacity for slot</span>
                      </>
                    )}
                  </span>
                  <button className="text-[#0066cc] font-medium hover:underline flex items-center">
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
