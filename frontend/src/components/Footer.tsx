import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FranchisePlansModal } from './FranchisePlansModal';
import {
  Car, Building2, Sparkles, ShieldCheck, ChevronRight, Clock, Activity, Cpu, FileText, Layers
} from 'lucide-react';

interface FooterProps {
  onNavigateTab?: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateTab }) => {
  const { user } = useAuth();
  const [showPlansModal, setShowPlansModal] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const isBranchManager = user?.role === 'branch_manager';
  const isFranchiseOwner = user?.role === 'franchise_owner';

  return (
    <>
      <footer className="bg-slate-950 border-t border-slate-800/80 text-slate-400 font-sans mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-10 border-b border-slate-800/80">
            {/* Column 1: Brand & Platform Overview (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <Car className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center">
                  <span className="text-2xl font-black tracking-tight text-white">Smart</span>
                  <span className="text-2xl font-black tracking-tight text-blue-500 ml-1">Q</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Next-generation automotive queue management and waiting time prediction system. 
                Replacing static tokens with real-time machine learning telemetry and automated workshop bay dispatching.
              </p>

              <div className="pt-2 flex items-center space-x-3 text-xs text-slate-500">
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  <span>ISO Automotive AI Standard</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>24/7 Live Sync</span>
                </span>
              </div>
            </div>

            {/* Column 2: Role-Aware Operations Hub (5 cols) */}
            {isSuperAdmin ? (
              /* Super Admin System Console Card (NO purchase plans, NO sales pitches) */
              <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900/90 to-blue-950/40 p-5 rounded-3xl border border-blue-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[11px] font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                    <span>Super Admin System Console</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Platform Online</span>
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white">
                  Enterprise Governance & System Operations
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Super Administrator master console. Real-time franchise subscription revenue auditing, multi-center ML predictive models, service center verification, and security audit logs.
                </p>

                <div className="pt-1 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('admin-dashboard')}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/25 transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Plans & Revenue Analytics</span>
                  </button>
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('admin-audit')}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Audit Logs</span>
                  </button>
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('admin-ml')}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                    <span>ML Pipeline</span>
                  </button>
                </div>
              </div>
            ) : isBranchManager ? (
              /* Branch Manager Operations Card */
              <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 p-5 rounded-3xl border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Branch Operations Console</span>
                  </div>
                  <span className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider">Live Bay Dispatch</span>
                </div>

                <h4 className="text-sm font-bold text-white">
                  Workshop Floor Management
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time queue monitoring, walk-in token issuance, mechanic bay allocation, and service duration telemetry tracking.
                </p>

                <div className="pt-1 flex items-center space-x-2">
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('manager-queue')}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Manage Live Queue</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('manager-analytics')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    Branch Analytics
                  </button>
                </div>
              </div>
            ) : isFranchiseOwner ? (
              /* Franchise Owner Network Card */
              <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-5 rounded-3xl border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Franchise Owner Console</span>
                  </div>
                  <span className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">Multi-Branch Network</span>
                </div>

                <h4 className="text-sm font-bold text-white">
                  Franchise Network Operations & Branch Quotas
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Configure branch managers, monitor multi-location bay throughput, track branch resource utilization, and review franchise growth.
                </p>

                <div className="pt-1 flex items-center space-x-2">
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('owner-overview')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Manage Branches</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('owner-analytics')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition cursor-pointer"
                  >
                    Network Analytics
                  </button>
                </div>
              </div>
            ) : (
              /* Customer / Public Visitor: Workshop & Franchise Plans Callout */
              <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-5 rounded-3xl border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>For Workshop & Franchise Owners</span>
                  </div>
                  <span className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">3 Flexible Tiers</span>
                </div>

                <h4 className="text-sm font-bold text-white">
                  List Your Auto Service Center on Smart Q
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Connect your physical workshops, assign dedicated branch managers, automate bay queues, and access AI waiting time prediction models.
                </p>

                <div className="pt-1 flex items-center space-x-3">
                  <button
                    onClick={() => setShowPlansModal(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                    <span>View Plans & Partner</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] text-slate-400 font-medium">Starting at ₹499/mo</span>
                </div>
              </div>
            )}

            {/* Column 3: Quick Navigation (3 cols) */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Quick Navigation</h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('about-us')}
                    className="text-slate-400 hover:text-white transition flex items-center space-x-1 cursor-pointer"
                  >
                    <ChevronRight className="w-3 h-3 text-blue-400" />
                    <span>About Smart Q Platform</span>
                  </button>
                </li>

                {isSuperAdmin ? (
                  <>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('admin-dashboard')}
                        className="text-slate-400 hover:text-white transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3 h-3 text-blue-400" />
                        <span>Plans & Revenue Analytics</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('admin-centers')}
                        className="text-slate-400 hover:text-white transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3 h-3 text-blue-400" />
                        <span>Service Centers Directory</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('admin-ml')}
                        className="text-slate-400 hover:text-white transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3 h-3 text-blue-400" />
                        <span>Machine Learning Pipeline</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('admin-audit')}
                        className="text-slate-400 hover:text-white transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3 h-3 text-blue-400" />
                        <span>Platform Security Audit Logs</span>
                      </button>
                    </li>
                  </>
                ) : isBranchManager ? (
                  <>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('manager-queue')}
                        className="text-slate-400 hover:text-white transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3 h-3 text-blue-400" />
                        <span>Workshop Queue Dispatcher</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('manager-analytics')}
                        className="text-slate-400 hover:text-white transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3 h-3 text-blue-400" />
                        <span>Center Performance Analytics</span>
                      </button>
                    </li>
                  </>
                ) : isFranchiseOwner ? (
                  <>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('owner-overview')}
                        className="text-slate-400 hover:text-white transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3 h-3 text-blue-400" />
                        <span>Branch Network Overview</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('owner-analytics')}
                        className="text-slate-400 hover:text-white transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3 h-3 text-blue-400" />
                        <span>Franchise Network Analytics</span>
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <button
                        onClick={() => setShowPlansModal(true)}
                        className="text-slate-400 hover:text-white transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3 h-3 text-blue-400" />
                        <span>Franchise Subscription Plans</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('active-service')}
                        className="text-slate-400 hover:text-white transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3 h-3 text-blue-400" />
                        <span>Live Service Queue Tracking</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('book-service')}
                        className="text-slate-400 hover:text-white transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3 h-3 text-blue-400" />
                        <span>Service Recommendation Engine</span>
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-slate-400">Smart Q</span>
              <span>•</span>
              <span>AI-Powered Smart Queue Management System</span>
            </div>
            <div className="text-[11px]">
              Automotive Decision Support Platform • Multi-Center Machine Learning
            </div>
          </div>
        </div>
      </footer>

      {/* Franchise & Workshop Plans Modal (Rendered ONLY for customer / prospective franchise owner) */}
      {!isSuperAdmin && !isBranchManager && (
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
    </>
  );
};
