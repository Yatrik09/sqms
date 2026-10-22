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
      <footer className="bg-[#f5f5f7] border-t border-[#d6d6d6] text-[#707070] font-sans mt-auto relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-6 sm:pb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10 pb-10 border-b border-[#d6d6d6]">
            {/* Column 1: Brand & Platform Overview (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="flex items-center space-x-3">
                <img
                  src="/logo.png"
                  alt="DriveOps"
                  className="h-10 sm:h-11 w-auto object-contain max-w-[190px]"
                />
              </div>

              <p className="text-[14px] text-[#707070] leading-relaxed max-w-sm">
                Next-generation automotive queue management and waiting time prediction system. 
                Replacing static tokens with real-time machine learning telemetry and automated workshop bay dispatching.
              </p>

              <div className="pt-2 flex items-center space-x-2 text-[12px] text-[#86868b]">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white border border-[#d6d6d6] text-[#1d1d1f]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#0071e3]" />
                  <span>ISO Automotive AI Standard</span>
                </span>
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white border border-[#d6d6d6] text-[#1d1d1f]">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>24/7 Live Sync</span>
                </span>
              </div>
            </div>

            {/* Column 2: Role-Aware Operations Hub (5 cols) - Apple 28px White Card on Studio Mist */}
            {isSuperAdmin ? (
              /* Super Admin System Console Card */
              <div className="lg:col-span-5 bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#1d1d1f] text-[12px] font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#0071e3]" />
                    <span>Super Admin Console</span>
                  </div>
                  <span className="text-[12px] text-emerald-600 font-medium flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Platform Online</span>
                  </span>
                </div>

                <h4 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
                  Enterprise Governance & Operations
                </h4>
                <p className="text-[14px] text-[#707070] leading-relaxed">
                  Super Administrator master console. Real-time franchise subscription revenue auditing, multi-center ML predictive models, service center verification, and security audit logs.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('admin-dashboard')}
                    className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[12px] font-normal transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Plans & Revenue Analytics</span>
                  </button>
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('admin-audit')}
                    className="px-4 py-2 rounded-full bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] text-[12px] font-normal border border-[#86868b] transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#707070]" />
                    <span>Audit Logs</span>
                  </button>
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('admin-ml')}
                    className="px-4 py-2 rounded-full bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] text-[12px] font-normal border border-[#86868b] transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Cpu className="w-3.5 h-3.5 text-[#0071e3]" />
                    <span>ML Pipeline</span>
                  </button>
                </div>
              </div>
            ) : isBranchManager ? (
              /* Branch Manager Operations Card */
              <div className="lg:col-span-5 bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#1d1d1f] text-[12px] font-medium">
                    <Activity className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Branch Operations Console</span>
                  </div>
                  <span className="text-[12px] text-emerald-600 font-medium">Live Bay Dispatch</span>
                </div>

                <h4 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
                  Workshop Floor Management
                </h4>
                <p className="text-[14px] text-[#707070] leading-relaxed">
                  Real-time queue monitoring, walk-in token issuance, mechanic bay allocation, and service duration telemetry tracking.
                </p>

                <div className="pt-2 flex items-center space-x-2">
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('manager-queue')}
                    className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[12px] font-normal transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Manage Live Queue</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('manager-analytics')}
                    className="px-4 py-2 rounded-full bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] text-[12px] font-normal border border-[#86868b] transition cursor-pointer"
                  >
                    Branch Analytics
                  </button>
                </div>
              </div>
            ) : isFranchiseOwner ? (
              /* Franchise Owner Network Card */
              <div className="lg:col-span-5 bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#1d1d1f] text-[12px] font-medium">
                    <Building2 className="w-3.5 h-3.5 text-[#0071e3]" />
                    <span>Franchise Owner Console</span>
                  </div>
                  <span className="text-[12px] text-[#0066cc] font-medium">Multi-Branch Network</span>
                </div>

                <h4 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
                  Franchise Network Operations & Branch Quotas
                </h4>
                <p className="text-[14px] text-[#707070] leading-relaxed">
                  Configure branch managers, monitor multi-location bay throughput, track branch resource utilization, and review franchise growth.
                </p>

                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('owner-overview')}
                    className="px-4 py-2 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[12px] font-normal transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <span>Branch Overview</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('owner-analytics')}
                    className="px-4 py-2 rounded-full bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] text-[12px] font-normal border border-[#86868b] transition cursor-pointer"
                  >
                    Network Analytics
                  </button>
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('owner-branches')}
                    className="px-4 py-2 rounded-full bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] text-[12px] font-normal border border-[#86868b] transition cursor-pointer"
                  >
                    Workshop Branches
                  </button>
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('owner-managers')}
                    className="px-4 py-2 rounded-full bg-white hover:bg-[#f5f5f7] text-[#1d1d1f] text-[12px] font-normal border border-[#86868b] transition cursor-pointer"
                  >
                    Branch Managers
                  </button>
                </div>
              </div>
            ) : (
              /* Customer / Public Visitor: Workshop & Franchise Plans Callout */
              <div className="lg:col-span-5 bg-white p-6 rounded-[28px] border border-[#d6d6d6] shadow-none space-y-3">
                <div className="flex items-center justify-between">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#f5f5f7] border border-[#d6d6d6] text-[#1d1d1f] text-[12px] font-medium">
                    <Building2 className="w-3.5 h-3.5 text-[#0071e3]" />
                    <span>For Workshop & Franchise Owners</span>
                  </div>
                  <span className="text-[12px] text-[#0066cc] font-medium">3 Flexible Tiers</span>
                </div>

                <h4 className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight">
                  List Your Auto Service Center on DriveOps
                </h4>
                <p className="text-[14px] text-[#707070] leading-relaxed">
                  Connect your physical workshops, assign dedicated branch managers, automate bay queues, and access AI waiting time prediction models.
                </p>

                <div className="pt-2 flex items-center space-x-3">
                  <button
                    onClick={() => setShowPlansModal(true)}
                    className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[12px] font-normal transition flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>View Plans & Partner</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[12px] text-[#86868b]">Starting at ₹499/mo</span>
                </div>
              </div>
            )}

            {/* Column 3: Quick Navigation (3 cols) */}
            <div className="lg:col-span-3 space-y-3">
              <h4 className="text-[12px] font-semibold uppercase tracking-wider text-[#1d1d1f]">Quick Navigation</h4>
              <ul className="space-y-2.5 text-[14px]">
                <li>
                  <button
                    onClick={() => onNavigateTab && onNavigateTab('about-us')}
                    className="text-[#707070] hover:text-[#0066cc] transition flex items-center space-x-1 cursor-pointer"
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-[#0066cc]" />
                    <span>About DriveOps Platform</span>
                  </button>
                </li>

                {isSuperAdmin ? (
                  <>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('admin-dashboard')}
                        className="text-[#707070] hover:text-[#0066cc] transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#0066cc]" />
                        <span>Plans & Revenue Analytics</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('admin-centers')}
                        className="text-[#707070] hover:text-[#0066cc] transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#0066cc]" />
                        <span>Service Centers Directory</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('admin-ml')}
                        className="text-[#707070] hover:text-[#0066cc] transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#0066cc]" />
                        <span>Machine Learning Pipeline</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('admin-audit')}
                        className="text-[#707070] hover:text-[#0066cc] transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#0066cc]" />
                        <span>Platform Security Audit Logs</span>
                      </button>
                    </li>
                  </>
                ) : isBranchManager ? (
                  <>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('manager-queue')}
                        className="text-[#707070] hover:text-[#0066cc] transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#0066cc]" />
                        <span>Workshop Queue Dispatcher</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('manager-analytics')}
                        className="text-[#707070] hover:text-[#0066cc] transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#0066cc]" />
                        <span>Center Performance Analytics</span>
                      </button>
                    </li>
                  </>
                ) : isFranchiseOwner ? (
                  <>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('owner-overview')}
                        className="text-[#707070] hover:text-[#0066cc] transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#0066cc]" />
                        <span>Multi-Branch Overview</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('owner-analytics')}
                        className="text-[#707070] hover:text-[#0066cc] transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#0066cc]" />
                        <span>Network Analytics</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('owner-branches')}
                        className="text-[#707070] hover:text-[#0066cc] transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#0066cc]" />
                        <span>Workshop Branches</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('owner-managers')}
                        className="text-[#707070] hover:text-[#0066cc] transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#0066cc]" />
                        <span>Branch Managers</span>
                      </button>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      <button
                        onClick={() => setShowPlansModal(true)}
                        className="text-[#707070] hover:text-[#0066cc] transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#0066cc]" />
                        <span>Franchise Subscription Plans</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('active-service')}
                        className="text-[#707070] hover:text-[#0066cc] transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#0066cc]" />
                        <span>Live Service Queue Tracking</span>
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => onNavigateTab && onNavigateTab('book-service')}
                        className="text-[#707070] hover:text-[#0066cc] transition flex items-center space-x-1 cursor-pointer"
                      >
                        <ChevronRight className="w-3.5 h-3.5 text-[#0066cc]" />
                        <span>Service Recommendation Engine</span>
                      </button>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#86868b]">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-[#1d1d1f]">DriveOps</span>
              <span>•</span>
              <span>Book Today. Drive Tomorrow.</span>
              <span>•</span>
              <span>AI-Powered Workshop Queue & Operations Platform</span>
            </div>
            <div className="text-[12px]">
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
