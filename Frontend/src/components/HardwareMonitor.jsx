import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu, Wifi, WifiOff, Activity, Trash2, Lightbulb,
  Radio, AlertTriangle, CheckCircle2, Clock, Zap,
  ThermometerSun, Moon, Sun, CircleDot, TrendingUp,
  RefreshCw, ChevronDown, Eye, Server, Router
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { getHardwareStatus, getHardwareEvents } from '../services/api';

const POLL_INTERVAL = 3000; // 3 seconds

export default function HardwareMonitor() {
  const { t } = useLanguage();
  const [status, setStatus] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [expandedEvents, setExpandedEvents] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, eventsRes] = await Promise.all([
        getHardwareStatus(),
        getHardwareEvents(30),
      ]);
      setStatus(statusRes);
      setEvents(eventsRes.events || []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch hardware data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const device = status?.devices?.[0] || null;
  const isOnline = device?.online || false;
  const uptime = device?.uptime_seconds || 0;
  const sl = device?.streetlight || {};
  const db = device?.dustbin || {};
  const ph = device?.pothole || {};
  const rfidState = device?.rfid || {};

  const formatUptime = (sec) => {
    if (!sec) return '—';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const formatTime = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const eventIcon = (type) => {
    const map = {
      'STREETLIGHT_FAULT': <Lightbulb className="w-3.5 h-3.5 text-amber-400" />,
      'DUSTBIN_FULL': <Trash2 className="w-3.5 h-3.5 text-red-400" />,
      'POTHOLE_MAJOR': <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
      'POTHOLE_NORMAL': <Activity className="w-3.5 h-3.5 text-orange-400" />,
      'RFID_SCAN': <Radio className="w-3.5 h-3.5 text-teal-400" />,
      'RFID_INVALID': <AlertTriangle className="w-3.5 h-3.5 text-red-400" />,
    };
    return map[type] || <CircleDot className="w-3.5 h-3.5 text-slate-400" />;
  };

  const severityColor = (sev) => {
    const map = {
      'CRITICAL': 'text-red-400 bg-red-500/10 border-red-500/30',
      'HIGH': 'text-orange-400 bg-orange-500/10 border-orange-500/30',
      'MEDIUM': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      'LOW': 'text-sky-400 bg-sky-500/10 border-sky-500/30',
      'INFO': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      'WARNING': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    };
    return map[sev] || 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  };

  // Dustbin fill %
  const binHeight = 6.0;
  const dustbinDist = db.distance_inches ?? binHeight;
  const fillPct = Math.max(0, Math.min(100, Math.round(((binHeight - Math.max(0, Math.min(dustbinDist, binHeight))) / binHeight) * 100)));

  if (loading && !status) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <Cpu className="w-12 h-12 text-sky-400 animate-spin" />
          <p className="text-slate-400 font-medium">{t('hardware', 'loading', 'Connecting to ESP32 hardware...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">

      {/* ═══════ HEADER ═══════ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center border ${
            isOnline
              ? 'bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
              : 'bg-red-500/10 border-red-500/40'
          }`}>
            <Cpu className={`w-6 h-6 ${isOnline ? 'text-emerald-400' : 'text-red-400'}`} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              {t('hardware', 'title', 'ESP32 Hardware Monitor')}
              {isOnline ? (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                </span>
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              )}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {isOnline
                ? t('hardware', 'online', 'Device online • Real-time sensor feed active')
                : t('hardware', 'offline', 'Device offline • Waiting for ESP32 connection...')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastRefresh && (
            <span className="text-[10px] text-slate-500 font-mono">
              {t('hardware', 'lastSync', 'Last sync')}: {formatTime(lastRefresh.toISOString())}
            </span>
          )}
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {t('hardware', 'refresh', 'Refresh')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs font-medium flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* ═══════ DEVICE INFO BAR ═══════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center">
            <Server className="w-4.5 h-4.5 text-sky-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{t('hardware', 'deviceId', 'Device ID')}</p>
            <p className="text-sm font-bold text-white font-mono">{device?.device_id || '—'}</p>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
            isOnline ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'
          }`}>
            {isOnline ? <Wifi className="w-4.5 h-4.5 text-emerald-400" /> : <WifiOff className="w-4.5 h-4.5 text-red-400" />}
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{t('hardware', 'connection', 'Connection')}</p>
            <p className={`text-sm font-bold ${isOnline ? 'text-emerald-400' : 'text-red-400'}`}>
              {isOnline ? t('hardware', 'connected', 'Connected') : t('hardware', 'disconnected', 'Disconnected')}
            </p>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center">
            <Clock className="w-4.5 h-4.5 text-violet-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{t('hardware', 'uptime', 'Uptime')}</p>
            <p className="text-sm font-bold text-white font-mono">{formatUptime(uptime)}</p>
          </div>
        </div>
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Router className="w-4.5 h-4.5 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{t('hardware', 'wifiSSID', 'WiFi SSID')}</p>
            <p className="text-sm font-bold text-white">0110</p>
          </div>
        </div>
      </div>

      {/* ═══════ SENSOR PANELS GRID ═══════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* ── STREETLIGHT ─────────────────────── */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lightbulb className={`w-4.5 h-4.5 ${sl.light_on ? 'text-amber-400' : 'text-slate-500'}`} />
              <span className="text-sm font-bold text-white">{t('hardware', 'streetlight', 'Streetlight')}</span>
            </div>
            {sl.fault_detected && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                {t('hardware', 'fault', 'FAULT')}
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('hardware', 'ambient', 'Ambient')}</span>
              <div className="flex items-center gap-1.5">
                {sl.is_night ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-400" />}
                <span className={`text-xs font-bold ${sl.is_night ? 'text-indigo-400' : 'text-amber-400'}`}>
                  {sl.is_night ? t('hardware', 'night', 'Night') : t('hardware', 'day', 'Day')}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('hardware', 'lampStatus', 'Lamp')}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                sl.light_on
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-slate-700/30 text-slate-400 border-slate-600/30'
              }`}>
                {sl.light_on ? 'ON' : 'OFF'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('hardware', 'ldrFeedback', 'LDR Feedback')}</span>
              <span className="text-xs font-mono font-bold text-white">{sl.ldr_feedback ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('hardware', 'faultStatus', 'Fault')}</span>
              {sl.fault_detected ? (
                <span className="text-xs font-bold text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> {t('hardware', 'detected', 'DETECTED')}
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {t('hardware', 'normal', 'Normal')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── DUSTBIN ─────────────────────────── */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trash2 className={`w-4.5 h-4.5 ${db.is_full ? 'text-red-400' : 'text-emerald-400'}`} />
              <span className="text-sm font-bold text-white">{t('hardware', 'dustbin', 'Smart Dustbin')}</span>
            </div>
            {db.is_full && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse">
                FULL
              </span>
            )}
          </div>
          <div className="p-4 space-y-3">
            {/* Fill Level Gauge */}
            <div className="relative h-28 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
              <div
                className={`absolute bottom-0 left-0 right-0 transition-all duration-700 ease-out rounded-b-xl ${
                  fillPct >= 85 ? 'bg-gradient-to-t from-red-600/60 to-red-500/20' :
                  fillPct >= 60 ? 'bg-gradient-to-t from-amber-600/50 to-amber-500/15' :
                  'bg-gradient-to-t from-emerald-600/40 to-emerald-500/10'
                }`}
                style={{ height: `${fillPct}%` }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                <span className={`text-3xl font-extrabold ${
                  fillPct >= 85 ? 'text-red-400' : fillPct >= 60 ? 'text-amber-400' : 'text-emerald-400'
                }`}>{fillPct}%</span>
                <span className="text-[10px] text-slate-400 font-semibold">{t('hardware', 'fillLevel', 'Fill Level')}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('hardware', 'distance', 'Distance')}</span>
              <span className="text-xs font-mono font-bold text-white">
                {dustbinDist > 0 ? `${dustbinDist.toFixed(1)}"` : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('hardware', 'binStatus', 'Status')}</span>
              {db.is_full ? (
                <span className="text-xs font-bold text-red-400">{t('hardware', 'overflow', 'OVERFLOW')}</span>
              ) : (
                <span className="text-xs font-bold text-emerald-400">{t('hardware', 'ok', 'OK')}</span>
              )}
            </div>
          </div>
        </div>

        {/* ── POTHOLE COUNTER ────────────────── */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800/60 flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-orange-400" />
            <span className="text-sm font-bold text-white">{t('hardware', 'potholeDetector', 'Pothole Detector')}</span>
          </div>
          <div className="p-4 space-y-3">
            <div className="text-center py-2">
              <p className="text-4xl font-extrabold text-white">{ph.total_count || 0}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">
                {t('hardware', 'totalDetected', 'Total Detected')}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-2.5 text-center">
                <p className="text-xl font-extrabold text-red-400">{ph.major_count || 0}</p>
                <p className="text-[9px] text-red-400/70 font-bold uppercase">{t('hardware', 'major', 'Major')}</p>
                <p className="text-[8px] text-slate-500 mt-0.5">MPU6050</p>
              </div>
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-2.5 text-center">
                <p className="text-xl font-extrabold text-amber-400">{ph.normal_count || 0}</p>
                <p className="text-[9px] text-amber-400/70 font-bold uppercase">{t('hardware', 'normalPh', 'Normal')}</p>
                <p className="text-[8px] text-slate-500 mt-0.5">IR Sensor</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('hardware', 'accel', 'Accel')}</span>
              <span className="text-xs font-mono font-bold text-white">{(ph.acceleration || 0).toFixed(2)} m/s²</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">{t('hardware', 'devFromBaseline', 'Deviation')}</span>
              <span className={`text-xs font-mono font-bold ${
                (ph.deviation || 0) > 8 ? 'text-red-400' : 'text-slate-300'
              }`}>{(ph.deviation || 0).toFixed(2)}g</span>
            </div>
          </div>
        </div>

        {/* ── RFID WORKER ────────────────────── */}
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-800/60 flex items-center gap-2">
            <Radio className="w-4.5 h-4.5 text-teal-400" />
            <span className="text-sm font-bold text-white">{t('hardware', 'rfidTracker', 'RFID Worker Tracker')}</span>
          </div>
          <div className="p-4 space-y-3">
            {rfidState.sw_uid ? (
              <>
                <div className="bg-teal-500/5 border border-teal-500/20 rounded-xl p-3 text-center">
                  <Radio className="w-8 h-8 text-teal-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-white">{rfidState.worker_name || 'Worker'}</p>
                  <p className="text-[10px] text-teal-400 font-mono mt-1">{rfidState.sw_uid}</p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{t('hardware', 'hwUID', 'HW UID')}</span>
                  <span className="text-xs font-mono text-slate-300">{rfidState.hw_uid || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{t('hardware', 'action', 'Action')}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${
                    rfidState.action === 'IN'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : rfidState.action === 'OUT'
                        ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                        : 'bg-red-500/10 text-red-400 border-red-500/30'
                  }`}>
                    {rfidState.action || '—'}
                  </span>
                </div>
                {rfidState.work_duration && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{t('hardware', 'duration', 'Duration')}</span>
                    <span className="text-xs font-mono font-bold text-white">{rfidState.work_duration}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <Radio className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-xs text-slate-500 font-medium">{t('hardware', 'noRfidScan', 'No RFID scan detected yet')}</p>
                <p className="text-[10px] text-slate-600 mt-1">{t('hardware', 'tapCard', 'Tap a worker card on the RC522 reader')}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════ RFID UID MAPPING TABLE ═══════ */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-800/60 flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-bold text-white">{t('hardware', 'rfidMapping', 'RFID UID Mapping — Hardware ↔ Software')}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-800/60 text-slate-400">
                <th className="text-left px-4 py-2.5 font-semibold">{t('hardware', 'hwCard', 'Hardware Card UID')}</th>
                <th className="text-left px-4 py-2.5 font-semibold">{t('hardware', 'swUID', 'Software Worker UID')}</th>
                <th className="text-left px-4 py-2.5 font-semibold">{t('hardware', 'workerName', 'Worker Name')}</th>
                <th className="text-left px-4 py-2.5 font-semibold">{t('hardware', 'dept', 'Department')}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800/40 hover:bg-slate-800/30">
                <td className="px-4 py-2.5 font-mono text-amber-400">B3:3D:02:04</td>
                <td className="px-4 py-2.5 font-mono text-sky-400">RFID-NGP-7701</td>
                <td className="px-4 py-2.5 font-bold text-white">Ramesh Patil</td>
                <td className="px-4 py-2.5 text-slate-300">Roads/PWD</td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="px-4 py-2.5 font-mono text-amber-400">CD:3E:C8:01</td>
                <td className="px-4 py-2.5 font-mono text-sky-400">RFID-NGP-8802</td>
                <td className="px-4 py-2.5 font-bold text-white">Sunil Deshmukh</td>
                <td className="px-4 py-2.5 text-slate-300">Electrical</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ═══════ EVENT TIMELINE ═══════ */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-2xl overflow-hidden">
        <button
          onClick={() => setExpandedEvents(!expandedEvents)}
          className="w-full px-4 py-3 border-b border-slate-800/60 flex items-center justify-between cursor-pointer hover:bg-slate-800/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-bold text-white">
              {t('hardware', 'eventTimeline', 'Live Event Timeline')}
            </span>
            <span className="text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/30 rounded px-1.5 py-0.5">
              {events.length}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expandedEvents ? 'rotate-180' : ''}`} />
        </button>
        {expandedEvents && (
          <div className="max-h-80 overflow-y-auto">
            {events.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                {t('hardware', 'noEvents', 'No hardware events recorded yet. Events will appear as sensors trigger.')}
              </div>
            ) : (
              <div className="divide-y divide-slate-800/40">
                {events.map((evt, i) => (
                  <div key={evt.id || i} className="px-4 py-2.5 flex items-start gap-3 hover:bg-slate-800/20 transition-colors">
                    <div className="mt-0.5 flex-shrink-0">{eventIcon(evt.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-medium truncate">{evt.message}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${severityColor(evt.severity)}`}>
                          {evt.severity}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">{formatTime(evt.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
