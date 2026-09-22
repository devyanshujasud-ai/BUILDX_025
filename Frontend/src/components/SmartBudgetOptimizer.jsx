import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, TrendingDown, ShieldAlert, Users, Award, AlertTriangle,
  Sliders, RefreshCw, CheckCircle2, XCircle, Search, Filter, MapPin,
  Car, Flame, MessageSquare, Briefcase, FileCheck, ArrowRight, Info,
  Layers, ExternalLink
} from 'lucide-react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { optimizeBudget, getBudgetSummary } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

// Custom Map DivIcons for corridor start points
const createCorridorIcon = (isFunded, rank) => {
  const bgClass = isFunded ? 'bg-emerald-500 border-emerald-300' : 'bg-rose-500 border-rose-300';
  return L.divIcon({
    className: 'custom-corridor-pin',
    html: `<div class="w-7 h-7 rounded-full ${bgClass} border-2 text-white flex items-center justify-center font-bold text-xs shadow-lg shadow-black/50">${rank}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

export default function SmartBudgetOptimizer() {
  const { t, language } = useLanguage();

  // Simulation Parameters (Pre-set to the 40% Challenge)
  const [reductionPct, setReductionPct] = useState(40.0);
  const [baselineBudget, setBaselineBudget] = useState(15000000.0); // 1.50 Crore
  const [weightTraffic, setWeightTraffic] = useState(0.30);
  const [weightAccident, setWeightAccident] = useState(0.25);
  const [weightComplaints, setWeightComplaints] = useState(0.25);
  const [weightEconomic, setWeightEconomic] = useState(0.20);

  // Data & State
  const [optimizationData, setOptimizationData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ALL'); // ALL, FUNDED, DEFERRED
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWard, setSelectedWard] = useState('ALL');
  const [selectedCorridor, setSelectedCorridor] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  // Trigger Optimization
  const runOptimization = async (customParams = null) => {
    try {
      setLoading(true);
      setError(null);
      const params = customParams || {
        total_baseline_budget_inr: baselineBudget,
        reduction_percentage: Number(reductionPct),
        weight_traffic: Number(weightTraffic),
        weight_accident: Number(weightAccident),
        weight_complaints: Number(weightComplaints),
        weight_economic: Number(weightEconomic),
      };

      const result = await optimizeBudget(params);
      setOptimizationData(result);
    } catch (err) {
      console.error('Failed to optimize road budget:', err);
      setError('Failed to compute budget optimization. Please verify backend connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runOptimization();
  }, [reductionPct, weightTraffic, weightAccident, weightComplaints, weightEconomic]);

  const handleResetChallengePreset = () => {
    setReductionPct(40.0);
    setBaselineBudget(15000000.0);
    setWeightTraffic(0.30);
    setWeightAccident(0.25);
    setWeightComplaints(0.25);
    setWeightEconomic(0.20);
    showToast('Reset to 40% Smart Maintenance Challenge preset');
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Combine funded and deferred lists for UI rendering
  const allCorridors = useMemo(() => {
    if (!optimizationData) return [];
    return [...optimizationData.funded_corridors, ...optimizationData.deferred_corridors].sort(
      (a, b) => (a.allocation_rank || 999) - (b.allocation_rank || 999)
    );
  }, [optimizationData]);

  // Unique wards for filter
  const wards = useMemo(() => {
    const s = new Set();
    allCorridors.forEach((c) => {
      c.ward.split('/').forEach((w) => s.add(w.trim()));
    });
    return Array.from(s).sort();
  }, [allCorridors]);

  // Filtered corridors
  const filteredCorridors = useMemo(() => {
    return allCorridors.filter((c) => {
      const matchesTab =
        activeTab === 'ALL' ||
        (activeTab === 'FUNDED' && c.funding_status === 'FUNDED') ||
        (activeTab === 'DEFERRED' && c.funding_status === 'DEFERRED');

      const matchesWard = selectedWard === 'ALL' || c.ward.includes(selectedWard);

      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        c.road_name.toLowerCase().includes(q) ||
        c.ward.toLowerCase().includes(q) ||
        c.economic_tags.some((tag) => tag.toLowerCase().includes(q));

      return matchesTab && matchesWard && matchesSearch;
    });
  }, [allCorridors, activeTab, selectedWard, searchQuery]);

  const formatLakhs = (val) => {
    if (!val && val !== 0) return '₹0 L';
    return `₹${(val / 100000).toFixed(2)} Lakhs`;
  };

  const formatCrores = (val) => {
    if (!val && val !== 0) return '₹0 Cr';
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-500/90 text-white font-medium px-4 py-2.5 rounded-xl shadow-xl shadow-emerald-500/20 backdrop-blur-md flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Challenge Header & Announcement Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-950/70 via-slate-900 to-slate-950 border border-amber-500/30 p-6 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>{t('smartBudget', 'challengeBadge', 'Smart Maintenance Challenge: 40% Road Budget Cut')}</span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-amber-400 p-1.5 bg-amber-500/20 rounded-xl border border-amber-500/30" />
              {t('smartBudget', 'title', 'Smart Road Maintenance Budget Optimizer')}
            </h1>
            <p className="text-slate-300 text-sm max-w-4xl leading-relaxed">
              {t(
                'smartBudget',
                'challengeDesc',
                'The city annual road maintenance budget has been reduced by 40%, making it impossible to repair every damaged road. Our multi-criteria Knapsack algorithm prioritizes corridors based on Traffic Density, Accident Blackspots, Public Complaints, and Economic Importance to maximize public safety and quality under tight resource caps.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleResetChallengePreset}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-medium text-xs transition shadow-sm"
              title="Reset parameters to 40% reduction and standard weights"
            >
              <RefreshCw className="w-4 h-4" />
              <span>{t('smartBudget', 'resetPreset', 'Reset to 40% Challenge Default')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Cards */}
      {optimizationData && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              {t('smartBudget', 'baselineBudget', 'Baseline Budget')}
              <DollarSign className="w-4 h-4 text-slate-500" />
            </span>
            <div className="mt-2">
              <div className="text-xl font-bold text-slate-200">
                {formatCrores(optimizationData.baseline_budget_inr)}
              </div>
              <span className="text-[11px] text-slate-400">100% Unconstrained</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-950/40 to-slate-900 border border-amber-500/30 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center justify-between">
              {t('smartBudget', 'reducedBudget', 'Reduced Target (-40%)')}
              <TrendingDown className="w-4 h-4 text-amber-400" />
            </span>
            <div className="mt-2">
              <div className="text-xl font-bold text-amber-300">
                {formatLakhs(optimizationData.reduced_budget_inr)}
              </div>
              <span className="text-[11px] text-amber-400/80">
                -₹{(optimizationData.budget_cut_amount_inr / 100000).toFixed(0)}L (-{reductionPct}%) Cut
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              {t('smartBudget', 'budgetUtilized', 'Allocated Funds')}
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </span>
            <div className="mt-2">
              <div className="text-xl font-bold text-emerald-300">
                {formatLakhs(optimizationData.allocated_budget_inr)}
              </div>
              <span className="text-[11px] text-emerald-400/80">
                {optimizationData.budget_utilization_pct}% Budget Efficiency
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-indigo-500/30 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center justify-between">
              {t('smartBudget', 'qualityPreserved', 'Quality Retained')}
              <Award className="w-4 h-4 text-indigo-400" />
            </span>
            <div className="mt-2">
              <div className="text-xl font-bold text-indigo-300">
                {optimizationData.quality_preservation_index}%
              </div>
              <span className="text-[11px] text-indigo-400/80">
                {optimizationData.funded_roads_count} Corridors Funded / {optimizationData.deferred_roads_count} Deferred
              </span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-sky-500/30 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-sky-400 uppercase tracking-wider flex items-center justify-between">
              {t('smartBudget', 'citizensServed', 'Citizens Protected')}
              <Users className="w-4 h-4 text-sky-400" />
            </span>
            <div className="mt-2">
              <div className="text-xl font-bold text-sky-300">
                {optimizationData.citizens_served_daily.toLocaleString()}
              </div>
              <span className="text-[11px] text-sky-400/80">Daily Commuters Served</span>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-rose-500/30 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center justify-between">
              {t('smartBudget', 'blackspotsMitigated', 'Blackspots Covered')}
              <Flame className="w-4 h-4 text-rose-400" />
            </span>
            <div className="mt-2">
              <div className="text-xl font-bold text-rose-300">
                {optimizationData.accident_blackspots_mitigated_pct}%
              </div>
              <span className="text-[11px] text-rose-400/80">Accident Risk Mitigated</span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Simulation Controls Bar */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Sliders className="w-4 h-4 text-amber-400" />
            <span>Interactive Municipal Budget Simulation Controls</span>
          </div>
          <span className="text-xs text-slate-400">
            Real-time dynamic Knapsack recalculation across Nagpur's primary road network
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {/* Slider 1: Budget Reduction % */}
          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium">Budget Cut Percentage</span>
              <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                {reductionPct}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="70"
              step="5"
              value={reductionPct}
              onChange={(e) => setReductionPct(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0% (₹1.5Cr)</span>
              <span className="text-amber-400 font-semibold">40% Challenge</span>
              <span>70% (₹45L)</span>
            </div>
          </div>

          {/* Slider 2: Traffic Density Weight */}
          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Car className="w-3.5 h-3.5 text-blue-400" />
                Traffic Weight
              </span>
              <span className="font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {Math.round(weightTraffic * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.60"
              step="0.05"
              value={weightTraffic}
              onChange={(e) => setWeightTraffic(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <span className="text-[10px] text-slate-500 block">ADT, Metro & Transit volume</span>
          </div>

          {/* Slider 3: Accident History Weight */}
          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                Accident Weight
              </span>
              <span className="font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                {Math.round(weightAccident * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.60"
              step="0.05"
              value={weightAccident}
              onChange={(e) => setWeightAccident(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <span className="text-[10px] text-slate-500 block">Police crash blackspots</span>
          </div>

          {/* Slider 4: Public Complaints Weight */}
          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                Complaints Weight
              </span>
              <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {Math.round(weightComplaints * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.60"
              step="0.05"
              value={weightComplaints}
              onChange={(e) => setWeightComplaints(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="text-[10px] text-slate-500 block">Citizen complaints & duplicates</span>
          </div>

          {/* Slider 5: Economic Hubs Weight */}
          <div className="space-y-1.5 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-300 font-medium flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                Economic Weight
              </span>
              <span className="font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                {Math.round(weightEconomic * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.60"
              step="0.05"
              value={weightEconomic}
              onChange={(e) => setWeightEconomic(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <span className="text-[10px] text-slate-500 block">MIDC, Hospitals, Freight</span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Impact Benchmark Cards */}
      {optimizationData?.benchmark_comparison && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-400" />
              {t('smartBudget', 'comparisonTitle', 'Strategic Impact Benchmark: Traditional vs Smart AI Optimization')}
            </h2>
            <span className="text-xs text-slate-400">
              Comparing identical reduced budgets (₹{optimizationData.reduced_budget_inr / 100000} Lakhs)
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Card 1: Naive FCFS */}
            <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
                    <XCircle className="w-3.5 h-3.5" />
                    Traditional First-Come-First-Serve (FCFS)
                  </div>
                  <h3 className="text-base font-bold text-slate-200 mt-1.5">
                    Complaint-Driven Allocation
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-rose-400">
                    {optimizationData.benchmark_comparison.naive_fcfs.infrastructure_quality_index}%
                  </div>
                  <span className="text-[11px] text-slate-400">Quality Retention</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {optimizationData.benchmark_comparison.naive_fcfs.strategy}
              </p>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800 text-center">
                <div>
                  <div className="text-sm font-bold text-slate-200">
                    {optimizationData.benchmark_comparison.naive_fcfs.roads_funded}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase">Roads Funded</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-rose-300">
                    {optimizationData.benchmark_comparison.naive_fcfs.citizens_impacted_daily.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase">Citizens Served</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-rose-300">
                    {optimizationData.benchmark_comparison.naive_fcfs.accident_blackspots_covered} /{' '}
                    {optimizationData.benchmark_comparison.naive_fcfs.total_blackspots}
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase">Blackspots Fixed</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">
                  Critical Vulnerabilities:
                </span>
                <ul className="space-y-1 text-xs text-slate-400">
                  {optimizationData.benchmark_comparison.naive_fcfs.key_vulnerabilities.map((v, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-500 mt-0.5">•</span>
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Card 2: Smart AI Optimization */}
            <div className="bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/40 rounded-2xl p-5 space-y-4 shadow-xl shadow-emerald-950/20">
              <div className="flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Vikasit Smart Multi-Criteria Allocation
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5">
                    Knapsack ROI Optimization
                  </h3>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-emerald-400">
                    {optimizationData.benchmark_comparison.smart_ai_optimization.infrastructure_quality_index}%
                  </div>
                  <span className="text-[11px] text-emerald-400/80">Quality Retention</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {optimizationData.benchmark_comparison.smart_ai_optimization.strategy}
              </p>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-slate-800/80 text-center">
                <div>
                  <div className="text-sm font-bold text-emerald-300">
                    {optimizationData.benchmark_comparison.smart_ai_optimization.roads_funded}
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase">Roads Funded</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-300">
                    {optimizationData.benchmark_comparison.smart_ai_optimization.citizens_impacted_daily.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase">Citizens Served</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-emerald-300">
                    {optimizationData.benchmark_comparison.smart_ai_optimization.accident_blackspots_covered} /{' '}
                    {optimizationData.benchmark_comparison.smart_ai_optimization.total_blackspots}
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase">Blackspots Fixed</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
                  Strategic Advantages:
                </span>
                <ul className="space-y-1 text-xs text-slate-300">
                  {optimizationData.benchmark_comparison.smart_ai_optimization.key_vulnerabilities.map((v, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Nagpur Map of Road Corridors */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-amber-400" />
              {t('smartBudget', 'mapTitle', 'Nagpur Prioritized Road Network Allocation Map')}
            </h2>
            <p className="text-xs text-slate-400">
              {t(
                'smartBudget',
                'mapSubtitle',
                'Geospatial visualization of road corridors funded for immediate repair versus deferred for preventive monitoring.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border border-emerald-300 shadow" />
              <span className="text-slate-200 font-medium">Funded Corridors (Green)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-rose-500 border border-rose-300 shadow" />
              <span className="text-slate-200 font-medium">Deferred Corridors (Red)</span>
            </div>
          </div>
        </div>

        <div className="h-[420px] rounded-xl overflow-hidden border border-slate-800 relative z-0">
          <MapContainer center={[21.1458, 79.0882]} zoom={12} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CartoDB</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            {allCorridors.map((corridor) => {
              const isFunded = corridor.funding_status === 'FUNDED';
              const color = isFunded ? '#10b981' : '#f43f5e';
              const startPoint = corridor.coordinates[0];

              return (
                <React.Fragment key={corridor.id}>
                  {/* Road Path */}
                  <Polyline
                    positions={corridor.coordinates}
                    pathOptions={{
                      color: color,
                      weight: isFunded ? 6 : 4,
                      opacity: isFunded ? 0.9 : 0.6,
                      dashArray: isFunded ? null : '6, 6',
                    }}
                  />

                  {/* Marker Pin at start point */}
                  {startPoint && (
                    <Marker
                      position={startPoint}
                      icon={createCorridorIcon(isFunded, corridor.allocation_rank)}
                    >
                      <Popup className="custom-leaflet-popup">
                        <div className="p-2 space-y-2 max-w-[280px]">
                          <div className="flex items-center justify-between gap-2 border-b pb-1">
                            <span className="font-bold text-xs text-slate-900">{corridor.road_name}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                isFunded ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              Rank #{corridor.allocation_rank}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 space-y-1">
                            <p><strong>Ward:</strong> {corridor.ward}</p>
                            <p><strong>Daily Traffic:</strong> {corridor.average_daily_traffic.toLocaleString()} vehicles</p>
                            <p><strong>Accidents (3-yr):</strong> {corridor.accident_count_3yr} crashes</p>
                            <p><strong>Estimated Cost:</strong> {formatLakhs(corridor.estimated_cost_inr)}</p>
                            <p><strong>Status:</strong> {corridor.funding_status}</p>
                            <p className="text-[10px] italic text-slate-500">{corridor.justification}</p>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  )}
                </React.Fragment>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Prioritization & Allocation Table */}
      <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl overflow-hidden shadow-2xl p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-400" />
              {t('smartBudget', 'tableTitle', 'Road Corridor Prioritization & Allocation Matrix')}
            </h2>
            <p className="text-xs text-slate-400">
              {t(
                'smartBudget',
                'tableSubtitle',
                'Ranked by Benefit-Cost Ratio (BCR) based on composite multi-criteria decision modeling.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder={t('smartBudget', 'searchPlaceholder', 'Search corridor or ward...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 w-56"
              />
            </div>

            {/* Ward Filter */}
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Wards</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  activeTab === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All ({allCorridors.length})
              </button>
              <button
                onClick={() => setActiveTab('FUNDED')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  activeTab === 'FUNDED'
                    ? 'bg-emerald-500 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Funded ({optimizationData?.funded_roads_count || 0})
              </button>
              <button
                onClick={() => setActiveTab('DEFERRED')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                  activeTab === 'DEFERRED'
                    ? 'bg-rose-500 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Deferred ({optimizationData?.deferred_roads_count || 0})
              </button>
            </div>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto rounded-xl border border-slate-800/80">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                <th className="py-3 px-3">Rank</th>
                <th className="py-3 px-4">Road Corridor & Ward</th>
                <th className="py-3 px-3 text-center">Severity</th>
                <th className="py-3 px-3 text-right">Traffic (ADT)</th>
                <th className="py-3 px-3 text-center">Accidents</th>
                <th className="py-3 px-3 text-center">Complaints</th>
                <th className="py-3 px-3">Economic Corridors</th>
                <th className="py-3 px-3 text-right">Cost (INR)</th>
                <th className="py-3 px-3 text-right">BCR / ROI</th>
                <th className="py-3 px-3 text-center">Funding Status</th>
                <th className="py-3 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredCorridors.map((c) => {
                const isFunded = c.funding_status === 'FUNDED';

                return (
                  <tr
                    key={c.id}
                    className={`hover:bg-slate-800/40 transition ${
                      isFunded ? 'bg-emerald-950/10' : 'bg-rose-950/10'
                    }`}
                  >
                    <td className="py-3 px-3 font-bold text-slate-300">
                      <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                        {c.allocation_rank}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{c.road_name}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3 h-3 text-amber-400" />
                        <span>{c.ward}</span>
                        <span>•</span>
                        <span>{c.length_km} km ({c.road_type})</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.severity === 'CRITICAL'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                            : c.severity === 'HIGH'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        }`}
                      >
                        {c.severity}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-200">
                      {c.average_daily_traffic.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-semibold ${
                          c.accident_count_3yr >= 25 ? 'text-rose-400 font-bold' : 'text-slate-300'
                        }`}
                      >
                        {c.accident_count_3yr}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-300 font-medium">
                      {c.complaint_count}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {c.economic_tags.slice(0, 2).map((tag, idx) => (
                          <span
                            key={idx}
                            className="bg-slate-800 text-slate-300 text-[10px] px-1.5 py-0.5 rounded border border-slate-700 truncate max-w-[120px]"
                            title={tag}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-200">
                      {formatLakhs(c.estimated_cost_inr)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {c.cost_benefit_ratio}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isFunded
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {isFunded ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            FUNDED
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-400" />
                            DEFERRED
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() =>
                          showToast(
                            isFunded
                              ? `Work order created for ${c.road_name} (${formatLakhs(c.estimated_cost_inr)})`
                              : `Override recorded: ${c.road_name} marked for emergency review`
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                          isFunded
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        {isFunded ? 'Work Order' : 'Review'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
