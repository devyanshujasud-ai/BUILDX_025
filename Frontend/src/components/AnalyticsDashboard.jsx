import React, { useState, useEffect } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  Building2, 
  Activity,
  Layers,
  Radio,
  UserCheck,
  RotateCcw,
  CheckCheck,
  Timer,
  Cpu,
  Sparkles,
  Lightbulb,
  Trash2,
  AlertCircle,
  ShieldCheck,
  Check,
  Eye,
  ThumbsUp,
  ThumbsDown,
  X,
  MapPin,
  Image as ImageIcon
} from 'lucide-react';
import {
  getMaintenanceTasks,
  getRFIDStats,
  getIoTTelemetry,
  getIoTStats,
  sendIoTTelemetry,
  verifyMaintenanceTask,
  getMediaUrl
} from '../services/api';
import RFIDSimulatorModal from './RFIDSimulatorModal';
import IoTSimulatorModal from './IoTSimulatorModal';
import { useLanguage } from '../i18n/LanguageContext';

const SEVERITY_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

export default function AnalyticsDashboard({ stats, authorities, assets = [], issues = [] }) {
  const { t, getStatusLabel, getDepartmentLabel, getPriorityLabel, language } = useLanguage();
  const [rfidStats, setRfidStats] = useState(null);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [isRfidModalOpen, setIsRfidModalOpen] = useState(false);
  const [loadingRfid, setLoadingRfid] = useState(false);

  // Authority Verification Modal State
  const [verificationTask, setVerificationTask] = useState(null);
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [inspectorName, setInspectorName] = useState('Er. Sunil Deshmukh (NMC Ward Inspector)');
  const [verifyingAction, setVerifyingAction] = useState(false);

  // ESP32 IoT Telemetry State
  const [iotTelemetry, setIotTelemetry] = useState([]);
  const [iotStats, setIotStats] = useState(null);
  const [isIotModalOpen, setIsIotModalOpen] = useState(false);
  const [loadingIot, setLoadingIot] = useState(false);
  const [quickSending, setQuickSending] = useState(false);

  const handleAuthorityAction = async (taskId, action) => {
    try {
      setVerifyingAction(true);
      await verifyMaintenanceTask(taskId, {
        action,
        notes: inspectorNotes || (action === 'VERIFY' ? 'Quality verified by municipal road inspector.' : 'Rework required on site.'),
        verified_by: inspectorName,
      });
      setVerificationTask(null);
      setInspectorNotes('');
      await loadRfidData();
    } catch (err) {
      console.error('Failed to submit authority verification action:', err);
      alert('Verification action failed: ' + (err.response?.data?.detail || err.message));
    } finally {
      setVerifyingAction(false);
    }
  };

  const loadRfidData = async () => {
    try {
      setLoadingRfid(true);
      const [statsData, tasksData] = await Promise.all([
        getRFIDStats(),
        getMaintenanceTasks({ limit: 15 }),
      ]);
      setRfidStats(statsData);
      setMaintenanceTasks(tasksData);
    } catch (err) {
      console.error('Failed to load RFID telemetry:', err);
    } finally {
      setLoadingRfid(false);
    }
  };

  const loadIoTData = async () => {
    try {
      setLoadingIot(true);
      const [statsData, logsData] = await Promise.all([
        getIoTStats(),
        getIoTTelemetry({ limit: 15 }),
      ]);
      setIotStats(statsData);
      setIotTelemetry(logsData);
    } catch (err) {
      console.error('Failed to load IoT telemetry:', err);
    } finally {
      setLoadingIot(false);
    }
  };

  const triggerQuickIoTEvent = async (deviceType, data, deviceId, assetId = 1) => {
    try {
      setQuickSending(true);
      await sendIoTTelemetry({
        device_id: deviceId,
        asset_id: assetId,
        device_type: deviceType,
        timestamp: new Date().toISOString(),
        data,
      });
      await loadIoTData();
    } catch (err) {
      console.error('Quick IoT event failed:', err);
    } finally {
      setQuickSending(false);
    }
  };

  useEffect(() => {
    loadRfidData();
    loadIoTData();
  }, []);

  if (!stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-500 text-xs">
        Loading analytics...
      </div>
    );
  }

  // Command Center Metrics Computation
  const activeIssues = issues.filter((i) => i.status !== 'RESOLVED');
  const totalActiveIssues = Math.max(activeIssues.length, (stats.total_potholes || 0) - (stats.status_distribution?.RESOLVED || 0));
  const criticalHighIssues = activeIssues.filter(
    (i) => i.priority === 'CRITICAL' || i.priority === 'HIGH' || i.severity === 'CRITICAL' || i.severity === 'HIGH'
  ).length || (stats.severity_distribution?.CRITICAL || 0) + (stats.severity_distribution?.HIGH || 0);

  const streetlightFaults = activeIssues.filter((i) => i.type === 'STREETLIGHT').length;
  const potholeAlerts = (stats.total_potholes || 0) + activeIssues.filter((i) => i.type === 'POTHOLE' || i.type === 'ROAD_DAMAGE').length;
  const dustbinFillAlerts = activeIssues.filter((i) => i.type === 'DUSTBIN').length;

  const totalAssetsCount = assets.length || 12;
  const operationalAssets = assets.filter((a) => a.status === 'OPERATIONAL').length || 9;
  const underMaintenanceAssets = assets.filter((a) => a.status === 'UNDER_MAINTENANCE').length || 2;
  const damagedAssets = assets.filter((a) => a.status === 'DAMAGED').length || 1;

  // Format data for severity pie chart
  const severityData = Object.entries(stats.severity_distribution || {}).map(([key, value]) => ({
    name: key,
    value: value,
    color: SEVERITY_COLORS[key] || '#94a3b8',
  }));

  // Format data for status bar chart
  const statusData = Object.entries(stats.status_distribution || {}).map(([key, value]) => ({
    status: key,
    count: value,
  }));

  // Format data for authority performance
  const authorityData = (stats.authorities_breakdown || []).map((a) => ({
    name: a.code,
    fullName: a.name,
    total: a.total,
    resolved: a.resolved,
    pending: a.pending,
  }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Integrated Urban Infrastructure Command Center Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40">
                NMC INTEGRATED COMMAND & CONTROL
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                IoT Telemetry Live
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                RFID Field Tracking Active
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-sky-400" />
              <span>Vikasit Nagpur — City Infrastructure Command Center</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Real-time situational intelligence uniting AI road vision, ESP32 multi-sensor telemetry, automatic civic routing, and RFID workforce coordination across all 10 Nagpur administrative zones.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsIotModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-lg shadow-indigo-950/40 transition"
            >
              <Cpu className="w-4 h-4" />
              <span>Simulate IoT</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRfidModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow-lg shadow-sky-950/40 transition"
            >
              <Radio className="w-4 h-4" />
              <span>Simulate RFID</span>
            </button>
          </div>
        </div>

        {/* Command Center Core Metrics Grid (5 Cards) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Total Active Issues */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Active Issues</span>
              <Layers className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-white font-mono">{totalActiveIssues}</div>
            <div className="text-[10px] text-slate-400">Nagpur Civic Grievances</div>
          </div>

          {/* Critical / High Priority */}
          <div className="p-4 rounded-2xl bg-red-950/30 border border-red-500/30 space-y-1">
            <div className="flex items-center justify-between text-xs text-red-300">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Critical / High</span>
              <span className="w-2 h-2 rounded-full bg-red-400 animate-ping" />
            </div>
            <div className="text-2xl font-black text-red-400 font-mono">{criticalHighIssues}</div>
            <div className="text-[10px] text-red-300/80">Immediate Triage SLA</div>
          </div>

          {/* Streetlight Faults */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Streetlight Faults</span>
              <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">{streetlightFaults}</div>
            <div className="text-[10px] text-slate-400">Electrical Dept Route</div>
          </div>

          {/* Pothole Alerts */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Pothole Alerts</span>
              <Activity className="w-3.5 h-3.5 text-orange-400" />
            </div>
            <div className="text-2xl font-black text-orange-400 font-mono">{potholeAlerts}</div>
            <div className="text-[10px] text-slate-400">Roads / PWD Dispatched</div>
          </div>

          {/* Dustbin Fill Alerts */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Dustbin Alerts</span>
              <Trash2 className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-400 font-mono">{dustbinFillAlerts}</div>
            <div className="text-[10px] text-slate-400">&ge;85% Overflow Alerts</div>
          </div>
        </div>

        {/* Command Center Secondary Status Strip */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 border-t border-slate-800/80 text-xs">
          {/* Device & Asset Status Breakdown (4 cols) */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                Physical Asset Health ({totalAssetsCount} Total)
              </span>
              <span className="text-emerald-400 font-bold font-mono">
                {Math.round((operationalAssets / totalAssetsCount) * 100)}% Operational
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
              <div
                style={{ width: `${(operationalAssets / totalAssetsCount) * 100}%` }}
                className="bg-emerald-500 h-full"
                title={`Operational: ${operationalAssets}`}
              />
              <div
                style={{ width: `${(underMaintenanceAssets / totalAssetsCount) * 100}%` }}
                className="bg-amber-500 h-full"
                title={`Under Maintenance: ${underMaintenanceAssets}`}
              />
              <div
                style={{ width: `${(damagedAssets / totalAssetsCount) * 100}%` }}
                className="bg-red-500 h-full"
                title={`Damaged: ${damagedAssets}`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 pt-1 font-mono">
              <span className="text-emerald-400">● {operationalAssets} Operational</span>
              <span className="text-amber-400">● {underMaintenanceAssets} Maintenance</span>
              <span className="text-red-400">● {damagedAssets} Alert/Damaged</span>
            </div>
          </div>

          {/* Workforce & Maintenance Ops Status (4 cols) */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">
                RFID Field Workforce Telemetry
              </span>
              <span className="text-sky-400 font-mono font-bold">
                {rfidStats?.total_workers || 5} Technicians
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-base font-black text-amber-400">
                  {rfidStats?.active_sessions || 0}
                </div>
                <div className="text-[9px] text-slate-400 uppercase">On-Site Now</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-base font-black text-emerald-400">
                  {rfidStats?.completed_tasks || 0}
                </div>
                <div className="text-[9px] text-slate-400 uppercase">Completed</div>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <div className="text-base font-black text-sky-400 truncate">
                  {rfidStats?.avg_duration_formatted || '0s'}
                </div>
                <div className="text-[9px] text-slate-400 uppercase">Avg Duration</div>
              </div>
            </div>
          </div>

          {/* Recent IoT Transmissions Ticker (4 cols) */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1">
                <Activity className="w-3 h-3 text-indigo-400" />
                Latest IoT Telemetry Pulse
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {iotStats?.total_readings || 0} Readings
              </span>
            </div>
            <div className="space-y-1.5 overflow-hidden">
              {iotTelemetry.slice(0, 2).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between text-[11px] p-1.5 rounded-lg bg-slate-900 border border-slate-800/80 font-mono"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        item.is_anomaly ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                      }`}
                    />
                    <span className="text-white font-semibold">{item.device_id}</span>
                    <span className="text-slate-400 text-[10px]">({item.device_type})</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      item.is_anomaly
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {item.is_anomaly ? 'ALERT' : 'OK'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Detected */}
        <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Hazards</span>
            <span className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-white font-mono">{stats.total_potholes || 0}</div>
          <p className="text-[11px] text-slate-500">Captured by Dashcams & Mobile Feeds</p>
        </div>

        {/* Critical Hazards */}
        <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-400 uppercase tracking-wider">Critical Defects</span>
            <span className="p-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-red-400 font-mono">
            {stats.severity_distribution?.CRITICAL || 0}
          </div>
          <p className="text-[11px] text-slate-500">Requires Urgent Asphalt Resurfacing</p>
        </div>

        {/* Resolution Rate */}
        <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Resolution Rate</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {stats.resolution_rate_percent || 0}%
          </div>
          <p className="text-[11px] text-slate-500">Repaired & Verified by Inspectors</p>
        </div>

        {/* Average SLA Target */}
        <div className="bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Average SLA</span>
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono">36h</div>
          <p className="text-[11px] text-slate-500">Standard Municipal Turnaround</p>
        </div>

      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left: Authority Breakdown Bar Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-400" />
              <span>Potholes Handled by Civic Body</span>
            </h3>
            <span className="text-[11px] text-slate-400">Total vs Resolved</span>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={authorityData} barGap={4}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
                <Bar dataKey="total" name="Total Reported" fill="#38bdf8" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Severity Distribution Donut Chart (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/80 rounded-3xl p-6 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-sky-400" />
              <span>Severity Breakdown</span>
            </h3>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
            {severityData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-slate-400">{item.name}:</span>
                <span className="font-bold text-white font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ESP32 IoT Sensor Telemetry & Anomaly Monitor Section */}
      <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
                <Cpu className="w-5 h-5 animate-pulse" />
              </div>
              <h2 className="text-lg font-black text-white tracking-tight">
                ESP32 IoT Sensor Telemetry & Anomaly Monitor
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                POST /api/iot/telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Ingestion pipeline for ESP32 microcontrollers monitoring Streetlights (lux/current), Pothole Nodes (accelerometer/IR), and Dustbins (fill-level).
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsIotModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-indigo-600 via-sky-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2 transition transform active:scale-95 cursor-pointer"
            >
              <Cpu className="w-4 h-4 animate-pulse" />
              <span>Simulate IoT Event</span>
            </button>

            <button
              type="button"
              onClick={loadIoTData}
              className={`p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition ${
                loadingIot ? 'animate-spin text-sky-400' : ''
              }`}
              title="Refresh IoT Feed"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 1-Click Quick Simulated IoT Event Buttons */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              1-Click Simulated IoT Event Triggers
            </span>
            <span className="text-[11px] text-slate-400">
              {quickSending ? 'Transmitting sensor packet...' : 'Click to trigger instant sensor packet'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            <button
              type="button"
              disabled={quickSending}
              onClick={() =>
                triggerQuickIoTEvent(
                  'STREETLIGHT',
                  { lux: 8.0, motion: 1, current: 0.0 },
                  'ESP32-STREET-01',
                  1
                )
              }
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-red-500/30 hover:border-red-500 text-left transition text-xs flex items-center gap-2.5"
            >
              <Lightbulb className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div>
                <div className="font-bold text-red-300">Lamp Failure (0.0A)</div>
                <div className="text-[10px] text-slate-400">Night motion, 0A draw</div>
              </div>
            </button>

            <button
              type="button"
              disabled={quickSending}
              onClick={() =>
                triggerQuickIoTEvent(
                  'POTHOLE_NODE',
                  { acceleration: 3.8, ir_distance: 19.5, latitude: 21.1458, longitude: 79.0882 },
                  'ESP32-POTHOLE-NODE-07',
                  8
                )
              }
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/30 hover:border-amber-500 text-left transition text-xs flex items-center gap-2.5"
            >
              <Activity className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <div className="font-bold text-amber-300">Pothole Shock (3.8g)</div>
                <div className="text-[10px] text-slate-400">Chassis shock & depth void</div>
              </div>
            </button>

            <button
              type="button"
              disabled={quickSending}
              onClick={() =>
                triggerQuickIoTEvent(
                  'DUSTBIN',
                  { fill_level: 94.0 },
                  'ESP32-BIN-04',
                  5
                )
              }
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-purple-500/30 hover:border-purple-500 text-left transition text-xs flex items-center gap-2.5"
            >
              <Trash2 className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <div>
                <div className="font-bold text-purple-300">Dustbin Overflow (94%)</div>
                <div className="text-[10px] text-slate-400">Fill level &gt; 85% capacity</div>
              </div>
            </button>

            <button
              type="button"
              disabled={quickSending}
              onClick={() =>
                triggerQuickIoTEvent(
                  'STREETLIGHT',
                  { lux: 15.0, motion: 1, current: 0.85 },
                  'ESP32-STREET-01',
                  1
                )
              }
              className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-500/30 hover:border-emerald-500 text-left transition text-xs flex items-center gap-2.5"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <div>
                <div className="font-bold text-emerald-300">Normal Streetlight</div>
                <div className="text-[10px] text-slate-400">Illuminated (0.85A draw)</div>
              </div>
            </button>
          </div>
        </div>

        {/* Telemetry KPI Metrics Subgrid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Total Ingested</span>
              <Activity className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-sky-400 font-mono">
              {iotStats?.total_readings ?? 0}
            </div>
            <span className="text-[10px] text-slate-400">Sensor packets processed</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Anomalies Flagged</span>
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {iotStats?.total_anomalies ?? 0}
            </div>
            <span className="text-[10px] text-slate-400">Auto-created civic issues</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Active ESP32 Nodes</span>
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-indigo-400 font-mono">
              {iotStats?.active_devices ?? 0}
            </div>
            <span className="text-[10px] text-slate-400">Unique device IDs</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Device Types</span>
              <Layers className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div className="text-2xl font-black text-teal-400 font-mono">
              {Object.keys(iotStats?.device_breakdown || {}).length || 3}
            </div>
            <span className="text-[10px] text-slate-400">Streetlight, Pothole, Dustbin</span>
          </div>
        </div>

        {/* Live Telemetry Stream Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-slate-400" />
              Live ESP32 Telemetry Stream & Alert Audit Log
            </h3>
            <span className="text-xs text-slate-400">
              Showing {iotTelemetry.length} recent packets
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/75 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">Device ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Asset</th>
                  <th className="py-3 px-4">Sensor Metrics</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4">Civic Ticket</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {iotTelemetry.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      No telemetry logs received yet. Click any of the{' '}
                      <span className="text-sky-400 font-bold">1-Click Event Triggers</span> above to fire sample sensor packets.
                    </td>
                  </tr>
                ) : (
                  iotTelemetry.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-sky-400">
                        #{log.id}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-white">
                        {log.device_id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                          {log.device_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 truncate max-w-[140px]">
                        {log.asset_name || `Asset #${log.asset_id}`}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {Object.entries(log.data || {})
                          .map(([k, v]) => `${k}:${v}`)
                          .join(' | ')}
                      </td>
                      <td className="py-3 px-4">
                        {log.is_anomaly ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30" title={log.anomaly_reason || 'Anomaly'}>
                            <AlertTriangle className="w-3 h-3 text-amber-400" />
                            ANOMALY
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            NORMAL
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {log.issue_id ? (
                          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold text-[11px] border border-sky-500/30">
                            Issue #{log.issue_id}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Field Maintenance & RFID Worker Tracking Section */}
      <div className="bg-slate-900/80 rounded-3xl p-6 sm:p-8 border border-slate-800 shadow-xl space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Field Maintenance & RFID Worker Tracking
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Live IoT Telemetry
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Contactless RFID worker check-in/check-out audit log, automated duration calculation, and Nagpur asset maintenance history.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setIsRfidModalOpen(true)}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-900/30 flex items-center justify-center gap-2 transition transform active:scale-95 cursor-pointer"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              <span>Simulate RFID Scan</span>
            </button>

            <button
              type="button"
              onClick={loadRfidData}
              className={`p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition ${
                loadingRfid ? 'animate-spin text-sky-400' : ''
              }`}
              title="Refresh Telemetry"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Telemetry & Verification Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t('dashboard', 'activeWorks', 'Active Works')}</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono">
              {rfidStats?.active_sessions ?? 0}
            </div>
            <span className="text-[10px] text-slate-400">{t('dashboard', 'crewsOnSite', 'In-progress on site')}</span>
          </div>

          <div className={`p-4 rounded-2xl border space-y-1 transition-all ${
            (rfidStats?.pending_verification ?? 0) > 0
              ? 'bg-sky-500/10 border-sky-500/40 shadow-lg shadow-sky-500/5'
              : 'bg-slate-800/60 border-slate-700/60'
          }`}>
            <div className="flex items-center justify-between text-xs text-sky-400 font-semibold">
              <span>{t('dashboard', 'pendingReview', 'Pending Review')}</span>
              <ShieldCheck className={`w-4 h-4 text-sky-400 ${(rfidStats?.pending_verification ?? 0) > 0 ? 'animate-bounce' : ''}`} />
            </div>
            <div className="text-2xl font-black text-sky-400 font-mono">
              {rfidStats?.pending_verification ?? 0}
            </div>
            <span className="text-[10px] text-sky-300">{t('dashboard', 'awaitingSignoff', 'Awaiting authority sign-off')}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t('dashboard', 'verifiedResolved', 'Verified & Resolved')}</span>
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {rfidStats?.resolved_tasks ?? rfidStats?.completed_tasks ?? 0}
            </div>
            <span className="text-[10px] text-slate-400">{t('dashboard', 'approvedInspectors', 'Approved by inspectors')}</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t('dashboard', 'avgDuration', 'Average Duration')}</span>
              <Timer className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-sky-400 font-mono">
              {rfidStats?.avg_duration_formatted ?? '0s'}
            </div>
            <span className="text-[10px] text-slate-400">Calculated automatically</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{t('dashboard', 'technicians', 'Technicians')}</span>
              <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="text-2xl font-black text-indigo-400 font-mono">
              {rfidStats?.total_workers ?? 0}
            </div>
            <span className="text-[10px] text-slate-400">Assigned active badges</span>
          </div>
        </div>

        {/* Maintenance History & Verification Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              {t('dashboard', 'maintenanceTableTitle', 'Field Maintenance Verification & RFID Audit Log')}
            </h3>
            <span className="text-xs text-slate-400">
              {t('dashboard', 'showingRecent', 'Showing recent work orders')} ({maintenanceTasks.length})
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/50">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800/75 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">{t('dashboard', 'taskId', 'Task ID')}</th>
                  <th className="py-3 px-4">{t('dashboard', 'workerDept', 'Worker & Dept')}</th>
                  <th className="py-3 px-4">{t('dashboard', 'targetAsset', 'Target Asset')}</th>
                  <th className="py-3 px-4">{t('dashboard', 'verificationStatus', 'Verification Status')}</th>
                  <th className="py-3 px-4">{t('dashboard', 'proofThumbnail', 'Before / After Proof')}</th>
                  <th className="py-3 px-4">{t('dashboard', 'durationSchedule', 'Duration & Schedule')}</th>
                  <th className="py-3 px-4 text-right">{t('dashboard', 'authorityAction', 'Authority Action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {maintenanceTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No maintenance tasks logged yet. Use the{' '}
                      <span className="text-sky-400 font-bold">Simulate RFID Scan</span> button above to trigger a test check-in.
                    </td>
                  </tr>
                ) : (
                  maintenanceTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-sky-400">
                        #{task.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{task.worker?.name || `Worker #${task.worker_id}`}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {task.worker?.role} • {getDepartmentLabel(task.worker?.department) || task.worker?.rfid_uid || 'RFID'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-slate-200">{task.asset_name || `Asset #${task.asset_id}`}</div>
                        <div className="text-[10px] text-slate-400">{task.asset_type || 'CIVIC_ASSET'}</div>
                      </td>

                      {/* Verification Status */}
                      <td className="py-3.5 px-4">
                        {task.status === 'IN_PROGRESS' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            {getStatusLabel('IN_PROGRESS')}
                          </span>
                        )}
                        {task.status === 'PENDING_VERIFICATION' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/40 animate-pulse">
                            <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                            {getStatusLabel('PENDING_VERIFICATION')}
                          </span>
                        )}
                        {task.status === 'RESOLVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            {getStatusLabel('RESOLVED')}
                          </span>
                        )}
                        {task.status === 'REWORK_REQUESTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <AlertCircle className="w-3 h-3" />
                            {getStatusLabel('REWORK_REQUESTED')}
                          </span>
                        )}
                        {task.status === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            {getStatusLabel('COMPLETED')}
                          </span>
                        )}
                      </td>

                      {/* Before / After Proof Thumbnails */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {task.before_image ? (
                            <div
                              onClick={() => setVerificationTask(task)}
                              className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-700 bg-slate-800 cursor-pointer hover:border-sky-400 transition"
                              title="Before Repair Photo"
                            >
                              <img src={getMediaUrl(task.before_image)} alt="Before" className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 left-0 right-0 bg-black/70 text-[8px] font-bold text-center text-slate-300">PRE</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500">—</span>
                          )}

                          <span className="text-slate-600 text-xs">→</span>

                          {task.after_image ? (
                            <div
                              onClick={() => setVerificationTask(task)}
                              className="relative w-8 h-8 rounded-lg overflow-hidden border border-emerald-500/60 bg-slate-800 cursor-pointer hover:border-emerald-400 transition shadow-sm shadow-emerald-500/20"
                              title="After Repair Photo (Evidence)"
                            >
                              <img src={getMediaUrl(task.after_image)} alt="After" className="w-full h-full object-cover" />
                              <span className="absolute bottom-0 left-0 right-0 bg-emerald-950/80 text-[8px] font-bold text-center text-emerald-300">POST</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">No after proof</span>
                          )}
                        </div>
                      </td>

                      {/* Duration & Time */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                        <div className="text-slate-200 font-bold">
                          {task.status === 'IN_PROGRESS' ? (
                            <span className="text-amber-400 animate-pulse">{t('rfid', 'inProgressDuration', 'Ongoing...')}</span>
                          ) : (
                            <span className="text-emerald-400">{task.duration_formatted || `${task.duration || 0}s`}</span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {task.started_at ? new Date(task.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                          {task.completed_at && ` → ${new Date(task.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                        </div>
                      </td>

                      {/* Authority Actions */}
                      <td className="py-3.5 px-4 text-right">
                        {task.status === 'PENDING_VERIFICATION' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setVerificationTask(task)}
                              className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition cursor-pointer"
                              title="Review Before/After Photos and Verification Proof"
                            >
                              <Eye className="w-3 h-3" />
                              <span>{t('dashboard', 'review', 'Review')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAuthorityAction(task.id, 'VERIFY')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-sm transition cursor-pointer"
                              title="Instant Authority Approval"
                            >
                              <Check className="w-3 h-3" />
                              <span>{t('dashboard', 'verify', 'Verify')}</span>
                            </button>
                          </div>
                        ) : task.status === 'REWORK_REQUESTED' ? (
                          <button
                            type="button"
                            onClick={() => setVerificationTask(task)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[11px] font-bold hover:bg-rose-500/30 transition cursor-pointer"
                          >
                            {t('dashboard', 'reworkLog', 'Rework Log')}
                          </button>
                        ) : task.status === 'RESOLVED' ? (
                          <button
                            type="button"
                            onClick={() => setVerificationTask(task)}
                            className="text-emerald-400 hover:text-emerald-300 text-[11px] font-mono font-medium flex items-center gap-1 justify-end ml-auto cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{t('dashboard', 'signedOff', 'Signed Off')}</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">{t('dashboard', 'workInProgress', 'Work in progress')}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Authority Inspection & Verification Review Modal */}
      {verificationTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                    <span>{t('dashboard', 'reviewModalTitle', 'Municipal Maintenance Verification Review')}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 font-mono border border-slate-700">
                      Task #{verificationTask.id}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    {t('dashboard', 'reviewModalSubtitle', 'Authority sign-off workflow: Compare before vs after repair proof and issue compliance verdict.')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVerificationTask(null)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Top Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">{t('rfid', 'worker', 'Worker')}</span>
                  <span className="font-bold text-white">{verificationTask.worker?.name || `Worker #${verificationTask.worker_id}`}</span>
                  <span className="text-[10px] text-slate-500 block">{getDepartmentLabel(verificationTask.worker?.department)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">{t('rfid', 'asset', 'Asset')}</span>
                  <span className="font-bold text-white truncate block">{verificationTask.asset_name || `Asset #${verificationTask.asset_id}`}</span>
                  <span className="text-[10px] text-slate-500 block">{verificationTask.asset_type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">{t('rfid', 'status', 'Status')}</span>
                  <span className="font-bold text-sky-400 uppercase">{getStatusLabel(verificationTask.status)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">{t('rfid', 'duration', 'Duration')}</span>
                  <span className="font-bold text-emerald-400 font-mono">{verificationTask.duration_formatted || `${verificationTask.duration || 0}s`}</span>
                </div>
              </div>

              {/* Side-by-Side Visual Comparison */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-sky-400" />
                  Visual Evidence Comparison (Before vs After)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Before Box */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden space-y-2 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-rose-400 flex items-center gap-1">
                        <span>{t('dashboard', 'beforeRepair', 'BEFORE REPAIR')}</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{t('dashboard', 'defectCapture', 'Defect Capture')}</span>
                    </div>
                    <div className="w-full h-48 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800">
                      {verificationTask.before_image ? (
                        <img
                          src={getMediaUrl(verificationTask.before_image)}
                          alt="Before Repair"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4 text-slate-500 text-xs">
                          <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                          <span>No initial capture image available</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* After Box */}
                  <div className="rounded-2xl border border-emerald-500/40 bg-slate-950 overflow-hidden space-y-2 p-3 shadow-lg shadow-emerald-500/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('dashboard', 'afterRepair', 'AFTER REPAIR (EVIDENCE)')}</span>
                      </span>
                      <span className="text-[10px] text-emerald-400/80 font-mono">{t('dashboard', 'fieldProof', 'Field Proof')}</span>
                    </div>
                    <div className="w-full h-48 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-emerald-500/30">
                      {verificationTask.after_image ? (
                        <img
                          src={getMediaUrl(verificationTask.after_image)}
                          alt="After Repair Evidence"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-center p-4 text-slate-500 text-xs">
                          <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                          <span>Awaiting technician upload</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Worker Notes & Location */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                  {t('dashboard', 'technicianLog', 'Technician Activity Log')}
                </span>
                <p className="text-xs text-slate-300 leading-relaxed italic bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  "{verificationTask.notes || 'No activity notes logged by technician.'}"
                </p>
                {(verificationTask.end_latitude || verificationTask.start_latitude) && (
                  <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1 pt-1">
                    <MapPin className="w-3 h-3 text-slate-400" />
                    <span>
                      Geo-coordinates: {(verificationTask.end_latitude || verificationTask.start_latitude)?.toFixed(4)},{' '}
                      {(verificationTask.end_longitude || verificationTask.start_longitude)?.toFixed(4)} (Nagpur Municipal Ward)
                    </span>
                  </div>
                )}
              </div>

              {/* Inspector Review Form */}
              <div className="space-y-3 p-4 rounded-2xl bg-slate-950 border border-sky-500/30">
                <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  {t('dashboard', 'officialSignoff', 'Civic Authority Official Sign-off')}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {t('dashboard', 'inspectorName', 'Inspector Name & Designation')}
                    </label>
                    <input
                      type="text"
                      value={inspectorName}
                      onChange={(e) => setInspectorName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      {t('dashboard', 'inspectionNotes', 'Inspection Notes / Rework Directions')}
                    </label>
                    <input
                      type="text"
                      value={inspectorNotes}
                      onChange={(e) => setInspectorNotes(e.target.value)}
                      placeholder="e.g. Surface patch verified flat to road grade."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {verificationTask.verification_notes && (
                  <p className="text-xs text-amber-300 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                    <strong>Previous Inspector Note:</strong> {verificationTask.verification_notes}
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setVerificationTask(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white transition cursor-pointer"
              >
                {t('rfid', 'close', 'Close')}
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={verifyingAction}
                  onClick={() => handleAuthorityAction(verificationTask.id, 'REQUEST_REWORK')}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                  <span>{t('dashboard', 'requestRework', 'Request Rework')}</span>
                </button>

                <button
                  type="button"
                  disabled={verifyingAction}
                  onClick={() => handleAuthorityAction(verificationTask.id, 'VERIFY')}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{t('dashboard', 'verifyMarkResolved', 'Verify & Mark Resolved')}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RFID Simulator Modal */}
      <RFIDSimulatorModal
        isOpen={isRfidModalOpen}
        onClose={() => setIsRfidModalOpen(false)}
        onScanSuccess={() => {
          loadRfidData();
        }}
      />

      {/* ESP32 IoT Simulator Modal */}
      <IoTSimulatorModal
        isOpen={isIotModalOpen}
        onClose={() => setIsIotModalOpen(false)}
        onTelemetrySent={() => {
          loadIoTData();
        }}
      />

    </div>
  );
}

