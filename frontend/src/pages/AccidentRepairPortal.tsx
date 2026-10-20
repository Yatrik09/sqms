import React, { useState } from 'react';
import { api } from '../services/api';
import { RecommendationCard } from '../components/RecommendationCard';
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-red-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-red-900/50">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
            Accident Repair Assistance
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2 text-white">
            AI-Assisted Damage Assessment & Center Routing
          </h1>
          <p className="text-slate-300 text-xs mt-1 max-w-xl">
            Upload incident photos for preliminary damage classification and intelligent routing to service centers with specialized body-repair bays.
          </p>
        </div>

        <div className="bg-red-900/40 border border-red-500/30 px-4 py-2.5 rounded-2xl text-xs text-red-200">
          <span className="font-bold block">Important Notice:</span>
          <span>Preliminary decision support only. Final inspection performed on-site.</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Form & Upload */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg space-y-5">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Incident & Damage Assessment</h3>
            <p className="text-xs text-slate-500">Provide photos and damage description for specialized bay allocation.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Presets */}
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
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
                  className="p-2 border rounded-xl text-left bg-slate-50 hover:bg-slate-100 transition"
                >
                  <span className="font-bold block text-slate-800">Scenario 1: Minor</span>
                  <span className="text-[10px] text-slate-500">Bumper dent / scratch</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSelectPreset(
                      'Structural Frame & Suspension',
                      'Major collision, radiator leaking, airbag deployed, heavy frame misalignment.'
                    )
                  }
                  className="p-2 border rounded-xl text-left bg-red-50/50 hover:bg-red-50 transition border-red-200"
                >
                  <span className="font-bold block text-red-800">Scenario 2: Major</span>
                  <span className="text-[10px] text-red-600">Structural collision</span>
                </button>
              </div>
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Upload Vehicle Damage Photo
              </label>
              <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:bg-slate-50 transition cursor-pointer relative">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                <span className="text-xs font-semibold text-slate-700 block">Click to upload photo</span>
                <span className="text-[10px] text-slate-400">PNG, JPG, WebP up to 10MB</span>
                {previewUrl && (
                  <div className="mt-3">
                    <img src={previewUrl} alt="Damage preview" className="h-28 mx-auto rounded-lg object-cover shadow" />
                  </div>
                )}
              </div>
            </div>

            {/* Visible Damage Area */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Visible Damage Area
              </label>
              <select
                value={damageArea}
                onChange={(e) => setDamageArea(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500"
              >
                <option value="Front Bumper & Grille">Front Bumper & Grille</option>
                <option value="Side Doors & Panels">Side Doors & Panels</option>
                <option value="Rear Bumper & Trunk">Rear Bumper & Trunk</option>
                <option value="Structural Frame & Suspension">Structural Frame & Suspension (Major)</option>
                <option value="Windshield & Glass">Windshield & Glass</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Damage Description
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe visible damage, fluid leaks, or airbag deployment..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Required Completion Time */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                Preferred Completion Deadline
              </label>
              <input
                type="text"
                value={requiredTime}
                onChange={(e) => setRequiredTime(e.target.value)}
                placeholder="e.g. 06:00 PM"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-red-500/25 transition flex items-center justify-center space-x-2"
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
              <div className="bg-white rounded-3xl p-6 border-2 border-red-500/30 shadow-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Preliminary AI Classification
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                      result.preliminary_category === 'Major Damage'
                        ? 'bg-red-100 text-red-800 border border-red-300'
                        : result.preliminary_category === 'Moderate Damage'
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    }`}
                  >
                    {result.preliminary_category}
                  </span>
                </div>

                <h3 className="text-xl font-black text-slate-900">
                  Assigned Workflow: {result.service_type_assigned}
                </h3>

                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>University Research & Engineering Disclaimer</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{result.disclaimer}</p>
                </div>
              </div>

              {/* Recommended Centers for Accident Repair */}
              {result.recommendations && result.recommendations.recommended_center && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
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
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Assessment Submitted Yet</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                Submit damage photos or select one of the demonstration scenarios on the left to receive preliminary AI classification and tailored center recommendations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
