import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Vehicle, CenterRecommendationItem, RecommendationResponse, ServiceCenter } from '../types';
import { PredictionCard } from '../components/PredictionCard';
import { RecommendationCard } from '../components/RecommendationCard';
import { FranchisePlansModal } from '../components/FranchisePlansModal';
import {
  Car, Clock, Calendar, CheckCircle2, AlertCircle, Plus, Trash2, ArrowRight,
  ShieldCheck, MapPin, Sparkles, RefreshCw, Building2, Navigation, Compass, ChevronDown, Wrench
} from 'lucide-react';
import { POPULAR_AREAS, findClosestArea, getDistanceBadge } from '../utils/geo';
import { AreaSelectDropdown } from '../components/AreaSelectDropdown';
import { cleanDisplayName, calculateTurnTime, calculateCompletionTime } from '../utils/formatters';

const STATUS_STEPS = [
  'Booking Confirmed',
  'Vehicle Received',
  'Waiting',
  'Service In Progress',
  'Quality Check',
  'Ready for Pickup',
  'Completed',
];

const AVAILABLE_SERVICES = [
  'General Service',
  'Oil Change',
  'Car Wash',
  'AC Service',
  'Brake Service',
  'Battery Check',
  'Tyre Service',
  'Electrical Repair',
  'Diagnosis',
  'Denting and Painting',
  'Minor Accident Repair',
  'Major Accident Repair',
];

export const CustomerPortal: React.FC<{ activeTab?: string }> = ({ activeTab = 'active-service' }) => {
  const { user, lastWsEvent } = useAuth();
  const [tab, setTab] = useState<string>(activeTab);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeService, setActiveService] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showPlansModal, setShowPlansModal] = useState<boolean>(false);

  // Booking Form State
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | ''>('');
  const [selectedService, setSelectedService] = useState<string>('General Service');
  const [requiredTime, setRequiredTime] = useState<string>('05:00 PM');
  const [preferredDate, setPreferredDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [bookingNotes, setBookingNotes] = useState<string>('');

  // Recommendation State
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [selectedCenterId, setSelectedCenterId] = useState<number>(1);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);

  // Proximity Location State
  const [userCity, setUserCity] = useState<string>(user?.city || 'Ahmedabad');
  const [userArea, setUserArea] = useState<string>(user?.area || 'Science City');
  const [userLat, setUserLat] = useState<number>(user?.latitude || 23.0784);
  const [userLon, setUserLon] = useState<number>(user?.longitude || 72.5074);
  const [nearbyCenters, setNearbyCenters] = useState<ServiceCenter[]>([]);
  const [loadingCenters, setLoadingCenters] = useState<boolean>(false);
  const [detectingGps, setDetectingGps] = useState<boolean>(false);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);

  // Sync user location from user object
  useEffect(() => {
    if (user?.city) setUserCity(user.city);
    if (user?.area) setUserArea(user.area);
    if (user?.latitude) setUserLat(user.latitude);
    if (user?.longitude) setUserLon(user.longitude);
  }, [user?.city, user?.area, user?.latitude, user?.longitude]);

  // Load nearby centers sorted by distance
  const loadNearbyCenters = async (lat?: number, lon?: number) => {
    setLoadingCenters(true);
    try {
      const list = await api.getServiceCenters(userCity, lat ?? userLat, lon ?? userLon);
      setNearbyCenters(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('Failed to load nearby centers', e);
      setNearbyCenters([]);
    } finally {
      setLoadingCenters(false);
    }
  };

  useEffect(() => {
    loadNearbyCenters(userLat, userLon);
  }, [userCity, userLat, userLon]);

  const handleAreaChange = (newAreaName: string) => {
    const matched = POPULAR_AREAS.find((a) => a.name.toLowerCase() === newAreaName.toLowerCase());
    if (matched) {
      setUserArea(matched.name);
      setUserCity(matched.city);
      setUserLat(matched.lat);
      setUserLon(matched.lon);
      loadNearbyCenters(matched.lat, matched.lon);
      setLocationNotice(`Active location switched to ${matched.name}. Workshop list sorted by proximity.`);
      setTimeout(() => setLocationNotice(null), 4000);
      api.updateProfile({ area: matched.name, city: matched.city, latitude: matched.lat, longitude: matched.lon }).catch(() => {});
    }
  };

  const handleDetectGps = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Math.round(pos.coords.latitude * 10000) / 10000;
        const lon = Math.round(pos.coords.longitude * 10000) / 10000;
        setUserLat(lat);
        setUserLon(lon);
        const closest = findClosestArea(lat, lon);
        setUserArea(closest.name);
        setUserCity(closest.city);
        setDetectingGps(false);
        loadNearbyCenters(lat, lon);
        setLocationNotice(`GPS detected! Matched nearest area: ${closest.name} (${lat}°N, ${lon}°E).`);
        setTimeout(() => setLocationNotice(null), 4500);
        api.updateProfile({ area: closest.name, city: closest.city, latitude: lat, longitude: lon }).catch(() => {});
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setDetectingGps(false);
        alert('Could not retrieve your GPS location. Please select your area manually.');
      },
      { timeout: 8000 }
    );
  };

  // New Vehicle Modal State
  const [showAddVehicle, setShowAddVehicle] = useState<boolean>(false);
  const [newReg, setNewReg] = useState<string>('');
  const [newType, setNewType] = useState<string>('Sedan');
  const [newModel, setNewModel] = useState<string>('');
  const [newYear, setNewYear] = useState<number>(2023);
  const [newFuel, setNewFuel] = useState<string>('Petrol');

  // Load customer data
  const loadData = async () => {
    try {
      const [vList, active, hist] = await Promise.all([
        api.getMyVehicles().catch(() => []),
        api.getMyActiveService().catch(() => ({ has_active: false })),
        api.getMyHistory().catch(() => []),
      ]);
      const safeVehicles = Array.isArray(vList) ? vList : [];
      setVehicles(safeVehicles);
      if (safeVehicles.length > 0 && selectedVehicleId === '') {
        setSelectedVehicleId(safeVehicles[0].id);
      }
      setActiveService(active);
      setHistory(Array.isArray(hist) ? hist : []);
    } catch (e) {
      console.error('Failed to load customer data', e);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 2500);
    return () => clearInterval(interval);
  }, [user?.id, lastWsEvent]);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  // Handle recommendation query
  const handleFetchRecommendations = async () => {
    setIsSearching(true);
    try {
      const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
      const veh = safeVehicles.find((v) => v.id === selectedVehicleId);
      const res = await api.getRecommendations(
        selectedService,
        veh?.vehicle_type || 'Sedan',
        requiredTime,
        userLat,
        userLon
      );
      setRecommendations(res);
      if (res.recommended_center) {
        setSelectedCenterId(res.recommended_center.service_center_id);
      }
    } catch (e) {
      console.error('Failed to fetch recommendations', e);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (tab === 'book-service') {
      handleFetchRecommendations();
    }
  }, [tab, selectedService, requiredTime, selectedVehicleId, userLat, userLon]);

  // Handle Booking submission
  const handleConfirmBooking = async () => {
    if (!selectedVehicleId) return;
    try {
      const res = await api.createBooking({
        vehicle_id: Number(selectedVehicleId),
        service_center_id: selectedCenterId,
        service_type: selectedService,
        requested_date: preferredDate,
        preferred_time: '10:00 AM',
        required_completion_time: requiredTime,
        notes: bookingNotes,
      });
      setBookingSuccess(res);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Booking failed');
    }
  };

  // Add vehicle
  const handleAddVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addVehicle({
        registration_number: newReg,
        vehicle_type: newType,
        model: newModel,
        year: newYear,
        fuel_type: newFuel,
      });
      setShowAddVehicle(false);
      setNewReg('');
      setNewModel('');
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to add vehicle');
    }
  };

  const handleDeleteVehicle = async (id: number) => {
    if (!confirm('Are you sure you want to delete this vehicle?')) return;
    try {
      await api.deleteVehicle(id);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to delete vehicle');
    }
  };

  const getStepStatus = (stepName: string, currentStatus: string) => {
    const stepIdx = STATUS_STEPS.indexOf(stepName);
    const currIdx = STATUS_STEPS.indexOf(currentStatus);
    if (currIdx === -1) {
      if (currentStatus === 'Washing' && stepName === 'Service In Progress') return 'current';
      if (currentStatus === 'Repair In Progress' && stepName === 'Service In Progress') return 'current';
    }
    if (stepIdx < currIdx) return 'completed';
    if (stepIdx === currIdx) return 'current';
    return 'upcoming';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center space-x-3 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Loading customer data & live queues...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
            Customer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2">Welcome, {cleanDisplayName(user?.name)}</h1>
          <p className="text-slate-300 text-sm mt-1 max-w-xl">
            Real-time digital queue management, AI turnaround predictions, and multi-service-center decision support.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0 flex-wrap gap-2">
          <button
            onClick={() => setTab('book-service')}
            className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs shadow-lg transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book New Service</span>
          </button>
          <button
            onClick={() => setTab('my-vehicles')}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition cursor-pointer"
          >
            <span>My Vehicles ({Array.isArray(vehicles) ? vehicles.length : 0})</span>
          </button>
          <button
            onClick={() => setShowPlansModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-yellow-300" />
            <span>Become Franchise Owner</span>
          </button>
        </div>
      </div>

      {/* Dynamic Proximity Location Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Active Location:</span>
              <span className="text-sm font-black text-white">{userArea}, {userCity}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                GPS: {userLat.toFixed(3)}°N, {userLon.toFixed(3)}°E
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Service centers are automatically ranked by proximity from your location (nearby first, long-distance at the bottom).
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 flex-wrap gap-y-2">
          {/* Quick Area Switcher */}
          <div className="w-56 sm:w-64">
            <AreaSelectDropdown
              value={userArea}
              onChange={handleAreaChange}
              buttonClassName="!py-2 !px-3 !rounded-xl text-xs"
            />
          </div>

          <button
            type="button"
            onClick={handleDetectGps}
            disabled={detectingGps}
            className="px-4 py-2.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            {detectingGps ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-blue-400" />
            )}
            <span>{detectingGps ? 'Locating...' : 'Use Live GPS'}</span>
          </button>
        </div>
      </div>

      {/* Location Switch Toast Notification */}
      {locationNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2.5 shadow-lg animate-in fade-in slide-in-from-top-1 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{locationNotice}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-semibold overflow-x-auto">
        <button
          onClick={() => setTab('active-service')}
          className={`pb-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
            tab === 'active-service' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Live Service Tracking
        </button>
        <button
          onClick={() => setTab('book-service')}
          className={`pb-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
            tab === 'book-service' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Book Service & Recommendation
        </button>
        <button
          onClick={() => setTab('nearby-centers')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
            tab === 'nearby-centers' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <MapPin className="w-4 h-4 text-emerald-600" />
          <span>Nearby Workshops ({nearbyCenters.length})</span>
        </button>
        <button
          onClick={() => setTab('my-vehicles')}
          className={`pb-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
            tab === 'my-vehicles' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          My Vehicles ({vehicles.length})
        </button>
        <button
          onClick={() => setTab('history')}
          className={`pb-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
            tab === 'history' ? 'border-blue-600 text-blue-600 font-bold' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Service History
        </button>
      </div>

      {/* TAB 1: LIVE ACTIVE SERVICE & TIMELINE */}
      {tab === 'active-service' && (
        <div className="space-y-6">
          {activeService && activeService.has_active ? (
            <div className="space-y-6">
              {/* Active Token Hero Card */}
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6 mb-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Active Service Queue</span>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">
                      {activeService.vehicle_registration} • {activeService.vehicle_model}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {activeService.service_center_name} ({activeService.service_center_address})
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-50 border-2 border-blue-600 rounded-2xl px-5 py-2.5 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Digital Token</span>
                      <span className="text-2xl font-black text-blue-700">{activeService.token_number}</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Queue Position</span>
                      <span className="text-xl font-bold text-slate-800">#{activeService.queue_position}</span>
                    </div>
                  </div>
                </div>

                {/* Live Real-Time Expected Turn & Completion Banner */}
                <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Your Turn Arrives</span>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-lg font-black text-slate-900">
                          {calculateTurnTime(new Date(), activeService.estimated_waiting_minutes)}
                        </span>
                        <span className="text-xs text-amber-600 font-bold">
                          (~{activeService.estimated_waiting_minutes} mins wait)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 sm:border-l sm:border-slate-200 sm:pl-6">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500 block">Estimated Service Completion</span>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-lg font-black text-emerald-700">
                          {calculateCompletionTime(new Date(), activeService.estimated_waiting_minutes + activeService.estimated_service_minutes)}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          (~{activeService.estimated_waiting_minutes + activeService.estimated_service_minutes} mins total)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Timeline */}
                <div className="mb-8">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                    Live Workshop Progression
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {STATUS_STEPS.map((step, idx) => {
                      const status = getStepStatus(step, activeService.status);
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border text-center transition flex flex-col justify-between ${
                            status === 'completed'
                              ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                              : status === 'current'
                              ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-md shadow-blue-500/20 animate-pulse-subtle'
                              : 'bg-slate-50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <span className="text-[10px] uppercase tracking-wider opacity-80 block mb-1">
                            Step {idx + 1}
                          </span>
                          <span className="text-xs leading-tight">{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Allocated Bay & Technician Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700">
                      Bay
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Service Bay</span>
                      <p className="text-sm font-bold text-slate-800">{activeService.assigned_bay}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700">
                      Tech
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Technician</span>
                      <p className="text-sm font-bold text-slate-800">{activeService.assigned_mechanic}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live AI Prediction Card */}
              <PredictionCard
                prediction={{
                  waiting_time_minutes: activeService.estimated_waiting_minutes,
                  service_duration_minutes: activeService.estimated_service_minutes,
                  total_turnaround_minutes:
                    activeService.estimated_waiting_minutes + activeService.estimated_service_minutes,
                  expected_completion_time: activeService.expected_completion_time,
                  expected_completion_iso: '',
                  prediction_source: activeService.prediction_source,
                  model_name: 'Gradient Boosting Regressor',
                  model_version: activeService.model_version,
                  contributing_factors: activeService.contributing_factors || [
                    `${activeService.queue_position} vehicle(s) ahead in queue`,
                    `Current status: ${activeService.status}`,
                    'Continuous recalculation active via WebSocket',
                  ],
                  workload_level: 'High',
                }}
                lastUpdated={activeService.last_updated}
              />
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
                <Car className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No Active Service In Queue</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
                You do not currently have a vehicle queued at any service center. Book a service to receive a digital token and real-time AI predictions.
              </p>
              <button
                onClick={() => setTab('book-service')}
                className="mt-6 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition"
              >
                Book a Service Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: BOOK SERVICE & MULTI-CENTER RECOMMENDATION */}
      {tab === 'book-service' && (
        <div className="space-y-6">
          {bookingSuccess ? (
            <div className="bg-emerald-50 border-2 border-emerald-500 rounded-3xl p-8 text-center shadow-lg space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Service Booking Confirmed!</h2>
              <div className="inline-block bg-white px-6 py-3 rounded-2xl border border-emerald-300 shadow-sm">
                <span className="text-xs uppercase font-bold text-slate-400 block">Your Digital Token</span>
                <span className="text-3xl font-black text-emerald-700">{bookingSuccess.token_number}</span>
              </div>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                Estimated Turnaround: ~{bookingSuccess.estimated_waiting_minutes + bookingSuccess.estimated_service_minutes} minutes. Your turn arrives at <strong>{calculateTurnTime(new Date(), bookingSuccess.estimated_waiting_minutes)}</strong> (~{bookingSuccess.estimated_waiting_minutes}m wait) and completion at <strong>{calculateCompletionTime(new Date(), bookingSuccess.estimated_waiting_minutes + bookingSuccess.estimated_service_minutes)}</strong>.
              </p>
              <div className="pt-4 flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setBookingSuccess(null);
                    setTab('active-service');
                  }}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition"
                >
                  View Live Queue Tracking
                </button>
                <button
                  onClick={() => setBookingSuccess(null)}
                  className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition"
                >
                  Book Another Service
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Booking Form */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-lg space-y-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Service Request Details</h3>
                  <p className="text-xs text-slate-500">Provide vehicle specifications and your completion requirement.</p>
                </div>

                {/* 1. Select Vehicle */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Select Vehicle
                  </label>
                  {(!Array.isArray(vehicles) || vehicles.length === 0) ? (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                      No vehicles found. Please add a vehicle first in the My Vehicles tab.
                    </div>
                  ) : (
                    <select
                      value={selectedVehicleId}
                      onChange={(e) => setSelectedVehicleId(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                    >
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.registration_number} — {v.model} ({v.vehicle_type})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* 2. Select Service */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Select Service / Repair Type
                  </label>
                  <select
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {AVAILABLE_SERVICES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Customer Required Completion Time (Section 7) */}
                <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80 space-y-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-blue-600" />
                    Required Completion Time (Optional)
                  </label>
                  <p className="text-[11px] text-blue-800/80">
                    Tell us when you need your vehicle back (e.g. "I need it by 5:00 PM"). The system evaluates feasibility across centers.
                  </p>
                  <input
                    type="text"
                    value={requiredTime}
                    onChange={(e) => setRequiredTime(e.target.value)}
                    placeholder="e.g. 05:00 PM or 17:00"
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 4. Preferred Date */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Service Date
                  </label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* 5. Additional Notes */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                    Specific Symptoms / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="e.g. Unusual noise on braking, AC cooling weak"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Confirm Booking CTA */}
                <button
                  disabled={!selectedVehicleId}
                  onClick={handleConfirmBooking}
                  className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirm Booking & Generate Digital Token</span>
                </button>
              </div>

              {/* Right Column: AI Recommendations Engine Output */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <span>Recommended Service Centers</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Comparing nearby centers by live workload, mechanics, bays, and required completion feasibility.
                    </p>
                  </div>
                  {isSearching && (
                    <div className="flex items-center space-x-1.5 text-xs text-blue-600">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Evaluating...</span>
                    </div>
                  )}
                </div>

                {recommendations && recommendations.recommended_center ? (
                  <RecommendationCard
                    recommended={recommendations.recommended_center}
                    alternatives={recommendations.alternative_centers}
                    onSelectCenter={(id) => setSelectedCenterId(id)}
                    selectedCenterId={selectedCenterId}
                  />
                ) : (
                  <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
                    <span className="text-sm font-medium text-slate-600">Calculating recommendations...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: NEARBY WORKSHOPS (SORTED BY PROXIMITY) */}
      {tab === 'nearby-centers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-emerald-600" />
                <span>Nearby Workshop Branches (Sorted by Distance)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Displaying all active service centers from closest to furthest from <strong>{userArea}, {userCity}</strong>.
              </p>
            </div>

            <button
              onClick={() => setTab('book-service')}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition flex items-center space-x-1.5 cursor-pointer self-start sm:self-center"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>AI Multi-Center Recommendation</span>
            </button>
          </div>

          {loadingCenters ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <span className="text-sm font-medium text-slate-600">Calculating workshop distances & live workloads...</span>
            </div>
          ) : nearbyCenters.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center">
              <p className="text-sm text-slate-500">No active service centers found for {userCity}.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {nearbyCenters.map((c, idx) => {
                const distBadge = getDistanceBadge(c.distance_km ?? 999);
                const isClosest = idx === 0;

                return (
                  <div
                    key={c.id}
                    className={`rounded-3xl p-6 border-2 transition-all duration-200 bg-white shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
                      isClosest
                        ? 'border-emerald-500/80 ring-4 ring-emerald-500/10 shadow-emerald-500/5'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {isClosest && (
                          <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-black tracking-wide uppercase shadow-sm flex items-center space-x-1">
                            <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                            <span>Nearest to You</span>
                          </span>
                        )}

                        <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center space-x-1 ${distBadge.badgeClass}`}>
                          <MapPin className="w-3.5 h-3.5" />
                          <span>{c.distance_km !== undefined ? `${c.distance_km} km away` : 'Distance unavailable'}</span>
                          <span className="opacity-75">({distBadge.label.split(' ')[0]})</span>
                        </span>

                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                          Area: <strong>{c.area}</strong>, {c.city}
                        </span>

                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                          Active Queue: {c.active_queue_count} vehicle(s)
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight flex items-center space-x-2">
                          <span>{c.name}</span>
                        </h4>
                        <p className="text-xs text-slate-500 mt-1 flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-slate-400 shrink-0" />
                          <span>{c.address}</span>
                          <span className="mx-2">•</span>
                          <span>Phone: {c.phone}</span>
                        </p>
                      </div>

                      {/* Workshop Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 max-w-xl text-xs">
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Available Bays</span>
                          <span className="font-extrabold text-slate-800 text-sm">{c.available_bays} of {c.total_bays} free</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Mechanics on Duty</span>
                          <span className="font-extrabold text-slate-800 text-sm">{c.available_mechanics} of {c.total_mechanics} ready</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Current Workload</span>
                          <span className="font-extrabold text-slate-800 text-sm">{Math.round((c.current_workload || 0) * 100)}% ({c.current_workload > 0.7 ? 'High' : c.current_workload > 0.4 ? 'Moderate' : 'Low'})</span>
                        </div>
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Hours</span>
                          <span className="font-extrabold text-slate-800 text-sm">{c.operating_hours_start} - {c.operating_hours_end}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2.5 shrink-0 min-w-[200px]">
                      <button
                        onClick={() => {
                          setSelectedCenterId(c.id);
                          setTab('book-service');
                        }}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-md ${
                          isClosest
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/25'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/25'
                        }`}
                      >
                        <Wrench className="w-4 h-4" />
                        <span>Book Service at this Branch</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="text-center text-[11px] text-slate-400">
                        {isClosest ? 'Recommended for lowest transit time' : `${c.distance_km} km driving distance`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MY VEHICLES */}
      {tab === 'my-vehicles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Registered Vehicles</h3>
              <p className="text-xs text-slate-500">Manage vehicles linked to your service account.</p>
            </div>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('close-sqms-overlays'));
                setShowAddVehicle(true);
              }}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle</span>
            </button>
          </div>

          {(!Array.isArray(vehicles) || vehicles.length === 0) ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <Car className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-800">No Vehicles Registered Yet</h4>
              <p className="text-xs text-slate-500 mt-1 mb-4">Add your car or two-wheeler to book quick AI queue services.</p>
              <button
                onClick={() => setShowAddVehicle(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow hover:bg-blue-700 transition"
              >
                + Register Your First Vehicle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {vehicles.map((v) => (
                <div key={v.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                        {v.vehicle_type}
                      </span>
                      <button
                        onClick={() => handleDeleteVehicle(v.id)}
                        className="text-slate-400 hover:text-red-500 transition cursor-pointer"
                        title="Delete vehicle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="text-xl font-black text-slate-900 mt-3">{v.registration_number}</h4>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">{v.model}</p>
                    <p className="text-xs text-slate-400 mt-1">Year: {v.year} • Fuel: {v.fuel_type}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
                    <span className="text-emerald-600 font-semibold">● Registered</span>
                    <button
                      onClick={() => {
                        setSelectedVehicleId(v.id);
                        setTab('book-service');
                      }}
                      className="text-blue-600 font-bold hover:underline flex items-center cursor-pointer"
                    >
                      Book Service <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Vehicle Modal */}
          {showAddVehicle && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 relative z-[10000]">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-base font-bold text-slate-900">Add New Vehicle</h3>
                  <button onClick={() => setShowAddVehicle(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-lg">
                    ✕
                  </button>
                </div>
                <form onSubmit={handleAddVehicleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Registration Number</label>
                    <input
                      type="text"
                      required
                      value={newReg}
                      onChange={(e) => setNewReg(e.target.value.toUpperCase())}
                      placeholder="e.g. GJ01-AB-1234"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm uppercase font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-sm transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Type</label>
                      <select
                        value={newType}
                        onChange={(e) => setNewType(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-sm transition"
                      >
                        <option value="Sedan">Sedan</option>
                        <option value="SUV">SUV</option>
                        <option value="Hatchback">Hatchback</option>
                        <option value="Luxury">Luxury</option>
                        <option value="Bike">Bike / Two-Wheeler</option>
                        <option value="EV">Electric Vehicle (EV)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Fuel Type</label>
                      <select
                        value={newFuel}
                        onChange={(e) => setNewFuel(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-sm transition"
                      >
                        <option value="Petrol">Petrol</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Electric">Electric</option>
                        <option value="CNG">CNG</option>
                        <option value="Hybrid">Hybrid</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Make & Model</label>
                    <input
                      type="text"
                      required
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="e.g. Honda City ZX"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-sm transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Manufacturing Year</label>
                    <input
                      type="number"
                      required
                      min={2000}
                      max={2026}
                      value={newYear}
                      onChange={(e) => setNewYear(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100 shadow-sm transition"
                    />
                  </div>
                  <div className="pt-3 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddVehicle(false)}
                      className="px-4 py-2 border rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md"
                    >
                      Save Vehicle
                    </button>
                  </div>
                </form>
              </div>
            </div>,
            document.body
          )}
        </div>
      )}

      {/* TAB 4: SERVICE HISTORY */}
      {tab === 'history' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Service Records & Past Bookings</h3>
            <p className="text-xs text-slate-500">History of your service tickets and completion records.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
                <tr>
                  <th className="p-3">Token</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Center</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Requested Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-400">
                      No past service history found.
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/50">
                      <td className="p-3 font-bold text-blue-600">{h.token_number}</td>
                      <td className="p-3 font-semibold text-slate-800">{h.vehicle_reg}</td>
                      <td className="p-3">{h.service_type}</td>
                      <td className="p-3 text-slate-500">{h.service_center}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                          {h.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">{h.requested_date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Franchise Plans & Upgrade Modal */}
      <FranchisePlansModal
        isOpen={showPlansModal}
        onClose={() => setShowPlansModal(false)}
      />
    </div>
  );
};
