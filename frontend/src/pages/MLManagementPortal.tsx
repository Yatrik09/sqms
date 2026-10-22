import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import type { MLStatusResponse } from '../types';
import {
  Cpu, Award, BarChart3, Database, Play, CheckCircle2, AlertCircle, RefreshCw, Layers, TrendingUp
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

export const MLManagementPortal: React.FC = () => {
  const [status, setStatus] = useState<MLStatusResponse | null>(null);
  const [evalData, setEvalData] = useState<any>(null);
  const [datasetPreview, setDatasetPreview] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainMessage, setTrainMessage] = useState<string | null>(null);

  const loadMLData = async () => {
    try {
      const [mStatus, eData, dPrev] = await Promise.all([
        api.getMLStatus(),
        api.getMLEvaluationData(),
        api.getDatasetPreview(),
      ]);
      setStatus(mStatus);
      setEvalData(eData);
      setDatasetPreview(dPrev);
    } catch (e) {
      console.error('Failed to load ML data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMLData();
  }, []);

  const handleRetrain = async () => {
    setIsTraining(true);
    setTrainMessage(null);
    try {
      const res = await api.triggerMLTraining();
      setTrainMessage(`Model training successful! Selected Waiting Model: ${res.best_waiting_model}, Selected Duration Model: ${res.best_duration_model}`);
      await loadMLData();
    } catch (e: any) {
      alert(e.message || 'Training failed');
    } finally {
      setIsTraining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] bg-white">
        <div className="flex items-center space-x-3 text-[#707070]">
          <RefreshCw className="w-5 h-5 animate-spin text-[#0071e3]" />
          <span className="text-sm font-medium tracking-tight text-[#1d1d1f]">Loading ML models and evaluation matrices...</span>
        </div>
      </div>
    );
  }

  // Format feature importance for chart
  const featureDataWaiting = evalData?.feature_importance_waiting
    ? Object.entries(evalData.feature_importance_waiting).map(([key, val]) => ({
        feature: key.replace(/_/g, ' '),
        importance: val,
      }))
    : [];

  // Comparison arrays for table
  const waitingComparison = status?.waiting_time?.comparison
    ? Object.entries(status.waiting_time.comparison).map(([model, metrics]) => ({
        model,
        ...metrics,
        isActive: model === status?.waiting_time?.active_model,
      }))
    : [];

  const durationComparison = status?.service_duration?.comparison
    ? Object.entries(status.service_duration.comparison).map(([model, metrics]) => ({
        model,
        ...metrics,
        isActive: model === status?.service_duration?.active_model,
      }))
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-2 sm:pb-4 space-y-8 bg-white text-[#1d1d1f]">
      {/* Header */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 text-[#1d1d1f] shadow-none flex flex-col md:flex-row md:items-center justify-between gap-6 border border-[#d6d6d6]">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
            Research Experiment & ML Pipeline
          </span>
          <h1 className="text-2xl sm:text-3xl font-semibold mt-2 text-[#1d1d1f] tracking-tight">Machine Learning Evaluation & Retraining</h1>
          <p className="text-[#707070] text-xs sm:text-sm mt-1 max-w-xl leading-relaxed">
            Empirical comparison of Baseline, Linear, Decision Tree, Random Forest, and Gradient Boosting models on {status?.dataset_records ?? 12000} synthetic service records.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            disabled={isTraining}
            onClick={handleRetrain}
            className="px-5 py-2.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] disabled:opacity-50 text-white font-medium text-xs shadow-none transition flex items-center space-x-2 cursor-pointer"
          >
            <Play className={`w-4 h-4 ${isTraining ? 'animate-spin' : ''}`} />
            <span>{isTraining ? 'Training Models...' : 'Retrain Pipeline'}</span>
          </button>
        </div>
      </div>

      {trainMessage && (
        <div className="bg-[#f5f5f7] border border-[#d6d6d6] text-[#1d1d1f] p-4 rounded-[20px] text-xs font-medium flex items-center space-x-3 shadow-none">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{trainMessage}</span>
        </div>
      )}

      {/* Production Models Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model A Summary */}
        <div className="bg-white border border-[#d6d6d6] hover:border-[#86868b] rounded-[28px] p-6 shadow-none space-y-4 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
              Model A: Waiting Time
            </span>
            <span className="flex items-center space-x-1.5 text-xs font-medium text-[#1d1d1f]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Active: {status?.waiting_time?.active_model}</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 bg-[#f5f5f7] p-4 rounded-[20px] border border-[#e6e6e8] text-center">
            <div>
              <span className="text-[10px] text-[#707070] uppercase font-semibold block mb-1">MAE</span>
              <span className="text-xl sm:text-2xl font-semibold text-[#1d1d1f]">{status?.waiting_time?.best_metrics.mae} min</span>
            </div>
            <div>
              <span className="text-[10px] text-[#707070] uppercase font-semibold block mb-1">RMSE</span>
              <span className="text-xl sm:text-2xl font-semibold text-[#1d1d1f]">{status?.waiting_time?.best_metrics.rmse} min</span>
            </div>
            <div>
              <span className="text-[10px] text-[#707070] uppercase font-semibold block mb-1">R² Score</span>
              <span className="text-xl sm:text-2xl font-semibold text-[#0071e3]">{status?.waiting_time?.best_metrics.r2}</span>
            </div>
          </div>
        </div>

        {/* Model B Summary */}
        <div className="bg-white border border-[#d6d6d6] hover:border-[#86868b] rounded-[28px] p-6 shadow-none space-y-4 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6]">
              Model B: Service Duration
            </span>
            <span className="flex items-center space-x-1.5 text-xs font-medium text-[#1d1d1f]">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Active: {status?.service_duration?.active_model}</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 bg-[#f5f5f7] p-4 rounded-[20px] border border-[#e6e6e8] text-center">
            <div>
              <span className="text-[10px] text-[#707070] uppercase font-semibold block mb-1">MAE</span>
              <span className="text-xl sm:text-2xl font-semibold text-[#1d1d1f]">{status?.service_duration?.best_metrics.mae} min</span>
            </div>
            <div>
              <span className="text-[10px] text-[#707070] uppercase font-semibold block mb-1">RMSE</span>
              <span className="text-xl sm:text-2xl font-semibold text-[#1d1d1f]">{status?.service_duration?.best_metrics.rmse} min</span>
            </div>
            <div>
              <span className="text-[10px] text-[#707070] uppercase font-semibold block mb-1">R² Score</span>
              <span className="text-xl sm:text-2xl font-semibold text-[#0071e3]">{status?.service_duration?.best_metrics.r2}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Comparison Table */}
      <div className="bg-white border border-[#d6d6d6] rounded-[28px] p-6 sm:p-8 shadow-none space-y-5">
        <div>
          <h3 className="text-lg font-semibold text-[#1d1d1f] flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#0071e3]" />
            <span>Model Benchmark & Evaluation Comparison</span>
          </h3>
          <p className="text-xs text-[#707070] mt-1">
            Empirical evaluation across candidate regressors calculated on the held-out test split.
          </p>
        </div>

        <div className="overflow-x-auto rounded-[20px] border border-[#e6e6e8]">
          <table className="w-full text-left text-xs text-[#1d1d1f] min-w-[700px]">
            <thead className="bg-[#f5f5f7] uppercase text-[10px] font-semibold text-[#707070] tracking-wider border-b border-[#e6e6e8]">
              <tr>
                <th className="p-3.5">Target</th>
                <th className="p-3.5">Candidate Model</th>
                <th className="p-3.5">MAE</th>
                <th className="p-3.5">RMSE</th>
                <th className="p-3.5">R² Score</th>
                <th className="p-3.5">Train Duration (sec)</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e6e8]">
              {waitingComparison.map((m: any, idx) => (
                <tr key={`wait-${idx}`} className={`transition ${m.isActive ? 'bg-[#fafafc] font-medium' : 'hover:bg-[#fafafc]'}`}>
                  <td className="p-3.5 font-mono text-[11px] text-[#0066cc]">Waiting Time</td>
                  <td className="p-3.5 font-semibold text-[#1d1d1f]">{m.model}</td>
                  <td className="p-3.5 font-mono text-[#707070]">{m.mae} min</td>
                  <td className="p-3.5 font-mono text-[#707070]">{m.rmse} min</td>
                  <td className="p-3.5 font-mono font-semibold text-[#1d1d1f]">{m.r2}</td>
                  <td className="p-3.5 text-[#707070]">{m.training_time_sec ?? '<1'}s</td>
                  <td className="p-3.5">
                    {m.isActive ? (
                      <span className="px-2.5 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6] text-[10px] font-medium">
                        ★ Production Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#86868b]">Benchmark</span>
                    )}
                  </td>
                </tr>
              ))}

              {durationComparison.map((m: any, idx) => (
                <tr key={`dur-${idx}`} className={`transition ${m.isActive ? 'bg-[#fafafc] font-medium' : 'hover:bg-[#fafafc]'}`}>
                  <td className="p-3.5 font-mono text-[11px] text-[#0066cc]">Service Duration</td>
                  <td className="p-3.5 font-semibold text-[#1d1d1f]">{m.model}</td>
                  <td className="p-3.5 font-mono text-[#707070]">{m.mae} min</td>
                  <td className="p-3.5 font-mono text-[#707070]">{m.rmse} min</td>
                  <td className="p-3.5 font-mono font-semibold text-[#1d1d1f]">{m.r2}</td>
                  <td className="p-3.5 text-[#707070]">{m.training_time_sec ?? '<1'}s</td>
                  <td className="p-3.5">
                    {m.isActive ? (
                      <span className="px-2.5 py-1 rounded-full bg-[#f5f5f7] text-[#1d1d1f] border border-[#d6d6d6] text-[10px] font-medium">
                        ★ Production Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#86868b]">Benchmark</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Visual Charts: Actual vs Predicted & Feature Importance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Actual vs Predicted Waiting Time Chart */}
        <div className="bg-white border border-[#d6d6d6] rounded-[28px] p-6 shadow-none space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-[#1d1d1f] flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-[#0071e3]" />
              <span>Actual vs Predicted Waiting Time</span>
            </h4>
            <p className="text-xs text-[#707070] mt-1">Comparison of ground truth vs ML regression output</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evalData?.actual_vs_predicted_waiting || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e8" />
                <XAxis dataKey="index" tick={false} stroke="#86868b" />
                <YAxis stroke="#86868b" unit="m" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#d6d6d6',
                    borderRadius: '16px',
                    color: '#1d1d1f',
                    boxShadow: 'none',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#707070' }} />
                <Line type="monotone" dataKey="actual" stroke="#0071e3" name="Actual Wait (min)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="predicted" stroke="#707070" name="Predicted Wait (min)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature Importance Chart */}
        <div className="bg-white border border-[#d6d6d6] rounded-[28px] p-6 shadow-none space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-[#1d1d1f] flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#0071e3]" />
              <span>Model Feature Importance (Top Predictors)</span>
            </h4>
            <p className="text-xs text-[#707070] mt-1">Normalized percentage contribution to regression decisions</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureDataWaiting} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e6e6e8" />
                <XAxis type="number" stroke="#86868b" unit="%" />
                <YAxis dataKey="feature" type="category" stroke="#707070" width={110} tick={{ fontSize: 10, fill: '#707070' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#d6d6d6',
                    borderRadius: '16px',
                    color: '#1d1d1f',
                    boxShadow: 'none',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="importance" fill="#0071e3" name="Importance (%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dataset Management Section */}
      <div className="bg-white border border-[#d6d6d6] rounded-[28px] p-6 sm:p-8 shadow-none space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[#1d1d1f] flex items-center space-x-2">
              <Database className="w-5 h-5 text-[#0071e3]" />
              <span>Dataset Governance & Integrity</span>
            </h3>
            <p className="text-xs text-[#707070] mt-1">
              Synthetic research training dataset: {datasetPreview?.total_records ?? 12000} records, 0 missing values.
            </p>
          </div>
          <span className="px-3 py-1 bg-[#f5f5f7] text-[#1d1d1f] text-xs font-medium rounded-full border border-[#d6d6d6] flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Validated • Clean</span>
          </span>
        </div>

        <div className="overflow-x-auto max-h-80 rounded-[20px] border border-[#e6e6e8]">
          <table className="w-full text-left text-[11px] text-[#1d1d1f] min-w-[700px]">
            <thead className="bg-[#f5f5f7] uppercase text-[9px] font-semibold text-[#707070] sticky top-0 z-10 tracking-wider border-b border-[#e6e6e8]">
              <tr>
                <th className="p-3">Record ID</th>
                <th className="p-3">Center ID</th>
                <th className="p-3">Vehicle Type</th>
                <th className="p-3">Service Type</th>
                <th className="p-3">Queue Pos</th>
                <th className="p-3">Avail Mechs</th>
                <th className="p-3">Avail Bays</th>
                <th className="p-3">Workload</th>
                <th className="p-3 font-semibold text-[#1d1d1f]">Actual Wait</th>
                <th className="p-3 font-semibold text-[#1d1d1f]">Actual Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e6e6e8]">
              {datasetPreview?.preview?.map((rec: any, idx: number) => (
                <tr key={idx} className="hover:bg-[#fafafc] font-mono transition">
                  <td className="p-3 text-[#0066cc] font-medium">{rec.record_id}</td>
                  <td className="p-3 text-[#707070] font-sans">Center {rec.service_center_id}</td>
                  <td className="p-3 text-[#1d1d1f] font-sans">{rec.vehicle_type}</td>
                  <td className="p-3 text-[#1d1d1f] font-sans">{rec.service_type}</td>
                  <td className="p-3 text-[#707070]">#{rec.queue_position}</td>
                  <td className="p-3 text-[#707070]">{rec.available_mechanics}</td>
                  <td className="p-3 text-[#707070]">{rec.available_bays}</td>
                  <td className="p-3 text-[#707070]">{(rec.current_workload * 100).toFixed(0)}%</td>
                  <td className="p-3 font-semibold text-[#1d1d1f]">{rec.actual_waiting_time}m</td>
                  <td className="p-3 font-semibold text-[#0071e3]">{rec.actual_service_duration}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
