import React, { useState, useEffect } from 'react';
import {
  X,
  Radio,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  CheckCheck,
  User,
  MapPin,
  Cpu,
  RotateCcw,
  Sparkles,
  Camera,
  Upload,
  ShieldCheck,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import { scanRFID, getWorkers, getAssets, getMaintenanceTasks } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';

const AFTER_IMAGE_PRESETS = [
  { id: 'asphalt', label: 'Repaired Asphalt Surface', url: '/uploads/sample_pothole_1_annotated.jpg' },
  { id: 'paving', label: 'Compacted Bitumen Patch', url: '/uploads/sample_pothole_2_annotated.jpg' },
  { id: 'smooth', label: 'Smooth Road Grade', url: '/uploads/sample_pothole_3_annotated.jpg' },
];

const RFIDSimulatorModal = ({ isOpen, onClose, onScanSuccess }) => {
  const { t, getDepartmentLabel, getStatusLabel } = useLanguage();
  const [workers, setWorkers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [selectedRfid, setSelectedRfid] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [customRfid, setCustomRfid] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [activeTasks, setActiveTasks] = useState([]);

  // End-of-Work Verification Evidence State
  const [completionNotes, setCompletionNotes] = useState('Cold mix asphalt compacted, surface leveled to grade.');
  const [afterImageUrl, setAfterImageUrl] = useState('/uploads/sample_pothole_1_annotated.jpg');

  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      setScanResult(null);
      setScanError(null);
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    try {
      const [workersData, assetsData, tasksData] = await Promise.all([
        getWorkers(),
        getAssets(),
        getMaintenanceTasks({ status: 'IN_PROGRESS' }),
      ]);
      setWorkers(workersData);
      setAssets(assetsData);
      setActiveTasks(tasksData);

      if (workersData.length > 0 && !selectedRfid) {
        setSelectedRfid(workersData[0].rfid_uid);
      }
      if (assetsData.length > 0 && !selectedAssetId) {
        setSelectedAssetId(assetsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load RFID simulator data:', err);
    }
  };

  if (!isOpen) return null;

  const currentRfid = isCustomMode ? customRfid : selectedRfid;
  const selectedWorker = workers.find((w) => w.rfid_uid === currentRfid);
  const selectedAsset = assets.find((a) => a.id === parseInt(selectedAssetId, 10));

  // Check if this worker currently has an in-progress task on this asset
  const hasInProgressTask = activeTasks.some(
    (t) =>
      selectedWorker &&
      t.worker_id === selectedWorker.id &&
      t.asset_id === parseInt(selectedAssetId, 10)
  );

  const handleScan = async () => {
    if (!currentRfid) {
      setScanError('Please select or enter an RFID UID.');
      return;
    }
    if (!selectedAssetId) {
      setScanError('Please select an asset to tap against.');
      return;
    }

    setScanning(true);
    setScanError(null);
    setScanResult(null);

    try {
      const payload = {
        rfid_uid: currentRfid.trim(),
        asset_id: parseInt(selectedAssetId, 10),
        latitude: selectedAsset?.latitude || 21.1458,
        longitude: selectedAsset?.longitude || 79.0882,
      };

      if (hasInProgressTask) {
        payload.after_image = afterImageUrl;
        payload.notes = completionNotes;
      } else {
        payload.notes = 'Technician on-site check-in.';
      }

      const result = await scanRFID(payload);
      setScanResult(result);

      // Refresh active tasks list
      const updatedTasks = await getMaintenanceTasks({ status: 'IN_PROGRESS' });
      setActiveTasks(updatedTasks);

      if (onScanSuccess) {
        onScanSuccess(result);
      }
    } catch (err) {
      const msg = err.response?.data?.detail || err.message || 'RFID Scan failed';
      setScanError(msg);
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-gradient-to-r from-slate-900 via-sky-950/40 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white tracking-wide">
                  {t('rfid', 'modalTitle', 'RFID IoT Field Maintenance Simulator')}
                </h3>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {t('rfid', 'agnosticBadge', 'ESP32 / RC522 Agnostic')}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {t('rfid', 'modalSubtitle', 'Simulate contact-less NFC/RFID tag taps by field workers at municipal assets')}
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Visual Digital Smart Card */}
          <div className="relative p-5 rounded-xl bg-gradient-to-br from-slate-800 via-slate-850 to-sky-950/60 border border-sky-500/20 shadow-lg overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 font-mono font-bold">
                  <Cpu className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-sky-400">
                    {t('rfid', 'fieldId', 'Nagpur Municipal Corporation • Field ID')}
                  </span>
                  <h4 className="text-base font-bold text-white">
                    {selectedWorker ? selectedWorker.name : 'Unknown Worker'}
                  </h4>
                  <p className="text-xs text-slate-300">
                    {selectedWorker
                      ? `${selectedWorker.role} — ${getDepartmentLabel(selectedWorker.department)}`
                      : 'Custom RFID Badge'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] uppercase text-slate-400 block font-mono">
                  {t('rfid', 'rfidUid', 'RFID UID')}
                </span>
                <span className="text-sm font-mono font-bold text-sky-400 bg-sky-950/60 px-2 py-1 rounded border border-sky-500/30">
                  {currentRfid || 'NO-CARD-LOADED'}
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>NFC Radio Reader: 13.56 MHz ISO 14443A</span>
              </div>
              <span className="text-slate-400 font-mono">Vikasit Nagpur Auth Protocol</span>
            </div>
          </div>

          {/* Form Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Worker Selection */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-400" />
                  {t('rfid', 'selectTechnician', 'Select Worker Badge')}
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(!isCustomMode)}
                  className="text-xs text-sky-400 hover:text-sky-300 underline"
                >
                  {isCustomMode ? 'Pick from List' : 'Enter Custom UID'}
                </button>
              </div>

              {isCustomMode ? (
                <input
                  type="text"
                  placeholder="e.g. RFID-NGP-7701"
                  value={customRfid}
                  onChange={(e) => setCustomRfid(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 font-mono uppercase"
                />
              ) : (
                <select
                  value={selectedRfid}
                  onChange={(e) => setSelectedRfid(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 font-medium"
                >
                  {workers.map((w) => (
                    <option key={w.id} value={w.rfid_uid}>
                      {w.name} ({w.rfid_uid}) — {getDepartmentLabel(w.department)}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Target Asset Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                {t('rfid', 'selectAsset', 'Target Asset / Tag Reader')}
              </label>
              <select
                value={selectedAssetId}
                onChange={(e) => setSelectedAssetId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800/90 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 font-medium"
              >
                {assets.map((a) => (
                  <option key={a.id} value={a.id}>
                    #{a.id} {a.name} ({a.type}) — {getStatusLabel(a.status)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Current State Hint Banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
              hasInProgressTask
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                : 'bg-sky-500/10 border-sky-500/30 text-sky-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>
                {hasInProgressTask
                  ? t('rfid', 'activeDetected', 'Active Work Order Detected! Next scan will COMPLETE the maintenance session.')
                  : t('rfid', 'noActiveDetected', 'No Active Session for this Pair. Next scan will START a new maintenance session.')}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                hasInProgressTask
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-sky-500/20 text-sky-300'
              }`}
            >
              {hasInProgressTask ? t('rfid', 'step2', 'Step 2: Check-Out') : t('rfid', 'step1', 'Step 1: Check-In')}
            </span>
          </div>

          {/* Post-Repair Evidence Input (Step 2: Check-Out) */}
          {hasInProgressTask && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  {t('rfid', 'evidenceTitle', 'Post-Repair Verification Evidence (Check-Out)')}
                </span>
                <span className="text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {t('rfid', 'nextStatusPending', 'Next Status: PENDING_VERIFICATION')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {t('rfid', 'workerNotes', 'Worker Repair Activity Notes')}
                </label>
                <textarea
                  rows="2"
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder={t('rfid', 'notesPlaceholder', 'Describe repair method, asphalt compaction, bitumen binder, or electrical test...')}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-sky-400" />
                    <span>{t('rfid', 'afterPhotoProof', 'Select Post-Repair Photo Proof (After Image)')}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">IRC Standards Evidence</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {AFTER_IMAGE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAfterImageUrl(preset.url)}
                      className={`p-2.5 rounded-lg border text-left transition flex flex-col items-center justify-center gap-1 text-[11px] cursor-pointer ${
                        afterImageUrl === preset.url
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold shadow-sm shadow-emerald-500/20'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span className="truncate w-full text-center">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Big Action Tap Button */}
          <button
            type="button"
            disabled={scanning}
            onClick={handleScan}
            className={`w-full py-4 px-6 rounded-xl font-bold text-base flex items-center justify-center gap-3 transition-all transform active:scale-[0.99] shadow-lg cursor-pointer ${
              hasInProgressTask
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/30'
                : 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white shadow-sky-900/30'
            } ${scanning ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {scanning ? (
              <>
                <RotateCcw className="w-5 h-5 animate-spin" />
                <span>{t('rfid', 'processing', 'Reading RFID Card & Processing...')}</span>
              </>
            ) : hasInProgressTask ? (
              <>
                <CheckCheck className="w-6 h-6 animate-bounce" />
                <span>{t('rfid', 'tapComplete', 'TAP RFID CARD TO COMPLETE WORK ORDER')}</span>
              </>
            ) : (
              <>
                <Radio className="w-6 h-6 animate-pulse" />
                <span>{t('rfid', 'tapStart', 'TAP RFID CARD TO START MAINTENANCE')}</span>
              </>
            )}
          </button>

          {/* Success Result Banner */}
          {scanResult && (
            <div className="p-4 rounded-xl bg-slate-800/90 border border-emerald-500/40 space-y-2 animate-fadeIn">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <span>
                  {scanResult.action === 'COMPLETED'
                    ? t('rfid', 'sessionCompleted', 'Maintenance Session Completed & Logged!')
                    : t('rfid', 'sessionStarted', 'Maintenance Session Started!')}
                </span>
                <span className="ml-auto text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                  Task #{scanResult.task_id}
                </span>
              </div>
              <p className="text-xs text-slate-300">{scanResult.message}</p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-700/60 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 block">{t('rfid', 'worker', 'WORKER')}</span>
                  <span className="text-slate-200 font-medium">{scanResult.worker_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{t('rfid', 'asset', 'ASSET')}</span>
                  <span className="text-slate-200 font-medium truncate block">
                    {scanResult.asset_name}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{t('rfid', 'status', 'STATUS')}</span>
                  <span
                    className={`font-bold ${
                      scanResult.task_status === 'PENDING_VERIFICATION'
                        ? 'text-sky-400'
                        : scanResult.action === 'COMPLETED'
                        ? 'text-emerald-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {getStatusLabel(scanResult.task_status || scanResult.action)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{t('rfid', 'duration', 'DURATION')}</span>
                  <span className="text-amber-400 font-bold">
                    {scanResult.formatted_duration || t('rfid', 'inProgressDuration', 'In Progress...')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {scanError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-3 text-xs">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
              <span>{scanError}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-between items-center text-xs text-slate-400">
          <span>{t('rfid', 'readyFooter', 'Ready for hardware connection: POST /api/rfid/scan')}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            {t('rfid', 'close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RFIDSimulatorModal;
