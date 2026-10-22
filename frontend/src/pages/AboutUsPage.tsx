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
    <div className="w-full space-y-12 sm:space-y-16 pt-4 sm:pt-6 pb-2 sm:pb-4">
      {/* Hero Section — Pure Gallery White Hero Stage */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
        <div className="flex justify-center mb-2">
          <img
            src="/logo.png"
            alt="DriveOps"
            className="h-14 sm:h-20 w-auto object-contain"
          />
        </div>

        <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#1d1d1f] text-[12px] font-medium">
          <Sparkles className="w-3.5 h-3.5 text-[#0071e3]" />
          <span>Automotive Intelligence Architecture</span>
        </div>

        <div className="space-y-3">
          <span className="text-[21px] font-semibold tracking-[0.23px] text-[#0071e3] block">
            Book Today. Drive Tomorrow.
          </span>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-[-1.2px] text-[#1d1d1f] leading-[1.05] max-w-4xl mx-auto">
            The intelligent operating system for automotive workshops.
          </h1>
        </div>

        <p className="text-[17px] sm:text-[19px] text-[#707070] leading-[1.47] max-w-3xl mx-auto font-normal">
          DriveOps is an enterprise-grade AI decision-support platform engineered to eliminate bay bottlenecks, unpredictable wait times, and workshop coordination chaos across the automotive service industry.
        </p>

        <div className="pt-4 flex flex-wrap justify-center items-center gap-3">
          {user?.role === 'super_admin' ? (
            <>
              <button
                onClick={() => onNavigateTab && onNavigateTab('admin-dashboard')}
                className="px-6 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-normal text-[14px] transition flex items-center space-x-2 cursor-pointer shadow-none"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Platform System Console</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => onNavigateTab && onNavigateTab('admin-centers')}
                className="px-6 py-3 rounded-full bg-white hover:bg-[#f5f5f7] border border-[#86868b] text-[#1d1d1f] font-normal text-[14px] transition flex items-center space-x-2 cursor-pointer shadow-none"
              >
                <Building2 className="w-4 h-4 text-[#707070]" />
                <span>Manage Service Centers</span>
              </button>
            </>
          ) : user?.role === 'branch_manager' ? (
            <button
              onClick={() => onNavigateTab && onNavigateTab('manager-queue')}
              className="px-6 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-normal text-[14px] transition flex items-center space-x-2 cursor-pointer shadow-none"
            >
              <Clock className="w-4 h-4" />
              <span>Go to Live Workshop Queue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : user?.role === 'franchise_owner' ? (
            <button
              onClick={() => onNavigateTab && onNavigateTab('owner-overview')}
              className="px-6 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-normal text-[14px] transition flex items-center space-x-2 cursor-pointer shadow-none"
            >
              <Building2 className="w-4 h-4" />
              <span>Manage Franchise Branches</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowPlansModal(true)}
              className="px-6 py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-normal text-[14px] transition flex items-center space-x-2 cursor-pointer shadow-none"
            >
              <Building2 className="w-4 h-4" />
              <span>List Your Workshop & Partner</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {user?.role === 'customer' && onNavigateTab && (
            <button
              onClick={() => onNavigateTab('book-service')}
              className="px-6 py-3 rounded-full bg-white hover:bg-[#f5f5f7] border border-[#86868b] text-[#1d1d1f] font-normal text-[14px] transition flex items-center space-x-2 cursor-pointer shadow-none"
            >
              <Car className="w-4 h-4 text-[#707070]" />
              <span>Book Vehicle Service</span>
            </button>
          )}
        </div>
      </div>

      {/* Highlights Band — Studio Mist (#f5f5f7) with 28px White Feature Cards */}
      <div className="w-full bg-[#f5f5f7] border-y border-[#d6d6d6] py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-[#0066cc]">Core Technical Contribution</span>
            <h2 className="text-3xl sm:text-4xl font-semibold text-[#1d1d1f] tracking-tight">
              Beyond Static Tokens: Dynamic AI Predictions
            </h2>
            <p className="text-[#707070] text-[17px] leading-[1.47]">
              Traditional service centers issue static token numbers with zero visibility. DriveOps introduces real-time multivariate predictive modeling.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            <div className="bg-white border border-[#d6d6d6] rounded-[28px] p-8 space-y-4 shadow-none">
              <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] border border-[#d6d6d6] flex items-center justify-center text-[#0071e3]">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-[21px] font-semibold text-[#1d1d1f] tracking-tight">Dual ML Regression Engine</h3>
              <p className="text-[15px] text-[#707070] leading-relaxed">
                Trained on extensive automotive telemetry:
                <br /><strong className="text-[#1d1d1f]">• Model A:</strong> Waiting Time prediction factoring queue depth, active mechanics, and bay load.
                <br /><strong className="text-[#1d1d1f]">• Model B:</strong> Service Duration based on repair complexity, vehicle segment, and service type.
              </p>
            </div>

            <div className="bg-white border border-[#d6d6d6] rounded-[28px] p-8 space-y-4 shadow-none">
              <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] border border-[#d6d6d6] flex items-center justify-center text-emerald-600">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-[21px] font-semibold text-[#1d1d1f] tracking-tight">Dynamic Resource State Machine</h3>
              <p className="text-[15px] text-[#707070] leading-relaxed">
                Intelligent workshop dispatch automatically matches service requirements (General, Electrical, Washing, Accidental) to compatible bays and certified technicians. Resources occupy upon stage start and instantly free upon completion.
              </p>
            </div>

            <div className="bg-white border border-[#d6d6d6] rounded-[28px] p-8 space-y-4 shadow-none">
              <div className="w-12 h-12 rounded-2xl bg-[#f5f5f7] border border-[#d6d6d6] flex items-center justify-center text-[#b64400]">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-[21px] font-semibold text-[#1d1d1f] tracking-tight">Real-Time Sync Architecture</h3>
              <p className="text-[15px] text-[#707070] leading-relaxed">
                As technicians advance vehicle stages in the workshop bay, customer dashboards update live across synchronized streams. Estimated completion times automatically recalibrate in real time without screen refresh delays.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Automotive Services Covered — White Editorial Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div>
          <span className="text-[12px] font-semibold uppercase tracking-wider text-[#0066cc]">Service Catalog</span>
          <h3 className="text-2xl sm:text-3xl font-semibold text-[#1d1d1f] tracking-tight mt-1">
            Comprehensive Vehicle Services Supported
          </h3>
          <p className="text-[15px] text-[#707070] mt-1">
            DriveOps seamlessly coordinates workflows across all major automotive repair classifications:
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
            <div key={idx} className="bg-white border border-[#d6d6d6] rounded-[20px] p-5 space-y-1.5 shadow-none">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[#0066cc]">{s.cat}</span>
              <h4 className="text-[15px] font-semibold text-[#1d1d1f] truncate">{s.name}</h4>
              <span className="text-[13px] text-[#707070] block">Estimated: ~{s.est}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Workshop & Franchise Partnership CTA Section — Studio Mist (#f5f5f7) with 28px White Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#f5f5f7] border border-[#d6d6d6] rounded-[28px] p-8 sm:p-12 shadow-none">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white border border-[#d6d6d6] text-[#1d1d1f] text-[12px] font-medium shadow-none">
                <Building2 className="w-3.5 h-3.5 text-[#0071e3]" />
                <span>Partner Network</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-semibold text-[#1d1d1f] tracking-tight leading-tight">
                List Your Service Center or Workshop on DriveOps
              </h2>

              <p className="text-[16px] text-[#707070] max-w-2xl leading-relaxed">
                Whether you operate an independent multi-brand workshop, an authorized dealership, or a nationwide auto repair chain, deploy DriveOps to automate bay routing and customer visibility.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[14px] text-[#1d1d1f]">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0071e3] shrink-0" />
                  <span>Live workshop capacity & service publishing</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0071e3] shrink-0" />
                  <span>Automated Bay & Mechanic assignment engine</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0071e3] shrink-0" />
                  <span>Dedicated Branch Manager console credentials</span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#0071e3] shrink-0" />
                  <span>Real-time ML turnaround time predictions</span>
                </div>
              </div>
            </div>

            {/* Floating Pricing Callout Card — 28px White Capsule with Pricing Blue Pill */}
            <div className="lg:col-span-4 flex flex-col items-start lg:items-end justify-center">
              <div className="bg-white border border-[#d6d6d6] p-7 rounded-[28px] text-center space-y-4 w-full sm:max-w-xs shadow-none">
                {user?.role === 'super_admin' ? (
                  <div>
                    <span className="text-[12px] uppercase font-semibold text-[#707070] block">Platform Governance</span>
                    <span className="text-2xl font-semibold text-[#1d1d1f] mt-1 block">Root Console</span>
                    <span className="text-[12px] text-[#86868b] block mt-0.5">Manage All Franchises & Centers</span>
                  </div>
                ) : (
                  <div>
                    <span className="text-[12px] uppercase font-semibold text-[#707070] block">Subscription Plans From</span>
                    <span className="text-3xl font-semibold text-[#1d1d1f] mt-1 block">₹499<span className="text-sm font-normal text-[#707070]">/mo</span></span>
                    <span className="text-[12px] text-[#86868b] block mt-0.5">Flexible monthly & annual tiers</span>
                  </div>
                )}

                {user?.role === 'super_admin' ? (
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('admin-dashboard')}
                    className="w-full py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-normal text-[14px] transition flex items-center justify-center space-x-2 cursor-pointer shadow-none"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Platform Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={() => setShowPlansModal(true)}
                    className="w-full py-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white font-normal text-[14px] transition flex items-center justify-center space-x-2 cursor-pointer shadow-none"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>List Your Branch Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <span className="text-[11px] text-[#86868b] block">
                  {user?.role === 'super_admin' ? 'Root platform access • Full privileges' : 'Instant setup • Includes initial bays & mechanics'}
                </span>
              </div>
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
