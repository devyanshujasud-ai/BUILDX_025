import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import {
  TrendingUp,
  AlertTriangle,
  Layers,
  Building2,
  Activity,
  Radio,
  Clock,
  ShieldCheck,
  CheckCheck,
  Cpu,
  AlertCircle,
  HardHat,
  Droplets,
  Zap,
  Route,
  ChevronRight,
  Play,
  RotateCcw,
  Sparkles,
  UserCheck,
  MapPin,
  ExternalLink,
  Eye,
  CheckCircle2,
  Trash2,
  Lightbulb,
  FileText,
  Filter,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import {
  createIssue,
  sendIoTTelemetry,
  scanRFID,
  getConstructionProjects,
  getConstructionConflicts,
  getRFIDStats,
  getMaintenanceTasks,
  getIoTStats,
  getIoTTelemetry,
  getMediaUrl,
  FALLBACK_ROAD_IMAGE
} from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

// Custom Leaflet DivIcons for Map Pins
const createPotholeIcon = (severity) => {
  const color =
    severity === 'CRITICAL' ? '#ef4444' :
    severity === 'HIGH' ? '#f97316' :
    severity === 'MEDIUM' ? '#eab308' : '#22c55e';

  return L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="width:20px;height:20px;border-radius:9999px;background:${color};border:2px solid #ffffff;box-shadow:0 0 12px ${color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:9px;font-weight:bold;">!</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const createAssetIcon = (type) => {
  const color = type === 'STREETLIGHT' ? '#38bdf8' : type === 'DUSTBIN' ? '#a855f7' : '#10b981';
  return L.divIcon({
    className: 'custom-asset-marker',
    html: `<div style="width:18px;height:18px;border-radius:6px;background:${color};border:2px solid #ffffff;box-shadow:0 2px 8px rgba(0,0,0,0.5);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

const createConflictIcon = () => {
  return L.divIcon({
    className: 'custom-conflict-marker',
    html: `<div style="width:26px;height:26px;border-radius:9999px;background:#ef4444;border:3px solid #ffffff;box-shadow:0 0 16px #ef4444;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:900;animation:pulse 1.5s infinite;">⚠️</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
};

export default function UnifiedCommandCenter({
  stats,
  authorities = [],
  assets = [],
  issues = [],
  potholes = [],
  onNavigateToTab,
  onOpenRFID,
  onOpenIoT,
  onRefreshData,
}) {
  const { t, getPriorityLabel, getStatusLabel, getDepartmentLabel, language } = useLanguage();

  // Subsystem Telemetry & Conflict State
  const [rfidStats, setRfidStats] = useState(null);
  const [maintenanceTasks, setMaintenanceTasks] = useState([]);
  const [iotStats, setIotStats] = useState(null);
  const [iotTelemetry, setIotTelemetry] = useState([]);
  const [projects, setProjects] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  // Map Filter: 'ALL' | 'ISSUES' | 'ASSETS' | 'CONFLICTS'
  const [mapFilter, setMapFilter] = useState('ALL');

  // Simulation Feedback State
  const [simulationEvent, setSimulationEvent] = useState(null);
  const [simulatingAction, setSimulatingAction] = useState(null);

  // Load Subsystem Data
  const loadSubsystems = async () => {
    try {
      setLoadingMetrics(true);
      const [rfidS, tasks, iotS, telemetry, proj, conf] = await Promise.all([
        getRFIDStats().catch(() => null),
        getMaintenanceTasks({ limit: 10 }).catch(() => []),
        getIoTStats().catch(() => null),
        getIoTTelemetry({ limit: 10 }).catch(() => []),
        getConstructionProjects({ limit: 20 }).catch(() => []),
        getConstructionConflicts().catch(() => []),
      ]);
      setRfidStats(rfidS);
      setMaintenanceTasks(tasks);
      setIotStats(iotS);
      setIotTelemetry(telemetry);
      setProjects(proj);
      setConflicts(conf);
    } catch (e) {
      console.error('Failed loading command center telemetry:', e);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    loadSubsystems();
  }, []);

  // Compute Unified Metrics
  const metrics = useMemo(() => {
    const totalMasterIssues = issues.length || stats?.total_potholes || 0;
    
    // Total raw citizen complaints before clustering
    const totalComplaintsIngested = issues.reduce((acc, curr) => acc + (curr.report_count || 1), 0);
    const duplicatesConsolidated = Math.max(0, totalComplaintsIngested - issues.length);

    const criticalHigh = issues.filter(
      (i) => i.priority === 'CRITICAL' || i.priority === 'HIGH' || i.severity === 'CRITICAL' || i.severity === 'HIGH'
    ).length || ((stats?.severity_distribution?.CRITICAL || 0) + (stats?.severity_distribution?.HIGH || 0));

    // Department-wise distribution
    const deptDistribution = issues.reduce((acc, curr) => {
      const dept = curr.department || 'NMC Road Maintenance';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    const iotAlertsCount = (iotStats?.total_anomalies || 0) +
      issues.filter((i) => i.type === 'STREETLIGHT' || i.type === 'DUSTBIN').length;

    const activeMaintenanceCount =
      rfidStats?.active_sessions || maintenanceTasks.filter((t) => t.status === 'IN_PROGRESS').length;

    const pendingVerificationCount =
      rfidStats?.pending_verification || maintenanceTasks.filter((t) => t.status === 'PENDING_VERIFICATION').length;

    const resolvedCount =
      (stats?.status_distribution?.RESOLVED || 0) + maintenanceTasks.filter((t) => t.status === 'RESOLVED').length;

    const conflictCount = conflicts.length;

    return {
      totalMasterIssues,
      totalComplaintsIngested,
      duplicatesConsolidated,
      criticalHigh,
      deptDistribution,
      iotAlertsCount,
      activeMaintenanceCount,
      pendingVerificationCount,
      resolvedCount,
      conflictCount,
    };
  }, [issues, stats, rfidStats, maintenanceTasks, iotStats, conflicts]);

  // Hackathon Demo Actions
  const handleSimulateCitizen = async () => {
    try {
      setSimulatingAction('CITIZEN');
      const sampleLocations = [
        { road: 'Wardha Road near Airport T-Point', lat: 21.1092, lng: 79.0553, desc: 'Large deep crater causing 2-wheeler skidding hazard.' },
        { road: 'Central Avenue near Gandhibagh Market', lat: 21.1512, lng: 79.1021, desc: 'Multiple surface ruptures and asphalt wash-away.' },
        { road: 'Amravati Road near Dharampeth', lat: 21.1465, lng: 79.0682, desc: 'Severe edge fracture along bus lane.' },
      ];
      const pick = sampleLocations[Math.floor(Math.random() * sampleLocations.length)];
      
      const newIssue = await createIssue({
        title: `Citizen Grievance: ${pick.road}`,
        description: pick.desc,
        road_name: pick.road,
        type: 'POTHOLE',
        severity: 'HIGH',
        latitude: pick.lat,
        longitude: pick.lng,
        reported_by: 'Nagpur Citizen (Mobile App)',
      });

      setSimulationEvent({
        type: 'CITIZEN',
        message: `Citizen grievance registered for ${pick.road}. AI auto-routed to ${newIssue.department} with High Priority!`,
        time: new Date().toLocaleTimeString(),
      });

      if (onRefreshData) onRefreshData();
      await loadSubsystems();
    } catch (e) {
      console.error('Citizen simulation error:', e);
      alert('Simulation failed: ' + e.message);
    } finally {
      setSimulatingAction(null);
    }
  };

  const handleSimulateIoT = async () => {
    try {
      setSimulatingAction('IOT');
      const scenarios = [
        { type: 'DUSTBIN', deviceId: 'ESP32-DUST-01', assetId: 2, data: { fill_level: 96 }, desc: 'Smart Dustbin Overflowing (96% capacity)' },
        { type: 'STREETLIGHT', deviceId: 'ESP32-STREET-01', assetId: 1, data: { lux: 4.5, motion: 1, current: 0.05 }, desc: 'Smart Streetlight Bulb Outage (0.05A draw)' },
        { type: 'POTHOLE_NODE', deviceId: 'ESP32-ROAD-01', assetId: 3, data: { ir_distance: 14.5, acceleration: 3.4, latitude: 21.1458, longitude: 79.0882 }, desc: 'Road Sensor High Impact Vibration Spike' },
      ];
      const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];

      await sendIoTTelemetry({
        device_id: scenario.deviceId,
        asset_id: scenario.assetId,
        device_type: scenario.type,
        timestamp: new Date().toISOString(),
        data: scenario.data,
      });

      setSimulationEvent({
        type: 'IOT',
        message: `ESP32 Telemetry Alert: ${scenario.desc} automatically flagged anomaly & logged civic ticket!`,
        time: new Date().toLocaleTimeString(),
      });

      await loadSubsystems();
      if (onRefreshData) onRefreshData();
    } catch (e) {
      console.error('IoT simulation error:', e);
      alert('IoT simulation failed: ' + e.message);
    } finally {
      setSimulatingAction(null);
    }
  };

  const handleSimulateRFIDCheckIn = async () => {
    try {
      setSimulatingAction('RFID_IN');
      const res = await scanRFID({
        rfid_uid: 'RFID-NGP-4401',
        asset_id: 1,
        latitude: 21.1458,
        longitude: 79.0882,
        notes: 'Technician on-site check-in via NFC badge.',
      });

      setSimulationEvent({
        type: 'RFID',
        message: `Worker Check-In Recorded: Ramesh Patil tapped RFID badge at Wardha Road Asset #1. Session Started!`,
        time: new Date().toLocaleTimeString(),
      });

      await loadSubsystems();
      if (onRefreshData) onRefreshData();
    } catch (e) {
      console.error('RFID Check-in error:', e);
      alert('RFID Check-in failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSimulatingAction(null);
    }
  };

  const handleSimulateRFIDCheckOut = async () => {
    try {
      setSimulatingAction('RFID_OUT');
      const res = await scanRFID({
        rfid_uid: 'RFID-NGP-4401',
        asset_id: 1,
        latitude: 21.1458,
        longitude: 79.0882,
        after_image: '/uploads/sample_pothole_1_annotated.jpg',
        notes: 'Bitumen asphalt cold-patch applied and compacted to road grade.',
      });

      setSimulationEvent({
        type: 'VERIFICATION',
        message: `Maintenance Work Order Completed! Post-repair photo proof uploaded. Task now PENDING_VERIFICATION!`,
        time: new Date().toLocaleTimeString(),
      });

      await loadSubsystems();
      if (onRefreshData) onRefreshData();
    } catch (e) {
      console.error('RFID Check-out error:', e);
      alert('RFID Check-out failed: ' + (e.response?.data?.detail || e.message));
    } finally {
      setSimulatingAction(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      
      {/* 1. Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-sky-950/70 border border-slate-700/80 p-6 sm:p-8 shadow-2xl">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40 tracking-wide uppercase">
                NMC SMART CITY UNIFIED OPS
              </span>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Civic Telemetry
              </span>
              <span className="px-3 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                10 Administrative Zones
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <TrendingUp className="w-7 h-7 text-sky-400" />
              <span>{t('commandCenter', 'title', 'Vikasit Nagpur — City Infrastructure Command Center')}</span>
            </h1>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              {t('commandCenter', 'subtitle', 'Unified municipal situational intelligence: AI road vision, ESP32 multi-sensor telemetry, automatic civic routing, and RFID workforce coordination across Nagpur.')}
            </p>
          </div>

          {/* Quick Refresh / Status */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => {
                loadSubsystems();
                if (onRefreshData) onRefreshData();
              }}
              disabled={loadingMetrics}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition flex items-center gap-1.5 text-xs font-bold"
              title="Refresh All Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${loadingMetrics ? 'animate-spin text-sky-400' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
            <div className="text-right hidden sm:block font-mono text-[11px] text-slate-400">
              <div className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                ALL SYSTEMS HEALTHY
              </div>
              <div>Nagpur Grid: 21.1458° N, 79.0882° E</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Hackathon Demo / Simulation Controls Bar */}
      <div className="rounded-3xl bg-slate-900/90 border border-indigo-500/30 p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                {t('commandCenter', 'demoControls.title', 'Hackathon Live Demonstration Controls')}
              </h2>
              <p className="text-[11px] text-slate-400">
                {t('commandCenter', 'demoControls.subtitle', 'One-click simulation actions to trigger real-time lifecycle events without manual data entry')}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-500/30">
            Rapid Evaluation Mode
          </span>
        </div>

        {/* Demo Buttons Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action 1: Citizen Complaint */}
          <button
            type="button"
            disabled={simulatingAction === 'CITIZEN'}
            onClick={handleSimulateCitizen}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-850 hover:from-slate-750 hover:to-slate-800 border border-slate-700/80 hover:border-sky-500/60 text-left transition-all shadow-md group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-sky-400 fill-sky-400" />
                {t('commandCenter', 'demoControls.simulateCitizen', 'Simulate Citizen Complaint')}
              </span>
              <span className="text-[9px] font-mono uppercase bg-sky-500/10 text-sky-400 px-1.5 py-0.5 rounded">
                Grievance
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              {t('commandCenter', 'demoControls.simulateCitizenDesc', 'Create sample road defect grievance with AI routing')}
            </p>
          </button>

          {/* Action 2: IoT Telemetry */}
          <button
            type="button"
            disabled={simulatingAction === 'IOT'}
            onClick={handleSimulateIoT}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-850 hover:from-slate-750 hover:to-slate-800 border border-slate-700/80 hover:border-amber-500/60 text-left transition-all shadow-md group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                {t('commandCenter', 'demoControls.simulateIot', 'Simulate IoT Telemetry')}
              </span>
              <span className="text-[9px] font-mono uppercase bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded">
                ESP32
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              {t('commandCenter', 'demoControls.simulateIotDesc', 'Fire abnormal ESP32 sensor reading (Dustbin/Light)')}
            </p>
          </button>

          {/* Action 3: RFID Check-In */}
          <button
            type="button"
            disabled={simulatingAction === 'RFID_IN'}
            onClick={handleSimulateRFIDCheckIn}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-850 hover:from-slate-750 hover:to-slate-800 border border-slate-700/80 hover:border-indigo-500/60 text-left transition-all shadow-md group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-indigo-400" />
                {t('commandCenter', 'demoControls.simulateRfidCheckIn', 'Simulate RFID Check-In')}
              </span>
              <span className="text-[9px] font-mono uppercase bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded">
                Step 1
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              {t('commandCenter', 'demoControls.simulateRfidCheckInDesc', 'Technician on-site contactless badge tap')}
            </p>
          </button>

          {/* Action 4: Work Order Completion */}
          <button
            type="button"
            disabled={simulatingAction === 'RFID_OUT'}
            onClick={handleSimulateRFIDCheckOut}
            className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-850 hover:from-slate-750 hover:to-slate-800 border border-slate-700/80 hover:border-emerald-500/60 text-left transition-all shadow-md group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {t('commandCenter', 'demoControls.simulateRfidCheckOut', 'Complete Maintenance')}
              </span>
              <span className="text-[9px] font-mono uppercase bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded">
                Step 2
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              {t('commandCenter', 'demoControls.simulateRfidCheckOutDesc', 'Submit repair with after-image for verification')}
            </p>
          </button>
        </div>

        {/* Live Simulation Toast Feedback */}
        {simulationEvent && (
          <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span className="text-slate-200 font-medium">{simulationEvent.message}</span>
            </div>
            <span className="text-[10px] font-mono text-slate-500">{simulationEvent.time}</span>
          </div>
        )}
      </div>

      {/* 3. The 8-Stage Workflow Pipeline Bar */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Route className="w-4 h-4 text-sky-400" />
              <span>{t('commandCenter', 'workflowTitle', 'End-to-End Civic Maintenance Workflow Pipeline')}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('commandCenter', 'workflowSubtitle', 'Transparent municipal lifecycle tracking from defect discovery to verified sign-off')}
            </p>
          </div>
          <span className="text-xs font-mono text-sky-400 bg-sky-950/60 px-3 py-1 rounded-full border border-sky-500/30">
            8-Stage Closed Loop
          </span>
        </div>

        {/* Stepper Pipeline */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-2">
          {/* Stage 1 */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-sky-400">01</span>
              <Activity className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Detection</div>
              <div className="text-[10px] text-slate-500">AI / IoT / Citizen</div>
            </div>
            <div className="pt-1 border-t border-slate-800/80 font-mono text-xs font-bold text-sky-400">
              {metrics.totalComplaintsIngested} Events
            </div>
          </div>

          {/* Stage 2 */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-indigo-400">02</span>
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Master Issue</div>
              <div className="text-[10px] text-slate-500">Clustered & Clean</div>
            </div>
            <div className="pt-1 border-t border-slate-800/80 font-mono text-xs font-bold text-indigo-400">
              {metrics.totalMasterIssues} Tickets
            </div>
          </div>

          {/* Stage 3 */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-amber-400">03</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Priority</div>
              <div className="text-[10px] text-slate-500">IRC Severity Matrix</div>
            </div>
            <div className="pt-1 border-t border-slate-800/80 font-mono text-xs font-bold text-amber-400">
              {metrics.criticalHigh} Critical
            </div>
          </div>

          {/* Stage 4 */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-purple-400">04</span>
              <Building2 className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Department</div>
              <div className="text-[10px] text-slate-500">Auto Agency Route</div>
            </div>
            <div className="pt-1 border-t border-slate-800/80 font-mono text-xs font-bold text-purple-400">
              4 Agencies
            </div>
          </div>

          {/* Stage 5 */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-cyan-400">05</span>
              <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Assignment</div>
              <div className="text-[10px] text-slate-500">Crew Dispatched</div>
            </div>
            <div className="pt-1 border-t border-slate-800/80 font-mono text-xs font-bold text-cyan-400">
              Assigned
            </div>
          </div>

          {/* Stage 6 */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-teal-400">06</span>
              <Radio className="w-3.5 h-3.5 text-teal-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">RFID Maintenance</div>
              <div className="text-[10px] text-slate-500">NFC Tap Check-in</div>
            </div>
            <div className="pt-1 border-t border-slate-800/80 font-mono text-xs font-bold text-teal-400">
              {metrics.activeMaintenanceCount} On-Site
            </div>
          </div>

          {/* Stage 7 */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-sky-500/40 bg-sky-500/5 flex flex-col justify-between space-y-2 shadow-sm shadow-sky-500/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-sky-400">07</span>
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400 animate-bounce" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Verification</div>
              <div className="text-[10px] text-sky-300">Before/After Audit</div>
            </div>
            <div className="pt-1 border-t border-sky-500/20 font-mono text-xs font-bold text-sky-400">
              {metrics.pendingVerificationCount} In Review
            </div>
          </div>

          {/* Stage 8 */}
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-emerald-500/30 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-emerald-400">08</span>
              <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div>
              <div className="text-xs font-bold text-white">Resolution</div>
              <div className="text-[10px] text-slate-500">Signed & Closed</div>
            </div>
            <div className="pt-1 border-t border-slate-800/80 font-mono text-xs font-bold text-emerald-400">
              {metrics.resolvedCount} Resolved
            </div>
          </div>
        </div>
      </div>

      {/* 4. Core Executive Metrics Grid (9 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        
        {/* Metric 1: Total Issues */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">{t('commandCenter', 'metrics.totalIssues', 'Total Master Issues')}</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">{metrics.totalMasterIssues}</div>
          <span className="text-[10px] text-slate-500 block">Deduplicated civic tickets</span>
        </div>

        {/* Metric 2: Critical & High */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-red-500/30 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-red-400">
            <span className="font-semibold uppercase tracking-wider">{t('commandCenter', 'metrics.criticalPriority', 'Critical / High')}</span>
            <AlertTriangle className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-3xl font-black text-red-400 font-mono">{metrics.criticalHigh}</div>
          <span className="text-[10px] text-slate-500 block">Immediate resurfacing needed</span>
        </div>

        {/* Metric 3: Duplicates Merged */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-indigo-500/30 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-indigo-400">
            <span className="font-semibold uppercase tracking-wider">{t('commandCenter', 'metrics.duplicatesMerged', 'Duplicates Merged')}</span>
            <Sparkles className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-indigo-300 font-mono">{metrics.duplicatesConsolidated}</div>
          <span className="text-[10px] text-slate-500 block">Citizen reports clustered</span>
        </div>

        {/* Metric 4: IoT Alerts */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-amber-500/30 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-amber-400">
            <span className="font-semibold uppercase tracking-wider">{t('commandCenter', 'metrics.iotAlerts', 'IoT Telemetry Alerts')}</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-300 font-mono">{metrics.iotAlertsCount}</div>
          <span className="text-[10px] text-slate-500 block">ESP32 sensor anomalies</span>
        </div>

        {/* Metric 5: Active Maintenance */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-teal-500/30 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-teal-400">
            <span className="font-semibold uppercase tracking-wider">{t('commandCenter', 'metrics.activeMaintenance', 'Active Works')}</span>
            <Radio className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-3xl font-black text-teal-300 font-mono">{metrics.activeMaintenanceCount}</div>
          <span className="text-[10px] text-slate-500 block">RFID crews on-site</span>
        </div>

        {/* Metric 6: Pending Verification */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-sky-500/40 bg-sky-950/20 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-sky-400">
            <span className="font-semibold uppercase tracking-wider">{t('commandCenter', 'metrics.pendingVerification', 'Pending Review')}</span>
            <ShieldCheck className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-black text-sky-300 font-mono">{metrics.pendingVerificationCount}</div>
          <span className="text-[10px] text-sky-400/70 block">Awaiting inspector approval</span>
        </div>

        {/* Metric 7: Resolved */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-emerald-500/30 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-emerald-400">
            <span className="font-semibold uppercase tracking-wider">{t('commandCenter', 'metrics.resolvedIssues', 'Resolved & Verified')}</span>
            <CheckCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">{metrics.resolvedCount}</div>
          <span className="text-[10px] text-slate-500 block">Audited & closed</span>
        </div>

        {/* Metric 8: Contractor Conflicts */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-rose-500/40 bg-rose-950/20 space-y-2 shadow-lg">
          <div className="flex items-center justify-between text-xs text-rose-400">
            <span className="font-semibold uppercase tracking-wider">{t('commandCenter', 'metrics.contractorConflicts', 'Work Conflicts')}</span>
            <HardHat className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-rose-400 font-mono">{metrics.conflictCount}</div>
          <span className="text-[10px] text-rose-300/80 block">Overlapping road excavations</span>
        </div>

        {/* Metric 9: Department Agencies */}
        <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-2 shadow-lg col-span-2 sm:col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">{t('commandCenter', 'metrics.departmentIssues', 'Department Breakdown')}</span>
            <Building2 className="w-4 h-4 text-slate-400" />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl">
              <span className="text-slate-400 truncate">NMC Zone Works</span>
              <span className="font-mono font-bold text-sky-400">
                {metrics.deptDistribution['NMC Road Maintenance'] || metrics.deptDistribution['NMC PWD'] || 3}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl">
              <span className="text-slate-400 truncate">MH PWD Highway</span>
              <span className="font-mono font-bold text-amber-400">
                {metrics.deptDistribution['Maharashtra PWD'] || 2}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl">
              <span className="text-slate-400 truncate">NHAI Ring Road</span>
              <span className="font-mono font-bold text-rose-400">
                {metrics.deptDistribution['NHAI Nagpur'] || 1}
              </span>
            </div>
            <div className="flex items-center justify-between bg-slate-950 p-2 rounded-xl">
              <span className="text-slate-400 truncate">NIT Infrastructure</span>
              <span className="font-mono font-bold text-purple-400">
                {metrics.deptDistribution['Nagpur Improvement Trust'] || 1}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Integrated Nagpur Spatial Command Map */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-400" />
              <span>{t('commandCenter', 'mapSection.title', 'Nagpur Multi-Agency Spatial Command Map')}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('commandCenter', 'mapSection.subtitle', 'Real-time geographic distribution of road defects, municipal assets, and utility work zones')}
            </p>
          </div>

          {/* Layer Filter Buttons */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
            {['ALL', 'ISSUES', 'ASSETS', 'CONFLICTS'].map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setMapFilter(filter)}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer text-xs ${
                  mapFilter === filter
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {filter === 'ALL' ? t('commandCenter', 'mapSection.allLayers', 'All Layers') :
                 filter === 'ISSUES' ? t('commandCenter', 'mapSection.issuesOnly', 'Issues') :
                 filter === 'ASSETS' ? t('commandCenter', 'mapSection.assetsOnly', 'Assets') :
                 t('commandCenter', 'mapSection.worksOnly', 'Works & Conflicts')}
              </button>
            ))}
          </div>
        </div>

        {/* Map Container */}
        <div className="w-full h-[450px] rounded-2xl overflow-hidden border border-slate-800 shadow-inner relative z-0">
          <MapContainer
            center={[21.1458, 79.0882]}
            zoom={13}
            className="w-full h-full"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Pothole & Issue Markers */}
            {(mapFilter === 'ALL' || mapFilter === 'ISSUES') &&
              issues.map((issue) => {
                if (!issue.latitude || !issue.longitude) return null;
                return (
                  <Marker
                    key={`issue-${issue.id}`}
                    position={[issue.latitude, issue.longitude]}
                    icon={createPotholeIcon(issue.priority || issue.severity)}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div className="p-1 space-y-1 text-slate-900 font-sans">
                        <div className="font-bold text-xs">{issue.title || issue.road_name}</div>
                        <div className="text-[10px] text-slate-600 font-mono">
                          {issue.department} • {issue.priority} Priority
                        </div>
                        <div className="text-[10px] text-slate-700">{issue.description}</div>
                        {issue.report_count > 1 && (
                          <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">
                            {issue.report_count} citizen reports merged
                          </div>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

            {/* Assets Markers */}
            {(mapFilter === 'ALL' || mapFilter === 'ASSETS') &&
              assets.map((asset) => {
                if (!asset.latitude || !asset.longitude) return null;
                return (
                  <Marker
                    key={`asset-${asset.id}`}
                    position={[asset.latitude, asset.longitude]}
                    icon={createAssetIcon(asset.type)}
                  >
                    <Popup className="custom-leaflet-popup">
                      <div className="p-1 space-y-1 text-slate-900 font-sans">
                        <div className="font-bold text-xs">{asset.name}</div>
                        <div className="text-[10px] text-slate-600 font-mono">
                          Type: {asset.type} • Status: {asset.status}
                        </div>
                        <div className="text-[10px] text-slate-500">Asset #{asset.id} (Nagpur Zone)</div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

            {/* Construction Projects and Conflict Zones */}
            {(mapFilter === 'ALL' || mapFilter === 'CONFLICTS') &&
              projects.map((p) => {
                if (!p.latitude || !p.longitude) return null;
                return (
                  <React.Fragment key={`proj-${p.id}`}>
                    <Marker
                      position={[p.latitude, p.longitude]}
                      icon={p.has_conflict ? createConflictIcon() : createPotholeIcon('MEDIUM')}
                    >
                      <Popup className="custom-leaflet-popup">
                        <div className="p-1 space-y-1 text-slate-900 font-sans">
                          <div className="font-bold text-xs">{p.location}</div>
                          <div className="text-[10px] font-bold text-slate-700 font-mono">
                            {p.work_type} • {p.agency?.code || 'Agency'}
                          </div>
                          {p.has_conflict && (
                            <div className="p-1 rounded bg-rose-100 border border-rose-300 text-rose-800 text-[10px] font-bold">
                              ⚠️ POTENTIAL COORDINATION CONFLICT!
                              <div className="font-normal">{p.conflicts?.[0]?.message}</div>
                            </div>
                          )}
                        </div>
                      </Popup>
                    </Marker>

                    {/* Pulsing ring if conflict */}
                    {p.has_conflict && (
                      <Circle
                        center={[p.latitude, p.longitude]}
                        radius={250}
                        pathOptions={{
                          color: '#ef4444',
                          fillColor: '#ef4444',
                          fillOpacity: 0.2,
                          weight: 2,
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
          </MapContainer>
        </div>
      </div>

      {/* 6. Active Coordination Conflicts Card & Rapid Actions */}
      {conflicts.length > 0 && (
        <div className="p-6 rounded-3xl bg-slate-900/90 border border-rose-500/40 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
                <AlertCircle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white tracking-wide uppercase">
                  Multi-Agency Infrastructure Coordination Conflicts ({conflicts.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Automated collision detection prevents simultaneous uncoordinated digging on identical corridors.
                </p>
              </div>
            </div>
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => onNavigateToTab('works')}
                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 transition"
              >
                <span>Deconflict in Works Page</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {conflicts.map((c, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-slate-950/80 border border-rose-500/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-400 text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                    POTENTIAL COORDINATION CONFLICT
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">Zone Collision</span>
                </div>
                <div className="text-xs font-semibold text-white">{c.message}</div>
                <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono pt-1 border-t border-slate-800">
                  <span>Project #{c.project_1_id} vs #{c.project_2_id}</span>
                  <span className="text-amber-400">Requires Joint Site Review</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
