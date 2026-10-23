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
  ShieldCheck, MapPin, Sparkles, RefreshCw, Building2, Navigation, Compass, ChevronDown, Wrench, X
} from 'lucide-react';
import { POPULAR_AREAS, findClosestArea, getDistanceBadge } from '../utils/geo';
import { AreaSelectDropdown } from '../components/AreaSelectDropdown';
import { SelectDropdown } from '../components/SelectDropdown';
import { useLockBodyScroll } from '../hooks/useLockBodyScroll';
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

const QUICK_TIME_SLOTS = [
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
  '07:00 PM',
  '08:00 PM',
];

interface CustomerPortalProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  activeTab = 'active-service',
  onTabChange,
}) => {
  const { user, lastWsEvent } = useAuth();
  const [tab, setTab] = useState<string>(activeTab);

  const handleTabSwitch = (newTab: string) => {
    setTab(newTab);
    onTabChange?.(newTab);
  };
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [activeService, setActiveService] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
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
      setNearbyCenters(Array.isArray(list) ? (list as any) : []);
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

  // Prevent background body scrolling when modal is open
  useLockBodyScroll(Boolean(showAddVehicle || showPlansModal));

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
      if (safeVehicles.length > 0) {
        setSelectedVehicleId((prev) => {
          if (prev === '' || !safeVehicles.some((v) => v.id === prev)) {
            return safeVehicles[0].id;
          }
          return prev;
        });
      } else {
        setSelectedVehicleId('');
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
    setSelectedVehicleId('');
    setBookingSuccess(null);
    loadData();
    const interval = setInterval(loadData, 20000); // 20s background sync to prevent screen flickering
    return () => clearInterval(interval);
  }, [user?.id, lastWsEvent]);

  useEffect(() => {
    setTab(activeTab);
  }, [activeTab]);

  // Handle recommendation query with debouncing
  useEffect(() => {
    if (tab !== 'book-service') return;

    setIsSearching(true);
    const timeoutId = setTimeout(async () => {
      try {
        const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
        const veh = safeVehicles.find((v) => v.id === selectedVehicleId) || safeVehicles[0];
        const res = await api.getRecommendations(
          selectedService,
          veh?.vehicle_type || 'Sedan',
          requiredTime,
          userLat,
          userLon,
          preferredDate
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
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [tab, selectedService, requiredTime, preferredDate, selectedVehicleId, userLat, userLon]);

  // Handle Booking submission
  const handleConfirmBooking = async () => {
    let vehicleIdToUse = selectedVehicleId;
    if (!vehicleIdToUse && vehicles.length > 0) {
      vehicleIdToUse = vehicles[0].id;
      setSelectedVehicleId(vehicles[0].id);
    }
    if (!vehicleIdToUse) {
      alert('Please select or add a vehicle first in the My Vehicles tab.');
      return;
    }
    try {
      const res = await api.createBooking({
        vehicle_id: Number(vehicleIdToUse),
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

  if (loading && !activeService && vehicles.length === 0 && history.length === 0) {
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2 sm:pb-4 space-y-6 sm:space-y-8">
      {/* Welcome Banner — Apple 28px White Gallery Card */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 text-[#1d1d1f] border border-[#d6d6d6] shadow-none relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-[12px] font-medium uppercase tracking-wider px-3 py-1 rounded-full bg-[#f5f5f7] text-[#0066cc] border border-[#d6d6d6]">
            Customer Portal
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] tracking-tight mt-2.5">
            Welcome, {cleanDisplayName(user?.name)}
          </h1>
          <p className="text-[#707070] text-[14px] mt-1 max-w-xl font-normal">
            Real-time digital queue management, AI turnaround predictions, and multi-service-center decision support.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0 flex-wrap">
          <div className="px-4 py-2 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[13px] text-[#1d1d1f] flex items-center space-x-2">
            <Car className="w-4 h-4 text-[#0071e3]" />
            <span>{Array.isArray(vehicles) ? vehicles.length : 0} Registered Vehicle{vehicles.length !== 1 ? 's' : ''}</span>
          </div>
          {activeService && activeService.has_active && (
            <div className="px-3.5 py-2 rounded-full bg-[#f0f9eb] border border-[#c2e7b0] text-[12px] font-medium text-[#2b641e] flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Token #{activeService.token_number} Live</span>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Proximity Location Control Bar — Studio Mist Surface */}
      <div className="bg-[#f5f5f7] border border-[#d6d6d6] rounded-[28px] p-5 sm:p-6 text-[#1d1d1f] shadow-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-2xl bg-white border border-[#d6d6d6] flex items-center justify-center text-[#0071e3] shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
              <span className="text-[12px] font-medium text-[#707070] uppercase tracking-wider">Your Active Location:</span>
              <span className="text-[14px] font-semibold text-[#1d1d1f]">{userArea}, {userCity}</span>
              <span className="text-[11px] font-normal px-2.5 py-0.5 rounded-full bg-white text-[#1d1d1f] border border-[#d6d6d6]">
                GPS: {userLat.toFixed(3)}°N, {userLon.toFixed(3)}°E
              </span>
            </div>
            <p className="text-[13px] text-[#707070] mt-0.5">
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
              buttonClassName="!py-2 !px-3 text-xs"
            />
          </div>

          <button
            type="button"
            onClick={handleDetectGps}
            disabled={detectingGps}
            className="px-4 py-2 rounded-full bg-white hover:bg-[#fafafc] border border-[#86868b] text-[#1d1d1f] text-[12px] font-normal transition flex items-center space-x-1.5 cursor-pointer shadow-none"
          >
            {detectingGps ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#0071e3]" />
            ) : (
              <Navigation className="w-3.5 h-3.5 text-[#0071e3]" />
            )}
            <span>{detectingGps ? 'Locating...' : 'Use Live GPS'}</span>
          </button>
        </div>
      </div>

      {/* Location Switch Toast Notification */}
      {locationNotice && (
        <div className="p-3.5 rounded-[20px] bg-[#f0f9eb] border border-[#c2e7b0] text-[#2b641e] text-[13px] flex items-center space-x-2.5 shadow-none animate-in fade-in slide-in-from-top-1 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{locationNotice}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs — Restrained Apple Navigation */}
      <div className="flex border-b border-[#d6d6d6] space-x-4 sm:space-x-8 text-[14px] overflow-x-auto no-scrollbar pb-1 -mx-2 px-2 sm:mx-0 sm:px-0">
        <button
          onClick={() => handleTabSwitch('active-service')}
          className={`pb-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
            tab === 'active-service' ? 'border-[#1d1d1f] text-[#1d1d1f] font-semibold' : 'border-transparent text-[#707070] hover:text-[#1d1d1f]'
          }`}
        >
          Live Service Tracking
        </button>
        <button
          onClick={() => handleTabSwitch('book-service')}
          className={`pb-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
            tab === 'book-service' ? 'border-[#1d1d1f] text-[#1d1d1f] font-semibold' : 'border-transparent text-[#707070] hover:text-[#1d1d1f]'
          }`}
        >
          Book Service & Recommendation
        </button>
        <button
          onClick={() => handleTabSwitch('nearby-centers')}
          className={`pb-3 border-b-2 transition whitespace-nowrap flex items-center space-x-1.5 cursor-pointer ${
            tab === 'nearby-centers' ? 'border-[#1d1d1f] text-[#1d1d1f] font-semibold' : 'border-transparent text-[#707070] hover:text-[#1d1d1f]'
          }`}
        >
          <MapPin className="w-4 h-4 text-[#0071e3]" />
          <span>Nearby Workshops ({nearbyCenters.length})</span>
        </button>
        <button
          onClick={() => handleTabSwitch('my-vehicles')}
          className={`pb-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
            tab === 'my-vehicles' ? 'border-[#1d1d1f] text-[#1d1d1f] font-semibold' : 'border-transparent text-[#707070] hover:text-[#1d1d1f]'
          }`}
        >
          My Vehicles ({vehicles.length})
        </button>
        <button
          onClick={() => handleTabSwitch('history')}
          className={`pb-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
            tab === 'history' ? 'border-[#1d1d1f] text-[#1d1d1f] font-semibold' : 'border-transparent text-[#707070] hover:text-[#1d1d1f]'
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
              {/* Active Token Hero Card — 28px White Card */}
              <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#d6d6d6] pb-5 mb-5">
                  <div>
                    <span className="text-[12px] font-medium uppercase tracking-wider text-[#0066cc]">Active Service Queue</span>
                    <h2 className="text-xl sm:text-2xl font-semibold text-[#1d1d1f] tracking-tight mt-0.5">
                      {activeService.vehicle_registration} • {activeService.vehicle_model}
                    </h2>
                    <p className="text-[13px] text-[#707070] mt-1 flex items-center">
                      <MapPin className="w-3.5 h-3.5 mr-1 text-[#86868b] shrink-0" />
                      <span>{activeService.service_center_name} ({activeService.service_center_address})</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-start space-x-3 w-full sm:w-auto">
                    <div className="flex-1 sm:flex-none bg-[#f5f5f7] border border-[#d6d6d6] rounded-[20px] px-5 py-2.5 text-center">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-[#707070] block">Digital Token</span>
                      <span className="text-xl sm:text-2xl font-semibold text-[#0071e3]">{activeService.token_number}</span>
                    </div>

                    <div className="flex-1 sm:flex-none bg-[#f5f5f7] border border-[#d6d6d6] rounded-[20px] px-4 py-2.5 text-center">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-[#707070] block">Queue Position</span>
                      <span className="text-lg sm:text-xl font-semibold text-[#1d1d1f]">#{activeService.queue_position}</span>
                    </div>
                  </div>
                </div>

                {/* Live Real-Time Expected Turn & Completion Banner */}
                <div className="bg-[#f5f5f7] border border-[#d6d6d6] rounded-[20px] p-4.5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-none">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-2xl bg-white border border-[#d6d6d6] flex items-center justify-center text-[#b64400] shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase font-medium text-[#707070] block">Your Turn Arrives</span>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-lg font-semibold text-[#1d1d1f]">
                          {calculateTurnTime(new Date(), activeService.estimated_waiting_minutes)}
                        </span>
                        <span className="text-[12px] text-[#b64400] font-medium">
                          (~{activeService.estimated_waiting_minutes} mins wait)
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 sm:border-l sm:border-[#d6d6d6] sm:pl-6">
                    <div className="w-9 h-9 rounded-2xl bg-white border border-[#d6d6d6] flex items-center justify-center text-emerald-600 shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase font-medium text-[#707070] block">Estimated Service Completion</span>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-lg font-semibold text-emerald-700">
                          {calculateCompletionTime(new Date(), activeService.estimated_waiting_minutes + activeService.estimated_service_minutes)}
                        </span>
                        <span className="text-[12px] text-[#707070] font-normal">
                          (~{activeService.estimated_waiting_minutes + activeService.estimated_service_minutes} mins total)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Timeline */}
                <div className="mb-6">
                  <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-3">
                    Live Workshop Progression
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {STATUS_STEPS.map((step, idx) => {
                      const status = getStepStatus(step, activeService.status);
                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-[16px] border text-center transition flex flex-col justify-between ${
                            status === 'completed'
                              ? 'bg-[#f0f9eb] border-[#c2e7b0] text-[#2b641e] font-medium'
                              : status === 'current'
                              ? 'bg-[#1d1d1f] border-[#1d1d1f] text-white font-medium'
                              : 'bg-[#f5f5f7] border-[#d6d6d6] text-[#86868b]'
                          }`}
                        >
                          <span className="text-[10px] uppercase tracking-wider opacity-80 block mb-1">
                            Step {idx + 1}
                          </span>
                          <span className="text-[12px] leading-tight">{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Allocated Bay & Technician Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#f5f5f7] p-4 rounded-[20px] border border-[#d6d6d6]">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-[#d6d6d6] flex items-center justify-center font-semibold text-[#1d1d1f] text-[13px]">
                      Bay
                    </div>
                    <div>
                      <span className="text-[11px] uppercase font-medium text-[#707070]">Assigned Service Bay</span>
                      <p className="text-[14px] font-semibold text-[#1d1d1f]">{activeService.assigned_bay}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-white border border-[#d6d6d6] flex items-center justify-center font-semibold text-[#1d1d1f] text-[13px]">
                      Tech
                    </div>
                    <div>
                      <span className="text-[11px] uppercase font-medium text-[#707070]">Assigned Technician</span>
                      <p className="text-[14px] font-semibold text-[#1d1d1f]">{activeService.assigned_mechanic}</p>
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
            <div className="bg-white rounded-[28px] p-12 border border-[#d6d6d6] text-center shadow-none">
              <div className="w-14 h-14 rounded-2xl bg-[#f5f5f7] border border-[#d6d6d6] text-[#0071e3] flex items-center justify-center mx-auto mb-4">
                <Car className="w-7 h-7" />
              </div>
              <h3 className="text-[18px] font-semibold text-[#1d1d1f]">No Active Service In Queue</h3>
              <p className="text-[#707070] text-[14px] mt-1 max-w-sm mx-auto">
                You do not currently have a vehicle queued at any service center. Book a service to receive a digital token and real-time AI predictions.
              </p>
              <button
                onClick={() => handleTabSwitch('book-service')}
                className="mt-6 px-6 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-normal text-[13px] transition shadow-none cursor-pointer"
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
            <div className="bg-[#f0f9eb] border border-[#c2e7b0] rounded-[28px] p-8 sm:p-10 text-center shadow-none space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold text-[#1d1d1f] tracking-tight">Service Booking Confirmed</h2>
              <div className="inline-block bg-white px-6 py-3 rounded-full border border-[#d6d6d6] shadow-none">
                <span className="text-[11px] uppercase font-medium text-[#707070] block">Your Digital Token</span>
                <span className="text-3xl font-semibold text-[#0071e3]">{bookingSuccess.token_number}</span>
              </div>
              <p className="text-[14px] text-[#707070] max-w-md mx-auto">
                Estimated Turnaround: ~{bookingSuccess.estimated_waiting_minutes + bookingSuccess.estimated_service_minutes} minutes. Your turn arrives at <strong className="text-[#1d1d1f]">{calculateTurnTime(new Date(), bookingSuccess.estimated_waiting_minutes)}</strong> (~{bookingSuccess.estimated_waiting_minutes}m wait) and completion at <strong className="text-emerald-700">{calculateCompletionTime(new Date(), bookingSuccess.estimated_waiting_minutes + bookingSuccess.estimated_service_minutes)}</strong>.
              </p>
              <div className="pt-4 flex justify-center space-x-3">
                <button
                  onClick={() => {
                    setBookingSuccess(null);
                    handleTabSwitch('active-service');
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-normal transition shadow-none cursor-pointer"
                >
                  View Live Queue Tracking
                </button>
                <button
                  onClick={() => setBookingSuccess(null)}
                  className="px-5 py-2.5 rounded-full bg-white border border-[#86868b] text-[#1d1d1f] text-[13px] font-normal hover:bg-[#f5f5f7] transition shadow-none cursor-pointer"
                >
                  Book Another Service
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Booking Form — 28px White Card */}
              <div className="lg:col-span-5 bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-5">
                <div>
                  <h3 className="text-[18px] font-semibold text-[#1d1d1f] tracking-tight">Service Request Details</h3>
                  <p className="text-[13px] text-[#707070]">Provide vehicle specifications and your completion requirement.</p>
                </div>

                {/* 1. Select Vehicle */}
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-1.5">
                    Select Vehicle
                  </label>
                  {(!Array.isArray(vehicles) || vehicles.length === 0) ? (
                    <div className="p-3.5 bg-[#f5f5f7] rounded-[18px] border border-[#d6d6d6] text-[13px] text-[#707070]">
                      No vehicles found. Please add a vehicle first in the My Vehicles tab.
                    </div>
                  ) : (
                    <SelectDropdown
                      value={selectedVehicleId ? String(selectedVehicleId) : ''}
                      onChange={(val) => setSelectedVehicleId(val ? Number(val) : '')}
                      options={vehicles.map((v) => ({
                        value: String(v.id),
                        label: `${v.registration_number} — ${v.model}`,
                        sublabel: v.vehicle_type,
                      }))}
                      placeholder="Select a registered vehicle"
                      buttonClassName="bg-white"
                    />
                  )}
                </div>

                {/* 2. Select Service */}
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-1.5">
                    Select Service / Repair Type
                  </label>
                  <SelectDropdown
                    value={selectedService}
                    onChange={setSelectedService}
                    options={AVAILABLE_SERVICES}
                    placeholder="Select service type"
                    buttonClassName="bg-white"
                  />
                </div>

                {/* 3. Customer Required Completion Time */}
                <div className="bg-[#f5f5f7] p-4 sm:p-5 rounded-[20px] border border-[#d6d6d6] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1.5 text-[#0071e3]" />
                      Required Completion Time (Slot)
                    </label>
                    <span className="text-[11px] font-medium text-[#0071e3] flex items-center">
                      <Sparkles className="w-3 h-3 mr-1" />
                      Auto-Updates Nearest Workshop
                    </span>
                  </div>
                  <p className="text-[12px] text-[#707070]">
                    Select or enter your desired vehicle completion time. SQMS evaluates live capacity across centers and automatically routes to the nearest workshop with an open slot.
                  </p>

                  {/* 1-Click Quick Time Slot Chips */}
                  <div className="pt-1">
                    <span className="text-[10px] uppercase font-semibold text-[#86868b] tracking-wider block mb-1.5">
                      Quick Select Target Slot:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_TIME_SLOTS.map((slot) => {
                        const isSelected = requiredTime.trim().toUpperCase() === slot.toUpperCase();
                        return (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => setRequiredTime(slot)}
                            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition cursor-pointer ${
                              isSelected
                                ? 'bg-[#0071e3] text-white ring-2 ring-[#0071e3] shadow-none'
                                : 'bg-white border border-[#d6d6d6] text-[#1d1d1f] hover:border-[#86868b] hover:bg-[#fbfbfd]'
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Custom Time Input */}
                  <div className="pt-1">
                    <input
                      type="text"
                      value={requiredTime}
                      onChange={(e) => setRequiredTime(e.target.value)}
                      placeholder="e.g. 05:00 PM, 06:00 PM or 17:00"
                      className="w-full px-4 h-11 bg-white border border-[#d6d6d6] rounded-[980px] text-[13px] font-medium text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                    />
                  </div>
                </div>

                {/* 4. Preferred Date */}
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-1.5">
                    Service Date
                  </label>
                  <input
                    type="date"
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full px-4 h-12 bg-white border border-[#d6d6d6] rounded-[980px] text-[14px] font-normal text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                  />
                </div>

                {/* 5. Additional Notes */}
                <div>
                  <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-1.5">
                    Specific Symptoms / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={bookingNotes}
                    onChange={(e) => setBookingNotes(e.target.value)}
                    placeholder="e.g. Unusual noise on braking, AC cooling weak"
                    className="w-full px-4 py-3 bg-white border border-[#d6d6d6] rounded-[20px] text-[13px] text-[#1d1d1f] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3]"
                  />
                </div>

                {/* Confirm Booking CTA */}
                <button
                  disabled={!selectedVehicleId}
                  onClick={handleConfirmBooking}
                  className="w-full h-12 rounded-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-normal text-[14px] shadow-none transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Confirm Booking & Generate Digital Token</span>
                </button>
              </div>

              {/* Right Column: AI Recommendations Engine Output */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[18px] font-semibold text-[#1d1d1f] tracking-tight flex items-center space-x-2">
                      <Building2 className="w-5 h-5 text-[#0071e3]" />
                      <span>Recommended Service Centers</span>
                    </h3>
                    <p className="text-[13px] text-[#707070]">
                      Comparing nearby centers by live workload, mechanics, bays, and required completion feasibility.
                    </p>
                  </div>
                  {isSearching && (
                    <div className="flex items-center space-x-1.5 text-xs text-[#0071e3]">
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
                  <div className="bg-white rounded-[28px] p-12 border border-[#d6d6d6] text-center shadow-none">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#0071e3] mx-auto mb-2" />
                    <span className="text-[14px] font-medium text-[#707070]">Calculating recommendations...</span>
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
              <h3 className="text-[20px] font-semibold text-[#1d1d1f] flex items-center space-x-2">
                <MapPin className="w-5 h-5 text-[#0071e3]" />
                <span>Nearby Workshop Branches (Sorted by Distance)</span>
              </h3>
              <p className="text-[13px] text-[#707070] mt-0.5">
                Displaying all active service centers from closest to furthest from <strong>{userArea}, {userCity}</strong>.
              </p>
            </div>

            <button
              onClick={() => handleTabSwitch('book-service')}
              className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-normal text-[13px] shadow-none transition flex items-center space-x-1.5 cursor-pointer self-start sm:self-center"
            >
              <Sparkles className="w-4 h-4 text-white" />
              <span>AI Multi-Center Recommendation</span>
            </button>
          </div>

          {loadingCenters ? (
            <div className="bg-white rounded-[28px] p-12 border border-[#d6d6d6] text-center shadow-none">
              <RefreshCw className="w-6 h-6 animate-spin text-[#0071e3] mx-auto mb-2" />
              <span className="text-[14px] font-medium text-[#707070]">Calculating workshop distances & live workloads...</span>
            </div>
          ) : nearbyCenters.length === 0 ? (
            <div className="bg-white rounded-[28px] p-12 border border-[#d6d6d6] text-center shadow-none">
              <p className="text-[14px] text-[#707070]">No active service centers found for {userCity}.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {nearbyCenters.map((c, idx) => {
                const distBadge = getDistanceBadge(c.distance_km ?? 999);
                const isClosest = idx === 0;

                return (
                  <div
                    key={c.id}
                    className={`rounded-[28px] p-6 sm:p-7 border transition-all duration-200 bg-white shadow-none flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
                      isClosest
                        ? 'border-2 border-[#0071e3] ring-1 ring-[#0071e3]'
                        : 'border-[#d6d6d6] hover:border-[#86868b]'
                    }`}
                  >
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {isClosest && (
                          <span className="px-3 py-1 rounded-full bg-[#0071e3] text-white text-[11px] font-medium uppercase tracking-wider flex items-center space-x-1 shadow-none">
                            <Sparkles className="w-3.5 h-3.5 text-white" />
                            <span>Nearest to You</span>
                          </span>
                        )}

                        <span className="px-3 py-1 rounded-full text-[12px] font-normal border border-[#d6d6d6] bg-[#f5f5f7] text-[#1d1d1f] flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-[#0066cc]" />
                          <span>{c.distance_km !== undefined ? `${c.distance_km} km away` : 'Distance unavailable'}</span>
                          <span className="text-[#707070]">({distBadge.label.split(' ')[0]})</span>
                        </span>

                        <span className="px-3 py-1 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#1d1d1f] text-[12px] font-normal">
                          Area: <strong className="font-semibold">{c.area}</strong>, {c.city}
                        </span>

                        <span className="px-3 py-1 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#0066cc] text-[12px] font-medium">
                          Active Queue: {c.active_queue_count} vehicle(s)
                        </span>
                      </div>

                      <div>
                        <h4 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight flex items-center space-x-2">
                          <span>{c.name}</span>
                        </h4>
                        <p className="text-[13px] text-[#707070] mt-1 flex items-center">
                          <MapPin className="w-3.5 h-3.5 mr-1 text-[#86868b] shrink-0" />
                          <span>{c.address}</span>
                          <span className="mx-2 text-[#d6d6d6]">•</span>
                          <span>Phone: {c.phone}</span>
                        </p>
                      </div>

                      {/* Workshop Metrics Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1 max-w-xl text-[12px]">
                        <div className="bg-[#f5f5f7] p-3 rounded-[16px] border border-[#d6d6d6]">
                          <span className="text-[10px] text-[#707070] block uppercase font-medium">Available Bays</span>
                          <span className="font-semibold text-[#1d1d1f] text-[13px]">{c.available_bays} of {c.total_bays} free</span>
                        </div>
                        <div className="bg-[#f5f5f7] p-3 rounded-[16px] border border-[#d6d6d6]">
                          <span className="text-[10px] text-[#707070] block uppercase font-medium">Mechanics on Duty</span>
                          <span className="font-semibold text-[#1d1d1f] text-[13px]">{c.available_mechanics} of {c.total_mechanics} ready</span>
                        </div>
                        <div className="bg-[#f5f5f7] p-3 rounded-[16px] border border-[#d6d6d6]">
                          <span className="text-[10px] text-[#707070] block uppercase font-medium">Current Workload</span>
                          <span className="font-semibold text-[#1d1d1f] text-[13px]">{Math.round((c.current_workload || 0) * 100)}% ({c.current_workload > 0.7 ? 'High' : c.current_workload > 0.4 ? 'Moderate' : 'Low'})</span>
                        </div>
                        <div className="bg-[#f5f5f7] p-3 rounded-[16px] border border-[#d6d6d6]">
                          <span className="text-[10px] text-[#707070] block uppercase font-medium">Hours</span>
                          <span className="font-semibold text-[#1d1d1f] text-[13px]">{c.operating_hours_start} - {c.operating_hours_end}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row lg:flex-col items-stretch gap-2.5 shrink-0 min-w-[200px]">
                      <button
                        onClick={() => {
                          setSelectedCenterId(c.id);
                          handleTabSwitch('book-service');
                        }}
                        className={`w-full py-2.5 px-5 rounded-full font-normal text-[13px] transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-none ${
                          isClosest
                            ? 'bg-[#0071e3] hover:bg-[#0077ed] text-white'
                            : 'bg-white hover:bg-[#f5f5f7] border border-[#86868b] text-[#1d1d1f]'
                        }`}
                      >
                        <Wrench className="w-4 h-4" />
                        <span>Book Service at this Branch</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <div className="text-center text-[11px] text-[#707070]">
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
              <h3 className="text-[18px] font-semibold text-[#1d1d1f] tracking-tight">Registered Vehicles</h3>
              <p className="text-[13px] text-[#707070]">Manage vehicles linked to your service account.</p>
            </div>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('close-sqms-overlays'));
                setShowAddVehicle(true);
              }}
              className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-normal text-[13px] shadow-none transition flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Vehicle</span>
            </button>
          </div>

          {(!Array.isArray(vehicles) || vehicles.length === 0) ? (
            <div className="bg-white rounded-[28px] p-10 text-center border border-[#d6d6d6] shadow-none max-w-md mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] border border-[#d6d6d6] text-[#0071e3] flex items-center justify-center mx-auto mb-3">
                <Car className="w-6 h-6" />
              </div>
              <h4 className="text-[16px] font-semibold text-[#1d1d1f]">No Vehicles Registered Yet</h4>
              <p className="text-[13px] text-[#707070] mt-1 mb-4">Add your car or two-wheeler to book quick AI queue services.</p>
              <button
                onClick={() => setShowAddVehicle(true)}
                className="px-6 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-normal text-[13px] shadow-none transition"
              >
                + Register Your First Vehicle
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {vehicles.map((v) => (
                <div key={v.id} className="bg-white rounded-[28px] p-6 border border-[#d6d6d6] shadow-none flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 rounded-full bg-[#f5f5f7] text-[#0066cc] text-[12px] font-medium border border-[#d6d6d6]">
                        {v.vehicle_type}
                      </span>
                      <button
                        onClick={() => handleDeleteVehicle(v.id)}
                        className="text-[#86868b] hover:text-[#cf1322] transition cursor-pointer"
                        title="Delete vehicle"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <h4 className="text-[20px] font-semibold text-[#1d1d1f] tracking-tight mt-3">{v.registration_number}</h4>
                    <p className="text-[14px] font-medium text-[#1d1d1f] mt-0.5">{v.model}</p>
                    <p className="text-[13px] text-[#707070] mt-1">Year: {v.year} • Fuel: {v.fuel_type}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[#d6d6d6] flex justify-between items-center text-[13px]">
                    <span className="text-emerald-700 font-medium">● Registered</span>
                    <button
                      onClick={() => {
                        setSelectedVehicleId(v.id);
                        handleTabSwitch('book-service');
                      }}
                      className="text-[#0066cc] font-medium hover:underline flex items-center cursor-pointer"
                    >
                      Book Service <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Vehicle Modal — Apple 28px Dialog */}
          {showAddVehicle && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto overscroll-contain animate-in fade-in duration-200">
              <div className="bg-white rounded-[28px] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#d6d6d6] space-y-4 relative z-[10000] max-h-[90vh] overflow-y-auto overscroll-contain">
                <div className="flex items-center justify-between border-b border-[#d6d6d6] pb-3">
                  <h3 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">Add New Vehicle</h3>
                  <button onClick={() => setShowAddVehicle(false)} className="text-[#707070] hover:text-[#1d1d1f] cursor-pointer p-1 rounded-full transition">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleAddVehicleSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-1">Registration Number</label>
                    <input
                      type="text"
                      required
                      value={newReg}
                      onChange={(e) => setNewReg(e.target.value.toUpperCase())}
                      placeholder="e.g. GJ01-AB-1234"
                      className="w-full px-4 h-12 bg-white border border-[#d6d6d6] rounded-[980px] text-[14px] uppercase font-mono font-semibold text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-1">Vehicle Type</label>
                      <SelectDropdown
                        value={newType}
                        onChange={setNewType}
                        options={['Sedan', 'SUV', 'Hatchback', 'Luxury', 'Bike', 'EV']}
                        placeholder="Select type"
                        buttonClassName="bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-1">Fuel Type</label>
                      <SelectDropdown
                        value={newFuel}
                        onChange={setNewFuel}
                        options={['Petrol', 'Diesel', 'Electric', 'CNG', 'Hybrid']}
                        placeholder="Select fuel"
                        buttonClassName="bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-1">Make & Model</label>
                    <input
                      type="text"
                      required
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="e.g. Honda City ZX"
                      className="w-full px-4 h-12 bg-white border border-[#d6d6d6] rounded-[980px] text-[14px] font-normal text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f] mb-1">Manufacturing Year</label>
                    <input
                      type="number"
                      required
                      min={2000}
                      max={2026}
                      value={newYear}
                      onChange={(e) => setNewYear(Number(e.target.value))}
                      className="w-full px-4 h-12 bg-white border border-[#d6d6d6] rounded-[980px] text-[14px] font-normal text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none focus:border-[#0071e3] focus:ring-1 focus:ring-[#0071e3] transition"
                    />
                  </div>
                  <div className="pt-3 flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowAddVehicle(false)}
                      className="px-5 py-2 rounded-full border border-[#86868b] text-[13px] font-normal text-[#1d1d1f] hover:bg-[#f5f5f7] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-[13px] font-normal shadow-none cursor-pointer"
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

      {/* TAB 4: SERVICE HISTORY & RECORDS */}
      {tab === 'history' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-[24px] p-5 border border-[#d6d6d6] shadow-none">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#707070] block">Total Records</span>
              <span className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] mt-1 block">{history.length}</span>
              <span className="text-[12px] text-[#707070] mt-0.5 block">Lifetime service bookings</span>
            </div>
            <div className="bg-white rounded-[24px] p-5 border border-[#d6d6d6] shadow-none">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#707070] block">Completed Services</span>
              <span className="text-2xl sm:text-3xl font-semibold text-emerald-700 mt-1 block">
                {history.filter((h) => h.status === 'Completed').length}
              </span>
              <span className="text-[12px] text-[#707070] mt-0.5 block">Successfully serviced</span>
            </div>
            <div className="bg-white rounded-[24px] p-5 border border-[#d6d6d6] shadow-none">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#707070] block">In Progress / Active</span>
              <span className="text-2xl sm:text-3xl font-semibold text-[#0071e3] mt-1 block">
                {history.filter((h) => h.status !== 'Completed' && h.status !== 'Cancelled').length}
              </span>
              <span className="text-[12px] text-[#707070] mt-0.5 block">Currently in queue/bays</span>
            </div>
            <div className="bg-white rounded-[24px] p-5 border border-[#d6d6d6] shadow-none">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#707070] block">Vehicles Serviced</span>
              <span className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] mt-1 block">
                {new Set(history.map((h) => h.vehicle_reg).filter(Boolean)).size}
              </span>
              <span className="text-[12px] text-[#707070] mt-0.5 block">Unique registrations</span>
            </div>
          </div>

          {/* Records Table Card */}
          <div className="bg-white rounded-[28px] p-6 sm:p-8 border border-[#d6d6d6] shadow-none space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#f0f0f2] pb-4">
              <div>
                <h3 className="text-[18px] font-semibold text-[#1d1d1f] tracking-tight">Service Records & Past Bookings</h3>
                <p className="text-[13px] text-[#707070] mt-0.5">Comprehensive audit logs of all your service appointments and completions.</p>
              </div>
              <button
                onClick={() => handleTabSwitch('book-service')}
                className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-normal text-[13px] transition flex items-center space-x-1.5 cursor-pointer shadow-none self-start sm:self-center"
              >
                <Plus className="w-4 h-4" />
                <span>Book New Service</span>
              </button>
            </div>

            {history.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#f5f5f7] border border-[#d6d6d6] text-[#0071e3] flex items-center justify-center mx-auto mb-3">
                  <Wrench className="w-7 h-7" />
                </div>
                <h4 className="text-[17px] font-semibold text-[#1d1d1f]">No Past Service Records Found</h4>
                <p className="text-[13px] text-[#707070] mt-1 max-w-sm mx-auto">
                  When you book a vehicle service and complete visits at DriveOps workshops, your digital records and receipts will appear here.
                </p>
                <button
                  onClick={() => handleTabSwitch('book-service')}
                  className="mt-5 px-6 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] font-normal transition shadow-none cursor-pointer"
                >
                  Book Your First Service
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px] text-[#1d1d1f]">
                  <thead className="bg-[#f5f5f7] uppercase text-[11px] font-semibold text-[#707070] tracking-wider border-b border-[#d6d6d6]">
                    <tr>
                      <th className="py-3 px-4 rounded-l-xl">Token</th>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">Service Type</th>
                      <th className="py-3 px-4">Service Center</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 rounded-r-xl">Requested Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f0f2]">
                    {history.map((h) => {
                      const isCompleted = h.status === 'Completed';
                      const isInProgress = ['Service In Progress', 'Washing', 'Repair In Progress', 'Quality Check'].includes(h.status);
                      const isCancelled = h.status === 'Cancelled';
                      const isPending = ['Booking Confirmed', 'Vehicle Received', 'Waiting'].includes(h.status);

                      return (
                        <tr key={h.id} className="hover:bg-[#fafafc] transition">
                          <td className="py-3.5 px-4 font-mono font-semibold text-[#0071e3]">
                            <span className="px-2.5 py-1 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[12px]">
                              {h.token_number}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-[#1d1d1f]">
                            {h.vehicle_reg}
                          </td>
                          <td className="py-3.5 px-4 font-normal text-[#1d1d1f]">
                            {h.service_type}
                          </td>
                          <td className="py-3.5 px-4 text-[#707070]">
                            <div className="flex items-center">
                              <MapPin className="w-3.5 h-3.5 mr-1 text-[#86868b] shrink-0" />
                              <span>{h.service_center}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${
                                isCompleted
                                  ? 'bg-[#f0f9eb] border-[#c2e7b0] text-[#2b641e]'
                                  : isInProgress
                                  ? 'bg-[#f0f7ff] border-[#b9daf9] text-[#0066cc]'
                                  : isCancelled
                                  ? 'bg-[#fff1f0] border-[#ffccc7] text-[#cf1322]'
                                  : isPending
                                  ? 'bg-[#fff8e6] border-[#ffd591] text-[#b64400]'
                                  : 'bg-[#f5f5f7] border-[#d6d6d6] text-[#707070]'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                  isCompleted
                                    ? 'bg-emerald-600'
                                    : isInProgress
                                    ? 'bg-blue-600'
                                    : isCancelled
                                    ? 'bg-red-600'
                                    : 'bg-amber-600'
                                }`}
                              />
                              {h.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-[#707070] font-normal">
                            {h.requested_date}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
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
