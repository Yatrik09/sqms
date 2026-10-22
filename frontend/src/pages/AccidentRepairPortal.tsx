import React, { useState } from 'react';
import { api } from '../services/api';
import { RecommendationCard } from '../components/RecommendationCard';
import { SelectDropdown } from '../components/SelectDropdown';
import {
  ShieldAlert, UploadCloud, AlertCircle, CheckCircle2, ArrowRight, RefreshCw, Sparkles, Car
} from 'lucide-react';

export const AccidentRepairPortal: React.FC = () => {
  const [damageArea, setDamageArea] = useState<string>('Front Bumper & Grille');
  const [description, setDescription] = useState<string>('Collision at low speed, bumper cracked, minor radiator dent.');
  const [vehicleType, setVehicleType] = useState<string>('Sedan');
  const [requiredTime, setRequiredTime] = useState<string>('06:00 PM');
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      setPreviewUrl(URL.createObjectURL(f));
    }
  };

  const handleSelectPreset = (presetArea: string, presetDesc: string) => {
    setDamageArea(presetArea);
    setDescription(presetDesc);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('damage_area', damageArea);
      formData.append('description', description);
      formData.append('vehicle_type', vehicleType);
      if (requiredTime) formData.append('required_completion_time', requiredTime);
      if (file) formData.append('file', file);

      const res = await api.submitPreliminaryAssessment(formData);
      setResult(res);
    } catch (e: any) {
      alert(e.message || 'Assessment submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2 sm:pb-4 space-y-8 bg-white text-[#1d1d1f]">
      {/* Header */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 text-[#1d1d1f] shadow-none flex flex-col md:flex-row md:items-center justify-between gap-6 border border-[#d6d6d6]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
            Accident Repair Assistance
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold mt-2 text-[#1d1d1f] tracking-tight">
            AI-Assisted Damage Assessment & Center Routing
          </h1>
          <p className="text-[#707070] text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Upload incident photos for preliminary damage classification and intelligent routing to service centers with specialized body-repair bays.
          </p>
        </div>

        <div className="bg-[#f5f5f7] border border-[#d6d6d6] px-4 py-2.5 rounded-[20px] text-xs text-[#707070]">
          <span className="font-semibold text-[#1d1d1f] block">Important Notice:</span>
          <span>Preliminary decision support only. Final inspection performed on-site.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Upload */}
        <div className="lg:col-span-5 bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-5">
          <div>
            <h3 className="text-lg font-semibold text-[#1d1d1f]">Incident & Damage Assessment</h3>
            <p className="text-xs text-[#707070]">Provide photos and damage description for specialized bay allocation.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Presets */}
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#707070] block mb-1.5">
                Quick Demonstration Scenarios
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    handleSelectPreset(
                      'Front Bumper & Fender',
                      'Minor frontal impact, bumper displaced, headlights intact, no chassis damage.'
                    )
                  }
                  className="p-3 border rounded-[16px] text-left bg-[#f5f5f7] hover:bg-[#e6e6e8] transition border-[#d6d6d6] cursor-pointer"
                >
                  <span className="font-semibold block text-[#1d1d1f]">Scenario 1: Minor</span>
                  <span className="text-[11px] text-[#707070]">Bumper dent / scratch</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSelectPreset(
                      'Structural Frame & Suspension',
                      'Major collision, radiator leaking, airbag deployed, heavy frame misalignment.'
                    )
                  }
                  className="p-3 border rounded-[16px] text-left bg-[#f5f5f7] hover:bg-[#e6e6e8] transition border-[#d6d6d6] cursor-pointer"
                >
                  <span className="font-semibold block text-[#b64400]">Scenario 2: Major</span>
                  <span className="text-[11px] text-[#707070]">Structural collision</span>
                </button>
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-xs font-medium text-[#1d1d1f] mb-1.5">
                Upload Vehicle Damage Photo
              </label>
              <div className="border border-dashed border-[#d6d6d6] rounded-[20px] p-4 text-center hover:bg-[#f5f5f7] transition cursor-pointer relative">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-8 h-8 text-[#86868b] mx-auto mb-1" />
                <span className="text-xs font-medium text-[#1d1d1f] block">Click to upload photo</span>
                <span className="text-[10px] text-[#86868b]">PNG, JPG, WebP up to 10MB</span>
                {previewUrl && (
                  <div className="mt-3">
                    <img src={previewUrl} alt="Damage preview" className="h-28 mx-auto rounded-[12px] object-cover shadow-none border border-[#d6d6d6]" />
                  </div>
                )}
              </div>
            </div>

            {/* Visible Damage Area */}
            <div>
              <label className="block text-xs font-medium text-[#1d1d1f] mb-1.5">
                Visible Damage Area
              </label>
              <SelectDropdown
                value={damageArea}
                onChange={setDamageArea}
                options={[
                  { value: 'Front Bumper & Grille', label: 'Front Bumper & Grille' },
                  { value: 'Side Doors & Panels', label: 'Side Doors & Panels' },
                  { value: 'Rear Bumper & Trunk', label: 'Rear Bumper & Trunk' },
                  { value: 'Structural Frame & Suspension', label: 'Structural Frame & Suspension (Major)' },
                  { value: 'Windshield & Glass', label: 'Windshield & Glass' },
                ]}
                placeholder="Select damage area"
                buttonClassName="bg-white text-xs h-10 rounded-xl"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-[#1d1d1f] mb-1.5">
                Damage Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe visible damage, fluid leaks, or airbag deployment..."
                className="w-full px-3 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs font-medium text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
              />
            </div>

            {/* Required Completion Time */}
            <div>
              <label className="block text-xs font-medium text-[#1d1d1f] mb-1.5">
                Preferred Completion Deadline
              </label>
              <input
                type="text"
                value={requiredTime}
                onChange={(e) => setRequiredTime(e.target.value)}
                placeholder="e.g. 06:00 PM"
                className="w-full px-3 py-2.5 bg-white border border-[#d6d6d6] rounded-xl text-xs font-medium text-[#1d1d1f] placeholder-[#86868b] focus:outline-none focus:border-[#0071e3]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-medium text-xs shadow-none transition flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loading ? 'Evaluating Damage & Centers...' : 'Analyze & Find Eligible Centers'}</span>
            </button>
          </form>
        </div>

        {/* Right Column: AI Damage Classification & Recommended Centers */}
        <div className="lg:col-span-7 space-y-6">
          {result ? (
            <div className="space-y-6">
              {/* Classification Badge Card */}
              <div className="bg-white rounded-[28px] p-6 border border-[#d6d6d6] shadow-none space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#707070]">
                    Preliminary AI Classification
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium uppercase border ${
                      result.preliminary_category === 'Major Damage'
                        ? 'bg-[#f5f5f7] text-[#b64400] border-[#d6d6d6]'
                        : result.preliminary_category === 'Moderate Damage'
                        ? 'bg-[#f5f5f7] text-[#1d1d1f] border-[#d6d6d6]'
                        : 'bg-[#f5f5f7] text-emerald-700 border-[#d6d6d6]'
                    }`}
                  >
                    {result.preliminary_category}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-[#1d1d1f]">
                  Assigned Workflow: {result.service_type_assigned}
                </h3>

                <div className="bg-[#f5f5f7] border border-[#e6e6e8] p-4 rounded-[20px] text-xs text-[#1d1d1f] space-y-1">
                  <div className="font-semibold flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-[#707070] shrink-0" />
                    <span>University Research & Engineering Disclaimer</span>
                  </div>
                  <p className="text-[11px] text-[#707070] leading-relaxed">{result.disclaimer}</p>
                </div>
              </div>

              {/* Recommended Centers for Accident Repair */}
              {result.recommendations && result.recommendations.recommended_center && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#707070] mb-3">
                    Capable Service Centers with Body & Accident Repair Capacity
                  </h4>
                  <RecommendationCard
                    recommended={result.recommendations.recommended_center}
                    alternatives={result.recommendations.alternative_centers}
                    onSelectCenter={(id) => alert(`Selected Center #${id} for accident repair booking.`)}
                    selectedCenterId={result.recommendations.recommended_center.service_center_id}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-[28px] p-12 border border-[#d6d6d6] text-center shadow-none">
              <div className="w-16 h-16 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#1d1d1f] flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8 text-[#0071e3]" />
              </div>
              <h3 className="text-lg font-semibold text-[#1d1d1f]">No Assessment Submitted Yet</h3>
              <p className="text-[#707070] text-xs mt-1 max-w-sm mx-auto leading-relaxed">
                Submit damage photos or select one of the demonstration scenarios on the left to receive preliminary AI classification and tailored center recommendations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
