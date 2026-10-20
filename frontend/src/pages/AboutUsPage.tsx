import React, { useState } from 'react';
import { FranchisePlansModal } from '../components/FranchisePlansModal';
import { useAuth } from '../context/AuthContext';
import {
  Car, ShieldCheck, Sparkles, Building2, Cpu, Clock, CheckCircle2,
  ArrowRight, Wrench, BarChart3, Users, Zap, Award, Layers,
  Compass, MapPin, Check
} from 'lucide-react';

interface AboutUsPageProps {
  onNavigateTab?: (tab: string) => void;
}

export const AboutUsPage: React.FC<AboutUsPageProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [showPlansModal, setShowPlansModal] = useState(false);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Hero Section */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-8 sm:p-12 text-white shadow-2xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Gen Automotive Intelligence</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            About <span className="text-white">Smart</span> <span className="text-blue-500">Q</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed font-normal">
            <strong>Smart Q</strong> is an enterprise-grade AI/ML decision-support software platform engineered to eliminate bay bottlenecks, unpredictable wait times, and workshop coordination chaos across the automotive service industry.
          </p>

          <div className="pt-2 flex flex-wrap gap-4">
            {user?.role === 'super_admin' ? (
              <>
                <button
                  onClick={() => onNavigateTab && onNavigateTab('admin-dashboard')}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition flex items-center space-x-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>Platform System Console</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigateTab && onNavigateTab('admin-centers')}
                  className="px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white font-semibold text-sm transition flex items-center space-x-2 cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span>Manage Service Centers</span>
                </button>
              </>
            ) : user?.role === 'branch_manager' ? (
              <button
                onClick={() => onNavigateTab && onNavigateTab('manager-queue')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition flex items-center space-x-2 cursor-pointer"
              >
                <Clock className="w-4 h-4 text-emerald-300" />
                <span>Go to Live Workshop Queue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : user?.role === 'franchise_owner' ? (
              <button
                onClick={() => onNavigateTab && onNavigateTab('owner-overview')}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition flex items-center space-x-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-indigo-300" />
                <span>Manage Franchise Branches</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowPlansModal(true)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25 transition flex items-center space-x-2 cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-yellow-300" />
                <span>List Your Workshop & Partner</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {user?.role === 'customer' && onNavigateTab && (
              <button
                onClick={() => onNavigateTab('book-service')}
                className="px-6 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-white font-semibold text-sm transition flex items-center space-x-2 cursor-pointer"
              >
                <Car className="w-4 h-4 text-blue-400" />
                <span>Book Vehicle Service</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* What SQMS Solves */}
      <div className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Core Technical Contribution</span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Beyond Static Tokens: Dynamic AI Predictions
          </h2>
          <p className="text-slate-400 text-sm">
            Traditional service centers issue static token numbers with zero visibility. SQMS introduces real-time multivariate predictive modeling.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-3 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Dual ML Regression Engine</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Trained on extensive automotive service telemetry:
              <br />• <strong>Model A:</strong> Waiting Time ($T_&#123;wait&#125;$) prediction factoring queue depth, active mechanics, and bay load.
              <br />• <strong>Model B:</strong> Service Duration ($T_&#123;service&#125;$) based on repair complexity, vehicle segment, and service type.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-3 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Dynamic Resource State Machine</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Intelligent workshop dispatch automatically matches service requirements (General, Electrical, Washing, Accidental) to compatible bays and certified technicians. Resources occupy upon stage start and instantly free upon completion.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-7 space-y-3 shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Real-Time WebSocket Sync</h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              As technicians advance vehicle stages in the workshop bay, customer dashboards update live across WebSockets without refreshing. Estimated completion times automatically recalibrate in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Automotive Services Covered */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Service Coverage</span>
          <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
            Comprehensive Vehicle Services Supported
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            SQMS seamlessly manages workflows for all major passenger vehicle categories:
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[
            { name: 'General Service', cat: 'Maintenance', est: '65 min' },
            { name: 'Oil & Filter Change', cat: 'Fast Lane', est: '30 min' },
            { name: 'Express Car Wash', cat: 'Detailing', est: '25 min' },
            { name: 'AC Service & Climate', cat: 'Maintenance', est: '55 min' },
            { name: 'Brake Service', cat: 'Safety / Repair', est: '50 min' },
            { name: 'Battery Diagnostics', cat: 'Inspection', est: '20 min' },
            { name: 'Tyre & Wheel Balancing', cat: 'Maintenance', est: '35 min' },
            { name: 'Electrical & Sensor Repair', cat: 'Repair', est: '75 min' },
            { name: 'Computerized Diagnostics', cat: 'Inspection', est: '40 min' },
            { name: 'Denting & Body Painting', cat: 'Bodyshop', est: '180 min' },
            { name: 'Minor Accident Repair', cat: 'Collision', est: '150 min' },
            { name: 'Major Collision Restoration', cat: 'Collision', est: '280 min' },
          ].map((s, idx) => (
            <div key={idx} className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 space-y-1">
              <span className="text-[10px] font-bold uppercase text-blue-400">{s.cat}</span>
              <h4 className="text-sm font-bold text-white truncate">{s.name}</h4>
              <span className="text-xs text-slate-400 block">Est: ~{s.est}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Workshop & Franchise Partnership CTA Section */}
      <div className="relative rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-purple-950 border border-indigo-500/40 p-8 sm:p-12 text-white shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 text-yellow-300" />
              <span>Partner With Us • Workshop Network</span>
            </div>

            <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
              List Your Service Center or Workshop on SQMS
            </h2>

            <p className="text-sm sm:text-base text-indigo-100 max-w-2xl leading-relaxed">
              Are you an independent workshop owner, authorized dealer, or multi-city auto repair brand? Join the SQMS partner network:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm text-indigo-100">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Publish your workshop with live capacity & services</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automated Bay & Mechanic assignment engine</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Individual Branch Manager accounts & credentials</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Real-time machine learning waiting time predictions</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center">
            <div className="bg-slate-950/60 backdrop-blur-md border border-indigo-400/30 p-6 rounded-3xl text-center space-y-4 w-full sm:max-w-xs shadow-xl">
              {user?.role === 'super_admin' ? (
                <div>
                  <span className="text-xs uppercase font-bold text-purple-300 block">Platform Administration</span>
                  <span className="text-2xl font-black text-white mt-1 block">Root Console</span>
                  <span className="text-[11px] text-slate-300 block mt-0.5">Manage All Franchises & Workshops</span>
                </div>
              ) : (
                <div>
                  <span className="text-xs uppercase font-bold text-indigo-300 block">Subscription Plans From</span>
                  <span className="text-3xl font-black text-white mt-1 block">₹499<span className="text-sm font-normal text-indigo-300">/mo</span></span>
                  <span className="text-[11px] text-slate-300 block mt-0.5">Flexible monthly & yearly tiers</span>
                </div>
              )}

              {user?.role === 'super_admin' ? (
                <button
                  onClick={() => onNavigateTab && onNavigateTab('admin-dashboard')}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-500/30 transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-purple-200" />
                  <span>Platform Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => setShowPlansModal(true)}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/30 transition flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-yellow-300" />
                  <span>List Your Branch Now</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              <span className="text-[10px] text-slate-400 block">
                {user?.role === 'super_admin' ? 'Root platform access • Full privileges' : 'Instant setup • Includes initial bays & mechanics'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Franchise Plans Modal for Seamless Checkout & Onboarding */}
      {user?.role !== 'super_admin' && (
        <FranchisePlansModal
          isOpen={showPlansModal}
          onClose={() => setShowPlansModal(false)}
          onSuccess={() => {
            setShowPlansModal(false);
            if (onNavigateTab) {
              onNavigateTab('owner-overview');
            }
          }}
        />
      )}
    </div>
  );
};
