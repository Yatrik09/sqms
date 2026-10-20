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
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex items-center space-x-3 text-slate-400">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
          <span className="text-sm font-semibold tracking-wide">Loading ML models and evaluation matrices...</span>
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950/80 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-blue-500/30 backdrop-blur-md">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
            Research Experiment & ML Pipeline
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold mt-2 text-white">Machine Learning Evaluation & Retraining</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
            Empirical comparison of Baseline, Linear, Decision Tree, Random Forest, and Gradient Boosting models on {status?.dataset_records ?? 12000} synthetic service records.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            disabled={isTraining}
            onClick={handleRetrain}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition flex items-center space-x-2 cursor-pointer"
          >
            <Play className={`w-4 h-4 ${isTraining ? 'animate-spin' : ''}`} />
            <span>{isTraining ? 'Training Models...' : 'Retrain Pipeline'}</span>
          </button>
        </div>
      </div>

      {trainMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 p-4 rounded-2xl text-xs font-semibold flex items-center space-x-3 shadow-lg shadow-emerald-950/40 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{trainMessage}</span>
        </div>
      )}

      {/* Production Models Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Model A Summary */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-md hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Model A: Waiting Time
            </span>
            <span className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active: {status?.waiting_time?.active_model}</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">MAE</span>
              <span className="text-xl sm:text-2xl font-black text-white">{status?.waiting_time?.best_metrics.mae} min</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">RMSE</span>
              <span className="text-xl sm:text-2xl font-black text-white">{status?.waiting_time?.best_metrics.rmse} min</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">R² Score</span>
              <span className="text-xl sm:text-2xl font-black text-blue-400">{status?.waiting_time?.best_metrics.r2}</span>
            </div>
          </div>
        </div>

        {/* Model B Summary */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-md hover:border-slate-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Model B: Service Duration
            </span>
            <span className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active: {status?.service_duration?.active_model}</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 bg-slate-950/70 p-4 rounded-2xl border border-slate-800/80 text-center">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">MAE</span>
              <span className="text-xl sm:text-2xl font-black text-white">{status?.service_duration?.best_metrics.mae} min</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">RMSE</span>
              <span className="text-xl sm:text-2xl font-black text-white">{status?.service_duration?.best_metrics.rmse} min</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">R² Score</span>
              <span className="text-xl sm:text-2xl font-black text-purple-400">{status?.service_duration?.best_metrics.r2}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Comparison Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 backdrop-blur-md">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>Model Benchmark & Evaluation Comparison</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Empirical evaluation across candidate regressors calculated on the held-out test split (Section 16 & 17).
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300 min-w-[700px]">
            <thead className="bg-slate-950/90 uppercase text-[10px] font-bold text-slate-400 tracking-wider">
              <tr>
                <th className="p-3.5">Target</th>
                <th className="p-3.5">Candidate Model</th>
                <th className="p-3.5">Mean Absolute Error (MAE)</th>
                <th className="p-3.5">Root Mean Squared Error (RMSE)</th>
                <th className="p-3.5">Coefficient of Determination (R²)</th>
                <th className="p-3.5">Train Duration (sec)</th>
                <th className="p-3.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {waitingComparison.map((m: any, idx) => (
                <tr key={`wait-${idx}`} className={`transition ${m.isActive ? 'bg-blue-500/10 border-l-2 border-blue-500 font-semibold' : 'hover:bg-slate-800/40'}`}>
                  <td className="p-3.5 font-mono text-[11px] text-blue-400 font-bold">Waiting Time</td>
                  <td className="p-3.5 font-bold text-white">{m.model}</td>
                  <td className="p-3.5 font-mono text-slate-300">{m.mae} min</td>
                  <td className="p-3.5 font-mono text-slate-300">{m.rmse} min</td>
                  <td className="p-3.5 font-mono font-bold text-white">{m.r2}</td>
                  <td className="p-3.5 text-slate-400">{m.training_time_sec ?? '<1'}s</td>
                  <td className="p-3.5">
                    {m.isActive ? (
                      <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-bold">
                        ★ Production Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-medium">Benchmark</span>
                    )}
                  </td>
                </tr>
              ))}

              {durationComparison.map((m: any, idx) => (
                <tr key={`dur-${idx}`} className={`transition ${m.isActive ? 'bg-purple-500/10 border-l-2 border-purple-500 font-semibold' : 'hover:bg-slate-800/40'}`}>
                  <td className="p-3.5 font-mono text-[11px] text-purple-400 font-bold">Service Duration</td>
                  <td className="p-3.5 font-bold text-white">{m.model}</td>
                  <td className="p-3.5 font-mono text-slate-300">{m.mae} min</td>
                  <td className="p-3.5 font-mono text-slate-300">{m.rmse} min</td>
                  <td className="p-3.5 font-mono font-bold text-white">{m.r2}</td>
                  <td className="p-3.5 text-slate-400">{m.training_time_sec ?? '<1'}s</td>
                  <td className="p-3.5">
                    {m.isActive ? (
                      <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                        ★ Production Active
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-medium">Benchmark</span>
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
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-md">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <span>Actual vs Predicted Waiting Time (Sampled Test Points)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">Comparison of ground truth vs ML regression output</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evalData?.actual_vs_predicted_waiting || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="index" tick={false} stroke="#64748b" />
                <YAxis stroke="#64748b" unit="m" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '16px',
                    color: '#f8fafc',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Line type="monotone" dataKey="actual" stroke="#38bdf8" name="Actual Wait (min)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="predicted" stroke="#fbbf24" name="Predicted Wait (min)" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feature Importance Chart */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 backdrop-blur-md">
          <div>
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Model Feature Importance (Top Predictors)</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">Normalized percentage contribution to regression decisions</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={featureDataWaiting} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" unit="%" />
                <YAxis dataKey="feature" type="category" stroke="#94a3b8" width={110} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    borderColor: '#334155',
                    borderRadius: '16px',
                    color: '#f8fafc',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="importance" fill="#3b82f6" name="Importance (%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dataset Management Section */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Database className="w-5 h-5 text-blue-400" />
              <span>Dataset Governance & Integrity</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Synthetic research training dataset: {datasetPreview?.total_records ?? 12000} records, 0 missing values.
            </p>
          </div>
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full border border-emerald-500/30 flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Validated • Clean</span>
          </span>
        </div>

        <div className="overflow-x-auto max-h-80 rounded-2xl border border-slate-800">
          <table className="w-full text-left text-[11px] text-slate-300 min-w-[700px]">
            <thead className="bg-slate-950/90 uppercase text-[9px] font-bold text-slate-400 sticky top-0 z-10 tracking-wider">
              <tr>
                <th className="p-3">Record ID</th>
                <th className="p-3">Center ID</th>
                <th className="p-3">Vehicle Type</th>
                <th className="p-3">Service Type</th>
                <th className="p-3">Queue Pos</th>
                <th className="p-3">Avail Mechs</th>
                <th className="p-3">Avail Bays</th>
                <th className="p-3">Workload</th>
                <th className="p-3 font-bold text-slate-200">Actual Wait</th>
                <th className="p-3 font-bold text-slate-200">Actual Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {datasetPreview?.preview?.map((rec: any, idx: number) => (
                <tr key={idx} className="hover:bg-slate-800/50 font-mono transition">
                  <td className="p-3 text-blue-400 font-bold">{rec.record_id}</td>
                  <td className="p-3 text-slate-300 font-sans">Center {rec.service_center_id}</td>
                  <td className="p-3 text-white font-sans">{rec.vehicle_type}</td>
                  <td className="p-3 text-white font-sans">{rec.service_type}</td>
                  <td className="p-3 text-slate-400">#{rec.queue_position}</td>
                  <td className="p-3 text-slate-300">{rec.available_mechanics}</td>
                  <td className="p-3 text-slate-300">{rec.available_bays}</td>
                  <td className="p-3 text-slate-300">{(rec.current_workload * 100).toFixed(0)}%</td>
                  <td className="p-3 font-bold text-amber-400">{rec.actual_waiting_time}m</td>
                  <td className="p-3 font-bold text-sky-400">{rec.actual_service_duration}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
