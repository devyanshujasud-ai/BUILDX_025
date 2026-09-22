import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Send,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Trash2,
  Activity,
  Layers,
  Sparkles,
  RotateCcw,
  Zap,
  MapPin
} from 'lucide-react';
import { sendIoTTelemetry, getAssets } from '../services/api';

const IoTSimulatorModal = ({ isOpen, onClose, onTelemetrySent }) => {
  const [deviceType, setDeviceType] = useState('STREETLIGHT');
  const [assets, setAssets] = useState([]);
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [deviceId, setDeviceId] = useState('ESP32-STREET-01');

  // Sensor Form Data
  const [streetlightData, setStreetlightData] = useState({
    lux: 12.0,
    motion: 1,
    current: 0.0,
  });

  const [potholeData, setPotholeData] = useState({
    acceleration: 3.4,
    ir_distance: 17.5,
    latitude: 21.1458,
    longitude: 79.0882,
  });

  const [dustbinData, setDustbinData] = useState({
    fill_level: 92.0,
  });

  const [transmitting, setTransmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadAssets();
      setResult(null);
      setError(null);
    }
  }, [isOpen]);

  const loadAssets = async () => {
    try {
      const data = await getAssets();
      setAssets(data);
      if (data.length > 0 && !selectedAssetId) {
        setSelectedAssetId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load assets for IoT simulator:', err);
    }
  };

  if (!isOpen) return null;

  // Filter assets by type for convenience
  const relevantAssets = assets.filter((a) => {
    if (deviceType === 'STREETLIGHT') return a.type === 'STREETLIGHT';
    if (deviceType === 'DUSTBIN') return a.type === 'DUSTBIN';
    if (deviceType === 'POTHOLE_NODE') return a.type === 'ROAD_SEGMENT' || a.type === 'HIGHWAY_CORRIDOR';
    return true;
  });

  // Pick target asset ID
  const effectiveAssetId =
    relevantAssets.some((a) => a.id === parseInt(selectedAssetId, 10))
      ? selectedAssetId
      : relevantAssets[0]?.id || assets[0]?.id || 1;

  const currentPayloadData =
    deviceType === 'STREETLIGHT'
      ? streetlightData
      : deviceType === 'POTHOLE_NODE'
      ? potholeData
      : dustbinData;

  const handleSendTelemetry = async (overrideData = null) => {
    setTransmitting(true);
    setError(null);
    setResult(null);

    const dataToSend = overrideData || currentPayloadData;

    try {
      const payload = {
        device_id: deviceId.trim(),
        asset_id: parseInt(effectiveAssetId, 10),
        device_type: deviceType,
        timestamp: new Date().toISOString(),
        data: dataToSend,
      };

      const res = await sendIoTTelemetry(payload);
      setResult(res);

      if (onTelemetrySent) {
        onTelemetrySent(res);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'Telemetry send failed';
      setError(msg);
    } finally {
      setTransmitting(false);
    }
  };

  // Quick Preset Handlers
  const handlePreset = (type, data, customDeviceId) => {
    setDeviceType(type);
    if (customDeviceId) setDeviceId(customDeviceId);
    if (type === 'STREETLIGHT') setStreetlightData(data);
    if (type === 'POTHOLE_NODE') setPotholeData(data);
    if (type === 'DUSTBIN') setDustbinData(data);
    handleSendTelemetry(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  ESP32 IoT Telemetry & Anomaly Simulator
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  HTTP REST JSON
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Simulate real-time sensor packets from ESP32 nodes into Vikasit Nagpur
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Preset Buttons */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              1-Click Demo Event Triggers
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Streetlight Failure */}
              <button
                type="button"
                onClick={() =>
                  handlePreset(
                    'STREETLIGHT',
                    { lux: 8.0, motion: 1, current: 0.0 },
                    'ESP32-STREET-01'
                  )
                }
                className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-red-500/30 hover:border-red-500 text-left transition group"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-red-400 mb-1">
                  <Lightbulb className="w-3.5 h-3.5" />
                  <span>Lamp Burnout (0.0A)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Nighttime motion active, 0A current. Triggers Electrical work order.
                </p>
              </button>

              {/* Pothole Shock */}
              <button
                type="button"
                onClick={() =>
                  handlePreset(
                    'POTHOLE_NODE',
                    { acceleration: 3.8, ir_distance: 19.5, latitude: 21.1458, longitude: 79.0882 },
                    'ESP32-POTHOLE-NODE-07'
                  )
                }
                className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-amber-500/30 hover:border-amber-500 text-left transition group"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 mb-1">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Pothole Impact (3.8g)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Shock impact + 19.5cm cavity depth. Triggers Roads/PWD issue.
                </p>
              </button>

              {/* Dustbin Overflow */}
              <button
                type="button"
                onClick={() =>
                  handlePreset(
                    'DUSTBIN',
                    { fill_level: 94.0 },
                    'ESP32-BIN-04'
                  )
                }
                className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-purple-500/30 hover:border-purple-500 text-left transition group"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-purple-400 mb-1">
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Dustbin Overflow (94%)</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Fill level exceeds 85%. Triggers Sanitation emptying route.
                </p>
              </button>
            </div>
          </div>

          {/* Device Type Selector Tabs */}
          <div className="flex border-b border-slate-800 pb-1">
            {[
              { type: 'STREETLIGHT', label: 'Streetlight Luminaire', icon: Lightbulb },
              { type: 'POTHOLE_NODE', label: 'Pothole Road Node', icon: Activity },
              { type: 'DUSTBIN', label: 'Smart Dustbin', icon: Trash2 },
            ].map((t) => {
              const Icon = t.icon;
              const active = deviceType === t.type;
              return (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => {
                    setDeviceType(t.type);
                    if (t.type === 'STREETLIGHT') setDeviceId('ESP32-STREET-01');
                    if (t.type === 'POTHOLE_NODE') setDeviceId('ESP32-POTHOLE-NODE-07');
                    if (t.type === 'DUSTBIN') setDeviceId('ESP32-BIN-04');
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition border-b-2 ${
                    active
                      ? 'border-sky-500 text-sky-400 bg-slate-800/40'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Configuration Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                Target Physical Asset
              </label>
              <select
                value={effectiveAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              >
                {relevantAssets.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.id} {a.name} ({a.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1.5">
                ESP32 Hardware Identifier (device_id)
              </label>
              <input
                type="text"
                value={deviceId}
                onChange={(e) => setDeviceId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Dynamic Sensor Inputs */}
          <div className="p-4 rounded-xl bg-slate-850/80 border border-slate-700/60 space-y-4">
            <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
              <span>Telemetry Metrics (`data` payload)</span>
              <span className="font-mono text-[10px] text-slate-400">POST /api/iot/telemetry</span>
            </div>

            {deviceType === 'STREETLIGHT' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Ambient Lux (lux)</label>
                  <input
                    type="number"
                    step="1"
                    value={streetlightData.lux}
                    onChange={(e) =>
                      setStreetlightData({ ...streetlightData, lux: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">&lt;30 = Dark/Night</span>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">PIR Motion (0 or 1)</label>
                  <select
                    value={streetlightData.motion}
                    onChange={(e) =>
                      setStreetlightData({ ...streetlightData, motion: parseInt(e.target.value, 10) })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-xs text-white font-mono"
                  >
                    <option value={1}>1 (Vehicle / Pedestrian active)</option>
                    <option value={0}>0 (Idle road)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Current Draw (Amperes)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={streetlightData.current}
                    onChange={(e) =>
                      setStreetlightData({ ...streetlightData, current: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">0A when dark = Anomaly</span>
                </div>
              </div>
            )}

            {deviceType === 'POTHOLE_NODE' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Z-Axis Acceleration (g)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={potholeData.acceleration}
                    onChange={(e) =>
                      setPotholeData({ ...potholeData, acceleration: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">&ge;2.5g = Hazardous pothole shock</span>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">IR Cavity Depth (cm)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={potholeData.ir_distance}
                    onChange={(e) =>
                      setPotholeData({ ...potholeData, ir_distance: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">&ge;15cm = Severe road depression</span>
                </div>
              </div>
            )}

            {deviceType === 'DUSTBIN' && (
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Bin Fill Level Percentage</span>
                  <span className="font-mono font-bold text-white">{dustbinData.fill_level}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={dustbinData.fill_level}
                  onChange={(e) =>
                    setDustbinData({ fill_level: parseFloat(e.target.value) })
                  }
                  className="w-full accent-sky-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0% (Empty)</span>
                  <span className="text-amber-400 font-bold">&ge;85% (Overflow Alert)</span>
                  <span>100% (Full)</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger Button */}
          <button
            type="button"
            disabled={transmitting}
            onClick={() => handleSendTelemetry()}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-sky-600 via-indigo-600 to-blue-600 hover:from-sky-500 hover:to-indigo-500 text-white flex items-center justify-center gap-2 shadow-lg shadow-sky-900/30 transition transform active:scale-[0.99]"
          >
            {transmitting ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Transmitting HTTP POST from ESP32...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>FIRE ESP32 TELEMETRY PACKET</span>
              </>
            )}
          </button>

          {/* Response Notification Banner */}
          {result && (
            <div
              className={`p-4 rounded-xl border space-y-2 animate-fadeIn ${
                result.is_anomaly
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-200'
                  : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {result.is_anomaly ? (
                  <>
                    <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <span>ANOMALY DETECTED & CIVIC WORK ORDER GENERATED</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <span>NORMAL TELEMETRY LOGGED (NO ANOMALY)</span>
                  </>
                )}
                <span className="ml-auto text-xs px-2 py-0.5 rounded bg-slate-900/60 font-mono">
                  Log #{result.id}
                </span>
              </div>

              {result.anomaly_reason && (
                <p className="text-xs text-slate-300">{result.anomaly_reason}</p>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-700/60 text-xs font-mono text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-400 block">DEVICE</span>
                  <span className="font-medium text-white">{result.device_id}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">ASSET</span>
                  <span className="font-medium text-white truncate block">{result.asset_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">STATUS</span>
                  <span className={result.is_anomaly ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                    {result.is_anomaly ? 'ANOMALY' : 'NORMAL'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">LINKED ISSUE</span>
                  <span className="text-sky-400 font-bold">
                    {result.issue_id ? `Issue #${result.issue_id}` : 'None'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center text-xs text-slate-400">
          <span className="font-mono">Payload: JSON via standard HTTP POST</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default IoTSimulatorModal;
